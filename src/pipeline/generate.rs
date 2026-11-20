//! Brief -> tool loop (read_skill_file) -> notes + HTML -> generations.

use crate::config::Config;
use crate::db::{self, es};
use crate::jobs::Job;
use crate::llm;
use crate::pipeline::field;
use crate::pipeline::finish;
use crate::pipeline::tokens;
use crate::sql::args;
use llm_providers_connector::{Delta, ReasoningEffort};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::path::{Component, Path, PathBuf};
use std::sync::LazyLock;
use std::time::Instant;
use uuid::Uuid;

const PROMPT: &str = include_str!("../../prompts/generate.md");
const DIRECTIONS: &str = include_str!("../../prompts/directions.md");
const MOBILE: &str = include_str!("../../prompts/mobile.md");
const DESKTOP_APP: &str = include_str!("../../prompts/desktop_app.md");

/// True when the brief, description, users or style tags mention a desktop application.
pub(crate) fn is_desktop_app(req: &Value) -> bool {
    let mut text = String::new();
    text.push_str(&field::field_text(&req["brief"]));
    text.push_str(&field::field_text(&req["description"]));
    text.push_str(&field::field_text(&req["users"]));
    text.push_str(&field::field_text(&req["style_tags"]));
    [
        "desktop app",
        "desktop application",
        "application de bureau",
        "app de bureau",
        "logiciel de bureau",
        "application desktop",
        "app desktop",
        "tauri",
        "electron app",
        "windows app",
        "application windows",
        "app windows",
        "macos app",
        "mac app",
        "system tray",
        "zone de notification",
    ]
    .iter()
    .any(|w| text.contains(w))
}

/// Design archetypes: each fixes a look, a structure and the hue / font candidates the seed picks from.
static ARCHETYPES: LazyLock<Vec<Value>> =
    LazyLock::new(|| serde_json::from_str(include_str!("../../prompts/archetypes.json")).expect("prompts/archetypes.json"));
/// Named screen structures: the planner picks one per direction from the brief; the archetype then dictates how its regions look.
static STRUCTURES: LazyLock<Vec<Value>> =
    LazyLock::new(|| serde_json::from_str(include_str!("../../prompts/structures.json")).expect("prompts/structures.json"));
const MAX_VARIANTS: u64 = 3;

/// `[{id, name, feel}]` for the front's archetype picker.
pub fn archetypes() -> Value {
    ARCHETYPES
        .iter()
        .map(|a| json!({"id": a["id"], "name": a["name"], "feel": a["feel"], "kind": a["kind"].as_str().unwrap_or("business")}))
        .collect()
}

/// One line per archetype for the brief helper, which picks the looks that fit the request.
pub fn looks_text() -> String {
    ARCHETYPES
        .iter()
        .map(|a| {
            format!(
                "- {}{}: {}\n",
                a["id"].as_str().unwrap_or(""),
                if a["kind"] == "consumer" { " (playful)" } else { "" },
                a["feel"].as_str().unwrap_or("")
            )
        })
        .collect()
}

pub fn is_archetype(id: &str) -> bool {
    ARCHETYPES.iter().any(|a| a["id"] == id)
}

/// splitmix64: a tiny deterministic mixer, no RNG dependency.
fn mix(seed: u64) -> u64 {
    let mut z = seed.wrapping_add(0x9E37_79B9_7F4A_7C15);
    z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
    z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
    z ^ (z >> 31)
}

/// Seeded starting point of one variant, so screens differ for sure and a seed reproduces its picks.
#[derive(Debug, PartialEq)]
pub struct Pick {
    pub archetype: Value,
    pub theme: String,
    pub hue: String,
    pub font: String,
}

/// One pick per variant: distinct archetypes (unless `forced`), hue and font from the archetype's own lists.
/// A theme named in the style tags wins over the archetype's. `kind:consumer` / `kind:game` (or playful words, for older briefs)
/// draw from the consumer archetypes (`"kind": "consumer"`), the others from the business ones.
pub fn seed_picks(seed: u64, n: usize, style_tags: &str, forced: Option<&str>, looks: &[String]) -> Result<Vec<Pick>, String> {
    let tags = style_tags.to_lowercase();
    let tag_theme = if tags.contains("dark") {
        Some("dark")
    } else if tags.contains("light") {
        Some("light")
    } else {
        None
    };
    let playful = ["kind:consumer", "kind:game", "playful", "arcade", "game", "fun", "kids", "teen"].iter().any(|w| tags.contains(w));
    let pool: Vec<&Value> = ARCHETYPES.iter().filter(|a| (a["kind"] == "consumer") == playful).collect();
    let forced = match forced.filter(|f| !f.is_empty() && *f != "auto") {
        Some(f) => Some(ARCHETYPES.iter().find(|a| a["id"] == f).ok_or_else(|| format!("unknown archetype {f:?}"))?),
        None => None,
    };
    let (a, h, f, t) = (mix(seed) as usize, mix(seed ^ 0xA5A5) as usize, mix(seed ^ 0xF0F0) as usize, mix(seed ^ 0x0F0F) as usize);
    // The looks the brief helper chose first, then the seeded walk; step 5 is coprime with both pool sizes (12 business, 4 consumer).
    let mut chosen: Vec<&Value> = Vec::new();
    for arch in looks
        .iter()
        .filter_map(|id| ARCHETYPES.iter().find(|a| a["id"] == id.as_str()))
        .chain((0..pool.len()).map(|i| pool[(a + i * 5) % pool.len()]))
    {
        if chosen.len() < n && !chosen.iter().any(|c| c["id"] == arch["id"]) {
            chosen.push(arch);
        }
    }
    Ok((0..n)
        .map(|k| {
            let arch = forced.unwrap_or(chosen[k % chosen.len()]);
            let from = |key: &str, x: usize| {
                let l = arch[key].as_array().expect("archetype list");
                l[(x + k) % l.len()].as_str().unwrap_or("").to_string()
            };
            let theme = match (tag_theme, arch["theme"].as_str()) {
                (Some(th), _) => th,
                (None, Some("dark")) => "dark",
                (None, Some("light")) => "light",
                _ => {
                    if (t + k) % 2 == 0 {
                        "dark"
                    } else {
                        "light"
                    }
                }
            };
            Pick { archetype: arch.clone(), theme: theme.into(), hue: from("hues", h), font: from("fonts", f) }
        })
        .collect())
}

