//! Scoped edits: new identity tokens and / or a layout-only instruction applied to one generation, stored as one new generation.
//! `live` rewrites colours, fonts and radius in place without the model; `run` asks the model for everything else.

use crate::config::Config;
use crate::db::{self, es};
use crate::jobs::Job;
use crate::llm;
use crate::models;
use crate::pipeline::finish;
use crate::pipeline::generate;
use crate::pipeline::refine;
use crate::pipeline::tokens;
use rango::prelude::*;
use serde_json::{Value, json};
use uuid::Uuid;

const PROMPT: &str = include_str!("../../prompts/edit.md");
pub const IDENTITY_KEYS: [&str; 17] = [
    "theme",
    "canvas",
    "surface",
    "border",
    "text",
    "muted",
    "accent",
    "accent2",
    "font",
    "mono",
    "radius",
    "density",
    "tone",
    "decoration",
    "glow",
    "scanlines",
    "caps",
];
const MAX_LAYOUT: usize = 500;

fn is_hex(v: &Value) -> bool {
    v.as_str().is_some_and(|s| s.len() == 7 && s.starts_with('#') && s[1..].chars().all(|c| c.is_ascii_hexdigit()))
}

pub fn validate(req: &Value) -> Result<(), String> {
    if let Some(identity) = req.get("identity") {
        if !identity.is_object() {
            return Err("identity must be an object".into());
        }
        for (key, value) in identity.as_object().unwrap() {
            if !IDENTITY_KEYS.contains(&key.as_str()) {
                return Err(format!("unknown identity key \"{key}\""));
            }
            match key.as_str() {
                "theme" => {
                    if !matches!(value.as_str(), Some("light") | Some("dark")) {
                        return Err("identity.theme: expected light or dark".into());
                    }
                }
                "canvas" | "surface" | "border" | "text" | "muted" | "accent" => {
                    if !is_hex(value) {
                        return Err(format!("identity.{key}: expected #rrggbb"));
                    }
                }
                // null removes the second accent.
                "accent2" if !value.is_null() && !is_hex(value) => {
                    return Err("identity.accent2: expected #rrggbb or null".into());
                }
                "tone" if !matches!(value.as_str(), Some("serious") | Some("neutral") | Some("playful")) => {
                    return Err("identity.tone: expected serious, neutral or playful".into());
                }
                "decoration" if !matches!(value.as_str(), Some("none") | Some("light") | Some("rich")) => {
                    return Err("identity.decoration: expected none, light or rich".into());
                }
                "font" | "mono" => {
                    if value.as_str().is_none_or(|s| s.trim().is_empty() || s.chars().count() > 60) {
                        return Err(format!("identity.{key}: expected a non-empty string of at most 60 chars"));
                    }
                }
                "radius" => {
                    if value.as_u64().is_none_or(|r| r > 32) {
                        return Err("identity.radius: expected an integer 0..=32".into());
                    }
                }
                // Effects are removed with null; glow is a level, the others are on with true.
                "glow" if !value.is_null() && value.as_u64().is_none_or(|l| !(1..=10).contains(&l)) => {
                    return Err("identity.glow: expected an integer 1..=10 or null".into());
                }
                "scanlines" | "caps" if !value.is_null() && *value != json!(true) => {
                    return Err(format!("identity.{key}: expected true or null"));
                }
                "density" if !matches!(value.as_str(), Some("compact") | Some("comfortable") | Some("spacious")) => {
                    return Err("identity.density: expected compact, comfortable or spacious".into());
                }
                _ => {}
            }
        }
    }
    if let Some(layout) = req.get("layout") {
        if !layout.is_string() {
            return Err("layout must be a string".into());
        }
        if layout.as_str().unwrap().trim().len() > MAX_LAYOUT {
            return Err(format!("layout: at most {MAX_LAYOUT} chars"));
        }
    }
    if req.get("mode").is_some_and(|m| !matches!(m.as_str(), Some("patch") | Some("full"))) {
        return Err("mode: expected patch or full".into());
    }
    Ok(())
}

