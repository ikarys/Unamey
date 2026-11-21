//! Brief helper: a quick description → the structured brief of the Generate form (one LLM call, one job).

use crate::config::Config;
use crate::db;
use crate::jobs::Job;
use crate::llm;
use crate::pipeline::{generate, universe};
use serde_json::{Value, json};
use std::time::Instant;

const PROMPT: &str = include_str!("../../prompts/brief.md");
const SHOTS: &str = include_str!("../../prompts/from_shots.md");
pub const MAX_TEXT: usize = 2000;
pub const MAX_IMAGES: usize = 5;
const MAX_IMAGE: usize = 3_000_000;
/// Looks generated from a user prompt: enough to compare, each one costs a full generation.
pub const START_VARIANTS: u64 = 3;

pub fn validate(req: &Value) -> Result<&str, String> {
    let text = req["text"].as_str().map(str::trim).filter(|t| !t.is_empty()).ok_or_else(|| "text is required".to_string())?;
    if text.chars().count() > MAX_TEXT {
        return Err(format!("text: at most {MAX_TEXT} chars"));
    }
    Ok(text)
}

/// The helper's request: `text` (optional when screenshots are given) and `images`, 1..=MAX_IMAGES data URLs.
pub fn validate_helper(req: &Value) -> Result<(String, Vec<String>), String> {
    let images = match &req["images"] {
        Value::Null => Vec::new(),
        Value::Array(items) => {
            let mut out = Vec::with_capacity(items.len());
            for item in items {
                match item.as_str() {
                    Some(s) => out.push(s.to_string()),
                    None => return Err("images: an array of data URLs".to_string()),
                }
            }
            out
        }
        _ => return Err("images: an array of data URLs".to_string()),
    };

    if images.len() > MAX_IMAGES {
        return Err(format!("images: at most {MAX_IMAGES}"));
    }

    for image in &images {
        if image.chars().count() > MAX_IMAGE {
            return Err("images: one is too large".to_string());
        }
        if !image.starts_with("data:image/png;base64,")
            && !image.starts_with("data:image/jpeg;base64,")
            && !image.starts_with("data:image/webp;base64,")
        {
            return Err("images: png, jpeg or webp data URLs only".to_string());
        }
        let payload = image.split_once(',').map(|(_, payload)| payload).unwrap_or("");
        if payload.is_empty() || !payload.chars().all(|c| c.is_ascii_alphanumeric() || c == '+' || c == '/' || c == '=') {
            return Err("images: png, jpeg or webp data URLs only".to_string());
        }
    }

    let text = req["text"].as_str().map(str::trim).unwrap_or_default().to_string();
    if text.chars().count() > MAX_TEXT {
        return Err(format!("text: at most {MAX_TEXT} chars"));
    }
    if text.is_empty() && images.is_empty() {
        return Err("text or images required".to_string());
    }
    Ok((text, images))
}

pub(crate) fn normalise(v: &Value) -> Value {
    json!({
        "name": str_field(v, "name").chars().take(60).collect::<String>(),
        "brief": str_field(v, "brief"),
        "users": str_field(v, "users"),
        "data_objects": list_field(v, "data_objects"),
        "style_tags": list_field(v, "style_tags"),
        "colours": str_field(v, "colours").chars().take(200).collect::<String>(),
        "density": density(v),
        "target": target(v),
        "pages": list_field(v, "pages"),
        "looks": list_field(v, "looks").into_iter().filter(|id| generate::is_archetype(id)).take(3).collect::<Vec<_>>(),
    })
}

fn str_field(v: &Value, key: &str) -> String {
    v.get(key).and_then(Value::as_str).map(str::trim).unwrap_or_default().to_string()
}

fn list_field(v: &Value, key: &str) -> Vec<String> {
    match v.get(key) {
        Some(Value::String(s)) => s.split(',').map(str::trim).filter(|s| !s.is_empty()).map(str::to_owned).collect(),
        Some(Value::Array(items)) => {
            items.iter().filter_map(Value::as_str).map(str::trim).filter(|s| !s.is_empty()).map(str::to_owned).collect()
        }
        _ => Vec::new(),
    }
}