fn bullets(v: &Value) -> String {
    v.as_array().map_or(String::new(), |a| a.iter().filter_map(Value::as_str).collect::<Vec<_>>().join("; "))
}

/// The archetype block shared by the planner and the generator prompts.
fn archetype_text(a: &Value) -> String {
    format!(
        "ARCHETYPE \"{}\": {}\n  Structure: {}\n  Neutrals: {}\n  Do: {}\n  Don't: {}",
        a["name"].as_str().unwrap_or(""),
        a["feel"].as_str().unwrap_or(""),
        a["structure"].as_str().unwrap_or(""),
        a["neutrals"].as_str().unwrap_or(""),
        bullets(&a["do"]),
        bullets(&a["dont"])
    )
}
/// One line per structure for the planner prompt.
/// `main_only` skips the `"main": false` entries (secondary pages), which the planner must not pick for the main screen.
fn structures_text(main_only: bool) -> String {
    STRUCTURES
        .iter()
        .filter(|s| !main_only || s["main"] != false)
        .map(|s| {
            format!(
                "- {}: {}. {} Use when: {}\n",
                s["id"].as_str().unwrap_or(""),
                s["name"].as_str().unwrap_or(""),
                s["regions"].as_str().unwrap_or(""),
                s["use_when"].as_str().unwrap_or("")
            )
        })
        .collect()
}

/// The structure block for the generator prompt: the regions are fixed, the archetype fixes their look.
fn structure_text(s: &Value) -> String {
    format!(
        "STRUCTURE \"{}\": {}\n  The structure fixes the regions; the archetype fixes how they look. Where the archetype's structure line conflicts with it, the structure wins.",
        s["name"].as_str().unwrap_or(""),
        s["regions"].as_str().unwrap_or("")
    )
}

fn enforce_mono(d: &mut Value, archetype: &Value, k: usize, mut log: impl FnMut(&str)) {
    let mono = d["identity"]["mono"].as_str().unwrap_or("").to_string();
    if !tokens::is_monospace(&mono) {
        log(&format!("variant {}: mono {mono:?} is not a monospace family, using the archetype's", k + 1));
        d["identity"]["mono"] = archetype["mono"].clone();
    }
}
const MAX_TOOL_CALLS: usize = 16;
const MAX_FILE_BYTES: usize = 100_000;

/// Resolves `rel` under `root`, refusing absolute paths, `..` and symlinks that leave the root.
pub fn confine(root: &Path, rel: &str) -> Result<PathBuf, String> {
    let p = Path::new(rel);
    if rel.is_empty() || p.components().any(|c| !matches!(c, Component::Normal(_) | Component::CurDir)) {
        return Err(format!("path not allowed: {rel:?} (use a path relative to the skill, e.g. ux/flows.md)"));
    }
    let root = root.canonicalize().map_err(es)?;
    let full = root.join(p).canonicalize().map_err(|_| format!("no such file: {rel}"))?;
    if !full.starts_with(&root) || !full.is_file() {
        return Err(format!("path not allowed: {rel:?}"));
    }
    Ok(full)
}

fn read_skill_file(root: &Path, args: &str) -> String {
    let path = serde_json::from_str::<Value>(args).ok().and_then(|v| v["path"].as_str().map(str::to_string));
    let Some(path) = path else {
        return "error: arguments must be {\"path\": \"...\"}".into();
    };
    match confine(root, &path).and_then(|p| std::fs::read(p).map_err(es)) {
        Ok(b) => for_model(&String::from_utf8_lossy(&b[..b.len().min(MAX_FILE_BYTES)])),
        Err(e) => format!("error: {e}"),
    }
}

/// A skill file without its `- Seen in:` provenance lines: 15 % of the text, no design guidance.
fn for_model(text: &str) -> String {
    text.lines().filter(|l| !l.starts_with("- Seen in:")).collect::<Vec<_>>().join("\n")
}

/// Read by nearly every generation whatever the structure, so handed over up front.
const CORE_FILES: [&str; 9] = [
    "ux/hierarchy.md",
    "styles/axes.md",
    "layouts/shells.md",
    "layouts/regions.md",
    "ux/flows.md",
    "ux/interactions.md",
    "ux/data-representation.md",
    "components/button.md",
    "components/badge.md",
];

/// The text of skill files handed over already open, each under a `### path` header.
/// Saves the model the 4-6 tool rounds it spent opening them one by one.
fn preloaded<'a>(root: &Path, files: impl IntoIterator<Item = &'a str>) -> Result<String, String> {
    let mut out = String::new();
    for rel in files {
        let text = for_model(&std::fs::read_to_string(confine(root, rel)?).map_err(es)?);
        out += &format!("\n\n### {rel}\n\n{text}");
    }
    Ok(out)
}

