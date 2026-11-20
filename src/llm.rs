//! Thin wrapper over llm-providers: one blocking call, content only.

use crate::config::{Config, Llm};
use llm_providers_connector::{ChatRequest, Completion, Delta, Endpoint, ReasoningEffort, list_models, stream};
use serde_json::{Value, json};
use std::collections::HashMap;
use std::sync::atomic::AtomicBool;
use std::sync::{LazyLock, Mutex};
use std::time::{Duration, Instant};

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Stage {
    Planner,
    Generator,
}

pub struct Answer {
    pub completion: Completion,
    pub model: String,
    pub failed: Vec<String>,
}

fn endpoint(cfg: &Config) -> Endpoint {
    let l = cfg.llm();
    Endpoint { base_url: l.url, api_key: l.api_key }
}

/// The last probe (endpoint URL, when, result), shared by every caller: the UI polls status every few seconds per tab,
/// and a down endpoint takes seconds to time out.
static PROBE: std::sync::Mutex<Option<(String, Instant, bool)>> = std::sync::Mutex::new(None);
const PROBE_TTL: std::time::Duration = std::time::Duration::from_secs(15);

/// Whether the endpoint answers; probes at most once per `PROBE_TTL` per URL. Blocking: call from `spawn_blocking`.
pub fn is_up(cfg: &Config) -> bool {
    let e = endpoint(cfg);
    if let Some((url, at, up)) = PROBE.lock().unwrap_or_else(|p| p.into_inner()).as_ref()
        && *url == e.base_url
        && at.elapsed() < PROBE_TTL
    {
        return *up;
    }
    let up = list_models(&e).is_ok();
    *PROBE.lock().unwrap_or_else(|p| p.into_inner()) = Some((e.base_url, Instant::now(), up));
    up
}

static DOWN: LazyLock<Mutex<HashMap<String, Instant>>> = LazyLock::new(|| Mutex::new(HashMap::new()));
const COOLDOWN: Duration = Duration::from_secs(60);

fn down_key(t: &Llm) -> String {
    format!("{} {}", t.url, t.model)
}

fn is_down(key: &str) -> bool {
    DOWN.lock().unwrap_or_else(|e| e.into_inner()).get(key).is_some_and(|at| at.elapsed() < COOLDOWN)
}

fn mark_down(key: &str) {
    DOWN.lock().unwrap_or_else(|e| e.into_inner()).insert(key.to_string(), Instant::now());
}

fn clear_down(key: &str) {
    DOWN.lock().unwrap_or_else(|e| e.into_inner()).remove(key);
}

/// Route order: up targets first, then down targets, both in route order.
pub fn order(n: usize, down: impl Fn(usize) -> bool) -> Vec<usize> {
    let mut up = Vec::new();
    let mut downed = Vec::new();
    for i in 0..n {
        if down(i) {
            downed.push(i);
        } else {
            up.push(i);
        }
    }
    up.extend(downed);
    up
}

/// One completion; `tools` is a JSON array (or `Value::Null` for none).
pub fn chat(cfg: &Config, stage: Stage, system: &str, messages: &[Value], tools: &Value, max_tokens: u32) -> Result<Answer, String> {
    chat_streaming(cfg, stage, system, messages, tools, max_tokens, None, &mut |_| {})
}

/// Same as `chat`, forwarding stream deltas to `on` (for progress reporting). `effort` caps the model's
/// hidden reasoning: `Low` cuts a generation turn from ~90 s to ~5 s, `None` leaves the server default.
#[allow(clippy::too_many_arguments)]
pub fn chat_streaming(
    cfg: &Config,
    stage: Stage,
    system: &str,
    messages: &[Value],
    tools: &Value,
    max_tokens: u32,
    effort: Option<ReasoningEffort>,
    on: &mut dyn FnMut(Delta),
) -> Result<Answer, String> {
    let routes = cfg.routes();
    let targets = match stage {
        Stage::Planner => routes.planner,
        Stage::Generator => routes.generator,
    };
    if targets.is_empty() {
        return Err("no model configured for this stage".into());
    }

    let mut failed = Vec::new();
    for i in order(targets.len(), |i| is_down(&down_key(&targets[i]))) {
        let t = &targets[i];
        let key = down_key(t);
        let ep = Endpoint { base_url: t.url.clone(), api_key: t.api_key.clone() };
        let mut effort = effort;
        loop {
            let req = ChatRequest {
                model: &t.model,
                system_prompt: system,
                messages,
                tools,
                max_tokens,
                reasoning_effort: effort,
                extra: &t.extra,
            };
            match stream(&ep, &req, &AtomicBool::new(false), on) {
                Ok(c) if !(c.content.trim().is_empty() && c.tool_calls.is_empty()) => {
                    clear_down(&key);
                    return Ok(Answer { completion: c, model: t.model.clone(), failed });
                }
                Ok(c) => {
                    let err =
                        format!("empty model answer (finish_reason {:?}, {} completion tokens)", c.finish_reason, c.completion_tokens);
                    failed.push(format!("{}: {}", t.model, err));
                    if c.finish_reason != "length" {
                        mark_down(&key);
                    } else if let Some(lower) = retry_effort(effort) {
                        // The budget went into hidden reasoning: same model, less thinking. Not an outage, so not marked down.
                        effort = Some(lower);
                        continue;
                    }
                }
                Err(e) => {
                    mark_down(&key);
                    failed.push(format!("{}: {}", t.model, e));
                }
            }
            break;
        }
    }

    Err(failed.join("; "))
}