pub(crate) fn plan(direction: &Value, req: &Value) -> Result<(Value, Value, Option<String>), String> {
    let parent_identity = direction.get("identity").cloned().unwrap_or(Value::Null);
    let mut direction = direction.clone();
    let mut identity = direction.get("identity").cloned().unwrap_or(Value::Null);
    if !identity.is_object() {
        identity = json!({});
    }
    if let Some(obj) = req.get("identity").and_then(Value::as_object) {
        for (k, v) in obj {
            if v.is_null() {
                identity.as_object_mut().map(|o| o.remove(k));
            } else {
                identity[k] = v.clone();
            }
        }
    }
    direction["identity"] = identity;

    let mut changes = json!({});
    let mut changed_keys: Vec<&str> = vec![];
    if let Some(obj) = req.get("identity").and_then(Value::as_object) {
        for key in IDENTITY_KEYS {
            if let Some(new) = obj.get(key) {
                let old = parent_identity.get(key).cloned().unwrap_or(Value::Null);
                if old != *new {
                    changes[key] = json!({"from": old, "to": new.clone()});
                    changed_keys.push(key);
                }
            }
        }
    }

    let layout = req["layout"].as_str().map(str::trim).filter(|s| !s.is_empty()).map(str::to_string);
    if changes.as_object().is_some_and(|o| o.is_empty()) && layout.is_none() {
        return Err("nothing to change".into());
    }

    let mut label = "Edit · ".to_string();
    if changed_keys.is_empty() {
        label.push_str("layout");
    } else {
        label.push_str(&changed_keys.join(", "));
        if layout.is_some() {
            label.push_str(" · layout");
        }
    }
    direction["label"] = json!(label);
    Ok((direction, changes, layout))
}

/// The generation an edit starts from.
struct Parent {
    html: String,
    brief: Value,
    notes: Value,
    skill_version: String,
    concept: Option<Uuid>,
    page: Option<String>,
    target: String,
    model: String,
}

fn load(cfg: &Config, id: Uuid) -> Result<Parent, String> {
    let g = cfg
        .block(get::<_, models::Generation>(&cfg.pool, &SqlValue::Uuid(id)))
        .map_err(es)?
        .ok_or_else(|| format!("no generation #{id}"))?;
    let html = g.html.map(|h| h.0).filter(|h| !h.is_empty()).ok_or("generation has no HTML")?;
    let notes = g.notes_json.map(|n| n.0).unwrap_or_default();
    if !notes["direction"].is_object() {
        return Err("generation has no direction (generated before archetypes); edit a newer one".into());
    }
    Ok(Parent {
        html,
        brief: g.brief_json.0,
        notes,
        skill_version: g.skill_version.0,
        concept: g.concept_id.map(|c| c.id()),
        page: g.page.map(|p| p.0),
        target: g.target.0,
        model: g.model.0,
    })
}

fn store(cfg: &Config, parent: &Parent, notes: &Value, html: &str, owner: Uuid, model: &str) -> Result<Uuid, String> {
    let html = &tokens::with_effects(html, &notes["direction"]["identity"]);
    let new = db::NewGeneration {
        request: &parent.brief,
        notes,
        html,
        skill_version: &parent.skill_version,
        project: None,
        concept: parent.concept,
        page: parent.page.as_deref(),
        target: &parent.target,
        owner,
        model,
    };
    cfg.block(db::insert_generation(cfg, new))
}

/// Live edit: colours, fonts and radius rewritten in the mockup's `:root` block, no LLM, stored as a new generation.
/// When the parent was its concept's identity, the identity moves to the new generation.
pub fn live(cfg: &Config, owner: Uuid, id: Uuid, request: Value) -> Result<Value, String> {
    validate(&request)?;
    let parent = load(cfg, id)?;
    let (direction, changes, layout) = plan(&parent.notes["direction"], &request)?;
    if layout.is_some() {
        return Err("a layout change needs Generate".into());
    }
    let mut to = serde_json::Map::new();
    for (key, change) in changes.as_object().into_iter().flatten() {
        // Effects are a style block added by `store`, whatever the mockup.
        if tokens::EFFECT_KEYS.contains(&key.as_str()) {
            continue;
        }
        // Adding or removing accent2 changes where it is used: that needs the model.
        if !tokens::LIVE_KEYS.contains(&key.as_str()) || change["from"].is_null() || change["to"].is_null() {
            return Err(format!("{key} cannot be applied live: use Generate"));
        }
        to.insert(key.clone(), change["to"].clone());
    }
    if !to.is_empty() && !tokens::live_editable(&parent.html, &parent.notes["direction"]["identity"]) {
        return Err("this mockup does not support live edits: use Generate".into());
    }
    let html = tokens::apply(&parent.html, &to)?;
    let notes = json!({
        "direction": direction,
        "seed": parent.notes["seed"],
        "edit": {"from": id, "changes": changes, "layout": null, "change": null, "live": true}
    });
    let new_id = store(cfg, &parent, &notes, &html, owner, &parent.model)?;
    cfg.block(db::move_identity(cfg, id, new_id))?;
    Ok(json!({"id": new_id, "from": id}))
}

