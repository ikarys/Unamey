//! Live token edits: rewrite the `:root` CSS variables of a mockup (colours, fonts, radius) without an LLM.
use serde_json::{Map, Value};

/// Identity keys that map 1:1 to a `:root` variable `--<key>` and can be changed without an LLM.
pub const LIVE_KEYS: [&str; 10] = ["canvas", "surface", "border", "text", "muted", "accent", "accent2", "font", "mono", "radius"];
const COLOUR_KEYS: [&str; 7] = ["canvas", "surface", "border", "text", "muted", "accent", "accent2"];

/// Byte range of the CONTENT (between the braces) of the first `:root` rule, e.g. `:root{...}` or `:root {\n ...}`.
fn root_block(html: &str) -> Option<(usize, usize)> {
    let root = html.find(":root")?;
    let mut i = root + 5;

    while i < html.len() {
        let ch = html[i..].chars().next().unwrap();
        if ch.is_whitespace() {
            i += ch.len_utf8();
        } else {
            break;
        }
    }

    if i < html.len() && html.as_bytes()[i] == b'{' {
        let start = i + 1;
        if let Some(close) = html[start..].find('}') {
            return Some((start, start + close));
        }
    }

    None
}

fn skip_ws(s: &str, mut i: usize) -> usize {
    while i < s.len() {
        let ch = s[i..].chars().next().unwrap();
        if ch.is_whitespace() {
            i += ch.len_utf8();
        } else {
            break;
        }
    }
    i
}

fn find_declaration(block: &str, key: &str) -> Option<(usize, usize)> {
    let needle = format!("--{key}");
    let mut search_from = 0;

    while let Some(rel) = block[search_from..].find(&needle) {
        let pos = search_from + rel;

        let before_ok = pos == 0 || {
            let before = block[..pos].chars().last().unwrap();
            !before.is_ascii_alphanumeric() && before != '-' && before != '_'
        };

        let after = skip_ws(block, pos + needle.len());

        if before_ok && after < block.len() && block.as_bytes()[after] == b':' {
            let value_start = after + 1;
            let value_end = block[value_start..].find(';').map(|i| value_start + i).unwrap_or(block.len());
            return Some((value_start, value_end));
        }

        search_from = pos + 1;
    }

    None
}

fn is_hex_colour(s: &str) -> bool {
    s.len() == 7 && s.starts_with('#') && s[1..].chars().all(|c| c.is_ascii_hexdigit())
}

/// A family name that is plausibly monospace: it contains "Mono" or "Code", or is one of the known Google Fonts monospace families without that word.
pub fn is_monospace(name: &str) -> bool {
    name.contains("Mono") || name.contains("Code") || matches!(name, "Inconsolata" | "Cousine" | "Courier Prime" | "Anonymous Pro" | "Sono")
}

/// The status tokens (`--success`, `--warning`, `--danger`) declared in the first `:root` of `html`, as a `:root` block for tokens.css; empty when none.
pub fn status_css(html: &str) -> String {
    let Some((start, end)) = root_block(html) else { return String::new() };
    let block = &html[start..end];
    let lines: Vec<String> = ["success", "warning", "danger"]
        .iter()
        .filter_map(|key| find_declaration(block, key).map(|(a, b)| format!("  --{key}: {};\n", block[a..b].trim())))
        .collect();
    if lines.is_empty() { String::new() } else { format!(":root {{\n{}}}\n", lines.concat()) }
}

/// Removes every `<link ... data-live-font="{kind}" ...>` tag.
fn remove_live_font_links(html: &str, kind: &str) -> String {
    let marker = format!("data-live-font=\"{kind}\"");
    let mut out = String::with_capacity(html.len());
    let mut rest = html;
    while let Some(start) = rest.find("<link") {
        let end = rest[start..].find('>').map_or(rest.len(), |e| start + e + 1);
        out.push_str(&rest[..start]);
        if !rest[start..end].contains(&marker) {
            out.push_str(&rest[start..end]);
        }
        rest = &rest[end..];
    }
    out.push_str(rest);
    out
}