/// The effort for one retry after an answer cut by the token cap before any content, or `None` when
/// the call already asked for little reasoning (retrying would cut it again).
fn retry_effort(effort: Option<ReasoningEffort>) -> Option<ReasoningEffort> {
    match effort {
        Some(ReasoningEffort::None | ReasoningEffort::Minimal | ReasoningEffort::Low) => None,
        _ => Some(ReasoningEffort::Low),
    }
}

/// One line for the job log: where the time of a call went.
pub fn usage(c: &Completion, started: Instant) -> String {
    format!(
        "llm: {:.0}s · prompt {} tok (cached {}) · out {} tok · thinking ~{} tok",
        started.elapsed().as_secs_f64(),
        c.prompt_tokens,
        c.cached_tokens,
        c.completion_tokens,
        c.thinking.len() / 4
    )
}

/// Token and time totals of one or more calls, stored in a generation's `notes.usage`.
#[derive(Default)]
pub struct Usage {
    pub prompt: u64,
    pub cached: u64,
    pub completion: u64,
    pub seconds: u64,
    pub calls: u32,
}

impl Usage {
    pub fn add(&mut self, c: &Completion, started: Instant) {
        self.prompt += c.prompt_tokens;
        self.cached += c.cached_tokens;
        self.completion += c.completion_tokens;
        self.seconds += started.elapsed().as_secs();
        self.calls += 1;
    }

    /// `planner` is shared by sibling variants, so it is recorded next to the totals, not in them.
    pub fn json(&self, planner: &Usage) -> Value {
        json!({"prompt": self.prompt, "cached": self.cached, "completion": self.completion, "seconds": self.seconds, "calls": self.calls,
               "planner": {"prompt": planner.prompt, "cached": planner.cached, "completion": planner.completion, "seconds": planner.seconds}})
    }
}

pub fn text(cfg: &Config, prompt: &str, max_tokens: u32) -> Result<String, String> {
    let msgs = [json!({"role": "user", "content": prompt})];
    Ok(chat(cfg, Stage::Planner, "", &msgs, &Value::Null, max_tokens)?.completion.content)
}

/// Parses the outermost `open..close` span of `text`, tolerating fences or prose around it.
pub fn parse_json(text: &str, open: char, close: char) -> Result<Value, String> {
    let (a, b) = (text.find(open), text.rfind(close));
    match (a, b) {
        (Some(a), Some(b)) if a < b => serde_json::from_str(&text[a..=b]).map_err(|e| format!("bad JSON: {e}")),
        _ => Err(format!("no JSON {open}{close} in model answer")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn order_puts_down_targets_last() {
        assert_eq!(order(4, |i| i == 1), vec![0, 2, 3, 1]);
        assert_eq!(order(0, |_: usize| true), Vec::<usize>::new());
        assert_eq!(order(3, |i| i % 2 == 1), vec![0, 2, 1]);
    }

    #[test]
    fn retries_a_cut_answer_once_with_low_effort() {
        assert_eq!(retry_effort(None), Some(ReasoningEffort::Low));
        assert_eq!(retry_effort(Some(ReasoningEffort::High)), Some(ReasoningEffort::Low));
        assert_eq!(retry_effort(Some(ReasoningEffort::Low)), None);
        assert_eq!(retry_effort(Some(ReasoningEffort::None)), None);
    }

    #[test]
    fn parses_through_fences() {
        let v = parse_json("```json\n{\"a\": [1]}\n```", '{', '}').unwrap();
        assert_eq!(v["a"][0], 1);
        assert!(parse_json("nothing", '[', ']').is_err());
    }
}