/// The first user turn: the core files, the structure's own files, then the brief.
/// Hosted providers cache the longest prompt prefix they have seen, so what never changes comes first: system +
/// core files (~21k tokens) are billed at the cached rate from the second generation on, the structure files when
/// the structure repeats. A 10 vs 10 test (2026-11-05) gave the same quality in both orders; the local server's
/// full pool reused nothing either way.
fn first_turn(root: &Path, brief: String, structure: &Value) -> Result<Value, String> {
    let core = preloaded(root, CORE_FILES)?;
    // Some structures list a core component again: sent once.
    let own = structure["files"].as_array().into_iter().flatten().filter_map(Value::as_str);
    let extra = preloaded(root, own.filter(|f| !CORE_FILES.contains(f)))?;
    Ok(
        json!({"role": "user", "content": format!("SKILL FILES, already open (read_skill_file is for the others):{core}{extra}\n\n---\n\n{brief}")}),
    )
}

fn tools() -> Value {
    json!([{"type": "function", "function": {
        "name": "read_skill_file",
        "description": "Read one file of the skill, by path relative to the skill root (e.g. ux/flows.md, components/kpi-tile.md).",
        "parameters": {"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]}
    }}])
}

fn list(v: &Value) -> String {
    match v {
        Value::Array(a) => a.iter().filter_map(Value::as_str).collect::<Vec<_>>().join(", "),
        Value::String(s) => s.clone(),
        _ => String::new(),
    }
}

pub(crate) fn user_message(req: &Value, direction: Option<&Value>, reference: Option<&str>) -> String {
    let dir = direction.map_or(String::new(), |d| {
        let structure = d["structure"].as_object().map_or(String::new(), |_| format!("\n\n{}", structure_text(&d["structure"])));
        format!(
            "\n\nDIRECTION ({}): {}\nFollow it for the structure (shell, regions, main representation); decide the rest with the skill.{}\n\n{}\nThe archetype's do / don't lists are rules, not suggestions.\n\nVISUAL IDENTITY (mandatory): {}\nPut these exact values in the `:root` variables of the tokens contract and use them everywhere through the variables; load the fonts from Google Fonts. Do not replace them with your usual palette. tone sets the voice of copy, shapes and type weight (serious / neutral / playful); decoration sets how much glow, texture, illustration and extra colour fields (none / light / rich); accent2, when present, colours secondary highlights (badges, progress, a second action), never body text.",
            d["label"].as_str().unwrap_or(""),
            d["direction"].as_str().unwrap_or(""),
            structure,
            archetype_text(&d["archetype"]),
            d["identity"]
        )
    });
    let mobile = req["target"].as_str() == Some("mobile");
    let mut msg = format!(
        "Project brief:\n{}\n\nUsers: {}\nData objects: {}\nStyle tags: {}\nDensity: {}",
        req["brief"].as_str().unwrap_or(""),
        list(&req["users"]),
        list(&req["data_objects"]),
        list(&req["style_tags"]),
        req["density"].as_str().unwrap_or("not specified"),
    ) + &dir;
    if let Some(d) = req["description"].as_str().map(str::trim).filter(|d| !d.is_empty()) {
        msg += &format!(
            "\n\nUSER'S OWN WORDS (binding: where the brief and these words differ, these words win; keep their scope, product name and constraints):\n{d}"
        );
    }
    if let Some(c) = req["colours"].as_str().map(str::trim).filter(|c| !c.is_empty()) {
        msg += &format!("\n\nCOLOURS (binding, the user's request; it overrides the archetype's hue family and the ban list): {c}");
    }
    if field::is_field(req) {
        msg += &format!("\n\n{}", field::rule());
    }
    if is_desktop_app(req) {
        msg += &format!("\n\nDESKTOP APP: {DESKTOP_APP}");
    }
    if let Some(page) = req["page"].as_str().map(str::trim).filter(|p| !p.is_empty()) {
        msg += &format!(
            "\n\nPAGE \"{page}\": this is one page of a multi-page product. The brief above describes THIS page. Keep the shell, navigation, tokens and component styles of the REFERENCE PAGE exactly; mark this page as the active nav item; design its own regions and content from its data. Pick this page's structure from the catalogue below by its 'use when' line and name it in your notes:\n{}",
            structures_text(false)
        );
        if !mobile && let Some(html) = reference {
            msg += &format!("\n\nREFERENCE PAGE (the product's identity page, imitate its shell and components):\n{html}");
        }
    }
    if mobile {
        msg += &format!("\n\nMOBILE TARGET: {MOBILE}");
    }
    if mobile && let Some(html) = reference {
        msg += &format!(
            "\n\nREFERENCE PAGE (desktop version; translate it to the phone: same tokens, components, content and navigation items, reorganised for 390px):\n{html}"
        );
    }
    msg
}

/// Which variant of the batch is running: (1-based index, total).
pub(crate) type Slot = (usize, usize);

/// Job progress as JSON, read by the Generate screen: `{"phase", "files", "kb", "variant", "variants"}`.
pub(crate) fn report(job: &Job, slot: Slot, phase: &str, files: usize, kb: usize) {
    let progress = json!({
        "phase": phase,
        "files": files,
        "max_files": MAX_TOOL_CALLS,
        "kb": kb,
        "variant": slot.0,
        "variants": slot.1,
        "parallel": job.parallel() > 1
    });
    job.progress(&progress.to_string());
}

fn between<'a>(text: &'a str, tag: &str) -> Option<&'a str> {
    let a = text.find(&format!("<{tag}>"))? + tag.len() + 2;
    let b = text[a..].find(&format!("</{tag}>"))? + a;
    Some(text[a..b].trim())
}

/// Strips a Markdown fence the model may have put around the document.
fn unfence(s: &str) -> &str {
    let s = s.trim();
    let s = s.strip_prefix("```html").or_else(|| s.strip_prefix("```")).unwrap_or(s);
    s.strip_suffix("```").unwrap_or(s).trim()
}

