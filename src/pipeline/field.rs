//! Field-use rules: when the brief says the product is used outdoors, with gloves or in sunlight, text and
//! touch targets get a hard floor; the prompt states it and the finished HTML is linted for it.
use serde_json::{Value, json};

pub const MIN_TEXT_PX: f32 = 14.0;
pub const MIN_TARGET_PX: u32 = 48;

pub(crate) fn field_text(v: &Value) -> String {
    match v {
        Value::String(s) => s.to_lowercase(),
        Value::Array(a) => a.iter().filter_map(Value::as_str).map(|s| s.to_lowercase()).collect::<Vec<_>>().join(" "),
        _ => String::new(),
    }
}

/// True when the brief, description, users or style tags mention field use (outdoors, gloves, sunlight).
pub fn is_field(req: &Value) -> bool {
    let mut text = String::new();
    text.push_str(&field_text(&req["brief"]));
    text.push_str(&field_text(&req["description"]));
    text.push_str(&field_text(&req["users"]));
    text.push_str(&field_text(&req["style_tags"]));
    [
        "glove",
        "gant",
        "sunlight",
        "soleil",
        "outdoor",
        "extérieur",
        "exterieur",
        "plein air",
        "terrain",
        "chantier",
        "in the field",
        "field work",
        "fieldwork",
        "field tech",
        "rugged",
    ]
    .iter()
    .any(|w| text.contains(w))
}

/// The binding field-conditions block added to the generator prompt.
pub fn rule() -> String {
    format!(
        "FIELD CONDITIONS (binding: the brief says the product is used outdoors, with gloves or in sunlight): no text under {}px, captions and labels included; every tappable control at least {}px tall; strong contrast on every surface; no hover-only affordances.",
        MIN_TEXT_PX as u32, MIN_TARGET_PX
    )
}

fn format_px(px: f32) -> String {
    if (px - px.round()).abs() < 0.0001 { format!("{:.0}px", px) } else { format!("{:.1}px", px) }
}

fn parse_size(s: &str, require_close: bool) -> Option<f32> {
    let bytes = s.as_bytes();
    let mut i = 0;
    while i < bytes.len() && bytes[i].is_ascii_whitespace() {
        i += 1;
    }

    let start = i;
    let mut digits = 0;
    let mut dot = false;
    while i < bytes.len() {
        if bytes[i].is_ascii_digit() {
            digits += 1;
            i += 1;
        } else if bytes[i] == b'.' && !dot {
            dot = true;
            i += 1;
        } else {
            break;
        }
    }

    if digits == 0 {
        return None;
    }

    let num: f32 = s[start..i].parse().ok()?;
    let mut j = i;
    while j < bytes.len() && bytes[j].is_ascii_whitespace() {
        j += 1;
    }

    let unit = if bytes[j..].starts_with(b"px") {
        "px"
    } else if bytes[j..].starts_with(b"rem") {
        "rem"
    } else if bytes[j..].starts_with(b"em") {
        "em"
    } else {
        return None;
    };

    let after = j + unit.len();
    if require_close {
        if after >= bytes.len() || bytes[after] != b']' {
            return None;
        }
    } else if after < bytes.len() && bytes[after].is_ascii_alphanumeric() {
        return None;
    }

    Some(if unit == "px" { num } else { num * 16.0 })
}

/// Finds every font size below `floor_px` in `html` (no regex) and groups the findings by rendered px value.
pub fn small_text(html: &str, floor_px: f32) -> Vec<Value> {
    let mut sizes = Vec::new();

    let mut rest = html;
    while let Some(pos) = rest.find("font-size:") {
        let after = &rest[pos + "font-size:".len()..];
        if let Some(px) = parse_size(after, false) {
            sizes.push(px);
        }
        rest = after;
    }

    let mut rest = html;
    while let Some(pos) = rest.find("text-[") {
        let after = &rest[pos + "text-[".len()..];
        if let Some(px) = parse_size(after, true) {
            sizes.push(px);
        }
        rest = after;
    }

    let bytes = html.as_bytes();
    let mut i = 0;
    while i + 7 <= bytes.len() {
        if &bytes[i..i + 7] == b"text-xs" {
            let before_ok = i == 0 || matches!(bytes[i - 1], b' ' | b'"' | b'\'');
            let after_pos = i + 7;
            let after_ok = after_pos == bytes.len() || matches!(bytes[after_pos], b' ' | b'"' | b'\'');
            if before_ok && after_ok {
                sizes.push(12.0);
            }
        }
        i += 1;
    }

    let mut counts: Vec<(f32, usize)> = Vec::new();
    for px in sizes {
        if px < floor_px {
            if let Some(entry) = counts.iter_mut().find(|(p, _)| format_px(*p) == format_px(px)) {
                entry.1 += 1;
            } else {
                counts.push((px, 1));
            }
        }
    }

    counts.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(std::cmp::Ordering::Equal));
    counts
        .into_iter()
        .map(|(px, count)| {
            json!({
                "rule": "small-text",
                "severity": "high",
                "detail": format!("{} ({})", format_px(px), if count == 1 { "1 time".to_string() } else { format!("{count} times") }),
                "why": format!("field use: text under {}px is unreadable with gloves or in sunlight", format_px(floor_px)),
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn is_field_detects_field_briefs() {
        assert!(is_field(&json!({"brief": "Used with gloves in the field"})));
        assert!(is_field(&json!({"description": "en plein soleil"})));
        assert!(!is_field(&json!({"brief": "A CRM"})));
    }

    #[test]
    fn rule_mentions_the_floors() {
        let rule = rule();
        assert!(rule.contains("14px"));
        assert!(rule.contains("48px"));
    }

    #[test]
    fn small_text_groups_sizes_below_the_floor() {
        let html = r#"<p style="font-size: 11px"><span class="text-[10px] text-xs">x</span><b style="font-size:.75rem">y</b><i class="text-sm">z</i>"#;
        let out = small_text(html, 14.0);
        assert_eq!(out.len(), 3);
        assert_eq!(out[0]["rule"], "small-text");
        assert_eq!(out[0]["severity"], "high");
        assert_eq!(out[0]["detail"], "10px (1 time)");
        assert_eq!(out[1]["detail"], "11px (1 time)");
        assert_eq!(out[2]["detail"], "12px (2 times)");
        assert!(out[0]["why"].as_str().unwrap().contains("14px"));
    }

    #[test]
    fn small_text_ignores_sizes_at_or_above_the_floor() {
        assert!(small_text("<p class=\"text-base\">", 14.0).is_empty());
        assert!(small_text("<p style=\"font-size: 14px\">", 14.0).is_empty());
    }
}
