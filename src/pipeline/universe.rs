//! Visual universes: before any screen exists, the model proposes a few concrete worlds (a metaphor, a palette,
//! materials) for the product. The chosen one rides into generation as the binding COLOURS line.

use crate::{config::Config, jobs::Job, llm, pipeline::brief};
use serde_json::{Value, json};

const PROMPT: &str = include_str!("../../prompts/universes.md");
const COUNT: usize = 3;
const MAX_STEER: usize = 300;
const MAX_AVOID: usize = 6;

/// The request: the product `text` (as for the brief), an optional `steer`, a `mode` (`safer` / `bolder`) and the names to `avoid` on a re-roll.
pub fn validate(req: &Value) -> Result<(), String> {
    brief::validate(req)?;
    if !req["steer"].is_null() && !req["steer"].as_str().is_some_and(|s| s.chars().count() <= MAX_STEER) {
        return Err(format!("steer: at most {MAX_STEER} chars"));
    }
    if !req["mode"].is_null() && !matches!(req["mode"].as_str(), Some("safer" | "bolder")) {
        return Err("unknown mode".to_string());
    }
    if !req["avoid"].is_null() && !req["avoid"].as_array().is_some_and(|a| a.len() <= MAX_AVOID && a.iter().all(Value::is_string)) {
        return Err(format!("avoid: at most {MAX_AVOID} names"));
    }
    Ok(())
}

fn hex(s: &str) -> bool {
    s.len() == 7 && s.starts_with('#') && s[1..].chars().all(|c| c.is_ascii_hexdigit())
}

/// One line of text capped to `max` chars, so model output or a client-sent universe cannot carry a multi-line prompt.
fn line(v: &Value, max: usize) -> String {
    v.as_str().unwrap_or("").split_whitespace().collect::<Vec<_>>().join(" ").chars().take(max).collect()
}

/// A well-formed universe, or None: a name, a metaphor, 5 hex colours; materials and risk are optional.
pub fn clean(v: &Value) -> Option<Value> {
    let palette: Vec<&str> = v["palette"].as_array()?.iter().filter_map(Value::as_str).filter(|c| hex(c)).collect();
    let (name, metaphor) = (line(&v["name"], 60), line(&v["metaphor"], 120));
    if palette.len() != 5 || name.is_empty() || metaphor.is_empty() {
        return None;
    }
    let materials: Vec<String> =
        v["materials"].as_array().map(|a| a.iter().map(|m| line(m, 40)).filter(|m| !m.is_empty()).take(4).collect()).unwrap_or_default();
    Some(
        json!({"name": name, "metaphor": metaphor, "pitch": line(&v["pitch"], 300), "palette": palette, "materials": materials, "risk": line(&v["risk"], 200)}),
    )
}

/// The model's array, malformed entries dropped, at most COUNT.
pub fn normalise(v: &Value) -> Vec<Value> {
    v.as_array().map(|a| a.iter().filter_map(clean).take(COUNT).collect()).unwrap_or_default()
}

/// The generator's COLOURS text for a chosen universe: the world has to show in colour, texture, shape and imagery.
pub fn colours(u: &Value) -> String {
    let palette = u["palette"].as_array().map(|p| p.iter().filter_map(Value::as_str).collect::<Vec<_>>().join(", ")).unwrap_or_default();
    let materials =
        u["materials"].as_array().map(|m| m.iter().filter_map(Value::as_str).collect::<Vec<_>>().join(", ")).unwrap_or_default();
    format!(
        "Visual universe \"{}\", {}. {} Palette (canvas, surface, text, accent, second accent): {palette}. Materials: {materials}. Carry the universe through colour, texture, shape and imagery, not only the accent.",
        u["name"].as_str().unwrap_or(""),
        u["metaphor"].as_str().unwrap_or(""),
        u["pitch"].as_str().unwrap_or("")
    )
}