/// `desktop` or `mobile`; anything else (including `auto`) is `desktop`.
fn target(v: &Value) -> &'static str {
    if v.get("target").and_then(Value::as_str).map(str::trim) == Some("mobile") { "mobile" } else { "desktop" }
}

fn density(v: &Value) -> String {
    v.get("density")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|d| matches!(*d, "compact" | "comfortable" | "spacious"))
        .unwrap_or("compact")
        .to_string()
}

pub fn run(cfg: &Config, job: &Job, request: Value) -> Result<Value, String> {
    let (mut text, images) = validate_helper(&request)?;
    job.progress(&json!({"phase": "planning", "variant": 0, "variants": 1}).to_string());
    if !images.is_empty() {
        job.log(&format!("reading {} screenshots", images.len()));
        let mut content = vec![json!({"type": "text", "text": SHOTS})];
        content.extend(images.iter().map(|u| json!({"type": "image_url", "image_url": {"url": u}})));
        let started_shots = Instant::now();
        let a = llm::chat(cfg, llm::Stage::Planner, "", &[json!({"role": "user", "content": content})], &Value::Null, 12_000)?;
        job.llm_call(&a.model, &a.completion, started_shots);
        text = if text.is_empty() {
            format!("Redesign of an existing app, read from screenshots:\n\n{}", a.completion.content.trim())
        } else {
            format!("{text}\n\nThe existing app, read from screenshots:\n\n{}", a.completion.content.trim())
        };
    }
    let started = Instant::now();
    let answer = llm::text(cfg, &PROMPT.replace("{looks}", &generate::looks_text()).replace("{text}", &text), 8_000)?;
    job.log(&format!("brief helper: {} s", started.elapsed().as_secs_f64()));
    let v = llm::parse_json(&answer, '{', '}')?;
    let mut out = normalise(&v);
    if out["brief"].as_str().unwrap_or("").is_empty() {
        return Err("the model returned no brief".to_string());
    }
    job.log(&format!(
        "brief: {} data objects, {} pages",
        out["data_objects"].as_array().map_or(0, |a| a.len()),
        out["pages"].as_array().map_or(0, |a| a.len())
    ));
    if let Some(t) = request["text"].as_str().map(str::trim).filter(|t| !t.is_empty()) {
        out["description"] = json!(t);
    }
    Ok(out)
}

/// The user flow: a free prompt → the framing agent's brief → looks in `concept`. Request fields, checked by the caller:
/// `look` (an archetype id, else the planner picks), `variants` (default 1 with a look, START_VARIANTS without),
/// `theme` (`light` / `dark`, else the look decides). A new project (`rename`) takes the product's name when the description names it; an existing concept
/// has no identity yet (the caller refuses a validated look: pages are added from the studio).
pub fn start(cfg: &Config, job: &Job, request: Value, project: uuid::Uuid, concept: uuid::Uuid, rename: bool) -> Result<Value, String> {
    let look = request["look"].as_str().filter(|l| !l.is_empty()).map(String::from);
    let variants = request["variants"].as_u64();
    let theme = request["theme"].as_str().filter(|t| matches!(*t, "light" | "dark")).map(String::from);
    let text = request["text"].as_str().unwrap_or("").to_string();
    // The user's choice on the home page wins; `auto` (or nothing) takes what the brief read from the description.
    let chosen = request["target"].as_str().filter(|t| matches!(*t, "desktop" | "mobile")).map(String::from);
    let request_universe = request.get("universe").and_then(universe::clean);
    let mut req = run(cfg, job, request)?;
    if rename
        && let Some(name) = req["name"].as_str().filter(|n| !n.is_empty())
        && named_by_user(&text, name)
        && let Err(e) = cfg.block(db::rename_project(cfg, project, name))
    {
        job.log(&format!("project not renamed: {e}"));
    }
    req["concept"] = json!(concept);
    // Kept as its own field, not folded into `colours`: the stored request is replayed by Add variant, where colours is capped at 200 chars.
    if let Some(u) = request_universe {
        req["universe"] = u;
    }
    if let Some(t) = chosen {
        req["target"] = json!(t);
    }
    job.log(&format!("target: {}", req["target"].as_str().unwrap_or("desktop")));
    req["variants"] = json!(variants.unwrap_or(if look.is_some() { 1 } else { START_VARIANTS }));
    if let Some(look) = look {
        req["archetype"] = json!(look);
    }
    if let Some(theme) = theme {
        req["style_tags"] = with_theme(&req["style_tags"], &theme);
    }
    generate::run(cfg, job, req)
}