/// Fallback when the `<html_doc>` wrapper is broken: the span from `<!doctype` / `<html` to the last `</html>`.
/// Without a `</html>` (output limit hit mid-document) the tail is kept and closed; the flag says so.
fn bare_html(text: &str) -> Option<(String, bool)> {
    let lower = text.to_ascii_lowercase();
    let a = lower.find("<!doctype html").or_else(|| lower.find("<html"))?;
    match lower.rfind("</html>") {
        Some(b) => Some((text[a..b + "</html>".len()].to_string(), false)),
        None => Some((format!("{}\n</body></html>", text[a..].trim_end()), true)),
    }
}

/// Notes from a `<notes>` block; `Null` when absent or unusable.
pub(crate) fn parse_notes(text: &str) -> Value {
    between(text, "notes").and_then(|n| llm::parse_json(n, '{', '}').ok()).unwrap_or(Value::Null)
}

/// Returns `(notes, html, truncated)`; notes is `Null` when the model's JSON is unusable.
pub fn parse_answer(text: &str) -> Result<(Value, String, bool), String> {
    let (html, truncated) = between(text, "html_doc")
        .map(unfence)
        .filter(|h| !h.is_empty())
        .map(|h| (h.to_string(), false))
        .or_else(|| bare_html(text))
        .ok_or("answer has no <html_doc>…</html_doc> and no <html> document")?;
    let notes = parse_notes(text);
    Ok((notes, html, truncated))
}

/// One screen, or `variants` (2-3) screens with structurally different directions, stored as one batch. A request with `parent: <generation id>` joins that generation's batch (an "alternative"). A request with a `page` name is generated under its concept's identity (see `run_page`). `target` is `desktop` (default), `mobile` or `both` (desktop then mobile, using the desktop HTML as reference).
pub fn run(cfg: &Config, job: &Job, request: Value) -> Result<Value, String> {
    if let Some(page) = request["page"].as_str().map(str::trim).filter(|p| !p.is_empty()) {
        return run_page(cfg, job, &request, page);
    }
    let n = request["variants"].as_u64().unwrap_or(1).clamp(1, MAX_VARIANTS) as usize;
    let targets = targets(&request);
    let total = n * targets.len();
    let batch = match uuid_of(&request["parent"]) {
        Some(p) => Some(cfg.block(db::join_batch(cfg, p, job.id))?),
        None => (total > 1).then(|| job.id.to_string()),
    };
    // Even a single screen is planned first: left alone, the model repeats one house style.
    job.progress(&json!({"phase": "planning", "variant": 0, "variants": n}).to_string());
    let seed = request["seed"].as_u64().unwrap_or_else(|| {
        std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_or(0, |d| d.as_nanos() as u64) % 1_000_000
    });
    let looks: Vec<String> =
        request["looks"].as_array().map_or(Vec::new(), |a| a.iter().filter_map(|v| v.as_str().map(String::from)).collect());
    let picks = seed_picks(seed, n, &list(&request["style_tags"]), request["archetype"].as_str(), &looks)?;
    let user_colours = request["colours"].as_str().is_some_and(|c| !c.trim().is_empty());
    let picks_text: String = picks
        .iter()
        .enumerate()
        .map(|(k, p)| {
            let a = &p.archetype;
            format!(
                "- direction {}: {}\n  theme {}, accent hue family {}, font {}, mono {}, radius {}px, density {}\n",
                k + 1,
                archetype_text(a),
                p.theme,
                if user_colours { "see COLOURS in the brief" } else { p.hue.as_str() },
                p.font,
                a["mono"].as_str().unwrap_or(""),
                a["radius"],
                a["density"].as_str().unwrap_or("")
            )
        })
        .collect();
    job.log(&format!(
        "seed {seed}, archetypes: {}",
        picks.iter().map(|p| p.archetype["id"].as_str().unwrap_or("")).collect::<Vec<_>>().join(", ")
    ));
    let rules = DIRECTIONS
        .replace("{n}", &n.to_string())
        .replace("{recent}", &recent_identities(cfg, job.owner)?)
        .replace("{structures}", &structures_text(true));
    let mut planned_req = request.clone();
    planned_req["target"] = json!("desktop");
    let prompt = format!(
        "{rules}\n\nSEED PICKS (mandatory: one direction per archetype below, in this order; use exactly this theme, an accent from this hue family, this font, mono, radius and density; you choose the exact hex values and everything else):\n{picks_text}\n{}",
        user_message(&planned_req, None, None)
    );
    let started = Instant::now();
    let planned = llm::chat(cfg, llm::Stage::Planner, "", &[json!({"role": "user", "content": prompt})], &Value::Null, 16_000)?;
    for f in &planned.failed {
        job.log(&format!("llm fallback: {f}"));
    }
    job.llm_call(&planned.model, &planned.completion, started);
    let mut planner = llm::Usage::default();
    planner.add(&planned.completion, started);
    let mut dirs = llm::parse_json(&planned.completion.content, '[', ']')?.as_array().cloned().unwrap_or_default();
    if dirs.len() < n {
        return Err(format!("planner returned {} directions, expected {n}", dirs.len()));
    }
    for (k, d) in dirs.iter_mut().take(n).enumerate() {
        // The archetype travels with the direction: the generator applies its rules, the pack prints it.
        d["archetype"] = picks[k].archetype.clone();
        let sid = d["structure"].as_str().unwrap_or("").to_string();
        match STRUCTURES.iter().find(|s| s["id"] == sid) {
            Some(s) => d["structure"] = s.clone(),
            None => {
                job.log(&format!("variant {}: unknown structure {sid:?}, the generator decides", k + 1));
                d["structure"] = Value::Null;
            }
        }
        enforce_mono(d, &picks[k].archetype, k, |m| job.log(m));
    }
    dirs.truncate(n);
    let width = job.parallel();
    if width > 1 {
        job.log(&format!("{} variants at a time", width.min(n)));
    }
    let one = |k: usize| -> Result<Vec<Uuid>, String> {
        let d = &dirs[k];
        let mut ids = vec![];
        let mut desktop_html = None;
        for (i, &t) in targets.iter().enumerate() {
            let mut req = request.clone();
            req["target"] = json!(t);
            let reference = if t == "mobile" { desktop_html.as_deref() } else { None };
            let structure = d["structure"]["id"].as_str().map_or(String::new(), |s| format!(" · {s}"));
            job.log(&format!("variant {} ({t}): {}{}", k + 1, d["label"].as_str().unwrap_or(""), structure));
            let (id, html) =
                generate_one(cfg, job, &req, Some(d), reference, (k * targets.len() + i + 1, total), batch.as_deref(), seed, &planner)?;
            ids.push(id);
            if t == "desktop" {
                desktop_html = Some(html);
            }
        }
        Ok(ids)
    };
    let ids = in_parallel(n, width, one)?.concat();
    Ok(json!({"generation_ids": ids, "seed": seed}))
}