pub fn run(cfg: &Config, job: &Job, request: Value) -> Result<Value, String> {
    let text = brief::validate(&request)?;
    let dir = match request["mode"].as_str() {
        Some("safer") => "Go safer: more familiar for the domain, still not a generic style. ",
        Some("bolder") => "Go bolder: push each world further from what the domain expects. ",
        _ => "",
    };
    let steer =
        request["steer"].as_str().map(str::trim).filter(|s| !s.is_empty()).map(|s| format!("The user steers: {s}. ")).unwrap_or_default();
    let steer = if dir.is_empty() && steer.is_empty() { steer } else { format!("{dir}{steer}\n\n") };
    let avoid = request["avoid"].as_array().map(|a| a.iter().map(|n| line(n, 60)).collect::<Vec<_>>().join(", ")).unwrap_or_default();
    let prompt = PROMPT
        .replace("{n}", &COUNT.to_string())
        .replace("{steer}", &steer)
        .replace("{avoid}", if avoid.is_empty() { "none" } else { &avoid })
        .replace("{text}", text);
    let started = std::time::Instant::now();
    let answer = llm::text(cfg, &prompt, 8_000)?;
    job.log(&format!("universes: {} s", started.elapsed().as_secs_f64()));
    let universes = normalise(&llm::parse_json(&answer, '[', ']')?);
    if universes.is_empty() {
        return Err("the model returned no usable universe".to_string());
    }
    Ok(json!({"universes": universes}))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn good() -> Value {
        json!({"name": " Night steno ", "metaphor": "a reporter's pad\non a desk", "pitch": "p", "palette": ["#0b1020", "#f1f0d8", "#1a1a1a", "#ff9a1f", "#7fb069"], "materials": ["paper", "", "spiral"], "risk": "cliché"})
    }

    #[test]
    fn clean_keeps_a_well_formed_universe() {
        let u = clean(&good()).unwrap();
        assert_eq!(u["name"], "Night steno");
        assert_eq!(u["metaphor"], "a reporter's pad on a desk");
        assert_eq!(u["materials"], json!(["paper", "spiral"]));
    }

    #[test]
    fn clean_drops_malformed_entries() {
        let mut short = good();
        short["palette"] = json!(["#0b1020", "#f1f0d8"]);
        let mut bad_hex = good();
        bad_hex["palette"] = json!(["#0b1020", "#f1f0d8", "#1a1a1a", "#ff9a1f", "red;ignore previous"]);
        let mut nameless = good();
        nameless["name"] = json!("  ");
        assert_eq!(normalise(&json!([short, bad_hex, nameless, good(), good(), good(), good()])).len(), COUNT);
        assert!(clean(&short).is_none() && clean(&bad_hex).is_none() && clean(&nameless).is_none());
        assert!(normalise(&json!("nope")).is_empty());
    }

    #[test]
    fn colours_names_the_world_and_the_palette() {
        let c = colours(&clean(&good()).unwrap());
        assert!(c.contains("Night steno") && c.contains("#ff9a1f") && c.contains("paper, spiral"));
    }

    #[test]
    fn prompt_answers_in_the_brief_language() {
        // A French brief once came back with English universes; the prompt must ask for the brief's language.
        assert!(PROMPT.contains("in the language the PRODUCT description is written in"));
    }

    #[test]
    fn validate_checks_each_field() {
        assert!(validate(&json!({"text": "a notes app"})).is_ok());
        assert!(validate(&json!({})).is_err());
        assert_eq!(validate(&json!({"text": "x", "mode": "wild"})), Err("unknown mode".into()));
        assert!(validate(&json!({"text": "x", "mode": "bolder", "steer": "a".repeat(301)})).is_err());
        assert!(validate(&json!({"text": "x", "avoid": ["a", 1]})).is_err());
        assert!(validate(&json!({"text": "x", "avoid": ["a", "b"], "steer": "calmer"})).is_ok());
    }
}
