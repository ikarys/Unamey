//! Refine: N versions of one generation along one impeccable action (bolder, quieter, ...), stored as one batch.

use crate::config::Config;
use crate::db::{self, es};
use crate::jobs::Job;
use crate::llm;
use crate::models;
use crate::pipeline::finish;
use crate::pipeline::generate;
use crate::pipeline::patch;
use crate::pipeline::tokens;
use llm_providers_connector::{Delta, ReasoningEffort};
use rango::prelude::*;
use serde_json::{Value, json};
use std::time::Instant;
use uuid::Uuid;

pub const ACTIONS: [&str; 6] = ["bolder", "quieter", "distill", "typeset", "colorize", "layout"];
const MAX_VERSIONS: u64 = 3;
const PROMPT: &str = include_str!("../../prompts/refine.md");
const PATCH: &str = include_str!("../../prompts/patch.md");
const PLAN: &str = r#"You refine an existing screen of an APPLICATION along one impeccable action: "{action}". Its rules:

{rules}

Propose exactly {n} different MOVES: each is one concrete interpretation of the action for THIS page, naming the region(s) it changes and what changes (1-3 sentences). Moves must differ in what they touch or how far they go; each must respect the archetype and keep the visual identity (theme, colours, fonts, radius, density) unchanged.

DIRECTION (fixed): {direction}

CURRENT DOCUMENT:
{html}

Output ONLY a JSON array, no fence:
[{"label": "2-4 words", "move": "1-3 sentences"}]
"#;

/// `request` = `{"action": "bolder", "count": 1}` (count defaults to 1, at most 3). Returns `{"generation_ids": [...], "from": id, "action": ...}`.
pub fn run(cfg: &Config, job: &Job, id: Uuid, request: Value) -> Result<Value, String> {
    let action = request["action"].as_str().unwrap_or("");
    if !ACTIONS.contains(&action) {
        return Err(format!("action must be one of {}", ACTIONS.join(", ")));
    }
    let n = request["count"].as_u64().unwrap_or(1).clamp(1, MAX_VERSIONS) as usize;
    let patch = match request["mode"].as_str() {
        Some("full") => false,
        Some("patch") | None => true,
        Some(_) => return Err("mode: expected patch or full".into()),
    };

    let parent =
        cfg.block(cfg.pool.get::<models::Generation>(&SqlValue::Uuid(id))).map_err(es)?.ok_or_else(|| format!("no generation #{id}"))?;
    let html = parent.html.map(|h| h.0).filter(|h| !h.is_empty()).ok_or("generation has no HTML")?;
    let brief = parent.brief_json.0;
    let parent_notes = parent.notes_json.map(|n| n.0).unwrap_or_default();
    let (skill_version, concept_id, page, target) =
        (parent.skill_version.0, parent.concept_id.map(|c| c.id()), parent.page.map(|p| p.0), parent.target.0);
    let direction = parent_notes["direction"].clone();
    if !direction.is_object() {
        return Err("generation has no direction (generated before archetypes); refine a newer one".into());
    }

    let rules =
        finish::action(&cfg.impeccable_dir, action).ok_or_else(|| format!("impeccable not installed: reference/{action}.md missing"))?;

    job.progress(&json!({"phase": "planning", "variant": 0, "variants": n}).to_string());
    let prompt = PLAN
        .replace("{n}", &n.to_string())
        .replace("{action}", action)
        .replace("{rules}", &rules)
        .replace("{direction}", &direction.to_string())
        .replace("{html}", &html);
    let started = Instant::now();
    let planned = llm::chat(cfg, llm::Stage::Planner, "", &[json!({"role": "user", "content": prompt})], &Value::Null, 8_000)?;
    for f in &planned.failed {
        job.log(&format!("llm fallback: {f}"));
    }
    job.llm_call(&planned.model, &planned.completion, started);
    let mut planner = llm::Usage::default();
    planner.add(&planned.completion, started);
    let moves = llm::parse_json(&planned.completion.content, '[', ']')?.as_array().cloned().unwrap_or_default();
    if moves.len() < n {
        return Err(format!("planner returned {} moves, expected {n}", moves.len()));
    }
    for (k, m) in moves.iter().enumerate().take(n) {
        job.log(&format!("version {}: {}", k + 1, m["label"].as_str().unwrap_or("")));
    }

    let mut ids = vec![];
    for (k, m) in moves.iter().enumerate().take(n) {
        let label = m["label"].as_str().unwrap_or("");
        let mv = m["move"].as_str().unwrap_or("");
        let mut system = PROMPT.replace("{action}", action).replace("{rules}", &rules);
        if let Some(r) = finish::rules(&cfg.impeccable_dir) {
            system += &format!("\n\n# Finish rules (impeccable)\n\n{r}");
        }
        let user = format!(
            "{base}\n\nMOVE {k} of {n} (\"{label}\"): {mv}",
            base = generate::user_message(&brief, Some(&direction), None),
            k = k + 1,
            n = n,
            label = label,
            mv = mv
        );
        let r = rewrite(cfg, job, (k + 1, n), &system, &user, &html, patch)?;
        let mut notes = version_notes(&parent_notes, action, id, k, m, &r.notes);
        notes["refine"]["mode"] = json!(r.mode);
        notes["usage"] = r.usage.json(&planner);
        if r.truncated {
            job.log("warning: HTML truncated (no </html>: the model hit its output limit); document closed as is");
            notes["truncated"] = json!(true);
        }
        notes["detect"] = finish::check(cfg, job, &r.html, &direction["archetype"], &brief);
        if n > 1 {
            notes["batch"] = json!(job.id);
        }
        let html = tokens::with_effects(&r.html, &notes["direction"]["identity"]);
        let new = db::NewGeneration {
            request: &brief,
            notes: &notes,
            html: &html,
            skill_version: &skill_version,
            project: None,
            concept: concept_id,
            page: page.as_deref(),
            target: &target,
            owner: job.owner,
            model: &r.model,
        };
        ids.push(cfg.block(db::insert_generation(cfg, new))?);
    }
    Ok(json!({"generation_ids": ids, "from": id, "action": action}))
}