/// Runs `f(0..n)` at most `width` at a time on scoped threads; results in index order, the first error wins once its batch has finished.
// ponytail: fixed batches of `width` (n <= 3 here); a work queue if n ever grows.
fn in_parallel<T: Send>(n: usize, width: usize, f: impl Fn(usize) -> Result<T, String> + Sync) -> Result<Vec<T>, String> {
    let mut out = Vec::with_capacity(n);
    let f = &f;
    for batch in (0..n).collect::<Vec<_>>().chunks(width.max(1)) {
        let results: Vec<Result<T, String>> = std::thread::scope(|s| {
            let handles: Vec<_> = batch.iter().map(|&k| s.spawn(move || f(k))).collect();
            handles.into_iter().map(|h| h.join().unwrap_or_else(|_| Err("a variant thread panicked".into()))).collect()
        });
        for r in results {
            out.push(r?);
        }
    }
    Ok(out)
}

/// One page (or `variants` tries of it) under the concept's identity: no planner, the identity's direction and its page as reference, stored as one batch when several.
fn run_page(cfg: &Config, job: &Job, request: &Value, page: &str) -> Result<Value, String> {
    let n = request["variants"].as_u64().unwrap_or(1).clamp(1, MAX_VARIANTS) as usize;
    let concept = uuid_of(&request["concept"]).ok_or("a page needs a concept")?;
    let identity = cfg.block(db::identity(cfg, concept))?.ok_or("pick a generation as the concept's identity first")?;
    let mut direction = identity["notes"]["direction"].clone();
    if !direction.is_object() {
        return Err("the identity generation has no direction".into());
    }
    // A page keeps the identity's archetype and tokens, not its dominant region: the page brief decides that.
    let _ = direction.as_object_mut().map(|o| o.remove("structure"));
    let reference = identity["html"].as_str().filter(|h| !h.is_empty()).ok_or("the identity generation has no HTML")?;
    let seed = identity["notes"]["seed"].as_u64().unwrap_or(0);
    let mut request = request.clone();
    request["page"] = json!(page);
    request["identity"] = identity["id"].clone();
    job.log(&format!("page {page:?} under identity #{}", identity["id"]));
    let targets = targets(&request);
    let total = n * targets.len();
    let batch = (total > 1).then(|| job.id.to_string());
    let one = |k: usize| -> Result<Vec<Uuid>, String> {
        let mut ids = vec![];
        let mut desktop_html = None;
        for (i, &t) in targets.iter().enumerate() {
            let mut req = request.clone();
            req["target"] = json!(t);
            // A mobile page follows the desktop page just generated when there is one, else the identity.
            let reference = Some(if t == "mobile" { desktop_html.as_deref().unwrap_or(reference) } else { reference });
            let (id, html) = generate_one(
                cfg,
                job,
                &req,
                Some(&direction),
                reference,
                (k * targets.len() + i + 1, total),
                batch.as_deref(),
                seed,
                &llm::Usage::default(),
            )?;
            ids.push(id);
            if t == "desktop" {
                desktop_html = Some(html);
            }
        }
        Ok(ids)
    };
    let ids = in_parallel(n, job.parallel(), one)?.concat();
    Ok(json!({"generation_ids": ids, "seed": seed}))
}

/// Identities of the owner's last generations, so the planner does not repeat them (never another user's).
fn recent_identities(cfg: &Config, owner: Uuid) -> Result<String, String> {
    let sql = "SELECT (notes_json #> '{direction,identity}')::text FROM generations WHERE owner_id = $1 AND notes_json #> '{direction,identity}' IS NOT NULL ORDER BY created_at DESC, id DESC LIMIT 4";
    let recent: Vec<String> = cfg.block(cfg.pool.fetch_all(sql, args![owner])).map_err(es)?.iter().map(|r| r.get::<String, _>(0)).collect();
    Ok(if recent.is_empty() {
        String::new()
    } else {
        format!("- Recently generated identities, do not reuse their accent or neutral set:\n{}\n", recent.join("\n"))
    })
}

/// A uuid sent as a JSON string (ids in requests).
pub fn uuid_of(v: &Value) -> Option<Uuid> {
    v.as_str().and_then(|s| s.parse().ok())
}

fn targets(request: &Value) -> Vec<&'static str> {
    match request["target"].as_str() {
        Some("mobile") => vec!["mobile"],
        Some("both") => vec!["desktop", "mobile"],
        _ => vec!["desktop"],
    }
}

