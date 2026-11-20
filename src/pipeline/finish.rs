//! Bridge to the external impeccable design skill: finish rules for the generator, and its anti-pattern detector.

use serde_json::{Value, json};
use std::path::Path;

/// Craft floor + Operate-mode rules, or None when impeccable is not installed.
pub fn rules(dir: &Path) -> Option<String> {
    let craft = std::fs::read_to_string(dir.join("reference/craft-floor.md")).ok()?;
    let operate = std::fs::read_to_string(dir.join("reference/operate.md")).ok()?;
    Some(format!("{craft}\n\n{operate}"))
}

/// One action's rule file (`reference/<name>.md`), or None when impeccable is not installed.
pub fn action(dir: &Path, name: &str) -> Option<String> {
    std::fs::read_to_string(dir.join("reference").join(format!("{name}.md"))).ok()
}

/// Runs `impeccable detect` on the HTML; findings as `[{rule, severity, detail, why}]`, minus the rules the archetype `tolerates` (its own traits, e.g. hard shadows for sticker pop).
pub fn detect(dir: &Path, html: &str, archetype: &Value) -> Result<Value, String> {
    let tolerated: Vec<&str> = archetype["tolerates"].as_array().map_or(vec![], |l| l.iter().filter_map(Value::as_str).collect());
    let nanos = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or(0);
    let temp = std::env::temp_dir().join(format!("studio-detect-{}-{nanos}.html", std::process::id()));
    std::fs::write(&temp, html).map_err(|e| e.to_string())?;
    // Exits non-zero when it finds issues: judge by stdout, not the status.
    let out = std::process::Command::new(dir.join("scripts/impeccable"))
        .args(["detect", "--json", "--no-config"])
        .arg(&temp)
        .current_dir(std::env::temp_dir())
        .output();
    let _ = std::fs::remove_file(&temp);
    let out = out.map_err(|e| e.to_string())?;
    let Ok(Value::Array(items)) = serde_json::from_slice(&out.stdout) else {
        return Err(String::from_utf8_lossy(&out.stderr).chars().take(300).collect());
    };
    Ok(items
        .iter()
        .filter(|i| !i["antipattern"].as_str().is_some_and(|r| tolerated.contains(&r)))
        .map(|i| json!({"rule": i["antipattern"], "severity": i["severity"], "detail": i["snippet"], "why": i["description"]}))
        .collect())
}

/// Every finish check on a generated page: impeccable `detect` (when installed; failures are logged) plus, for a field-use brief, the small-text lint. Logged on the job, returned as the `notes["detect"]` findings.
pub fn check(cfg: &crate::config::Config, job: &crate::jobs::Job, html: &str, archetype: &Value, request: &Value) -> Value {
    check_inner(&cfg.impeccable_dir, html, archetype, request, |msg| job.log(msg))
}

fn check_inner(impeccable_dir: &Path, html: &str, archetype: &Value, request: &Value, mut log: impl FnMut(&str)) -> Value {
    let mut findings = match detect(impeccable_dir, html, archetype) {
        Ok(found) => {
            log(&format!("impeccable detect: {} findings", found.as_array().map_or(0, Vec::len)));
            found
        }
        Err(e) => {
            log(&format!("warning: impeccable detect failed: {e}"));
            Value::Array(vec![])
        }
    };

    if super::field::is_field(request) {
        let small = super::field::small_text(html, super::field::MIN_TEXT_PX);
        if !small.is_empty() {
            log(&format!("field lint: {} text sizes under {}px", small.len(), super::field::MIN_TEXT_PX as u32));
        }
        if let Value::Array(items) = &mut findings {
            items.extend(small);
        }
    }

    findings
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missing_install_is_harmless() {
        assert_eq!(rules(Path::new("/nonexistent")), None);
        assert!(detect(Path::new("/nonexistent"), "<html></html>", &Value::Null).is_err());
    }

    #[test]
    fn check_appends_field_lint_for_field_brief() {
        let mut logs = Vec::new();
        let out = check_inner(
            Path::new("/nonexistent"),
            "<p style=\"font-size: 11px\">x</p>",
            &Value::Null,
            &json!({"brief": "used with gloves"}),
            |m| logs.push(m.to_string()),
        );
        let arr = out.as_array().unwrap();
        assert_eq!(arr.len(), 1);
        assert_eq!(arr[0]["rule"], "small-text");
        assert!(logs.iter().any(|l| l.starts_with("warning: impeccable detect failed")));
        assert!(logs.iter().any(|l| l == "field lint: 1 text sizes under 14px"));
    }

    #[test]
    fn check_does_not_append_field_lint_for_non_field() {
        let mut logs = Vec::new();
        let out =
            check_inner(Path::new("/nonexistent"), "<p style=\"font-size: 11px\">x</p>", &Value::Null, &json!({"brief": "A CRM"}), |m| {
                logs.push(m.to_string())
            });
        assert!(out.as_array().unwrap().is_empty());
        assert!(!logs.iter().any(|l| l.starts_with("field lint")));
    }
}