fn insert_before_head(html: &str, link: &str) -> Result<String, String> {
    // ASCII lowercasing keeps byte offsets.
    let pos = html.to_ascii_lowercase().find("</head").ok_or("no </head>")?;
    Ok(format!("{}{link}{}", &html[..pos], &html[pos..]))
}

/// True when the mockup follows the tokens contract for this identity:
/// - a `:root` block exists;
/// - every LIVE_KEYS key present in `identity` with a non-null value has a `--<key>:` declaration in that block;
/// - no identity colour value (COLOUR_KEYS present in identity, compared case-insensitively) appears anywhere in the html OUTSIDE the root block, except `#ffffff` and `#000000` which are skipped (too common as plain white/black text).
pub fn live_editable(html: &str, identity: &Value) -> bool {
    let (start, end) = match root_block(html) {
        Some(range) => range,
        None => return false,
    };

    let block = &html[start..end];

    let Some(obj) = identity.as_object() else { return false };
    let declared = |key: &str| obj.get(key).is_none_or(Value::is_null) || find_declaration(block, key).is_some();
    if !LIVE_KEYS.iter().all(|k| declared(k)) {
        return false;
    }
    let outside = format!("{}{}", &html[..start], &html[end..]).to_ascii_lowercase();
    COLOUR_KEYS.iter().filter_map(|k| obj.get(*k).and_then(Value::as_str)).map(str::to_ascii_lowercase).all(|hex| {
        // ponytail: plain white / black are too common as text colours to count as a hardcoded token.
        hex == "#ffffff" || hex == "#000000" || !outside.contains(&hex)
    })
}