pub(crate) struct Rewrite {
    pub notes: Value,
    pub html: String,
    pub truncated: bool,
    pub usage: llm::Usage,
    pub model: String,
    pub mode: &'static str,
}

/// One rewrite. In patch mode the model answers with edits (or a whole document, mode "whole"); when they cannot be
/// applied, a full rewrite follows (mode "patch-fallback", usage of both calls).
pub(crate) fn rewrite(
    cfg: &Config,
    job: &Job,
    slot: generate::Slot,
    system: &str,
    user: &str,
    doc: &str,
    patch: bool,
) -> Result<Rewrite, String> {
    let mut usage = llm::Usage::default();

    if patch {
        let system2 = format!("{system}\n\n{PATCH}");
        let user2 = format!("{user}\n\nCURRENT DOCUMENT (apply only this change; answer with edits):\n{doc}");
        let (answer, model) = call(cfg, job, slot, &system2, &user2, &mut usage)?;

        match read_patch(&answer, doc) {
            Patched::Whole(notes, html, truncated) => return Ok(Rewrite { notes, html, truncated, usage, model, mode: "whole" }),
            Patched::Edits(n, notes, html) => {
                job.log(&format!("patch: {n} edits applied"));
                return Ok(Rewrite { notes, html, truncated: false, usage, model, mode: "patch" });
            }
            Patched::Nothing(change) => return Err(format!("nothing to change: {change}")),
            Patched::Failed(e) => job.log(&format!("patch failed ({e}), falling back to a full rewrite")),
        }
    }

    let user2 = format!(
        "{user}\n\nCURRENT DOCUMENT (rewrite it as a whole, applying only this change; everything else stays byte-for-byte the same where possible):\n{doc}"
    );
    let (answer, model) = call(cfg, job, slot, system, &user2, &mut usage)?;
    let (notes, html, truncated) = generate::parse_answer(&answer).inspect_err(|_| log_raw_answer(job, &answer))?;
    let mode = if patch { "patch-fallback" } else { "full" };

    Ok(Rewrite { notes, html, truncated, usage, model, mode })
}

#[derive(Debug)]
enum Patched {
    /// The model chose to answer with a whole document (allowed when the change touches most of it).
    Whole(Value, String, bool),
    /// Edits applied: count, notes, new document.
    Edits(usize, Value, String),
    /// Notes but no edit: the document already does what was asked; a second call would only copy it.
    Nothing(String),
    /// Unusable answer: the caller falls back to a full rewrite.
    Failed(String),
}