#[allow(clippy::too_many_arguments)]
fn generate_one(
    cfg: &Config,
    job: &Job,
    request: &Value,
    direction: Option<&Value>,
    reference: Option<&str>,
    slot: Slot,
    batch: Option<&str>,
    seed: u64,
    planner: &llm::Usage,
) -> Result<(Uuid, String), String> {
    let skill_md =
        std::fs::read_to_string(cfg.skill_dir.join("SKILL.md")).map_err(|e| format!("skill not exported yet ({e}); run Export first"))?;
    let version = skill_version(&cfg.skill_dir)?;
    let mut system = PROMPT.replace("{skill}", &skill_md);
    match finish::rules(&cfg.impeccable_dir) {
        Some(r) => {
            system += &format!(
                "\n\n# Finish rules (impeccable)\n\nThe skill above decides the structure; these rules decide the finish. On conflict, the brief wins, then the skill.\n\n{r}"
            )
        }
        None => job.log("warning: impeccable not found, generating without finish rules"),
    }
    let tools = tools();
    let structure = direction.map_or(&Value::Null, |d| &d["structure"]);
    let mut messages = vec![first_turn(&cfg.skill_dir, user_message(request, direction, reference), structure)?];
    let mut calls = 0;
    let mut usage = llm::Usage::default();
    let mut tools_on = true;
    let mut used_model;
    let answer = loop {
        let files = calls.min(MAX_TOOL_CALLS);
        report(job, slot, "thinking", files, 0);
        let t = if tools_on { &tools } else { &Value::Null };
        // Progress for the UI: phase + files read + kB of answer written so far, at most every second.
        let (mut text_len, mut last) = (0usize, Instant::now());
        let started = Instant::now();
        // The planner already fixed structure and identity: this turn executes, so little reasoning is needed.
        let a = llm::chat_streaming(cfg, llm::Stage::Generator, &system, &messages, t, 96_000, Some(ReasoningEffort::Low), &mut |d| {
            let phase = match d {
                Delta::Text(s) => {
                    text_len += s.len();
                    "writing"
                }
                Delta::Thinking(_) => "thinking",
                Delta::ToolPreparing { .. } => "reading",
            };
            if last.elapsed().as_secs() >= 1 {
                last = Instant::now();
                report(job, slot, phase, files, text_len / 1024);
            }
        })?;
        for f in &a.failed {
            job.log(&format!("llm fallback: {f}"));
        }
        used_model = a.model;
        let c = a.completion;
        job.llm_call(&used_model, &c, started);
        usage.add(&c, started);
        if c.tool_calls.is_empty() {
            break c.content;
        }
        let tcs: Vec<Value> = c
            .tool_calls
            .iter()
            .enumerate()
            .map(|(i, t)| {
                let id = if t.id.is_empty() { format!("call_{}", calls + i) } else { t.id.clone() };
                json!({"id": id, "type": "function", "function": {"name": t.name, "arguments": t.arguments}})
            })
            .collect();
        // The thinking goes back as streamed: the next prompt then extends the exact tokens of this
        // call, which the server's prefix cache keeps longer than a bare turn boundary.
        messages.push(json!({"role": "assistant", "content": c.content, "reasoning_content": c.thinking, "tool_calls": tcs}));
        for (tc, call) in tcs.iter().zip(&c.tool_calls) {
            calls += 1;
            let out = if calls > MAX_TOOL_CALLS {
                tools_on = false;
                "error: tool call limit reached; write your final answer now".to_string()
            } else if call.name != "read_skill_file" {
                format!("error: unknown tool {}", call.name)
            } else {
                job.log(&format!("read_skill_file {}", call.arguments));
                read_skill_file(&cfg.skill_dir, &call.arguments)
            };
            messages.push(json!({"role": "tool", "tool_call_id": tc["id"], "content": out}));
        }
    };
    let (notes, html, truncated) = parse_answer(&answer).inspect_err(|_| {
        let n = answer.chars().count();
        job.log(&format!("raw answer ({n} chars) head: {}", answer.chars().take(500).collect::<String>()));
        job.log(&format!("raw answer tail: {}", answer.chars().skip(n.saturating_sub(500)).collect::<String>()));
    })?;
    let mut notes = if notes.is_null() {
        job.log("warning: <notes> missing or not valid JSON");
        json!({})
    } else {
        notes
    };
    if truncated {
        job.log("warning: HTML truncated (no </html>: the model hit its output limit); document closed as is");
        notes["truncated"] = json!(true);
    }
    notes["detect"] = finish::check(cfg, job, &html, direction.map_or(&Value::Null, |d| &d["archetype"]), request);
    notes["seed"] = json!(seed);
    notes["usage"] = usage.json(planner);
    if let Some(d) = direction {
        notes["direction"] = d.clone();
    }
    if let Some(b) = batch {
        notes["batch"] = json!(b);
    }
    // Effects (glow, scanlines...) are a style block from the identity, not left to the model.
    let html = tokens::with_effects(&html, &notes["direction"]["identity"]);
    let new = db::NewGeneration {
        request,
        notes: &notes,
        html: &html,
        skill_version: &version,
        project: None,
        concept: uuid_of(&request["concept"]),
        page: request["page"].as_str(),
        target: request["target"].as_str().unwrap_or("desktop"),
        owner: job.owner,
        model: &used_model,
    };
    let id = cfg.block(db::insert_generation(cfg, new))?;
    Ok((id, html))
}

fn collect(dir: &Path, base: &Path, out: &mut Vec<String>) -> Result<(), String> {
    for e in std::fs::read_dir(dir).map_err(es)? {
        let p = e.map_err(es)?.path();
        if p.is_dir() {
            collect(&p, base, out)?;
        } else {
            out.push(p.strip_prefix(base).map_err(es)?.to_string_lossy().replace('\\', "/"));
        }
    }
    Ok(())
}