pub fn run(cfg: &Config, job: &Job, id: Uuid, request: Value) -> Result<Value, String> {
    validate(&request)?;
    let parent = load(cfg, id)?;
    let (direction, changes, layout) = plan(&parent.notes["direction"], &request)?;
    job.log(&format!("edit #{id}: {}", direction["label"].as_str().unwrap_or("")));

    let mut system = PROMPT.to_string();
    if let Some(r) = finish::rules(&cfg.impeccable_dir) {
        system += &format!("\n\n# Finish rules (impeccable)\n\n{r}");
    }

    let mut user = generate::user_message(&parent.brief, Some(&direction), None);
    user.push_str("\n\nEDIT:");
    if changes.as_object().is_some_and(|o| !o.is_empty()) {
        user.push_str(&format!("\nTOKENS changed (from → to): {changes}"));
    }
    if let Some(layout) = &layout {
        user.push_str(&format!("\nLAYOUT (arrangement only): {layout}"));
    }

    let patch = request["mode"].as_str() != Some("full");
    let r = refine::rewrite(cfg, job, (1, 1), &system, &user, &parent.html, patch)?;

    let mut notes = json!({
        "direction": direction,
        "seed": parent.notes["seed"],
        "edit": {"from": id, "changes": changes, "layout": layout, "change": r.notes["change"], "mode": r.mode}
    });
    notes["usage"] = r.usage.json(&llm::Usage::default());
    if r.truncated {
        job.log("warning: HTML truncated (no </html>: the model hit its output limit); document closed as is");
        notes["truncated"] = json!(true);
    }
    match finish::detect(&cfg.impeccable_dir, &r.html, &direction["archetype"]) {
        Ok(found) => {
            job.log(&format!("impeccable detect: {} findings", found.as_array().map_or(0, Vec::len)));
            notes["detect"] = found;
        }
        Err(e) => job.log(&format!("warning: impeccable detect failed: {e}")),
    }

    let new_id = store(cfg, &parent, &notes, &r.html, job.owner, &r.model)?;
    Ok(json!({"generation_ids": [new_id], "from": id}))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_rejects_bad_identity_and_layout() {
        assert!(validate(&json!({"identity": {"accent": "red"}})).is_err());
        assert!(validate(&json!({"identity": {"foo": 1}})).is_err());
        assert!(validate(&json!({"identity": {"radius": 99}})).is_err());
        assert!(validate(&json!({"layout": "x".repeat(501)})).is_err());
        assert!(validate(&json!({"mode": "bogus"})).is_err());
        assert!(validate(&json!({"mode": 1})).is_err());
    }

    #[test]
    fn validate_accepts_good_request() {
        validate(&json!({
            "identity": {"accent": "#ff6600", "theme": "light", "radius": 8},
            "layout": "move the filters above the table"
        }))
        .unwrap();
        assert!(validate(&json!({"mode": "patch"})).is_ok());
        assert!(validate(&json!({"mode": "full"})).is_ok());
    }

    #[test]
    fn plan_records_only_changed_tokens_and_layout() {
        let parent = json!({
            "label": "A · Dense",
            "identity": {"theme": "dark", "accent": "#123456", "radius": 4}
        });
        let req = json!({
            "identity": {"accent": "#ff6600", "radius": 4},
            "layout": " move filters "
        });
        let (direction, changes, layout) = plan(&parent, &req).unwrap();
        assert_eq!(changes, json!({"accent": {"from": "#123456", "to": "#ff6600"}}));
        assert_eq!(layout, Some("move filters".to_string()));
        assert_eq!(direction["label"], json!("Edit · accent · layout"));
        assert_eq!(direction["identity"]["accent"], json!("#ff6600"));
        assert_eq!(direction["identity"]["theme"], json!("dark"));
        assert_eq!(direction["identity"]["radius"], json!(4));
    }

    #[test]
    fn plan_rejects_nothing_to_change() {
        let parent = json!({
            "label": "A · Dense",
            "identity": {"theme": "dark", "accent": "#123456", "radius": 4}
        });
        assert_eq!(plan(&parent, &json!({"identity": {"radius": 4}})).unwrap_err(), "nothing to change");
    }
}