fn read_patch(answer: &str, doc: &str) -> Patched {
    if !answer.contains("<edit>") {
        if let Ok((notes, html, truncated)) = generate::parse_answer(answer) {
            return Patched::Whole(notes, html, truncated);
        }
        return match generate::parse_notes(answer)["change"].as_str() {
            Some(change) => Patched::Nothing(change.to_string()),
            None => Patched::Failed("no edits".into()),
        };
    }
    match patch::parse(answer).and_then(|edits| patch::apply(doc, &edits).map(|html| (edits.len(), html))) {
        Ok((n, html)) => Patched::Edits(n, generate::parse_notes(answer), html),
        Err(e) => Patched::Failed(e),
    }
}

fn call(
    cfg: &Config,
    job: &Job,
    slot: generate::Slot,
    system: &str,
    user: &str,
    usage: &mut llm::Usage,
) -> Result<(String, String), String> {
    let (mut text_len, mut last) = (0usize, Instant::now());
    let started = Instant::now();
    let a = llm::chat_streaming(
        cfg,
        llm::Stage::Generator,
        system,
        &[json!({"role": "user", "content": user})],
        &Value::Null,
        96_000,
        Some(ReasoningEffort::Low),
        &mut |d| {
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
                generate::report(job, slot, phase, 0, text_len / 1024);
            }
        },
    )?;
    for f in &a.failed {
        job.log(&format!("llm fallback: {f}"));
    }
    let model = a.model;
    let c = a.completion;
    job.llm_call(&model, &c, started);
    usage.add(&c, started);
    Ok((c.content, model))
}

fn log_raw_answer(job: &Job, answer: &str) {
    let len = answer.chars().count();
    job.log(&format!("raw answer ({len} chars) head: {}", answer.chars().take(500).collect::<String>()));
    job.log(&format!("raw answer tail: {}", answer.chars().skip(len.saturating_sub(500)).collect::<String>()));
}

/// Notes of one version: the parent's direction (relabelled), seed and the refine record; `detect`, `batch` and `truncated` are added by `run`.
fn version_notes(parent: &Value, action: &str, from: Uuid, k: usize, mv: &Value, answer: &Value) -> Value {
    let mut direction = parent["direction"].clone();
    let mut cap = action.to_string();
    if let Some(first) = cap.get_mut(0..1) {
        first.make_ascii_uppercase();
    }
    direction["label"] = json!(format!("{cap} {} · {}", k + 1, mv["label"].as_str().unwrap_or("")));
    json!({
        "direction": direction,
        "seed": parent["seed"],
        "refine": {"from": from, "action": action, "label": mv["label"], "move": mv["move"], "change": answer["change"]}
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn read_patch_sorts_the_answers() {
        let doc = "<html><body><p>a</p></body></html>";
        let notes = r#"<notes>{"change": "c"}</notes>"#;
        let edit = format!("{notes}<edit>\n<find>\n<p>a</p>\n</find>\n<replace>\n<p>b</p>\n</replace>\n</edit>");
        assert!(matches!(read_patch(&edit, doc), Patched::Edits(1, _, ref h) if h.contains("<p>b</p>")));
        let whole = format!("{notes}<html_doc><html><body>x</body></html></html_doc>");
        assert!(matches!(read_patch(&whole, doc), Patched::Whole(..)));
        assert!(matches!(read_patch(notes, doc), Patched::Nothing(ref c) if c == "c"));
        assert!(matches!(read_patch("nothing useful", doc), Patched::Failed(_)));
        let missing = edit.replace("<p>a</p>\n</find>", "<p>z</p>\n</find>");
        assert!(matches!(read_patch(&missing, doc), Patched::Failed(_)));
    }

    #[test]
    fn version_notes_relabels_and_records() {
        let parent = json!({
            "direction": {"label": "Original", "identity": {"theme": "dark", "accent": "#123456"}},
            "seed": 42
        });
        let answer = json!({"change": "made KPI row heavier"});
        let mv = json!({"label": "Heavier KPI row", "move": "raise KPI weight"});
        let notes = version_notes(&parent, "bolder", Uuid::from_u128(7), 0, &mv, &answer);
        assert_eq!(notes["direction"]["label"], json!("Bolder 1 · Heavier KPI row"));
        assert_eq!(notes["direction"]["identity"], parent["direction"]["identity"]);
        assert_eq!(notes["seed"], json!(42));
        assert_eq!(notes["refine"]["from"], json!(Uuid::from_u128(7)));
        assert_eq!(notes["refine"]["action"], json!("bolder"));
        assert_eq!(notes["refine"]["move"], json!("raise KPI weight"));
        assert_eq!(notes["refine"]["change"], json!("made KPI row heavier"));
        assert!(notes.get("truncated").is_none());
    }
}