/// Points hardcoded token colours back at their variable: outside `:root`, `#rrggbb` equal to an identity colour becomes
/// `var(--key)` (e.g. Tailwind `accent-[#ff6a3a]` → `accent-[var(--accent)]`), so the mockup stays live-editable.
pub fn bind(html: &str, identity: &Value) -> String {
    let obj = match identity.as_object() {
        Some(obj) => obj,
        None => return html.to_string(),
    };

    let (start, end) = match root_block(html) {
        Some(range) => range,
        None => return html.to_string(),
    };

    let mut pairs: Vec<(String, &'static str)> = Vec::new();
    for key in COLOUR_KEYS {
        let Some(hex) = obj.get(key).and_then(Value::as_str).filter(|h| is_hex_colour(h)).map(str::to_ascii_lowercase) else { continue };
        if hex != "#ffffff" && hex != "#000000" && !pairs.iter().any(|(h, _)| *h == hex) {
            pairs.push((hex, key));
        }
    }

    if pairs.is_empty() {
        return html.to_string();
    }

    let replace_segment = |segment: &str| -> String {
        let bytes = segment.as_bytes();
        let mut out = String::with_capacity(segment.len() + 32);
        let mut last = 0;
        let mut i = 0;

        while i < bytes.len() {
            if bytes[i] == b'#' && i + 7 <= bytes.len() {
                let six_hex = (1..7).all(|offset| bytes[i + offset].is_ascii_hexdigit());

                if six_hex {
                    let next_ok = if i + 7 < bytes.len() { !bytes[i + 7].is_ascii_alphanumeric() } else { true };

                    let not_attr_value = !(i >= 2 && bytes[i - 2] == b'=' && (bytes[i - 1] == b'"' || bytes[i - 1] == b'\''));

                    if next_ok && not_attr_value {
                        let candidate = &segment[i..i + 7];

                        if let Some((_, key)) = pairs.iter().find(|(hex, _)| candidate.eq_ignore_ascii_case(hex.as_str())) {
                            out.push_str(&segment[last..i]);
                            out.push_str("var(--");
                            out.push_str(key);
                            out.push(')');

                            last = i + 7;
                            i += 7;
                            continue;
                        }
                    }
                }
            }

            i += 1;
        }

        out.push_str(&segment[last..]);
        out
    };

    let prefix = replace_segment(&html[..start]);
    let suffix = replace_segment(&html[end..]);

    let mut out = String::with_capacity(prefix.len() + (end - start) + suffix.len());
    out.push_str(&prefix);
    out.push_str(&html[start..end]);
    out.push_str(&suffix);

    out
}

/// The `:root` value written for a key: colours as given (`#rrggbb`), radius as `{n}px`, font as `'{name}', sans-serif`, mono as `'{name}', monospace`.
fn css_value(key: &str, v: &Value) -> Result<String, String> {
    match key {
        "radius" => {
            let n = v.as_i64().ok_or_else(|| format!("radius must be an integer, got {v}"))?;
            Ok(format!("{n}px"))
        }
        "font" | "mono" => {
            let name = v.as_str().ok_or_else(|| format!("{key} must be a string, got {v}"))?;

            if !name.chars().all(|c| c.is_ascii_alphanumeric() || c == ' ') {
                return Err(format!("{key} name may contain only ASCII letters, digits and spaces: {name:?}"));
            }

            if key == "mono" && !is_monospace(name) {
                return Err(format!("mono must be a monospace family (a name containing Mono or Code): {name:?}"));
            }

            if key == "font" { Ok(format!("'{name}', sans-serif")) } else { Ok(format!("'{name}', monospace")) }
        }
        _ => {
            if !LIVE_KEYS.contains(&key) {
                return Err(format!("unknown key: {key}"));
            }

            let s = v.as_str().ok_or_else(|| format!("colour must be a string, got {v}"))?;

            if !is_hex_colour(s) {
                return Err(format!("colour must be #rrggbb: {s:?}"));
            }

            Ok(s.to_string())
        }
    }
}

/// Rewrites `--<key>: <old>;` inside the root block for every entry of `changes` (keys from LIVE_KEYS only; values already validated: colours `#rrggbb`, radius integer, font/mono strings).
/// Errors: no root block, a key outside LIVE_KEYS, a variable missing from the block, a font name containing anything other than ASCII letters, digits and spaces.
/// When `font` or `mono` is in `changes`: first remove any existing `<link data-live-font="font" ...>` (resp. "mono") tag from the document, then insert before `</head>` (case-insensitive; error if absent):
/// `<link data-live-font="font" rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Name+With+Plus:wght@400;500;600;700&display=swap">`
/// (spaces in the name become `+`). The original Google Fonts link stays untouched.
pub fn apply(html: &str, changes: &Map<String, Value>) -> Result<String, String> {
    if changes.is_empty() {
        return Ok(html.to_string());
    }

    for key in changes.keys() {
        if !LIVE_KEYS.contains(&key.as_str()) {
            return Err(format!("unknown key: {key}"));
        }
    }

    let mut out = html.to_string();
    let (mut start, mut end) = root_block(&out).ok_or("no :root block")?;

    for (key, value) in changes {
        let val = css_value(key, value)?;
        let block = out[start..end].to_string();

        let (value_start, value_end) = find_declaration(&block, key).ok_or_else(|| format!("--{key} missing from :root"))?;

        let replacement = format!(" {val}");
        let new_block = format!("{}{}{}", &block[..value_start], replacement, &block[value_end..]);

        out.replace_range(start..end, &new_block);
        let (s, e) = root_block(&out).ok_or("no :root block")?;
        start = s;
        end = e;
    }

    for key in ["font", "mono"] {
        if let Some(name) = changes.get(key).and_then(Value::as_str) {
            let family = name.replace(' ', "+");
            let link = format!(
                r#"<link data-live-font="{key}" rel="stylesheet" href="https://fonts.googleapis.com/css2?family={family}:wght@400;500;600;700&display=swap">"#
            );
            out = remove_live_font_links(&out, key);
            out = insert_before_head(&out, &link)?;
        }
    }

    Ok(out)
}

/// A standalone `tokens.css` for a pack: `:root {\n  --canvas: #...;\n ...}\n` with one line per LIVE_KEYS key present (non-null) in `identity`, in LIVE_KEYS order, values via css_value; keys that fail css_value are skipped.
pub fn css(identity: &Value) -> String {
    let mut out = String::from(":root {\n");

    if let Some(obj) = identity.as_object() {
        for key in LIVE_KEYS {
            if let Some(v) = obj.get(key) {
                if v.is_null() {
                    continue;
                }

                if let Ok(val) = css_value(key, v) {
                    out.push_str(&format!("  --{key}: {val};\n"));
                }
            }
        }
    }

    out.push_str("}\n");
    out.push_str(&effects_css(identity));
    out
}

/// Effect keys checked in identity.
pub const EFFECT_KEYS: [&str; 3] = ["glow", "scanlines", "caps"];

// Keep in sync with EFFECT_CSS in web/src/screens/Generate.tsx (live preview).
// `glow` is a level 1..=10 (see `glow_css`); the others are on when `true`.
const EFFECT_RULES: [(&str, &str); 2] = [
    (
        "scanlines",
        r#"html::after{content:"";position:fixed;inset:0;pointer-events:none;z-index:2147483647;background:repeating-linear-gradient(to bottom,rgba(0,0,0,.16) 0 1px,transparent 1px 3px)}"#,
    ),
    (
        "caps",
        r#"button,[role="button"],.btn,input[type="submit"],th{text-transform:uppercase;letter-spacing:.08em;font-family:var(--mono,ui-monospace,monospace)}"#,
    ),
];

/// Build CSS for enabled effects.
pub fn effects_css(identity: &Value) -> String {
    let mut css = String::new();
    if let Some(level) = identity.get("glow").and_then(Value::as_u64).filter(|l| (1..=10).contains(l)) {
        css.push_str(&glow_css(level));
        css.push('\n');
    }
    for (key, rule) in EFFECT_RULES {
        if identity.get(key) == Some(&Value::Bool(true)) {
            css.push_str(rule);
            css.push('\n');
        }
    }
    css
}

fn remove_effects_styles(html: &str) -> String {
    const OPEN: &str = "<style data-studio-effects>";
    const CLOSE: &str = "</style>";
    let mut out = String::with_capacity(html.len());
    let mut rest = html;

    while let Some(start) = rest.find(OPEN) {
        out.push_str(&rest[..start]);
        let after_open = &rest[start + OPEN.len()..];

        match after_open.find(CLOSE) {
            Some(close_start) => {
                rest = &after_open[close_start + CLOSE.len()..];
            }
            None => {
                return out;
            }
        }
    }

    out.push_str(rest);
    out
}

/// Text glow of the given level (1..=10): a halo in each text's own colour. Same formula as `glowCss` in Generate.tsx.
fn glow_css(level: u64) -> String {
    format!("body{{text-shadow:0 0 {:.2}em color-mix(in srgb,currentColor {}%,transparent)}}", level as f64 * 0.08, 40 + 6 * level)
}

/// Insert or replace studio effects style block.
pub fn with_effects(html: &str, identity: &Value) -> String {
    let cleaned = remove_effects_styles(html);
    let css = effects_css(identity);

    if css.is_empty() {
        return cleaned;
    }

    let block = format!("<style data-studio-effects>{}</style>", css);

    match insert_before_head(&cleaned, &block) {
        Ok(result) => result,
        Err(_) => format!("{}{}", block, cleaned),
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn bind_rewrites_hardcoded_token_colours() {
        let html = r##"<style>:root{--accent:#ff6a3a;--text:#ffffff}.a{color:#FF6A3A}</style><i class="accent-[#ff6a3a]"></i><b style="x:#ff6a3a80"></b><svg fill="#ff6a3a"></svg><p class="text-[#ffffff]"></p>"##;
        let identity = json!({
            "accent": "#ff6a3a",
            "text": "#ffffff"
        });

        let out = bind(html, &identity);

        assert!(out.contains(":root{--accent:#ff6a3a;"));
        assert!(out.contains(".a{color:var(--accent)}"));
        assert!(out.contains("accent-[var(--accent)]"));
        assert!(out.contains("#ff6a3a80"));
        assert!(out.contains(r##"fill="#ff6a3a""##));
        assert!(out.contains("text-[#ffffff]"));

        assert_eq!(bind(html, &json!(null)), html);
    }

    use super::*;
    use serde_json::json;

    #[test]
    fn live_editable_true_on_compliant_doc() {
        let html = r#"<html><head><style>:root{--canvas:#0b0e0c;--accent:#3DDC84;--radius:4px;--font:'Archivo', sans-serif}</style></head><body><div style="color:var(--accent)">x</div></body></html>"#;
        let identity = json!({
            "canvas": "#0b0e0c",
            "accent": "#3ddc84",
            "radius": 4,
            "font": "Archivo"
        });

        assert!(live_editable(html, &identity));
    }

    #[test]
    fn live_editable_false_when_colour_appears_outside_root() {
        let html = r#"<html><head><style>:root{--canvas:#0b0e0c;--accent:#3DDC84;--radius:4px;--font:'Archivo', sans-serif}</style></head><body><div style="color:#3ddc84">x</div></body></html>"#;
        let identity = json!({
            "canvas": "#0b0e0c",
            "accent": "#3ddc84",
            "radius": 4,
            "font": "Archivo"
        });

        assert!(!live_editable(html, &identity));
    }

    #[test]
    fn live_editable_false_when_radius_missing_from_root() {
        let html = r#"<html><head><style>:root{--canvas:#0b0e0c;--accent:#3DDC84;--font:'Archivo', sans-serif}</style></head><body></body></html>"#;
        let identity = json!({
            "canvas": "#0b0e0c",
            "accent": "#3ddc84",
            "radius": 4,
            "font": "Archivo"
        });

        assert!(!live_editable(html, &identity));
    }

    #[test]
    fn live_editable_false_with_no_root() {
        let html = r#"<html><head><style>body{color:red}</style></head><body></body></html>"#;
        let identity = json!({"canvas": "#0b0e0c"});

        assert!(!live_editable(html, &identity));
    }

    #[test]
    fn apply_rewrites_accent_and_radius_without_touching_accent2() {
        let html = r#"<html><head><style>:root{--accent:#111111;--accent2:#222222;--radius:4px}</style></head><body>ok</body></html>"#;
        let changes = json!({
            "accent": "#333333",
            "radius": 12
        })
        .as_object()
        .unwrap()
        .clone();

        let out = apply(html, &changes).unwrap();

        assert_eq!(
            out,
            r#"<html><head><style>:root{--accent: #333333;--accent2:#222222;--radius: 12px}</style></head><body>ok</body></html>"#
        );
    }

    #[test]
    fn apply_font_adds_single_live_font_link_and_replaces_on_second_apply() {
        let html = r#"<html><head><style>:root{--font:'Old', sans-serif}</style></head><body></body></html>"#;

        let changes = json!({"font": "Space Grotesk"}).as_object().unwrap().clone();
        let out = apply(html, &changes).unwrap();

        assert!(out.contains("--font: 'Space Grotesk', sans-serif"));
        assert!(out.contains(r#"data-live-font="font""#));
        assert!(out.contains("family=Space+Grotesk"));
        assert_eq!(out.matches(r#"data-live-font="font""#).count(), 1);

        let changes2 = json!({"font": "Inter"}).as_object().unwrap().clone();
        let out2 = apply(&out, &changes2).unwrap();

        assert!(out2.contains("--font: 'Inter', sans-serif"));
        assert!(out2.contains("family=Inter"));
        assert!(!out2.contains("family=Space+Grotesk"));
        assert_eq!(out2.matches(r#"data-live-font="font""#).count(), 1);
    }

    #[test]
    fn apply_errors_on_invalid_font_name_and_missing_key() {
        let html = r#"<html><head><style>:root{--font:'Old', sans-serif}</style></head><body></body></html>"#;

        let bad_font = json!({"font": "X\"><script>"}).as_object().unwrap().clone();
        assert!(apply(html, &bad_font).is_err());

        let missing = json!({"radius": 4}).as_object().unwrap().clone();
        assert!(apply(html, &missing).is_err());
    }

    #[test]
    fn css_output_for_small_identity() {
        let identity = json!({
            "canvas": "#0b0e0c",
            "radius": 4,
            "font": "Archivo"
        });

        assert_eq!(css(&identity), ":root {\n  --canvas: #0b0e0c;\n  --font: 'Archivo', sans-serif;\n  --radius: 4px;\n}\n");
    }

    #[test]
    fn effects_css_empty_when_off() {
        assert_eq!(effects_css(&serde_json::json!({})), "");
        assert_eq!(effects_css(&serde_json::json!({"glow": false})), "");
        assert_eq!(effects_css(&serde_json::json!({"glow": 0, "scanlines": false})), "");
    }

    #[test]
    fn with_effects_inserts_one_block_before_head() {
        let html = "<html><head></head><body></body></html>";
        let out = with_effects(html, &serde_json::json!({"glow": 4, "caps": true}));

        assert_eq!(out.matches("<style data-studio-effects>").count(), 1);
        assert!(out.contains("body{text-shadow:0 0 0.32em color-mix(in srgb,currentColor 64%,transparent)}"));
        assert!(out.contains(r#"button,[role="button"],.btn,input[type="submit"],th{text-transform:uppercase;letter-spacing:.08em;font-family:var(--mono,ui-monospace,monospace)}"#));

        let style_pos = out.find("<style data-studio-effects>").unwrap();
        let head_pos = out.find("</head>").unwrap();
        assert!(style_pos < head_pos);
    }

    #[test]
    fn with_effects_replaces_existing_block() {
        let html = "<html><head></head><body></body></html>";
        let first = with_effects(html, &serde_json::json!({"glow": 4}));
        let second = with_effects(&first, &serde_json::json!({"caps": true}));

        assert_eq!(second.matches("<style data-studio-effects>").count(), 1);
        assert!(second.contains(r#"button,[role="button"],.btn,input[type="submit"],th{text-transform:uppercase;letter-spacing:.08em;font-family:var(--mono,ui-monospace,monospace)}"#));
        assert!(!second.contains("body{text-shadow:0 0 0.32em color-mix(in srgb,currentColor 64%,transparent)}"));
    }

    #[test]
    fn with_effects_no_effects_removes_and_no_head_prepends() {
        let existing = "<html><head><style data-studio-effects>old</style></head><body></body></html>";
        let out = with_effects(existing, &serde_json::json!({}));
        assert!(!out.contains("data-studio-effects"));

        let no_head = "<body></body>";
        let out2 = with_effects(no_head, &serde_json::json!({"glow": 4}));
        assert!(out2.starts_with("<style data-studio-effects>"));
    }

    #[test]
    fn status_css_reads_the_root() {
        let html = "<style>:root{--accent:#ff6a3a; --success: #1f9d55;--danger:#d64545}</style>";
        assert_eq!(status_css(html), ":root {\n  --success: #1f9d55;\n  --danger: #d64545;\n}\n");
        assert_eq!(status_css("<style>:root{--accent:#fff}</style>"), "");
        assert_eq!(status_css("no root"), "");
    }

    #[test]
    fn is_monospace_recognises_mono_families() {
        assert!(is_monospace("JetBrains Mono"));
        assert!(is_monospace("Fira Code"));
        assert!(is_monospace("Inconsolata"));
        assert!(!is_monospace("Barlow Semi Condensed"));
        assert!(!is_monospace("Inter"));
    }

    #[test]
    fn css_value_rejects_non_monospace_mono() {
        let err = css_value("mono", &json!("Barlow Semi Condensed")).unwrap_err();
        assert!(err.contains("monospace"));
        assert_eq!(css_value("mono", &json!("IBM Plex Mono")).unwrap(), "'IBM Plex Mono', monospace");
    }
}