/// The style tags with the user's theme replacing any theme the framing agent read in the prompt (seed_picks reads "dark" / "light").
fn with_theme(tags: &Value, theme: &str) -> Value {
    let mut out: Vec<Value> = tags.as_array().map_or(vec![], |a| {
        a.iter()
            .filter(|t| t.as_str().is_some_and(|s| !s.to_lowercase().contains("dark") && !s.to_lowercase().contains("light")))
            .cloned()
            .collect()
    });
    out.push(json!(format!("theme:{theme}")));
    json!(out)
}

pub(crate) fn named_by_user(description: &str, name: &str) -> bool {
    !name.is_empty() && description.to_lowercase().contains(&name.to_lowercase())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalise_model_answer() {
        let v = json!({
            "brief": " x ",
            "data_objects": "Order, Supplier",
            "pages": ["Home", ""],
            "density": "huge"
        });
        let out = normalise(&v);
        assert_eq!(out["brief"], "x");
        assert_eq!(out["name"], "");
        assert_eq!(out["users"], "");
        assert_eq!(out["data_objects"], json!(["Order", "Supplier"]));
        assert_eq!(out["pages"], json!(["Home"]));
        assert_eq!(out["style_tags"], json!([]));
        assert_eq!(out["colours"], "");
        assert_eq!(out["density"], "compact");
        assert_eq!(out["target"], "desktop");
        assert_eq!(out["looks"], json!([]));
        assert_eq!(normalise(&json!({"target": "mobile"}))["target"], "mobile");
        assert_eq!(normalise(&json!({"target": "auto"}))["target"], "desktop");
        assert_eq!(normalise(&json!({"looks": ["glass", "nope"]}))["looks"], json!(["glass"]));
        assert_eq!(normalise(&json!({"colours": " Bold red, no grey "}))["colours"], "Bold red, no grey");
    }

    #[test]
    fn theme_replaces_tags() {
        assert_eq!(with_theme(&json!(["Dark mode", "calm"]), "light"), json!(["calm", "theme:light"]));
        assert_eq!(with_theme(&Value::Null, "dark"), json!(["theme:dark"]));
    }

    #[test]
    fn named_by_user_is_case_insensitive() {
        assert!(named_by_user("Build Acme Ops, a platform", "acme ops"));
        assert!(!named_by_user("a platform of apps", "CloudOps Console"));
        assert!(!named_by_user("x", ""));
    }

    #[test]
    fn validate_text() {
        assert_eq!(validate(&json!({})), Err("text is required".to_string()));
        assert_eq!(validate(&json!({"text": "  "})), Err("text is required".to_string()));
        let long = "a".repeat(2001);
        assert_eq!(validate(&json!({"text": long})), Err("text: at most 2000 chars".to_string()));
        assert_eq!(validate(&json!({"text": " a bakery tool "})), Ok("a bakery tool"));
    }

    #[test]
    fn validate_helper_images() {
        assert_eq!(validate_helper(&json!({"text": "a tool"})), Ok(("a tool".to_string(), Vec::<String>::new())));
        assert_eq!(
            validate_helper(&json!({"images": ["data:image/png;base64,iVBORw0KGgo="]})),
            Ok((String::new(), vec!["data:image/png;base64,iVBORw0KGgo=".to_string()]))
        );
        assert_eq!(validate_helper(&json!({})), Err("text or images required".to_string()));
        assert_eq!(
            validate_helper(&json!({"images": ["data:text/html;base64,AAAA"]})),
            Err("images: png, jpeg or webp data URLs only".to_string())
        );
        assert_eq!(
            validate_helper(&json!({"images": ["data:image/png;base64,ab<c"]})),
            Err("images: png, jpeg or webp data URLs only".to_string())
        );
        let six = vec!["data:image/png;base64,iVBORw0KGgo=".to_string(); 6];
        assert_eq!(validate_helper(&json!({"images": six})), Err("images: at most 5".to_string()));
    }
}
