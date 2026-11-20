//! Admin cache screen data: LLM prompt-cache metrics and recent LLM job calls.

use crate::config::Config;
use serde_json::{Value, json};
use std::collections::HashMap;

/// Sums the Prometheus samples of the cache metrics by name (labels ignored, except kv: pool 0 only).
fn parse_metrics(text: &str) -> Value {
    let mut sums: HashMap<&str, f64> = HashMap::new();
    for line in text.lines().filter(|l| !l.starts_with('#')) {
        let Some((head, value)) = line.rsplit_once(' ') else {
            continue;
        };
        let Ok(value) = value.parse::<f64>() else {
            continue;
        };
        let (name, labels) = head.split_once('{').unwrap_or((head, ""));
        if name.starts_with("ninfer_device_kv_") && !labels.contains("pool_id=\"0\"") {
            continue;
        }
        *sums.entry(name).or_default() += value;
    }
    let get = |name: &str| sums.get(name).map_or(Value::Null, |v| json!(v));
    json!({
        "prompt_tokens": get("ninfer_prompt_tokens_total"),
        "cached_tokens": get("ninfer_prompt_tokens_cached_total"),
        "checkpoint_selections": get("ninfer_checkpoint_selections_total"),
        "root_selections": get("ninfer_root_selections_total"),
        "kv_used": get("ninfer_device_kv_used_page_groups"),
        "kv_capacity": get("ninfer_device_kv_capacity_page_groups"),
        "host_used": get("ninfer_host_context_used_bytes"),
        "host_capacity": get("ninfer_host_context_capacity_bytes"),
    })
}

/// The server's cache metrics, or null when it exposes none (not ninfer, or down).
fn server(cfg: &Config) -> Value {
    let url = format!("{}/metrics", cfg.llm().url.trim_end_matches('/').trim_end_matches("/v1"));
    let agent: ureq::Agent = ureq::Agent::config_builder().timeout_global(Some(std::time::Duration::from_secs(3))).build().into();
    agent.get(&url).call().ok().and_then(|r| r.into_body().read_to_string().ok()).map_or(Value::Null, |b| parse_metrics(&b))
}

/// One `llm::usage` log line (`llm: 63s · prompt N tok (cached N) · out N tok · thinking ~N tok`) as numbers.
fn parse_call(line: &str) -> Option<Value> {
    let nums: Vec<u64> = line.strip_prefix("llm: ")?.split(|c: char| !c.is_ascii_digit()).filter_map(|s| s.parse().ok()).collect();
    let [seconds, prompt, cached, out, ..] = nums[..] else {
        return None;
    };
    Some(json!({"seconds": seconds, "prompt": prompt, "cached": cached, "out": out}))
}

/// Build the admin cache view from server metrics and recent jobs.
pub fn view(cfg: &Config) -> Result<Value, String> {
    let sql = "SELECT id, kind, status, created_at, log FROM jobs WHERE log LIKE '%llm: %' ORDER BY created_at DESC, id DESC LIMIT 30";
    let rows = cfg.block(cfg.pool.fetch_all(sql, vec![])).map_err(crate::db::es)?;
    let jobs: Vec<Value> = rows
        .iter()
        .map(|row| {
            json!({
                "id": row.get::<uuid::Uuid, _>(0),
                "kind": row.get::<String, _>(1),
                "status": row.get::<String, _>(2),
                "created_at": row.get::<chrono::DateTime<chrono::Utc>, _>(3).format("%Y-%m-%d %H:%M:%S").to_string(),
                "calls": row.get::<String, _>(4).lines().filter_map(parse_call).collect::<Vec<_>>(),
            })
        })
        .collect();

    Ok(json!({
        "server": server(cfg),
        "jobs": jobs,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_metrics_sample() {
        let text = "# HELP x\nninfer_prompt_tokens_total 100\nninfer_prompt_tokens_cached_total{a=\"x\"} 30\nninfer_prompt_tokens_cached_total{a=\"y\"} 10\nninfer_device_kv_used_page_groups{pool_id=\"0\"} 5\nninfer_device_kv_used_page_groups{pool_id=\"1\"} 99\n";
        let v = parse_metrics(text);
        assert_eq!(v["prompt_tokens"], json!(100.0));
        assert_eq!(v["cached_tokens"], json!(40.0));
        assert_eq!(v["kv_used"], json!(5.0));
        assert!(v["kv_capacity"].is_null());
    }

    #[test]
    fn parse_call_sample() {
        let line = "llm: 63s · prompt 26330 tok (cached 14967) · out 12068 tok · thinking ~3092 tok";
        let v = parse_call(line).unwrap();
        assert_eq!(v["seconds"], json!(63));
        assert_eq!(v["prompt"], json!(26330));
        assert_eq!(v["cached"], json!(14967));
        assert_eq!(v["out"], json!(12068));
        assert!(parse_call("read_skill_file {...}").is_none());
    }
}