/// sha256 over the sorted files' relative paths and contents.
pub fn skill_version(dir: &Path) -> Result<String, String> {
    let mut paths = vec![];
    collect(dir, dir, &mut paths)?;
    paths.sort();
    let mut h = Sha256::new();
    for p in paths {
        h.update(p.as_bytes());
        h.update([0]);
        h.update(std::fs::read(dir.join(&p)).map_err(es)?);
        h.update([0]);
    }
    Ok(format!("{:x}", h.finalize()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn in_parallel_keeps_order_and_reports_errors() {
        assert_eq!(in_parallel(5, 2, |k| Ok::<_, String>(k * 10)).unwrap(), vec![0, 10, 20, 30, 40]);
        assert_eq!(in_parallel(3, 3, |k| if k == 1 { Err("boom".to_string()) } else { Ok(k) }).unwrap_err(), "boom");
        assert!(in_parallel(0, 1, Ok::<_, String>).unwrap().is_empty());
    }

    fn skill_root() -> PathBuf {
        let d = std::env::temp_dir().join(format!("studio-confine-{}", std::process::id()));
        std::fs::create_dir_all(d.join("skill/ux")).unwrap();
        std::fs::write(d.join("skill/ux/flows.md"), "flows").unwrap();
        std::fs::write(d.join("secret.txt"), "secret").unwrap();
        #[cfg(unix)]
        let _ = std::os::unix::fs::symlink(d.join("secret.txt"), d.join("skill/link.txt"));
        d.join("skill")
    }

    #[test]
    fn confinement() {
        let root = skill_root();
        assert!(confine(&root, "ux/flows.md").is_ok());
        assert!(confine(&root, "./ux/flows.md").is_ok());
        for bad in ["", "..", "../secret.txt", "ux/../../secret.txt", "/etc/passwd", "ux", "missing.md", "ux//../../secret.txt"] {
            assert!(confine(&root, bad).is_err(), "{bad}");
        }
        #[cfg(unix)]
        assert!(confine(&root, "link.txt").is_err());
        assert_eq!(read_skill_file(&root, r#"{"path":"ux/flows.md"}"#), "flows");
        assert!(read_skill_file(&root, r#"{"path":"../secret.txt"}"#).starts_with("error"));
    }

    #[test]
    fn first_turn_puts_the_stable_files_before_the_brief() {
        let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("skill/app-layout-patterns");
        let text = first_turn(&root, "BRIEF".into(), &STRUCTURES[1]).unwrap()["content"].as_str().unwrap().to_string();
        assert!(text.ends_with("BRIEF"));
        let other = first_turn(&root, "OTHER".into(), &STRUCTURES[2]).unwrap()["content"].as_str().unwrap().to_string();
        let core_end = text.find(&format!("### {}", STRUCTURES[1]["files"][0].as_str().unwrap())).unwrap();
        assert_eq!(text[..core_end], other[..core_end], "the core files are a prefix shared by every generation");
        assert!(!text.contains("Seen in:"), "provenance stays out of the prompt");
        for rel in CORE_FILES.iter().copied().chain(STRUCTURES[1]["files"].as_array().unwrap().iter().filter_map(Value::as_str)) {
            assert!(text.contains(&format!("\n### {rel}\n")), "{rel}");
        }
        let master = first_turn(&root, "B".into(), &STRUCTURES[0]).unwrap()["content"].as_str().unwrap().to_string();
        assert_eq!(master.matches("\n### components/button.md\n").count(), 1, "a core file listed by the structure is sent once");
        assert!(first_turn(&root, "B".into(), &Value::Null).is_ok(), "a page with no structure yet gets the core files");
        assert!(first_turn(&root, "B".into(), &json!({"files": ["../Cargo.toml"]})).is_err());
    }

    #[test]
    fn seed_picks_are_stable_and_distinct() {
        let a = seed_picks(42, 3, "modern", None, &[]).unwrap();
        assert_eq!(a, seed_picks(42, 3, "modern", None, &[]).unwrap());
        let ids: Vec<_> = a.iter().map(|p| p.archetype["id"].as_str().unwrap()).collect();
        assert_ne!(ids[0], ids[1]);
        assert_ne!(ids[1], ids[2]);
        assert!(seed_picks(7, 3, "theme:dark", None, &[]).unwrap().iter().all(|p| p.theme == "dark"));
        // Forced archetype: same archetype for every variant, hues still differ.
        let f = seed_picks(3, 3, "", Some("terminal"), &[]).unwrap();
        assert!(f.iter().all(|p| p.archetype["id"] == "terminal" && p.theme == "dark"));
        assert_ne!(f[0].hue, f[1].hue);
        assert!(f.iter().all(|p| { p.archetype["fonts"].as_array().unwrap().iter().any(|x| x == &json!(p.font)) }));
        assert!(seed_picks(1, 1, "", Some("nope"), &[]).is_err());
        assert_eq!(seed_picks(1, 1, "", Some("auto"), &[]).unwrap().len(), 1);
        let p = seed_picks(7, 4, "theme:dark, kind:game", None, &[]).unwrap();
        assert!(p.iter().all(|x| x.archetype["kind"] == "consumer"));
        assert_eq!(p.iter().map(|x| x.archetype["id"].to_string()).collect::<std::collections::HashSet<_>>().len(), 4);
        assert!(seed_picks(7, 4, "theme:dark", None, &[]).unwrap().iter().all(|x| x.archetype["kind"] != "consumer"));
        // The brief helper's looks come first, unknown ids skipped, then a distinct seeded one.
        let l = seed_picks(1, 3, "", None, &["glass".into(), "nope".into(), "soft-product".into()]).unwrap();
        let ids: Vec<_> = l.iter().map(|p| p.archetype["id"].as_str().unwrap()).collect();
        assert_eq!(&ids[..2], &["glass", "soft-product"]);
        assert!(ids[2] != "glass" && ids[2] != "soft-product");
    }

    #[test]
    fn archetypes_are_well_formed() {
        let all = archetypes();
        assert_eq!(all.as_array().unwrap().len(), 16, "seed stepping assumes 12 business + 4 consumer archetypes");
        assert_eq!(ARCHETYPES.iter().filter(|a| a["kind"] == "consumer").count(), 4);
        for a in ARCHETYPES.iter() {
            for k in ["id", "name", "feel", "structure", "neutrals", "mono", "density"] {
                assert!(a[k].is_string(), "{k} in {}", a["id"]);
            }
            for k in ["hues", "fonts", "do", "dont"] {
                assert!(a[k].as_array().is_some_and(|l| l.len() >= 3), "{k} in {}", a["id"]);
            }
            assert!(a["radius"].is_u64());
            assert!(matches!(a["theme"].as_str(), Some("dark" | "light" | "either")));
        }
    }

    #[test]
    fn structures_are_well_formed() {
        assert_eq!(STRUCTURES.len(), 16);
        let mut ids = std::collections::HashSet::new();
        for s in STRUCTURES.iter() {
            for k in ["id", "name", "regions", "use_when"] {
                assert!(s[k].as_str().is_some_and(|x| !x.is_empty()), "{k} in {}", s["id"].as_str().unwrap_or("?"));
            }
            assert!(ids.insert(s["id"].as_str().unwrap_or("").to_string()));
        }
        assert!(structures_text(true).contains("- board:"));
        assert!(!structures_text(true).contains("- play:"), "secondary structures stay out of the planner");
        assert!(structures_text(false).contains("- play:"));
    }

    #[test]
    fn structure_in_user_message() {
        let d = json!({"label": "A · x", "direction": "d", "archetype": ARCHETYPES[0].clone(), "structure": STRUCTURES[1].clone(), "identity": {}});
        assert!(user_message(&json!({"brief": "b"}), Some(&d), None).contains("STRUCTURE \"Board\""));
        let d = json!({"label": "A · x", "direction": "d", "archetype": ARCHETYPES[0].clone(), "structure": Value::Null, "identity": {}});
        assert!(!user_message(&json!({"brief": "b"}), Some(&d), None).contains("STRUCTURE \""));
    }

    #[test]
    fn user_words_and_colours_in_user_message() {
        let m = user_message(&json!({"brief": "b", "description": "a platform of apps", "colours": "bold, no grey"}), None, None);
        assert!(m.contains("USER'S OWN WORDS") && m.contains("a platform of apps") && m.contains("COLOURS") && m.contains("bold, no grey"));
        let m = user_message(&json!({"brief": "b", "description": " ", "colours": ""}), None, None);
        assert!(!m.contains("USER'S OWN WORDS") && !m.contains("COLOURS"));
    }

    #[test]
    fn parses_answers() {
        let (n, h, t) = parse_answer("<notes>{\"steps\":[]}</notes>\n<html_doc>\n```html\n<html></html>\n```\n</html_doc>").unwrap();
        assert!(!t);
        assert_eq!(n["steps"], json!([]));
        assert_eq!(h, "<html></html>");
        assert!(parse_answer("no tags").is_err());
        assert!(parse_answer("<notes>x</notes><html_doc><p/></html_doc>").unwrap().0.is_null());
        // Broken wrapper: falls back to the bare document.
        let (_, h, t) = parse_answer("<notes>{}</notes>\n<!DOCTYPE html><html><body/></html>\n</html_doc>").unwrap();
        assert_eq!((h.as_str(), t), ("<!DOCTYPE html><html><body/></html>", false));
        // Cut off by the output limit: kept, closed, flagged.
        let (_, h, t) = parse_answer("<notes>{}</notes>\n<html_doc>\n<!DOCTYPE html><html><body><svg><path d=\"M0 ").unwrap();
        assert_eq!((h.as_str(), t), ("<!DOCTYPE html><html><body><svg><path d=\"M0\n</body></html>", true));
    }

    #[test]
    fn mobile_target_prompt() {
        let m = user_message(&json!({"brief": "b", "target": "mobile"}), None, Some("<html>"));
        assert!(m.contains("MOBILE TARGET") && m.contains("desktop version"));
        assert!(!user_message(&json!({"brief": "b"}), None, None).contains("MOBILE TARGET"));
    }

    #[test]
    fn desktop_app_prompt() {
        let m = user_message(&json!({"brief": "A notepad", "description": "Une app de bureau Tauri pour Windows"}), None, None);
        assert!(m.contains("DESKTOP APP") && m.contains("caption buttons"));
        assert!(!user_message(&json!({"brief": "A support desk web app used at a desktop"}), None, None).contains("DESKTOP APP"));
    }

    #[test]
    fn user_message_states_field_conditions() {
        let m = user_message(&json!({"brief": "Checklists filled with gloves in the sun"}), None, None);
        assert!(m.contains("FIELD CONDITIONS") && m.contains("48px"));
        assert!(!user_message(&json!({"brief": "A CRM"}), None, None).contains("FIELD CONDITIONS"));
    }

    #[test]
    fn enforce_mono_replaces_non_monospace_families() {
        let mut d = json!({"identity": {"mono": "Inter"}});
        let arch = json!({"mono": "JetBrains Mono"});
        let mut logs = Vec::new();
        enforce_mono(&mut d, &arch, 0, |m| logs.push(m.to_string()));
        assert_eq!(d["identity"]["mono"], "JetBrains Mono");
        assert!(logs[0].contains("variant 1"));

        let mut d2 = json!({"identity": {"mono": "Fira Code"}});
        enforce_mono(&mut d2, &arch, 1, |m| logs.push(m.to_string()));
        assert_eq!(d2["identity"]["mono"], "Fira Code");
        assert_eq!(logs.len(), 1);
    }
}
