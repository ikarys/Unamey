//! A small read-only MCP server on /api/mcp, for coding agents holding a personal API token.
use std::sync::Arc;

use serde_json::{Value, json};

use crate::authz::Actor;
use crate::config::Config;
use crate::http;

const INSTRUCTIONS: &str = "Read-only access to your Unamey mockups: list projects and screens, read a screen's HTML, \
     read the UI pack (SKILL.md, tokens.css, one HTML page per screen) a coding agent builds from.";

/// JSON-RPC 2.0 entry point for the MCP streamable HTTP transport (JSON replies, no SSE, no session).
/// Returns `None` for notifications so the caller can answer 202. Every tool goes through `http::read` or
/// `http::owned_pack`, so the routes' ownership checks apply and nothing here writes.
pub async fn handle(cfg: &Arc<Config>, actor: &Actor, body: &[u8]) -> Option<Value> {
    let request = match serde_json::from_slice::<Value>(body) {
        Ok(v) => v,
        Err(_) => return Some(err(&Value::Null, -32700, "parse error")),
    };

    let obj = match request.as_object() {
        Some(o) => o,
        None => return Some(err(&Value::Null, -32600, "invalid request")),
    };

    let id = obj.get("id")?;
    let method = match obj.get("method").and_then(Value::as_str) {
        Some(m) => m,
        None => return Some(err(id, -32600, "invalid request")),
    };
    let params = obj.get("params").unwrap_or(&Value::Null);

    match method {
        "initialize" => {
            let result = json!({
                "protocolVersion": protocol(params.get("protocolVersion").and_then(Value::as_str)),
                "capabilities": {
                    "tools": {}
                },
                "serverInfo": {
                    "name": "unamey",
                    "version": env!("CARGO_PKG_VERSION")
                },
                "instructions": INSTRUCTIONS
            });
            Some(ok(id, result))
        }
        "ping" => Some(ok(id, json!({}))),
        "tools/list" => Some(ok(id, tools())),
        "tools/call" => {
            let name = params["name"].as_str().unwrap_or("");
            if !tools()["tools"].as_array().is_some_and(|t| t.iter().any(|t| t["name"] == name)) {
                return Some(err(id, -32602, "unknown tool"));
            }
            let (text, is_error) = match call(cfg, actor, name, &params["arguments"]).await {
                Ok(t) => (t, false),
                Err(t) => (t, true),
            };
            Some(ok(id, json!({"content": [{"type": "text", "text": text}], "isError": is_error})))
        }
        _ => Some(err(id, -32601, "method not found")),
    }
}

fn ok(id: &Value, result: Value) -> Value {
    json!({
        "jsonrpc": "2.0",
        "id": id,
        "result": result
    })
}

fn err(id: &Value, code: i64, message: &str) -> Value {
    json!({
        "jsonrpc": "2.0",
        "id": id,
        "error": {
            "code": code,
            "message": message
        }
    })
}

fn protocol(requested: Option<&str>) -> &'static str {
    match requested {
        Some("2025-06-18") => "2025-06-18",
        Some("2025-03-26") => "2025-03-26",
        Some("2024-11-05") => "2024-11-05",
        _ => "2025-06-18",
    }
}

fn tools() -> Value {
    json!({
        "tools": [
            {
                "name": "list_projects",
                "description": "List projects and their concepts.",
                "inputSchema": {
                    "type": "object",
                    "properties": {},
                    "additionalProperties": false
                }
            },
            {
                "name": "list_screens",
                "description": "List screen generation metadata.",
                "inputSchema": {
                    "type": "object",
                    "properties": {},
                    "additionalProperties": false
                }
            },
            {
                "name": "get_screen",
                "description": "Read a screen's HTML.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "id": {
                            "type": "string",
                            "description": "uuid of a screen"
                        }
                    },
                    "required": ["id"],
                    "additionalProperties": false
                }
            },
            {
                "name": "get_pack",
                "description": "Read UI pack for concept/generation. Concept packs cover all pages. Provide concept_id or generation_id.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "concept_id": {
                            "type": "string",
                            "description": "concept id"
                        },
                        "generation_id": {
                            "type": "string",
                            "description": "generation id"
                        }
                    },
                    "additionalProperties": false
                }
            }
        ]
    })
}

async fn call(cfg: &Arc<Config>, actor: &Actor, name: &str, args: &Value) -> Result<String, String> {
    match name {
        "list_projects" => http::read(cfg, actor, &["projects"]).await.map(|v| pretty(&v)).map_err(tool_error),
        "list_screens" => http::read(cfg, actor, &["generations"]).await.map(|v| pretty(&v)).map_err(tool_error),
        "get_screen" => {
            let id = args.get("id").and_then(Value::as_str).ok_or_else(|| "missing id".to_string())?;
            let screen = http::read(cfg, actor, &["generations", id]).await.map_err(tool_error)?;
            match screen.get("html") {
                Some(Value::String(html)) => Ok(html.clone()),
                _ => Err("this screen has no HTML yet".to_string()),
            }
        }
        "get_pack" => {
            let concept_id = args.get("concept_id").and_then(Value::as_str);
            let generation_id = args.get("generation_id").and_then(Value::as_str);
            match (concept_id, generation_id) {
                (Some(id), None) => pack_text(cfg, actor, true, id).await,
                (None, Some(id)) => pack_text(cfg, actor, false, id).await,
                _ => Err("provide exactly one of concept_id or generation_id".to_string()),
            }
        }
        _ => Err("unknown tool".into()),
    }
}

async fn pack_text(cfg: &Arc<Config>, actor: &Actor, concept: bool, id: &str) -> Result<String, String> {
    let pack = http::owned_pack(cfg, actor, concept, id).await.map_err(tool_error)?;
    let mut text = String::from("# SKILL.md\n\n");
    text.push_str(&pack.skill_md);
    for (path, bytes) in &pack.files {
        if let Ok(content) = std::str::from_utf8(bytes) {
            text.push_str("\n\n# ");
            text.push_str(path);
            text.push_str("\n\n");
            text.push_str(content);
        } else {
            text.push_str("\n\n# ");
            text.push_str(path);
            text.push_str(" (binary, skipped)");
        }
    }
    Ok(text)
}

fn pretty(v: &Value) -> String {
    serde_json::to_string_pretty(v).unwrap_or_else(|_| v.to_string())
}

fn tool_error(e: (u16, String)) -> String {
    if e.0 == 404 { "not found".to_string() } else { e.1 }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn protocol_defaults_and_known_versions() {
        assert_eq!(protocol(Some("2025-03-26")), "2025-03-26");
        assert_eq!(protocol(Some("1999-01-01")), "2025-06-18");
        assert_eq!(protocol(None), "2025-06-18");
    }

    #[test]
    fn tools_lists_four_read_only_tools() {
        let tools = tools();
        let names: Vec<&str> = tools
            .get("tools")
            .and_then(Value::as_array)
            .map(|entries| entries.iter().filter_map(|tool| tool.get("name").and_then(Value::as_str)).collect())
            .unwrap_or_default();
        assert_eq!(names, vec!["list_projects", "list_screens", "get_screen", "get_pack"]);
    }
}
