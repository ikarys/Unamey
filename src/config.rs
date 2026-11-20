use std::path::PathBuf;

use serde_json::Value;

#[derive(Clone)]
pub struct Llm {
    pub url: String,
    pub model: String,
    pub api_key: Option<String>,
    /// Variants of one job generated at once (1..=3); 1 for a local model, more with an API.
    pub parallel: usize,
    /// Per-model request extras merged into the request body (e.g. OpenRouter provider pinning).
    pub extra: Value,
}

#[derive(Clone, Default)]
pub struct Routes {
    pub planner: Vec<Llm>,
    pub generator: Vec<Llm>,
}

pub struct Config {
    pub pool: crate::sql::Db,
    /// Runs the async DB calls from sync code (jobs and the pipeline, on the blocking pool): see `block`.
    pub rt: tokio::runtime::Handle,
    /// Seals the providers' API keys (env STUDIO_KEY_FILE).
    pub key_file: PathBuf,
    /// Listen address (env STUDIO_BIND, default 127.0.0.1; 0.0.0.0 behind a proxy or on a platform).
    pub bind: String,
    pub port: u16,
    pub origin: Option<String>,
    /// LLM endpoint: env gives the defaults, the `settings` table overrides them at startup and the Settings drawer updates them live.
    pub llm: std::sync::RwLock<Llm>,
    /// Per-stage model routes (planner and generator), updated with the LLM settings.
    pub routes: std::sync::RwLock<Routes>,
    /// Exported skill directory (env STUDIO_SKILL_DIR).
    pub skill_dir: PathBuf,
    /// Where imported images are stored (env STUDIO_REFS_DIR).
    pub web_dir: PathBuf,
    /// Where generation packs are written (env STUDIO_PACKS_DIR).
    pub packs_dir: PathBuf,
    /// Installed impeccable skill (env STUDIO_IMPECCABLE_DIR); optional finish layer.
    pub impeccable_dir: PathBuf,
    /// Process start, shown in the admin header.
    pub started_at: chrono::DateTime<chrono::Utc>,
}

fn env(name: &str, default: &str) -> String {
    std::env::var(name).unwrap_or_else(|_| default.to_string())
}

fn origin() -> Option<String> {
    std::env::var("STUDIO_ORIGIN").ok().map(|o| o.trim().trim_end_matches('/').to_string()).filter(|o| !o.is_empty())
}

impl Config {
    pub fn llm(&self) -> Llm {
        self.llm.read().unwrap().clone()
    }

    pub fn routes(&self) -> Routes {
        self.routes.read().unwrap().clone()
    }

    pub fn multi_user(&self) -> bool {
        self.origin.is_some()
    }

    /// Runs `f` to completion; call from `spawn_blocking`, never from an async task.
    pub fn block<F: std::future::Future>(&self, f: F) -> F::Output {
        self.rt.block_on(f)
    }

    pub fn new(pool: crate::sql::Db, rt: tokio::runtime::Handle, port: u16) -> Config {
        let default_llm = Llm {
            url: env("STUDIO_LLM_URL", "http://127.0.0.1:8000/v1"),
            model: env("STUDIO_MODEL", "qwen3.8-27b"),
            api_key: None,
            parallel: 1,
            extra: Value::Null,
        };
        Config {
            pool,
            rt,
            key_file: env("STUDIO_KEY_FILE", "studio.key").into(),
            bind: env("STUDIO_BIND", "127.0.0.1"),
            port,
            origin: origin(),
            llm: std::sync::RwLock::new(default_llm.clone()),
            routes: std::sync::RwLock::new(Routes { planner: vec![default_llm.clone()], generator: vec![default_llm] }),
            skill_dir: env("STUDIO_SKILL_DIR", "skill/app-layout-patterns").into(),
            web_dir: "web/dist".into(),
            packs_dir: env("STUDIO_PACKS_DIR", "packs").into(),
            impeccable_dir: std::env::var("STUDIO_IMPECCABLE_DIR")
                .map(PathBuf::from)
                .unwrap_or_else(|_| PathBuf::from(env("HOME", ".")).join(".claude/skills/impeccable")),
            started_at: chrono::Utc::now(),
        }
    }
}
