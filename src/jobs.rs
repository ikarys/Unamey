//! Background jobs: one blocking tokio task per job (the pipeline is sync), state in the `jobs` table.
//! Jobs that call the model take a global lock, so they run one at a time (the local model is single-user).

use crate::config::Config;
use crate::db;
use crate::models;
use crate::sql::args;
use rango::prelude::*;
use serde_json::Value;
use std::panic::{AssertUnwindSafe, catch_unwind};
use std::sync::{Arc, Mutex};
use uuid::Uuid;

static MODEL_LOCK: Mutex<()> = Mutex::new(());

pub struct Job {
    cfg: Arc<Config>,
    pub id: Uuid,
    pub owner: Uuid,
}

impl Job {
    fn exec(&self, sql: &str, text: &str) {
        let _ = self.cfg.block(self.cfg.pool.execute(sql, args![text, self.id]));
    }

    pub fn progress(&self, text: &str) {
        self.exec("UPDATE jobs SET progress = $1 WHERE id = $2", text);
    }

    pub fn log(&self, line: &str) {
        eprintln!("[job {}] {line}", self.id);
        self.exec("UPDATE jobs SET log = log || $1 || chr(10) WHERE id = $2", line);
    }

    /// Logs one LLM call and adds it to the job's totals, priced at `model`'s current price (cost stays null once a call is unpriced).
    pub fn llm_call(&self, model: &str, c: &llm_providers_connector::Completion, started: std::time::Instant) {
        let line = format!("{} · {model}", crate::llm::usage(c, started));
        self.log(&line);
        let price = self.cfg.block(db::price_for(&self.cfg, model)).ok().flatten();
        let cost = price.map(|p| p.cost(c.prompt_tokens, c.cached_tokens, c.completion_tokens));
        let sql = "UPDATE jobs SET llm_calls = llm_calls + 1, llm_seconds = llm_seconds + $1, prompt_tokens = prompt_tokens + $2,
                   cached_tokens = cached_tokens + $3, out_tokens = out_tokens + $4,
                   cost = CASE WHEN $5::float8 IS NULL OR (cost IS NULL AND llm_calls > 0) THEN NULL ELSE COALESCE(cost, 0) + $5 END,
                   model = $6 WHERE id = $7";
        let a = args![
            started.elapsed().as_secs_f64().round() as i32,
            c.prompt_tokens as i64,
            c.cached_tokens as i64,
            c.completion_tokens as i64,
            cost,
            model,
            self.id
        ];
        let _ = self.cfg.block(self.cfg.pool.execute(sql, a));
    }

    /// Variants of this job generated at once (the active provider's setting).
    pub fn parallel(&self) -> usize {
        self.cfg.llm().parallel
    }
}

/// Starts `f` on the blocking pool, where `cfg.block` works. The returned value is logged as `result: <json>` (null is skipped).
pub async fn spawn(
    cfg: &Arc<Config>,
    kind: &str,
    owner: Uuid,
    target: Option<Value>,
    f: impl FnOnce(&Job) -> Result<Value, String> + Send + 'static,
) -> Result<Uuid, String> {
    let row = models::Job {
        id: FieldUuid(Uuid::now_v7()),
        kind: FieldText(kind.into()),
        status: FieldText("queued".into()),
        progress: FieldText(String::new()),
        log: FieldText(String::new()),
        created_at: FieldDateTime(chrono::Utc::now()),
        finished_at: None,
        owner_id: ForeignKey::new(owner),
        target_json: target.map(FieldJson),
        llm_calls: FieldInt(0),
        llm_seconds: FieldInt(0),
        prompt_tokens: FieldBigInt(0),
        cached_tokens: FieldBigInt(0),
        out_tokens: FieldBigInt(0),
        cost: None,
        model: None,
    };
    let id = cfg.pool.insert(row).await.map_err(db::es)?.id.0;
    let job = Job { cfg: cfg.clone(), id, owner };
    tokio::task::spawn_blocking(move || {
        let _guard = MODEL_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        job.exec("UPDATE jobs SET status = $1 WHERE id = $2", "running");
        let out = catch_unwind(AssertUnwindSafe(|| f(&job))).unwrap_or_else(|_| Err("job panicked".into()));
        let status = match out {
            Ok(v) => {
                if !v.is_null() {
                    job.log(&format!("result: {v}"));
                }
                "done"
            }
            Err(e) => {
                job.log(&format!("error: {e}"));
                "failed"
            }
        };
        job.exec("UPDATE jobs SET status = $1, finished_at = now() WHERE id = $2", status);
    });
    Ok(id)
}

/// A job left 'running' or 'queued' by a previous process can never finish.
pub async fn mark_stale(cfg: &Config) -> Result<(), String> {
    cfg.pool
        .execute("UPDATE jobs SET status = 'failed', finished_at = now(), log = log || 'interrupted by restart' || chr(10) WHERE status IN ('running','queued')", vec![])
        .await
        .map_err(db::es)?;
    Ok(())
}
