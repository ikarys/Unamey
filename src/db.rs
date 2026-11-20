//! PostgreSQL access (async, on `cfg.pool`): rango for single-row inserts, sqlx for the rest (joins, JSON, bulk updates).
//! Sync callers (job threads, the pipeline) go through `cfg.block(..)`.

use crate::authz::Actor;
use crate::config::{Config, Llm, Routes};
use crate::models;
use crate::sql::args;
use chrono::{DateTime, Datelike, Utc};
use llm_providers_connector::{ApiKey, MasterKey, ModelPrefs, ModelRef, Price, Provider};
use rango::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::BTreeMap;
use uuid::Uuid;

pub fn es<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

/// The admin account seeded by migrations/0002 (`authz::LOCAL`): cannot be deleted nor suspended.
const ADMIN: Uuid = Uuid::from_u128(1);

/// Timestamps leave the API as `YYYY-MM-DD HH:MM:SS` (UTC), the format the front parses.
fn ts(d: DateTime<Utc>) -> String {
    d.format("%Y-%m-%d %H:%M:%S").to_string()
}

fn now() -> FieldDateTime {
    FieldDateTime(Utc::now())
}

/// Times are bound from Rust, never computed in SQL: the two backends have no common `now()` or `date_trunc`.
fn month_start(now: DateTime<Utc>) -> DateTime<Utc> {
    now.date_naive().with_day(1).expect("day 1 exists").and_hms_opt(0, 0, 0).expect("midnight exists").and_utc()
}

/// `last_seen` is refreshed at most this often, so a busy session does not write on every request.
const SESSION_TOUCH: chrono::Duration = chrono::Duration::minutes(5);

const HEX: &[u8; 16] = b"0123456789abcdef";

fn hex(bytes: &[u8]) -> String {
    let mut s = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        s.push(char::from(HEX[(b >> 4) as usize]));
        s.push(char::from(HEX[(b & 0xf) as usize]));
    }
    s
}

fn sha256_hex(s: &str) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(s);
    hex(&hasher.finalize())
}

fn new_token() -> Result<String, String> {
    let mut bytes = [0u8; 32];
    getrandom::getrandom(&mut bytes).map_err(es)?;
    Ok(hex(&bytes))
}

fn hash_password(pw: &str) -> Result<String, String> {
    use argon2::{Argon2, PasswordHasher, password_hash::SaltString};
    let mut bytes = [0u8; 16];
    getrandom::getrandom(&mut bytes).map_err(es)?;
    let salt = SaltString::encode_b64(&bytes).map_err(es)?;
    Ok(Argon2::default().hash_password(pw.as_bytes(), &salt).map_err(es)?.to_string())
}

fn verify_password(pw: &str, hash: &str) -> bool {
    use argon2::{Argon2, PasswordHash, PasswordVerifier};
    PasswordHash::new(hash).is_ok_and(|h| Argon2::default().verify_password(pw.as_bytes(), &h).is_ok())
}

async fn new_session(tx: &mut crate::sql::Tx, user_id: Uuid, user_agent: &str) -> Result<String, String> {
    let token = new_token()?;
    let ua: String = user_agent.chars().take(200).collect();
    let s = models::Session {
        id: FieldUuid(Uuid::now_v7()),
        token_hash: FieldText(sha256_hex(&token)),
        user_id: ForeignKey::new(user_id),
        user_agent: Some(FieldText(ua)),
        created_at: now(),
        last_seen: now(),
        expires_at: FieldDateTime(Utc::now() + chrono::Duration::days(90)),
    };
    tx.insert(s).await.map_err(es)?;
    Ok(token)
}

/// The free-text brief of a stored generation request.
fn brief_text(request: &Value) -> Value {
    request["brief"].clone()
}

fn parse(s: &str) -> Value {
    serde_json::from_str(s).unwrap_or(Value::Null)
}

/// A generation to store; `model` is the model that answered.
pub struct NewGeneration<'a> {
    pub request: &'a Value,
    pub notes: &'a Value,
    pub html: &'a str,
    pub skill_version: &'a str,
    pub project: Option<Uuid>,
    /// When set, the project is the concept's (`project` is ignored).
    pub concept: Option<Uuid>,
    pub page: Option<&'a str>,
    pub target: &'a str,
    pub owner: Uuid,
    pub model: &'a str,
}

pub async fn insert_generation(cfg: &Config, g: NewGeneration<'_>) -> Result<Uuid, String> {
    let project = match g.concept {
        Some(c) => Some(concept_project(cfg, c).await?.ok_or("concept not found")?),
        None => g.project,
    };
    let row = models::Generation {
        id: FieldUuid(Uuid::now_v7()),
        brief_json: FieldJson(g.request.clone()),
        model: FieldText(g.model.to_string()),
        notes_json: Some(FieldJson(g.notes.clone())),
        // Hardcoded token colours would make the mockup lose its live edits.
        html: Some(FieldText(crate::pipeline::tokens::bind(g.html, &g.notes["direction"]["identity"]))),
        skill_version: FieldText(g.skill_version.to_string()),
        verdict: None,
        verdict_note: None,
        created_at: now(),
        project_id: project.map(ForeignKey::new),
        concept_id: g.concept.map(ForeignKey::new),
        page: g.page.map(|p| FieldText(p.to_string())),
        target: FieldText(g.target.to_string()),
        owner_id: ForeignKey::new(g.owner),
    };
    Ok(cfg.pool.insert(row).await.map_err(es)?.id.0)
}

pub async fn settings(cfg: &Config) -> Result<std::collections::HashMap<String, String>, String> {
    let rows = cfg.pool.fetch_all("SELECT key, value FROM settings", vec![]).await.map_err(es)?;
    Ok(rows.into_iter().map(|r| (r.get::<String, _>(0), r.get::<String, _>(1))).collect())
}

pub async fn set_settings(cfg: &Config, kv: &[(&str, &str)]) -> Result<(), String> {
    let mut tx = cfg.pool.begin().await.map_err(es)?;
    for (k, v) in kv {
        tx.execute(
            "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
            args![*k, *v],
        )
        .await
        .map_err(es)?;
    }
    tx.commit().await.map_err(es)
}

pub async fn users(cfg: &Config) -> Result<Value, String> {
    let rows = cfg
        .pool
        .fetch_all("SELECT id, email, admin, disabled, created_at, name FROM users ORDER BY created_at, id", vec![])
        .await
        .map_err(es)?;
    let list: Vec<(Uuid, Value)> = rows
        .into_iter()
        .map(|r| {
            let id: Uuid = r.get(0);
            let email: String = r.get(1);
            let admin: bool = r.get(2);
            let disabled: bool = r.get(3);
            let created_at: DateTime<Utc> = r.get(4);
            let name: Option<String> = r.get(5);
            (id, json!({"id": json!(id), "email": email, "name": name, "admin": admin, "disabled": disabled, "created_at": ts(created_at)}))
        })
        .collect();
    let mut prices: std::collections::HashMap<String, Option<Price>> = std::collections::HashMap::new();
    let mut cost_by_user: std::collections::HashMap<Uuid, f64> = std::collections::HashMap::new();
    let gens: Vec<(Uuid, String, Option<Value>)> = cfg
        .pool
        .fetch_all("SELECT owner_id, model, notes_json FROM generations WHERE created_at >= $1", args![month_start(Utc::now())])
        .await
        .map_err(es)?
        .into_iter()
        .map(|r| (r.get::<Uuid, _>(0), r.get::<String, _>(1), r.get::<Option<Value>, _>(2)))
        .collect();
    for (owner, model, notes) in gens {
        if !prices.contains_key(&model) {
            prices.insert(model.clone(), price_for(cfg, &model).await.ok().flatten());
        }
        let price = &prices[&model];
        if let Some(p) = price {
            let notes = notes.unwrap_or(Value::Null);
            if let Some(c) = cost(&notes, p) {
                *cost_by_user.entry(owner).or_insert(0.0) += c;
            }
        }
    }
    let mut out = Vec::with_capacity(list.len());
    for (id, mut u) in list {
        let generations_month: i64 = cfg
            .pool
            .fetch_one("SELECT COUNT(*) FROM generations WHERE owner_id = $1 AND created_at >= $2", args![id, month_start(Utc::now())])
            .await
            .map_err(es)?
            .get(0);
        let generations_total: i64 =
            cfg.pool.fetch_one("SELECT COUNT(*) FROM generations WHERE owner_id = $1", args![id]).await.map_err(es)?.get(0);
        u["generations_month"] = json!(generations_month);
        u["generations_total"] = json!(generations_total);
        u["cost_month"] = json!(cost_by_user.get(&id).copied().map(Value::from).unwrap_or(Value::Null));
        out.push(u);
    }
    Ok(Value::Array(out))
}

/// Longest accepted display name, in characters.
const MAX_NAME: usize = 100;

fn clean_name(name: &str) -> Result<String, String> {
    let name = name.trim();
    if name.is_empty() {
        return Err("name is required".into());
    }
    if name.chars().count() > MAX_NAME || name.chars().any(char::is_control) {
        return Err(format!("name must be at most {MAX_NAME} characters, without control characters"));
    }
    Ok(name.to_string())
}

pub async fn set_name(cfg: &Config, user_id: Uuid, name: &str) -> Result<bool, String> {
    let name = clean_name(name)?;
    let n = cfg.pool.execute("UPDATE users SET name = $1 WHERE id = $2", args![name, user_id]).await.map_err(es)?;
    Ok(n == 1)
}

pub async fn signup(cfg: &Config, name: &str, email: &str, password: &str, user_agent: &str) -> Result<String, String> {
    let name = clean_name(name)?;
    let email = email.trim().to_lowercase();
    if !email.contains('@') {
        return Err("email must contain @".into());
    }
    if password.chars().count() < 8 {
        return Err("password must be at least 8 characters".into());
    }
    let hash = hash_password(password)?;
    let mut tx = cfg.pool.begin().await.map_err(es)?;
    let no_password: bool = tx.fetch_one("SELECT password_hash IS NULL FROM users WHERE id = $1", args![ADMIN]).await.map_err(es)?.get(0);
    let user_id: Uuid = if no_password {
        tx.execute("UPDATE users SET email = $1, password_hash = $2, name = $3 WHERE id = $4", args![&email, &hash, &name, ADMIN])
            .await
            .map_err(|e| {
                if e.as_database_error().is_some_and(|d| d.is_unique_violation()) { "email already registered".into() } else { es(e) }
            })?;
        ADMIN
    } else {
        let user = models::User {
            id: FieldUuid(Uuid::now_v7()),
            email: FieldText(email.clone()),
            name: Some(FieldText(name)),
            admin: FieldBool(false),
            disabled: FieldBool(false),
            password_hash: Some(FieldText(hash.clone())),
            created_at: now(),
        };
        let inserted = tx.insert(user).await.map_err(|e| match e {
            rango::Error::UniqueViolation { .. } => "email already registered".into(),
            _ => es(e),
        })?;
        inserted.id.0
    };
    let token = new_session(&mut tx, user_id, user_agent).await?;
    tx.commit().await.map_err(es)?;
    Ok(token)
}

pub async fn login(cfg: &Config, email: &str, password: &str, user_agent: &str) -> Result<Option<String>, String> {
    let email = email.trim().to_lowercase();
    let row = cfg.pool.fetch_optional("SELECT id, password_hash, disabled FROM users WHERE email = $1", args![&email]).await.map_err(es)?;
    let Some(row) = row else {
        return Ok(None);
    };
    let id: Uuid = row.get(0);
    let hash: Option<String> = row.get(1);
    let disabled: bool = row.get(2);
    if disabled {
        return Ok(None);
    }
    let Some(hash) = hash else {
        return Ok(None);
    };
    if !verify_password(password, &hash) {
        return Ok(None);
    }
    let mut tx = cfg.pool.begin().await.map_err(es)?;
    let token = new_session(&mut tx, id, user_agent).await?;
    tx.commit().await.map_err(es)?;
    Ok(Some(token))
}

pub async fn session(cfg: &Config, token: &str) -> Result<Option<Actor>, String> {
    let hash = sha256_hex(token);
    let row = cfg.pool.fetch_optional("SELECT u.id, u.admin FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > $2 AND u.disabled = $3", args![&hash, Utc::now(), false]).await.map_err(es)?;
    let a = row.map(|r| Actor { id: r.get::<Uuid, _>(0), admin: r.get::<bool, _>(1) });
    if a.is_some() {
        let now = Utc::now();
        cfg.pool
            .execute(
                "UPDATE sessions SET last_seen = $2 WHERE token_hash = $1 AND (last_seen IS NULL OR last_seen < $3)",
                args![&hash, now, now - SESSION_TOUCH],
            )
            .await
            .map_err(es)?;
    }
    Ok(a)
}

pub async fn logout(cfg: &Config, token: &str) -> Result<(), String> {
    cfg.pool.execute("DELETE FROM sessions WHERE token_hash = $1", args![sha256_hex(token)]).await.map_err(es)?;
    Ok(())
}

/// The signed-in user's account.
pub async fn account(cfg: &Config, user_id: Uuid) -> Result<Option<Value>, String> {
    let row =
        cfg.pool.fetch_optional("SELECT email, admin, created_at, name FROM users WHERE id = $1", args![user_id]).await.map_err(es)?;
    Ok(row.map(|r| {
        let email: String = r.get(0);
        let admin: bool = r.get(1);
        let created_at: DateTime<Utc> = r.get(2);
        let name: Option<String> = r.get(3);
        json!({"email": email, "name": name, "admin": admin, "created_at": ts(created_at)})
    }))
}

async fn password_ok(cfg: &Config, user_id: Uuid, pw: &str) -> Result<bool, String> {
    let row = cfg.pool.fetch_optional("SELECT password_hash FROM users WHERE id = $1", args![user_id]).await.map_err(es)?;
    let hash: Option<String> = row.and_then(|r| r.get(0));
    Ok(hash.is_some_and(|h| verify_password(pw, &h)))
}

/// Changes a password and signs out the other sessions.
pub async fn change_password(cfg: &Config, user_id: Uuid, current: &str, new: &str, keep_token: &str) -> Result<bool, String> {
    if new.chars().count() < 8 {
        return Err("password must be at least 8 characters".into());
    }
    if !password_ok(cfg, user_id, current).await? {
        return Ok(false);
    }
    let hash = hash_password(new)?;
    let mut tx = cfg.pool.begin().await.map_err(es)?;
    tx.execute("UPDATE users SET password_hash = $1 WHERE id = $2", args![&hash, user_id]).await.map_err(es)?;
    delete_other_sessions(&mut tx, user_id, keep_token).await?;
    tx.commit().await.map_err(es)?;
    Ok(true)
}

/// Deletes a user and their rows; the admin account is kept.
pub async fn delete_account(cfg: &Config, user_id: Uuid, password: &str) -> Result<bool, String> {
    if user_id == ADMIN {
        return Err("the admin account cannot be deleted".into());
    }
    if !password_ok(cfg, user_id, password).await? {
        return Ok(false);
    }
    delete_user_rows(cfg, user_id).await?;
    Ok(true)
}

async fn delete_user_rows(cfg: &Config, user_id: Uuid) -> Result<(), String> {
    let mut tx = cfg.pool.begin().await.map_err(es)?;
    tx.execute("DELETE FROM shares WHERE owner_id = $1", args![user_id]).await.map_err(es)?;
    tx.execute("UPDATE concepts SET identity_id = NULL WHERE project_id IN (SELECT id FROM projects WHERE owner_id = $1)", args![user_id])
        .await
        .map_err(es)?;
    tx.execute("DELETE FROM generations WHERE owner_id = $1", args![user_id]).await.map_err(es)?;
    tx.execute("DELETE FROM projects WHERE owner_id = $1", args![user_id]).await.map_err(es)?;
    tx.execute("DELETE FROM jobs WHERE owner_id = $1", args![user_id]).await.map_err(es)?;
    tx.execute("DELETE FROM users WHERE id = $1", args![user_id]).await.map_err(es)?;
    tx.commit().await.map_err(es)
}

async fn delete_other_sessions(tx: &mut crate::sql::Tx, user_id: Uuid, keep_token: &str) -> Result<usize, String> {
    Ok(tx
        .execute("DELETE FROM sessions WHERE user_id = $1 AND token_hash != $2", args![user_id, sha256_hex(keep_token)])
        .await
        .map_err(es)? as usize)
}

pub async fn sessions(cfg: &Config, user_id: Uuid, current_token: &str) -> Result<Value, String> {
    let cur = sha256_hex(current_token);
    let rows = cfg.pool.fetch_all("SELECT id, token_hash, user_agent, created_at, last_seen FROM sessions WHERE user_id = $1 AND expires_at > $2 ORDER BY last_seen DESC, created_at DESC", args![user_id, Utc::now()]).await.map_err(es)?;
    Ok(Value::Array(rows.into_iter().map(|r| {
        let id: Uuid = r.get(0);
        let token_hash: String = r.get(1);
        let user_agent: Option<String> = r.get(2);
        let created_at: DateTime<Utc> = r.get(3);
        let last_seen: Option<DateTime<Utc>> = r.get(4);
        json!({"id": json!(id), "user_agent": user_agent, "created_at": ts(created_at), "last_seen": last_seen.map(ts), "current": token_hash == cur})
    }).collect()))
}

pub async fn revoke_session(cfg: &Config, user_id: Uuid, id: Uuid) -> Result<bool, String> {
    Ok(cfg.pool.execute("DELETE FROM sessions WHERE id = $1 AND user_id = $2", args![id, user_id]).await.map_err(es)? > 0)
}

pub async fn revoke_other_sessions(cfg: &Config, user_id: Uuid, keep_token: &str) -> Result<usize, String> {
    let mut tx = cfg.pool.begin().await.map_err(es)?;
    let n = delete_other_sessions(&mut tx, user_id, keep_token).await?;
    tx.commit().await.map_err(es)?;
    Ok(n)
}

pub async fn admin_delete_user(cfg: &Config, actor_id: Uuid, user_id: Uuid) -> Result<bool, String> {
    if user_id == ADMIN {
        return Err("the admin account cannot be deleted".into());
    }
    if user_id == actor_id {
        return Err("you cannot delete your own account here".into());
    }
    let exists: bool = cfg.pool.fetch_one("SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)", args![user_id]).await.map_err(es)?.get(0);
    if !exists {
        return Ok(false);
    }
    delete_user_rows(cfg, user_id).await?;
    Ok(true)
}

pub async fn set_disabled(cfg: &Config, actor_id: Uuid, user_id: Uuid, disabled: bool) -> Result<bool, String> {
    if user_id == ADMIN {
        return Err("the admin account cannot be suspended".into());
    }
    if user_id == actor_id {
        return Err("you cannot suspend your own account".into());
    }
    let mut tx = cfg.pool.begin().await.map_err(es)?;
    let n = tx.execute("UPDATE users SET disabled = $1 WHERE id = $2", args![disabled, user_id]).await.map_err(es)?;
    if n == 0 {
        return Ok(false);
    }
    if disabled {
        tx.execute("DELETE FROM sessions WHERE user_id = $1", args![user_id]).await.map_err(es)?;
    }
    tx.commit().await.map_err(es)?;
    Ok(true)
}

/// What the admin sees on one account's page: usage, projects (names and counts, not their content), active sessions and recent jobs.
pub async fn user_detail(cfg: &Config, user_id: Uuid) -> Result<Option<Value>, String> {
    if account(cfg, user_id).await?.is_none() {
        return Ok(None);
    }
    Ok(Some(json!({
        "usage": usage(cfg, user_id).await?,
        "projects": projects(cfg, user_id).await?,
        "sessions": sessions(cfg, user_id, "").await?,
        "jobs": jobs(cfg, Some(user_id)).await?,
    })))
}

pub async fn usage(cfg: &Config, user_id: Uuid) -> Result<Value, String> {
    let sql = format!(
        "SELECT {} AS month, COUNT(*) FROM generations WHERE owner_id = $1 GROUP BY 1 ORDER BY 1 DESC LIMIT 12",
        cfg.pool.month("created_at")
    );
    let rows = cfg.pool.fetch_all(&sql, args![user_id]).await.map_err(es)?;
    let mut by = Vec::with_capacity(rows.len());
    for r in rows {
        let month: String = r.get(0);
        let generations: i64 = r.get(1);
        by.push(json!({"month": month, "generations": generations}));
    }
    by.reverse();
    let month_generations: i64 = cfg
        .pool
        .fetch_one("SELECT COUNT(*) FROM generations WHERE owner_id = $1 AND created_at >= $2", args![user_id, month_start(Utc::now())])
        .await
        .map_err(es)?
        .get(0);
    let month_projects: i64 = cfg
        .pool
        .fetch_one("SELECT COUNT(*) FROM projects WHERE owner_id = $1 AND created_at >= $2", args![user_id, month_start(Utc::now())])
        .await
        .map_err(es)?
        .get(0);
    let total_generations: i64 =
        cfg.pool.fetch_one("SELECT COUNT(*) FROM generations WHERE owner_id = $1", args![user_id]).await.map_err(es)?.get(0);
    let total_projects: i64 =
        cfg.pool.fetch_one("SELECT COUNT(*) FROM projects WHERE owner_id = $1", args![user_id]).await.map_err(es)?.get(0);
    Ok(json!({
        "month": {
            "generations": month_generations,
            "projects": month_projects,
        },
        "total": {
            "generations": total_generations,
            "projects": total_projects,
        },
        "by_month": Value::Array(by),
    }))
}

pub async fn owner_of(cfg: &Config, table: &'static str, id: Uuid) -> Result<Option<Uuid>, String> {
    // The table name is spliced into SQL: only these three are accepted, in release builds too.
    if !matches!(table, "jobs" | "projects" | "generations") {
        return Err(format!("owner_of: unexpected table {table}"));
    }
    let sql = format!("SELECT owner_id FROM {table} WHERE id = $1");
    Ok(cfg.pool.fetch_optional(&sql, args![id]).await.map_err(es)?.map(|r| r.get::<Uuid, _>(0)))
}

fn master_key(cfg: &Config) -> Result<MasterKey, String> {
    MasterKey::load_or_create(&cfg.key_file)
}

/// The stored providers and the active model; `None` before the first migration.
pub async fn llm_settings(cfg: &Config) -> Result<Option<(Vec<Provider>, ModelRef)>, String> {
    let s = settings(cfg).await?;
    let (Some(p), Some(a)) = (s.get("providers"), s.get("active")) else {
        return Ok(None);
    };
    Ok(Some((serde_json::from_str(p).map_err(es)?, serde_json::from_str(a).map_err(es)?)))
}

/// Variants generated at once, per provider id (settings key `parallel`); missing = 1.
pub async fn parallel_settings(cfg: &Config) -> Result<BTreeMap<String, usize>, String> {
    match settings(cfg).await?.get("parallel") {
        Some(s) => serde_json::from_str(s).map_err(es),
        None => Ok(BTreeMap::new()),
    }
}

/// The clear API key of a provider (unsealed or read from its env var).
pub fn provider_key(cfg: &Config, p: &Provider) -> Result<Option<String>, String> {
    match &p.api_key {
        None => Ok(None),
        Some(k) => k.resolve(|sealed| master_key(cfg)?.open(sealed)),
    }
}

#[derive(Serialize, Deserialize, Default, Clone)]
pub struct Routing {
    pub planner: Option<ModelRef>,
    #[serde(default)]
    pub fallbacks: Vec<ModelRef>,
}

pub type Extras = BTreeMap<String, BTreeMap<String, Value>>;

/// Points the pipeline (`cfg.llm` and `cfg.routes`) at the active, planner and fallback models.
pub fn apply_llm(
    cfg: &Config,
    providers: &[Provider],
    active: &ModelRef,
    routing: &Routing,
    extras: &Extras,
    parallel: &BTreeMap<String, usize>,
) -> Result<(), String> {
    let resolve = |what: &str, ref_: &ModelRef| -> Result<Llm, String> {
        let p = providers.iter().find(|p| p.id == ref_.provider).ok_or_else(|| format!("{what} provider does not exist"))?;
        let api_key = provider_key(cfg, p)?;
        let extra = extras.get(&ref_.provider).and_then(|m| m.get(&ref_.model)).cloned().unwrap_or(Value::Null);
        Ok(Llm {
            url: p.base_url.clone(),
            model: ref_.model.clone(),
            api_key,
            parallel: parallel.get(&ref_.provider).copied().unwrap_or(1),
            extra,
        })
    };

    let active_llm = resolve("active", active)?;
    *cfg.llm.write().unwrap() = active_llm.clone();

    let mut generator_refs = vec![active.clone()];
    let mut planner_refs = match routing.planner {
        Some(ref planner) => vec![planner.clone()],
        None => vec![active.clone()],
    };
    for f in &routing.fallbacks {
        if !generator_refs.iter().any(|r| r.provider == f.provider && r.model == f.model) {
            generator_refs.push(f.clone());
        }
        if !planner_refs.iter().any(|r| r.provider == f.provider && r.model == f.model) {
            planner_refs.push(f.clone());
        }
    }

    let generator = generator_refs.iter().map(|r| resolve("generator", r)).collect::<Result<Vec<_>, _>>()?;
    let planner = planner_refs.iter().map(|r| resolve("planner", r)).collect::<Result<Vec<_>, _>>()?;
    *cfg.routes.write().unwrap() = Routes { planner, generator };
    Ok(())
}

pub async fn routing_settings(cfg: &Config) -> Result<(Routing, Extras), String> {
    let s = settings(cfg).await?;
    let routing = match s.get("routing") {
        Some(v) if v != "null" => serde_json::from_str(v).map_err(es)?,
        _ => Routing::default(),
    };
    let extras = match s.get("extras") {
        Some(v) if v != "null" => serde_json::from_str(v).map_err(es)?,
        _ => Extras::default(),
    };
    Ok((routing, extras))
}

async fn store_llm(
    cfg: &Config,
    providers: &[Provider],
    active: &ModelRef,
    routing: &Routing,
    extras: &Extras,
    parallel: &BTreeMap<String, usize>,
) -> Result<(), String> {
    let p = serde_json::to_string(providers).map_err(es)?;
    let a = serde_json::to_string(active).map_err(es)?;
    let r = serde_json::to_string(routing).map_err(es)?;
    let e = serde_json::to_string(extras).map_err(es)?;
    set_settings(
        cfg,
        &[("providers", &p), ("active", &a), ("routing", &r), ("extras", &e), ("parallel", &serde_json::to_string(parallel).map_err(es)?)],
    )
    .await
}

/// Loads the providers into `cfg.llm`; the first time, turns the env defaults into one provider `default`.
pub async fn load_llm_settings(cfg: &Config) -> Result<(), String> {
    if llm_settings(cfg).await?.is_none() {
        let d = cfg.llm();
        let p = Provider {
            id: "default".into(),
            name: "Default".into(),
            base_url: d.url,
            api_key: None,
            models: BTreeMap::from([(d.model.clone(), ModelPrefs::default())]),
        };
        store_llm(
            cfg,
            &[p],
            &ModelRef { provider: "default".into(), model: d.model },
            &Routing::default(),
            &Extras::default(),
            &BTreeMap::new(),
        )
        .await?;
    }
    let (providers, active) = llm_settings(cfg).await?.ok_or("providers missing")?;
    let (routing, extras) = routing_settings(cfg).await?;
    apply_llm(cfg, &providers, &active, &routing, &extras, &parallel_settings(cfg).await?)
}

/// Validates and stores a settings body (see docs/architecture.md), then applies it.
pub async fn save_llm_settings(cfg: &Config, b: &Value) -> Result<(), String> {
    let old = llm_settings(cfg).await?.map(|o| o.0).unwrap_or_default();
    let mut providers: Vec<Provider> = Vec::new();
    let mut parallel = BTreeMap::new();
    let mut extras = Extras::default();
    for p in b["providers"].as_array().ok_or("providers must be an array")? {
        let text = |k: &str| p[k].as_str().unwrap_or("").trim().to_string();
        let (id, base_url) = (text("id"), text("base_url"));
        let n = p.get("parallel").map_or(Some(1), Value::as_u64).filter(|n| (1..=3).contains(n));
        parallel.insert(id.clone(), n.ok_or_else(|| format!("provider {id}: parallel must be 1-3"))? as usize);
        if !url::Url::parse(&base_url).is_ok_and(|u| matches!(u.scheme(), "http" | "https")) {
            return Err(format!("provider {id}: base_url must be an http(s) URL"));
        }
        let api_key = match p.get("api_key").and_then(Value::as_str) {
            None => old.iter().find(|o| o.id == id).and_then(|o| o.api_key.clone()),
            Some("") => None,
            Some(k) => Some(ApiKey::Sealed(master_key(cfg)?.seal(k))),
        };
        let models = p["models"].as_array().into_iter().flatten().filter_map(Value::as_str).map(str::trim).filter(|m| !m.is_empty());
        let mut models_map = BTreeMap::new();
        for m in models {
            let price = match p["prices"].get(m) {
                None | Some(Value::Null) => None,
                Some(e) => {
                    let f = |k: &str| e[k].as_f64().filter(|x| x.is_finite() && *x >= 0.0).ok_or("prices must be numbers >= 0");
                    Some(Price { input_per_m: f("input_per_m")?, cached_per_m: f("cached_per_m")?, output_per_m: f("output_per_m")? })
                }
            };
            models_map.insert(m.to_string(), ModelPrefs { price, ..Default::default() });
        }

        if let Some(provider_extras) = p.get("extras") {
            if !provider_extras.is_object() {
                return Err(format!("provider {id}: extras must be an object"));
            }
            let mut provider_extra_map = BTreeMap::new();
            for (model, value) in provider_extras.as_object().unwrap() {
                if !models_map.contains_key(model) {
                    continue;
                }
                if !value.is_object() {
                    return Err(format!("provider {id}: extras for {model} must be a JSON object"));
                }
                if value.as_object().is_some_and(|o| !o.is_empty()) {
                    provider_extra_map.insert(model.clone(), value.clone());
                }
            }
            if !provider_extra_map.is_empty() {
                extras.insert(id.clone(), provider_extra_map);
            }
        }

        let provider = Provider { name: text("name"), models: models_map, id, base_url, api_key };
        provider.validate()?;
        if providers.iter().any(|o| o.id == provider.id) {
            return Err(format!("duplicate provider id {}", provider.id));
        }
        providers.push(provider);
    }
    let active: ModelRef = serde_json::from_value(b["active"].clone()).map_err(|e| format!("active: {e}"))?;
    let active = ModelRef { model: active.model.trim().to_string(), ..active };
    if active.model.is_empty() || active.model.chars().count() > 200 {
        return Err("model must be 1-200 characters".into());
    }
    providers
        .iter_mut()
        .find(|p| p.id == active.provider)
        .ok_or("active provider does not exist")?
        .models
        .entry(active.model.clone())
        .or_default();

    let mut routing = Routing::default();
    if let Some(r) = b.get("routing").filter(|r| !r.is_null()) {
        routing = serde_json::from_value(r.clone()).map_err(|e| format!("routing: {e}"))?;
    }
    if routing.fallbacks.len() > 5 {
        return Err("at most 5 fallbacks".into());
    }

    let mut validate_ref = |what: &str, ref_: &mut ModelRef| -> Result<(), String> {
        ref_.provider = ref_.provider.trim().to_string();
        ref_.model = ref_.model.trim().to_string();
        if ref_.model.is_empty() || ref_.model.chars().count() > 200 {
            return Err(format!("{what}: model must be 1-200 characters"));
        }
        providers
            .iter_mut()
            .find(|p| p.id == ref_.provider)
            .ok_or_else(|| format!("{what} provider does not exist"))?
            .models
            .entry(ref_.model.clone())
            .or_default();
        Ok(())
    };

    if let Some(planner) = routing.planner.as_mut() {
        validate_ref("planner", planner)?;
    }
    for fallback in routing.fallbacks.iter_mut() {
        validate_ref("fallback", fallback)?;
    }

    apply_llm(cfg, &providers, &active, &routing, &extras, &parallel)?;
    store_llm(cfg, &providers, &active, &routing, &extras, &parallel).await
}

/// Global job counts only for admins (members never see other users' activity); `my_jobs`: the actor's running jobs (not briefs) with their `target`, newest first.
pub async fn status(cfg: &Config, actor: Uuid, admin: bool, endpoint_ok: bool) -> Result<Value, String> {
    let my_jobs = cfg
        .pool
        .fetch_all(
            "SELECT id, kind, target_json FROM jobs WHERE owner_id = $1 AND status IN ('running','queued') AND kind <> 'brief' ORDER BY created_at DESC",
            args![actor],
        )
        .await
        .map_err(es)?;
    let my_jobs: Vec<Value> = my_jobs
        .iter()
        .map(|r| json!({"id": r.get::<Uuid, _>(0), "kind": r.get::<String, _>(1), "target": r.get::<Option<Value>, _>(2)}))
        .collect();
    let mut out = json!({
        "endpoint_ok": endpoint_ok,
        "model": cfg.llm().model,
        "my_jobs": my_jobs,
        "started_at": cfg.started_at.to_rfc3339(),
    });
    if admin {
        let row = cfg
            .pool
            .fetch_one(
                "SELECT COUNT(*) FILTER (WHERE status IN ('running','queued')), COUNT(*) FILTER (WHERE status = 'failed') FROM jobs",
                vec![],
            )
            .await
            .map_err(es)?;
        out["jobs_running"] = json!(row.get::<i64, _>(0));
        out["jobs_failed"] = json!(row.get::<i64, _>(1));
    }
    Ok(out)
}

/// Queued or running jobs of `owner`.
pub async fn active_jobs(cfg: &Config, owner: Uuid) -> Result<i64, String> {
    let row = cfg
        .pool
        .fetch_one("SELECT COUNT(*) FROM jobs WHERE owner_id = $1 AND status IN ('running','queued')", args![owner])
        .await
        .map_err(es)?;
    Ok(row.get::<i64, _>(0))
}

/// The job target (`{concept, page}`) of work derived from generation `id`: its result lands next to it.
pub async fn job_target(cfg: &Config, id: Uuid) -> Result<Option<Value>, String> {
    let row = cfg
        .pool
        .fetch_optional("SELECT concept_id, page FROM generations WHERE id = $1 AND concept_id IS NOT NULL", args![id])
        .await
        .map_err(es)?;
    Ok(row.map(|r| json!({"concept": r.get::<Uuid, _>(0), "page": r.get::<Option<String>, _>(1)})))
}

fn job_json(r: &crate::sql::Row, with_log: bool) -> Value {
    let mut v = json!({
        "id": json!(r.get::<Uuid, _>(0)),
        "kind": r.get::<String, _>(1),
        "status": r.get::<String, _>(2),
        "progress": r.get::<String, _>(3),
        "created_at": ts(r.get::<DateTime<Utc>, _>(5)),
        "finished_at": r.get::<Option<DateTime<Utc>>, _>(6).map(ts),
        "owner": {"id": json!(r.get::<Uuid, _>(7)), "email": r.get::<String, _>(8), "name": r.get::<Option<String>, _>(9)},
        "llm": {
            "calls": r.get::<i32, _>(10),
            "seconds": r.get::<i32, _>(11),
            "prompt": r.get::<i64, _>(12),
            "cached": r.get::<i64, _>(13),
            "out": r.get::<i64, _>(14),
            "cost": r.get::<Option<f64>, _>(15),
            "model": r.get::<Option<String>, _>(16),
        },
    });
    let log: String = r.get(4);
    // A failed job says why as an "error: <reason>" log line (see jobs.rs).
    v["error"] = log.lines().rev().find_map(|l| l.strip_prefix("error: ")).map_or(Value::Null, |e| json!(e));
    if with_log {
        // Jobs report their outcome as a final "result: <json>" log line.
        let result = log.lines().rev().find_map(|l| l.strip_prefix("result: ")).map_or(Value::Null, parse);
        v["result"] = result;
        v["log"] = json!(log);
    }
    v
}

const JOB_COLS: &str = "SELECT j.id, j.kind, j.status, j.progress, j.log, j.created_at, j.finished_at, u.id, u.email, u.name,
    j.llm_calls, j.llm_seconds, j.prompt_tokens, j.cached_tokens, j.out_tokens, j.cost, j.model FROM jobs j JOIN users u ON u.id = j.owner_id";

/// The latest jobs of one owner, or of everyone when `owner` is None.
pub async fn jobs(cfg: &Config, owner: Option<Uuid>) -> Result<Value, String> {
    let sql = format!("{JOB_COLS} WHERE $1 IS NULL OR j.owner_id = $1 ORDER BY j.created_at DESC, j.id DESC LIMIT 200");
    let rows = cfg.pool.fetch_all(&sql, args![owner]).await.map_err(es)?;
    Ok(Value::Array(rows.iter().map(|r| job_json(r, false)).collect()))
}

pub async fn job(cfg: &Config, id: Uuid) -> Result<Option<Value>, String> {
    let sql = format!("{JOB_COLS} WHERE j.id = $1");
    let row = cfg.pool.fetch_optional(&sql, args![id]).await.map_err(es)?;
    Ok(row.map(|r| job_json(&r, true)))
}

/// Admin > Jobs query: free text (account name or email, kind, job id), filters, sort and page.
#[derive(Debug, Default, PartialEq)]
pub struct JobQuery {
    pub q: String,
    pub status: Option<String>,
    pub kind: Option<String>,
    pub sort: String,
    pub asc: bool,
    pub page: i64,
    pub per: i64,
}

impl JobQuery {
    pub fn parse(query: &str) -> JobQuery {
        let mut j = JobQuery { sort: "created".into(), page: 1, per: 50, ..Default::default() };
        for (k, v) in url::form_urlencoded::parse(query.as_bytes()) {
            let v = v.trim().to_string();
            match &*k {
                "q" => j.q = v,
                "status" if !v.is_empty() && v != "all" => j.status = Some(v),
                "kind" if !v.is_empty() && v != "all" => j.kind = Some(v),
                "sort" => j.sort = v,
                "dir" => j.asc = v == "asc",
                "page" => j.page = v.parse().unwrap_or(1),
                "per" => j.per = v.parse().unwrap_or(50),
                _ => {}
            }
        }
        j.page = j.page.max(1);
        j.per = j.per.clamp(1, 200);
        j
    }

    /// The ORDER BY expression of a sort key; unknown keys fall back to the start time (never user text in SQL).
    fn order(&self, sqlite: bool) -> &'static str {
        match self.sort.as_str() {
            // $6 is the current time, bound by search_jobs for this key only; SQLite stores RFC 3339 text, so it subtracts julian days.
            "duration" if sqlite => "julianday(COALESCE(j.finished_at, $6)) - julianday(j.created_at)",
            "duration" => "COALESCE(j.finished_at, $6) - j.created_at",
            "cost" => "j.cost",
            "account" => "lower(COALESCE(u.name, u.email))",
            "tokens" => "j.prompt_tokens + j.out_tokens",
            "llm_time" => "j.llm_seconds",
            "kind" => "j.kind",
            "status" => "j.status",
            _ => "j.created_at",
        }
    }
}

/// One page of every account's jobs, with the counts the screen needs (per status under the other filters, 24 h totals).
pub async fn search_jobs(cfg: &Config, q: &JobQuery) -> Result<Value, String> {
    let like = format!("%{}%", q.q.replace('\\', "\\\\").replace('%', "\\%").replace('_', "\\_"));
    // $1 text, $2 kind; the status filter ($3) is applied separately so the counts per status ignore it.
    let filter = "($1 = '%%' OR lower(u.email) LIKE lower($1) ESCAPE '\\' OR lower(COALESCE(u.name, '')) LIKE lower($1) ESCAPE '\\'
                   OR lower(j.kind) LIKE lower($1) ESCAPE '\\' OR lower(CAST(j.id AS TEXT)) LIKE lower($1) ESCAPE '\\')
                  AND ($2 IS NULL OR j.kind = $2)";
    let dir = if q.asc { "ASC" } else { "DESC" };
    let sql = format!(
        "{JOB_COLS} WHERE {filter} AND ($3 IS NULL OR j.status = $3)
         ORDER BY {} {dir} NULLS LAST, j.created_at DESC, j.id DESC LIMIT $4 OFFSET $5",
        q.order(cfg.pool.is_sqlite())
    );
    let mut a = args![&like, q.kind.clone(), q.status.clone(), q.per, (q.page - 1) * q.per];
    if q.sort == "duration" {
        a.push(crate::sql::Arg::arg(Utc::now()));
    }
    let rows = cfg.pool.fetch_all(&sql, a).await.map_err(es)?;
    let counts_sql = format!("SELECT j.status, COUNT(*) FROM jobs j JOIN users u ON u.id = j.owner_id WHERE {filter} GROUP BY 1");
    let mut counts = json!({"all": 0, "queued": 0, "running": 0, "done": 0, "failed": 0});
    let mut all = 0i64;
    let mut total = 0i64;
    for r in cfg.pool.fetch_all(&counts_sql, args![&like, q.kind.clone()]).await.map_err(es)? {
        let (status, n): (String, i64) = (r.get(0), r.get(1));
        all += n;
        if q.status.as_deref().is_none_or(|s| s == status) {
            total += n;
        }
        counts[status] = json!(n);
    }
    counts["all"] = json!(all);
    let kinds: Vec<String> =
        cfg.pool.fetch_all("SELECT DISTINCT kind FROM jobs ORDER BY 1", vec![]).await.map_err(es)?.iter().map(|r| r.get(0)).collect();
    let d = cfg.pool.fetch_one("SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'failed'), CAST(COALESCE(SUM(llm_seconds), 0) AS BIGINT), CAST(COALESCE(SUM(prompt_tokens), 0) AS BIGINT),
                CAST(COALESCE(SUM(cached_tokens), 0) AS BIGINT), CAST(COALESCE(SUM(out_tokens), 0) AS BIGINT), SUM(cost)
         FROM jobs WHERE created_at >= $1", args![Utc::now() - chrono::Duration::hours(24)])
    .await
    .map_err(es)?;
    Ok(json!({
        "jobs": rows.iter().map(|r| job_json(r, false)).collect::<Vec<_>>(),
        "total": total,
        "page": q.page,
        "per": q.per,
        "counts": counts,
        "kinds": kinds,
        "last24h": {
            "jobs": d.get::<i64, _>(0), "failed": d.get::<i64, _>(1), "seconds": d.get::<i64, _>(2),
            "prompt": d.get::<i64, _>(3), "cached": d.get::<i64, _>(4), "out": d.get::<i64, _>(5), "cost": d.get::<Option<f64>, _>(6),
        },
    }))
}

pub async fn generations(cfg: &Config, owner: Uuid) -> Result<Value, String> {
    let rows = cfg
        .pool
        .fetch_all(
            "SELECT id, brief_json, model, skill_version, verdict, verdict_note, created_at, html IS NOT NULL,
                notes_json ->> 'batch', notes_json #>> '{direction,label}', jsonb_array_length(notes_json -> 'detect'),
                notes_json #>> '{direction,archetype,name}', project_id, page, target,
                notes_json #>> '{direction,identity,accent}', notes_json #>> '{direction,identity,canvas}', concept_id
         FROM generations WHERE owner_id = $1 ORDER BY created_at DESC, id DESC",
            args![owner],
        )
        .await
        .map_err(es)?;
    let mut out = Vec::with_capacity(rows.len());
    for r in rows {
        let request: Value = r.get(1);
        out.push(json!({
            "id": json!(r.get::<Uuid, _>(0)),
            "brief": brief_text(&request),
            "model": r.get::<String, _>(2),
            "skill_version": r.get::<String, _>(3),
            "verdict": r.get::<Option<String>, _>(4),
            "verdict_note": r.get::<Option<String>, _>(5),
            "created_at": ts(r.get::<DateTime<Utc>, _>(6)),
            "has_html": r.get::<bool, _>(7),
            "batch": r.get::<Option<String>, _>(8),
            "label": r.get::<Option<String>, _>(9),
            "detect_count": r.get::<Option<i32>, _>(10),
            "archetype": r.get::<Option<String>, _>(11),
            "project_id": r.get::<Option<Uuid>, _>(12),
            "page": r.get::<Option<String>, _>(13),
            "target": r.get::<String, _>(14),
            "accent": r.get::<Option<String>, _>(15),
            "canvas": r.get::<Option<String>, _>(16),
            "concept_id": r.get::<Option<Uuid>, _>(17),
        }));
    }
    Ok(Value::Array(out))
}

/// The price of `model` from the settings: the active provider's first, else any provider that prices it.
pub async fn price_for(cfg: &Config, model: &str) -> Result<Option<Price>, String> {
    let Some((providers, active)) = llm_settings(cfg).await? else {
        return Ok(None);
    };
    let price = |p: &Provider| p.models.get(model).and_then(|m| m.price);
    Ok(providers.iter().find(|p| p.id == active.provider).and_then(price).or_else(|| providers.iter().find_map(price)))
}

/// Dollars for the `usage` of a generation's notes (planner call included).
fn cost(notes: &Value, price: &Price) -> Option<f64> {
    let tok =
        |u: &Value| price.cost(u["prompt"].as_u64().unwrap_or(0), u["cached"].as_u64().unwrap_or(0), u["completion"].as_u64().unwrap_or(0));
    let u = notes.get("usage").filter(|u| u.is_object())?;
    Some(tok(u) + u.get("planner").filter(|p| p.is_object()).map_or(0.0, tok))
}

pub async fn generation(cfg: &Config, id: Uuid) -> Result<Option<Value>, String> {
    let Some(row) = cfg.pool.fetch_optional("SELECT id, brief_json, model, skill_version, verdict, verdict_note, created_at, notes_json, html, project_id, page, target, concept_id FROM generations WHERE id = $1", args![id])
        .await
        .map_err(es)?
    else {
        return Ok(None);
    };
    let request: Value = row.get(1);
    let mut g = json!({
        "id": json!(row.get::<Uuid, _>(0)),
        "brief": brief_text(&request),
        "request": request,
        "model": row.get::<String, _>(2),
        "skill_version": row.get::<String, _>(3),
        "verdict": row.get::<Option<String>, _>(4),
        "verdict_note": row.get::<Option<String>, _>(5),
        "created_at": ts(row.get::<DateTime<Utc>, _>(6)),
        "notes": row.get::<Option<Value>, _>(7),
        "html": row.get::<Option<String>, _>(8),
        "project_id": row.get::<Option<Uuid>, _>(9),
        "page": row.get::<Option<String>, _>(10),
        "target": row.get::<String, _>(11),
        "concept_id": row.get::<Option<Uuid>, _>(12),
    });
    let price = price_for(cfg, g["model"].as_str().unwrap_or_default()).await.ok().flatten();
    g["cost"] = json!(price.and_then(|p| cost(&g["notes"], &p)));
    Ok(Some(g))
}

pub async fn set_verdict(cfg: &Config, id: Uuid, verdict: &str, note: Option<&str>) -> Result<bool, String> {
    if !["good", "mixed", "bad"].contains(&verdict) {
        return Err("verdict must be good, mixed or bad".into());
    }
    let n = cfg
        .pool
        .execute("UPDATE generations SET verdict = $1, verdict_note = $2 WHERE id = $3", args![verdict, note, id])
        .await
        .map_err(es)?;
    Ok(n > 0)
}

/// The batch of `parent`, created from `batch` (the running job id) when it has none, so alternatives sit next to it.
pub async fn join_batch(cfg: &Config, parent: Uuid, batch: Uuid) -> Result<String, String> {
    let row = cfg.pool.fetch_optional("UPDATE generations SET notes_json = jsonb_set(COALESCE(notes_json, '{}'::jsonb), '{batch}', COALESCE(notes_json -> 'batch', to_jsonb($2::text))) WHERE id = $1 RETURNING notes_json ->> 'batch'", args![parent, batch.to_string()])
    .await
    .map_err(es)?;
    let Some(row) = row else {
        return Err(format!("generation {parent} not found"));
    };
    Ok(row.get::<String, _>(0))
}

pub async fn projects(cfg: &Config, owner: Uuid) -> Result<Value, String> {
    let rows = cfg.pool.fetch_all("SELECT id, name, created_at, archived_at IS NOT NULL, (SELECT COUNT(*) FROM generations WHERE project_id = projects.id) FROM projects WHERE owner_id = $1 ORDER BY name", args![owner])
    .await
    .map_err(es)?;
    let concepts = cfg.pool.fetch_all("SELECT c.project_id, c.id, c.name, c.identity_id, c.created_at, COUNT(g.id) FROM concepts c JOIN projects p ON p.id = c.project_id LEFT JOIN generations g ON g.concept_id = c.id WHERE p.owner_id = $1 GROUP BY c.id ORDER BY c.created_at, c.id", args![owner])
    .await
    .map_err(es)?;
    let mut out = Vec::with_capacity(rows.len());
    for r in rows {
        let id: Uuid = r.get(0);
        let cs: Vec<Value> = concepts
            .iter()
            .filter(|c| c.get::<Uuid, _>(0) == id)
            .map(|c| {
                json!({
                    "id": json!(c.get::<Uuid, _>(1)),
                    "name": c.get::<String, _>(2),
                    "identity": c.get::<Option<Uuid>, _>(3),
                    "generations": c.get::<i64, _>(5),
                    "created_at": ts(c.get::<DateTime<Utc>, _>(4)),
                })
            })
            .collect();
        out.push(json!({
            "id": json!(id),
            "name": r.get::<String, _>(1),
            "created_at": ts(r.get::<DateTime<Utc>, _>(2)),
            "generations": r.get::<i64, _>(4),
            "concepts": cs,
            "archived": r.get::<bool, _>(3),
        }));
    }
    Ok(Value::Array(out))
}

fn project_name(name: &str) -> Result<&str, String> {
    Some(name.trim()).filter(|n| !n.is_empty()).ok_or_else(|| "name is required".into())
}

fn project_unique_rango(e: rango::Error) -> String {
    if matches!(e, rango::Error::UniqueViolation { .. }) { "a project with that name exists".into() } else { es(e) }
}

fn project_unique_sqlx(e: sqlx::Error) -> String {
    if e.as_database_error().is_some_and(|d| d.is_unique_violation()) { "a project with that name exists".into() } else { es(e) }
}

async fn create_project_inner(cfg: &Config, owner: Uuid, name: &str) -> Result<(Uuid, Uuid, String), String> {
    let name = project_name(name)?;
    let id = Uuid::now_v7();
    let p = models::Project {
        id: FieldUuid(id),
        name: FieldText(name.to_string()),
        owner_id: ForeignKey::new(owner),
        created_at: now(),
        archived_at: None,
    };
    cfg.pool.insert(p).await.map_err(project_unique_rango)?;
    // ponytail: two inserts, not one transaction (rango inserts on the pool); a failure here leaves a project without concept.
    let concept = insert_concept(cfg, id, "Concept 1").await?;
    Ok((id, concept, name.to_string()))
}

async fn insert_concept(cfg: &Config, project: Uuid, name: &str) -> Result<Uuid, String> {
    let id = Uuid::now_v7();
    let c = models::Concept {
        id: FieldUuid(id),
        project_id: ForeignKey::new(project),
        name: FieldText(name.to_string()),
        identity_id: None,
        created_at: now(),
    };
    cfg.pool.insert(c).await.map_err(concept_unique_rango)?;
    Ok(id)
}

pub async fn create_project(cfg: &Config, owner: Uuid, name: &str) -> Result<Value, String> {
    let (id, concept, name) = create_project_inner(cfg, owner, name).await?;
    Ok(json!({"id": json!(id), "name": name, "concept": json!(concept)}))
}

/// Creates a project named `base`, or `base (2)`, `base (3)`… when the name is taken. Returns `(project, concept 1)`.
pub async fn create_project_dedup(cfg: &Config, owner: Uuid, base: &str) -> Result<(Uuid, Uuid), String> {
    for k in 1..=50 {
        let name = if k == 1 { base.to_string() } else { format!("{base} ({k})") };
        match create_project_inner(cfg, owner, &name).await {
            Ok((id, concept, _)) => return Ok((id, concept)),
            Err(e) if e.contains("exists") => continue,
            Err(e) => return Err(e),
        }
    }
    Err("too many projects with that name".into())
}

fn concept_unique_rango(e: rango::Error) -> String {
    if matches!(e, rango::Error::UniqueViolation { .. }) { "a concept with that name exists".into() } else { es(e) }
}

fn concept_name(name: &str) -> Result<&str, String> {
    let n = name.trim();
    if (1..=60).contains(&n.chars().count()) { Ok(n) } else { Err("concept name must be 1 to 60 characters".into()) }
}

/// Adds a concept to the project: `name`, or the first free "Concept N" with N > the concept count.
pub async fn create_concept(cfg: &Config, project: Uuid, name: Option<&str>) -> Result<Value, String> {
    let name = match name {
        Some(n) => concept_name(n)?.to_string(),
        None => {
            let rows = cfg.pool.fetch_all("SELECT name FROM concepts WHERE project_id = $1", args![project]).await.map_err(es)?;
            let taken: Vec<String> = rows.iter().map(|r| r.get(0)).collect();
            let n = (taken.len() + 1..).find(|n| !taken.contains(&format!("Concept {n}"))).unwrap_or(1);
            format!("Concept {n}")
        }
    };
    let id = insert_concept(cfg, project, &name).await?;
    Ok(json!({"id": json!(id), "name": name}))
}

pub async fn rename_concept(cfg: &Config, id: Uuid, name: &str) -> Result<Option<Value>, String> {
    let name = concept_name(name)?;
    let n = cfg.pool.execute("UPDATE concepts SET name = $1 WHERE id = $2", args![name, id]).await.map_err(|e| {
        if e.as_database_error().is_some_and(|d| d.is_unique_violation()) { "a concept with that name exists".into() } else { es(e) }
    })?;
    Ok((n > 0).then(|| json!({"id": json!(id), "name": name})))
}

/// Deletes the concept (not the project's last one); its generations stay in the project, without a concept.
pub async fn delete_concept(cfg: &Config, id: Uuid) -> Result<Option<Value>, String> {
    let Some(project) = concept_project(cfg, id).await? else {
        return Ok(None);
    };
    let n = cfg
        .pool
        .execute("DELETE FROM concepts WHERE id = $1 AND (SELECT COUNT(*) FROM concepts WHERE project_id = $2) > 1", args![id, project])
        .await
        .map_err(es)?;
    if n == 0 {
        return Err("a project keeps at least one concept".into());
    }
    Ok(Some(json!({"id": json!(id)})))
}

/// The project a concept belongs to (for ownership checks).
pub async fn concept_project(cfg: &Config, concept: Uuid) -> Result<Option<Uuid>, String> {
    Ok(cfg.pool.fetch_optional("SELECT project_id FROM concepts WHERE id = $1", args![concept]).await.map_err(es)?.map(|r| r.get(0)))
}

pub async fn rename_project(cfg: &Config, id: Uuid, name: &str) -> Result<Option<Value>, String> {
    let name = project_name(name)?;
    let n = cfg.pool.execute("UPDATE projects SET name = $1 WHERE id = $2", args![name, id]).await.map_err(project_unique_sqlx)?;
    Ok((n > 0).then(|| json!({"id": json!(id), "name": name})))
}

/// Archives (or restores) the project. An archived project is read-only: no new generation, edit or identity change.
pub async fn set_archived(cfg: &Config, id: Uuid, archived: bool) -> Result<Option<Value>, String> {
    let n = cfg
        .pool
        .execute("UPDATE projects SET archived_at = CASE WHEN $1 THEN COALESCE(archived_at, now()) END WHERE id = $2", args![archived, id])
        .await
        .map_err(es)?;
    Ok((n > 0).then(|| json!({"id": json!(id), "archived": archived})))
}

/// Whether the project `id` (table "projects"), or the project of the generation `id` (table "generations"), is archived.
pub async fn archived(cfg: &Config, table: &str, id: Uuid) -> Result<bool, String> {
    let sql = if table == "projects" {
        "SELECT archived_at IS NOT NULL FROM projects WHERE id = $1"
    } else {
        "SELECT p.archived_at IS NOT NULL FROM generations g JOIN projects p ON p.id = g.project_id WHERE g.id = $1"
    };
    let row = cfg.pool.fetch_optional(sql, args![id]).await.map_err(es)?;
    Ok(row.map(|r| r.get::<bool, _>(0)).unwrap_or(false))
}

/// Deletes the project; its generations stay, unsorted.
pub async fn delete_project(cfg: &Config, id: Uuid) -> Result<Option<Value>, String> {
    let mut tx = cfg.pool.begin().await.map_err(es)?;
    let unsorted = tx.execute("UPDATE generations SET project_id = NULL WHERE project_id = $1", args![id]).await.map_err(es)?;
    let n = tx.execute("DELETE FROM projects WHERE id = $1", args![id]).await.map_err(es)?;
    tx.commit().await.map_err(es)?;
    Ok((n > 0).then(|| json!({"unsorted": unsorted})))
}

/// Deletes the generations; a concept whose identity was one of them loses its identity.
pub async fn delete_generations(cfg: &Config, ids: &[Uuid]) -> Result<usize, String> {
    let mut tx = cfg.pool.begin().await.map_err(es)?;
    // One statement per id: a bound array has no SQLite equivalent.
    let mut deleted = 0;
    for id in ids {
        tx.execute("UPDATE concepts SET identity_id = NULL WHERE identity_id = $1", args![*id]).await.map_err(es)?;
        deleted += tx.execute("DELETE FROM generations WHERE id = $1", args![*id]).await.map_err(es)? as usize;
    }
    tx.commit().await.map_err(es)?;
    Ok(deleted)
}

/// Sets (or clears, with `None`) the generation whose direction is the concept's identity.
pub async fn set_identity(cfg: &Config, concept: Uuid, generation: Option<Uuid>) -> Result<Option<Value>, String> {
    if let Some(g) = generation {
        let ok: bool = cfg
            .pool
            .fetch_one(
                "SELECT EXISTS (SELECT 1 FROM generations WHERE id = $1 AND concept_id = $2 AND notes_json -> 'direction' IS NOT NULL)",
                args![g, concept],
            )
            .await
            .map_err(es)?
            .get(0);
        if !ok {
            return Err("the generation must belong to the concept and have a direction".into());
        }
    }
    let n = cfg.pool.execute("UPDATE concepts SET identity_id = $1 WHERE id = $2", args![generation, concept]).await.map_err(es)?;
    Ok((n > 0).then(|| json!({"id": json!(concept), "identity": generation})))
}

/// Moves any concept identity pointing at `from` to `to` (a live edit of the identity stays the identity).
pub async fn move_identity(cfg: &Config, from: Uuid, to: Uuid) -> Result<(), String> {
    cfg.pool.execute("UPDATE concepts SET identity_id = $1 WHERE identity_id = $2", args![to, from]).await.map_err(es)?;
    Ok(())
}

/// Moves generation `id` into concept `to` (same project only). A concept whose identity it was loses it; an empty `to` takes a look (no page) as its identity.
pub async fn move_generation(cfg: &Config, id: Uuid, to: Uuid) -> Result<bool, String> {
    let mut tx = cfg.pool.begin().await.map_err(es)?;
    let ok: bool = tx
        .fetch_one(
            "SELECT EXISTS (SELECT 1 FROM generations g JOIN concepts c ON c.project_id = g.project_id WHERE g.id = $1 AND c.id = $2)",
            args![id, to],
        )
        .await
        .map_err(es)?
        .get(0);
    if !ok {
        return Err("the concept must be in the generation's project".into());
    }
    tx.execute("UPDATE concepts SET identity_id = NULL WHERE identity_id = $1 AND id <> $2", args![id, to]).await.map_err(es)?;
    let moved = tx.execute("UPDATE generations SET concept_id = $2 WHERE id = $1", args![id, to]).await.map_err(es)?;
    tx.execute("UPDATE concepts SET identity_id = $1 WHERE id = $2 AND identity_id IS NULL AND EXISTS (SELECT 1 FROM generations WHERE id = $1 AND COALESCE(TRIM(page), '') = '' AND notes_json -> 'direction' IS NOT NULL)", args![id, to])
    .await
    .map_err(es)?;
    tx.commit().await.map_err(es)?;
    Ok(moved > 0)
}

/// The concept's identity generation as `{id, request, notes, html, created_at}`, `None` when none is picked.
pub async fn identity(cfg: &Config, concept: Uuid) -> Result<Option<Value>, String> {
    let row = cfg.pool.fetch_optional("SELECT g.id, g.brief_json, g.notes_json, g.html, g.created_at FROM concepts c JOIN generations g ON g.id = c.identity_id WHERE c.id = $1", args![concept])
        .await
        .map_err(es)?;
    Ok(row.map(|r| {
        let id: Uuid = r.get(0);
        let request: Value = r.get(1);
        json!({
            "id": json!(id),
            "request": request,
            "notes": r.get::<Option<Value>, _>(2),
            "html": r.get::<Option<String>, _>(3),
            "created_at": ts(r.get::<DateTime<Utc>, _>(4))
        })
    }))
}

/// One generation per (page, target) of the concept: a `good` one if any, else the latest. `(page, target, id, html, brief)`.
pub async fn concept_pages(cfg: &Config, concept: Uuid) -> Result<Vec<(String, String, Uuid, String, String)>, String> {
    let rows = cfg.pool.fetch_all("SELECT page, target, id, html, brief_json->>'brief' FROM generations WHERE concept_id = $1 AND page IS NOT NULL AND html IS NOT NULL ORDER BY page, target, CASE WHEN verdict = 'good' THEN 0 ELSE 1 END, created_at DESC, id DESC", args![concept])
    .await
    .map_err(es)?;
    let mut pages = rows
        .into_iter()
        .map(|r| {
            (
                r.get::<String, _>(0),
                r.get::<String, _>(1),
                r.get::<Uuid, _>(2),
                r.get::<String, _>(3),
                r.get::<Option<String>, _>(4).unwrap_or_default(),
            )
        })
        .collect::<Vec<_>>();
    pages.dedup_by(|a, b| a.0 == b.0 && a.1 == b.1);
    Ok(pages)
}

/// The generate request for an alternative of `id`: same brief and seed, one variant, `archetype` forced, joined to its batch.
pub async fn alternative_request(cfg: &Config, id: Uuid, archetype: &str) -> Result<Value, String> {
    let Some(row) = cfg
        .pool
        .fetch_optional("SELECT brief_json, (notes_json ->> 'seed')::bigint, concept_id FROM generations WHERE id = $1", args![id])
        .await
        .map_err(es)?
    else {
        return Err(format!("generation {id} not found"));
    };
    let mut req: Value = row.get(0);
    let seed: Option<i64> = row.get(1);
    let concept: Option<Uuid> = row.get(2);
    let o = req.as_object_mut().ok_or("stored request is not an object")?;
    o.insert("variants".into(), json!(1));
    if let Some(s) = seed {
        o.insert("seed".into(), json!(s));
    }
    if let Some(c) = concept {
        o.insert("concept".into(), json!(c));
    }
    o.insert("archetype".into(), json!(archetype));
    o.insert("parent".into(), json!(id));
    Ok(req)
}

// Share links.
pub async fn create_share(
    cfg: &Config,
    owner: Uuid,
    generation: Option<Uuid>,
    concept: Option<Uuid>,
    expires_days: Option<u32>,
) -> Result<(Uuid, String), String> {
    if generation.is_some() == concept.is_some() {
        return Err("share one generation or one concept".into());
    }
    if let Some(d) = expires_days
        && !(1..=365).contains(&d)
    {
        return Err("expires_days must be 1 to 365".into());
    }
    let token = new_token()?;
    let id = Uuid::now_v7();
    let s = models::Share {
        id: FieldUuid(id),
        token_hash: FieldText(sha256_hex(&token)),
        owner_id: ForeignKey::new(owner),
        generation_id: generation.map(ForeignKey::new),
        concept_id: concept.map(ForeignKey::new),
        created_at: now(),
        expires_at: expires_days.map(|n| FieldDateTime(Utc::now() + chrono::Duration::days(n as i64))),
    };
    cfg.pool.insert(s).await.map_err(es)?;
    Ok((id, token))
}

pub async fn shares(cfg: &Config, owner: Uuid) -> Result<Value, String> {
    let rows = cfg
        .pool
        .fetch_all(
            "SELECT s.id, s.generation_id, s.concept_id, s.created_at, s.expires_at,
                s.expires_at IS NOT NULL AND s.expires_at <= now(),
                CASE WHEN s.concept_id IS NOT NULL THEN p.name || ' · ' || c.name
                     ELSE COALESCE(g.page, g.notes_json #>> '{direction,label}', '#' || right(g.id::text, 8), 'deleted') END
         FROM shares s
         LEFT JOIN concepts c ON c.id = s.concept_id
         LEFT JOIN projects p ON p.id = c.project_id
         LEFT JOIN generations g ON g.id = s.generation_id
         WHERE s.owner_id = $1
         ORDER BY s.created_at DESC, s.id DESC",
            args![owner],
        )
        .await
        .map_err(es)?;
    let mut out = Vec::with_capacity(rows.len());
    for r in rows {
        out.push(json!({
            "id": json!(r.get::<Uuid, _>(0)),
            "generation_id": r.get::<Option<Uuid>, _>(1),
            "concept_id": r.get::<Option<Uuid>, _>(2),
            "created_at": ts(r.get::<DateTime<Utc>, _>(3)),
            "expires_at": r.get::<Option<DateTime<Utc>>, _>(4).map(ts),
            "expired": r.get::<bool, _>(5),
            "label": r.get::<String, _>(6),
        }));
    }
    Ok(Value::Array(out))
}

pub async fn revoke_share(cfg: &Config, owner: Uuid, id: Uuid) -> Result<bool, String> {
    let n = cfg.pool.execute("DELETE FROM shares WHERE id = $1 AND owner_id = $2", args![id, owner]).await.map_err(es)?;
    Ok(n > 0)
}

#[derive(Debug, PartialEq)]
pub struct SharedScreen {
    pub id: Uuid,
    pub label: String,
    pub target: String,
}

pub async fn shared_screens(cfg: &Config, token: &str) -> Result<Option<(String, Vec<SharedScreen>)>, String> {
    if token.len() != 64 || !token.bytes().all(|b| matches!(b, b'0'..=b'9' | b'a'..=b'f')) {
        return Ok(None);
    }
    let Some(row) = cfg
        .pool
        .fetch_optional(
            "SELECT generation_id, concept_id FROM shares WHERE token_hash = $1 AND (expires_at IS NULL OR expires_at > now())",
            args![sha256_hex(token)],
        )
        .await
        .map_err(es)?
    else {
        return Ok(None);
    };
    let generation: Option<Uuid> = row.get(0);
    let concept: Option<Uuid> = row.get(1);
    if let Some(gid) = generation {
        let Some(row) = cfg.pool.fetch_optional("SELECT COALESCE(page, notes_json #>> '{direction,label}', '#' || right(id::text, 8), 'deleted'), html IS NOT NULL, target FROM generations WHERE id = $1", args![gid])
            .await
            .map_err(es)?
        else {
            return Ok(None);
        };
        let label: String = row.get(0);
        let has_html: bool = row.get(1);
        let target: String = row.get(2);
        let screens: Vec<SharedScreen> = has_html.then(|| SharedScreen { id: gid, label: label.clone(), target }).into_iter().collect();
        return Ok(Some((label, screens)));
    }
    let Some(cid) = concept else {
        return Ok(None);
    };
    let Some(row) = cfg
        .pool
        .fetch_optional(
            "SELECT p.name || ' · ' || c.name FROM concepts c JOIN projects p ON p.id = c.project_id WHERE c.id = $1",
            args![cid],
        )
        .await
        .map_err(es)?
    else {
        return Ok(None);
    };
    let title: String = row.get(0);
    let mut screens = vec![];
    let identity_row = cfg
        .pool
        .fetch_optional(
            "SELECT g.id, g.target FROM concepts c JOIN generations g ON g.id = c.identity_id WHERE c.id = $1 AND g.html IS NOT NULL",
            args![cid],
        )
        .await
        .map_err(es)?;
    if let Some(row) = identity_row {
        let id: Uuid = row.get(0);
        let target: String = row.get(1);
        screens.push(SharedScreen { id, label: "Main screen".into(), target });
    }
    for (page, target, id, _html, _brief) in concept_pages(cfg, cid).await? {
        if !screens.iter().any(|s| s.id == id) {
            screens.push(SharedScreen { id, label: page, target });
        }
    }
    Ok(Some((title, screens)))
}

pub async fn shared_html(cfg: &Config, token: &str, gid: Uuid) -> Result<Option<String>, String> {
    let Some((_, screens)) = shared_screens(cfg, token).await? else {
        return Ok(None);
    };
    if !screens.iter().any(|s| s.id == gid) {
        return Ok(None);
    }
    Ok(cfg
        .pool
        .fetch_optional("SELECT html FROM generations WHERE id = $1", args![gid])
        .await
        .map_err(es)?
        .and_then(|r| r.get::<Option<String>, _>(0)))
}

#[cfg(test)]
mod tests {
    use super::*;

    const LOCAL: Uuid = Uuid::from_u128(1); // the admin user seeded by the migrations

    async fn test_cfg() -> Config {
        let mut cfg = Config::new(crate::sql::test_db().await, tokio::runtime::Handle::current(), 0);
        cfg.key_file = std::env::temp_dir().join(format!("studio-test-{}.key", Uuid::new_v4().simple()));
        cfg
    }

    /// A stored generation (model "m", skill "v") and its id.
    async fn add_gen(cfg: &Config, concept: Option<Uuid>, page: Option<&str>, target: &str, notes: Value) -> Uuid {
        insert_generation(
            cfg,
            NewGeneration {
                request: &json!({"brief": "b"}),
                notes: &notes,
                html: "<p>x</p>",
                skill_version: "v",
                project: None,
                concept,
                page,
                target,
                owner: LOCAL,
                model: "m",
            },
        )
        .await
        .unwrap()
    }

    #[tokio::test]
    async fn routes_put_planner_first_and_append_fallbacks() {
        let cfg = test_cfg().await;
        let body = json!({
            "providers": [
                {"id": "a", "name": "A", "base_url": "http://h:1/v1", "models": ["m1"]},
                {"id": "b", "name": "B", "base_url": "http://h:2/v1", "models": ["m2"]}
            ],
            "active": {"provider": "a", "model": "m1"},
            "routing": {
                "planner": {"provider": "b", "model": "m2"},
                "fallbacks": [
                    {"provider": "b", "model": "m2"},
                    {"provider": "a", "model": "m1"}
                ]
            }
        });
        save_llm_settings(&cfg, &body).await.unwrap();
        let routes = cfg.routes();
        assert_eq!(routes.planner.iter().map(|l| l.model.clone()).collect::<Vec<_>>(), vec!["m2".to_string(), "m1".to_string()]);
        assert_eq!(routes.generator.iter().map(|l| l.model.clone()).collect::<Vec<_>>(), vec!["m1".to_string(), "m2".to_string()]);
    }

    #[tokio::test]
    async fn extras_must_be_objects() {
        let cfg = test_cfg().await;
        let bad = json!({
            "providers": [
                {"id": "p", "name": "P", "base_url": "http://h:1/v1", "models": ["m"], "extras": {"m": [1]}}
            ],
            "active": {"provider": "p", "model": "m"}
        });
        let err = save_llm_settings(&cfg, &bad).await.unwrap_err();
        assert!(err.contains("provider p: extras for m must be a JSON object"));

        let good = json!({
            "providers": [
                {"id": "p", "name": "P", "base_url": "http://h:1/v1", "models": ["m"], "extras": {"m": {"provider": {"only": ["deepinfra"]}}}}
            ],
            "active": {"provider": "p", "model": "m"}
        });
        save_llm_settings(&cfg, &good).await.unwrap();
        assert_eq!(cfg.llm().extra, json!({"provider": {"only": ["deepinfra"]}}));
        assert_eq!(cfg.routes().generator[0].extra, json!({"provider": {"only": ["deepinfra"]}}));
    }

    /// A new project and its "Concept 1": `(project, concept)`.
    async fn new_project(cfg: &Config, owner: Uuid, name: &str) -> (Uuid, Uuid) {
        let v = create_project(cfg, owner, name).await.unwrap();
        (serde_json::from_value(v["id"].clone()).unwrap(), serde_json::from_value(v["concept"].clone()).unwrap())
    }

    #[tokio::test]
    async fn first_start_stores_a_default_provider() {
        let cfg = test_cfg().await;
        load_llm_settings(&cfg).await.unwrap();
        let Some((providers, active)) = llm_settings(&cfg).await.unwrap() else {
            panic!("expected default llm settings");
        };
        assert_eq!(providers.len(), 1);
        assert_eq!(providers[0].id, "default");
        assert_eq!(active.provider, "default");
        assert_eq!(active.model, cfg.llm().model);
    }

    #[tokio::test]
    async fn prices_are_optional_per_model() {
        let cfg = test_cfg().await;
        let body = json!({"providers": [{"id": "p", "name": "P", "base_url": "http://h:1/v1", "models": ["m1", "m2"],
            "prices": {"m1": {"input_per_m": 1, "cached_per_m": 0.1, "output_per_m": 5}}}], "active": {"provider": "p", "model": "m1"}});
        save_llm_settings(&cfg, &body).await.unwrap();
        let p = Price { input_per_m: 1.0, cached_per_m: 0.1, output_per_m: 5.0 };
        assert_eq!((price_for(&cfg, "m1").await.unwrap(), price_for(&cfg, "m2").await.unwrap()), (Some(p), None));
        assert_eq!(cost(&json!({"usage": {"prompt": 1_000_000, "cached": 0, "completion": 0}}), &p), Some(1.0));
    }

    #[tokio::test]
    async fn parallel_is_per_provider_and_bounded() {
        let cfg = test_cfg().await;
        let body = |active: &str| {
            json!({
                "providers": [
                    {"id": "api", "name": "A", "base_url": "http://h:1/v1", "models": ["m"], "parallel": 3},
                    {"id": "local", "name": "L", "base_url": "http://h:2/v1", "models": ["m"]}
                ],
                "active": {"provider": active, "model": "m"}
            })
        };
        save_llm_settings(&cfg, &body("api")).await.unwrap();
        assert_eq!(cfg.llm().parallel, 3);
        save_llm_settings(&cfg, &body("local")).await.unwrap();
        assert_eq!(cfg.llm().parallel, 1);
        let bad = json!({
            "providers": [{"id": "p", "name": "P", "base_url": "http://h:1/v1", "models": ["m"], "parallel": 4}],
            "active": {"provider": "p", "model": "m"}
        });
        assert!(save_llm_settings(&cfg, &bad).await.unwrap_err().contains("parallel"));
    }

    #[tokio::test]
    async fn status_shows_only_the_actors_jobs() {
        let cfg = test_cfg().await;
        signup(&cfg, "Test User", "admin@example.com", "a long password", "test").await.unwrap(); // the first signup claims the admin
        signup(&cfg, "Test User", "other@example.com", "a long password", "test").await.unwrap();
        let other: Uuid = cfg.pool.fetch_one("SELECT id FROM users WHERE email = 'other@example.com'", vec![]).await.unwrap().get(0);
        for (owner, kind) in [(LOCAL, "generate"), (other, "generate"), (other, "brief")] {
            cfg.pool
                .execute(
                    "INSERT INTO jobs (id, kind, status, owner_id, created_at) VALUES ($1, $2, 'running', $3, $4)",
                    args![Uuid::now_v7(), kind, owner, Utc::now()],
                )
                .await
                .unwrap();
        }
        let s = status(&cfg, other, false, false).await.unwrap();
        assert_eq!((s["my_jobs"].as_array().map(Vec::len), s.get("jobs_running")), (Some(1), None));
        assert_eq!(status(&cfg, LOCAL, true, false).await.unwrap()["jobs_running"], json!(3));
        assert_eq!((active_jobs(&cfg, other).await.unwrap(), active_jobs(&cfg, LOCAL).await.unwrap()), (2, 1));
    }

    #[tokio::test]
    async fn a_failed_job_says_why() {
        let cfg = test_cfg().await;
        let id = Uuid::now_v7();
        cfg.pool.execute("INSERT INTO jobs (id, kind, status, owner_id, log, llm_calls, llm_seconds, prompt_tokens, cached_tokens, out_tokens, cost, created_at)
                     VALUES ($1, 'generate', 'failed', $2, 'planning\nerror: model unreachable\n', 2, 42, 3200, 1000, 550, 0.25, $3)", args![id, LOCAL, Utc::now()])
        .await
        .unwrap();
        assert_eq!(job(&cfg, id).await.unwrap().unwrap()["error"], json!("model unreachable"));
        let list = jobs(&cfg, Some(LOCAL)).await.unwrap();
        let row = list.as_array().unwrap().iter().find(|j| j["id"] == json!(id)).unwrap();
        assert_eq!(row["error"], json!("model unreachable"));
        assert_eq!(row["owner"]["id"], json!(LOCAL));
        let l = &row["llm"];
        assert_eq!(
            (&l["calls"], &l["seconds"], &l["prompt"], &l["cached"], &l["out"], &l["cost"]),
            (&json!(2), &json!(42), &json!(3200), &json!(1000), &json!(550), &json!(0.25))
        );
    }

    #[tokio::test]
    async fn admin_job_search_sorts_filters_and_pages() {
        let cfg = test_cfg().await;
        // A kind of its own keeps this test apart from the other jobs of the shared test database.
        let kind = format!("k{}", Uuid::now_v7().simple());
        for (status, cost) in [("done", Some(0.5)), ("failed", None), ("done", Some(2.0))] {
            cfg.pool
                .execute(
                    "INSERT INTO jobs (id, kind, status, owner_id, cost, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
                    args![Uuid::now_v7(), &kind, status, LOCAL, cost, Utc::now()],
                )
                .await
                .unwrap();
        }
        let q = JobQuery::parse(&format!("q={kind}&sort=cost&dir=desc&per=2"));
        let r = search_jobs(&cfg, &q).await.unwrap();
        let costs: Vec<_> = r["jobs"].as_array().unwrap().iter().map(|j| j["llm"]["cost"].clone()).collect();
        assert_eq!(costs, vec![json!(2.0), json!(0.5)], "dearest first, unpriced last");
        assert_eq!((r["total"].clone(), r["counts"]["all"].clone(), r["counts"]["failed"].clone()), (json!(3), json!(3), json!(1)));
        let page2 = search_jobs(&cfg, &JobQuery { page: 2, ..q }).await.unwrap();
        assert_eq!(page2["jobs"][0]["llm"]["cost"], Value::Null);
        let failed = search_jobs(&cfg, &JobQuery::parse(&format!("q={kind}&status=failed"))).await.unwrap();
        assert_eq!((failed["total"].clone(), failed["counts"]["all"].clone()), (json!(1), json!(3)), "counts ignore the status filter");
        let none = search_jobs(&cfg, &JobQuery::parse(&format!("q={kind}_nobody"))).await.unwrap();
        assert_eq!(none["total"], json!(0));
        let by_duration = search_jobs(&cfg, &JobQuery::parse(&format!("q={kind}&sort=duration"))).await.unwrap();
        assert_eq!(by_duration["total"], json!(3), "unfinished jobs count up to now");
    }

    #[tokio::test]
    async fn admin_job_search_ignores_case() {
        let cfg = test_cfg().await;
        let (alice, kind) = (Uuid::now_v7(), format!("k{}", Uuid::now_v7().simple()));
        let email = format!("Alice{}@X.io", alice.simple());
        cfg.pool.execute("INSERT INTO users (id, email, created_at) VALUES ($1, $2, $3)", args![alice, &email, Utc::now()]).await.unwrap();
        cfg.pool
            .execute(
                "INSERT INTO jobs (id, kind, status, owner_id, created_at) VALUES ($1, $2, 'done', $3, $4)",
                args![Uuid::now_v7(), &kind, alice, Utc::now()],
            )
            .await
            .unwrap();
        for q in [email.to_lowercase(), email.to_uppercase()] {
            let r = search_jobs(&cfg, &JobQuery::parse(&format!("q={q}"))).await.unwrap();
            assert_eq!(r["total"], json!(1), "search for {q}");
        }
    }

    #[test]
    fn job_query_bounds_its_input() {
        let q = JobQuery::parse("page=-3&per=99999&sort=x;drop&dir=asc");
        assert_eq!((q.page, q.per, q.asc, q.order(false)), (1, 200, true, "j.created_at"));
    }

    #[tokio::test]
    async fn alternatives_join_the_parent_batch() {
        let cfg = test_cfg().await;
        let p = add_gen(&cfg, None, None, "desktop", json!({"seed": 42})).await;
        let _child = add_gen(&cfg, None, None, "desktop", json!({})).await;

        let r = alternative_request(&cfg, p, "terminal").await.unwrap();
        assert_eq!(
            (r["variants"].as_i64(), r["seed"].as_i64(), r["archetype"].as_str(), r["parent"].clone(), r["brief"].as_str()),
            (Some(1), Some(42), Some("terminal"), json!(p), Some("b"))
        );

        let j1 = Uuid::now_v7();
        let j2 = Uuid::now_v7();
        assert_eq!((join_batch(&cfg, p, j1).await.unwrap(), join_batch(&cfg, p, j2).await.unwrap()), (j1.to_string(), j1.to_string()));

        let stored = generation(&cfg, p).await.unwrap().unwrap();
        assert_eq!(stored["notes"]["batch"], json!(j1.to_string()));
    }

    #[tokio::test]
    async fn deleting_a_project_keeps_its_generations() {
        let cfg = test_cfg().await;
        let (p, c) = new_project(&cfg, LOCAL, " Acme ").await;
        assert!(create_project(&cfg, LOCAL, "Acme").await.is_err());
        assert!(create_project(&cfg, LOCAL, " ").await.is_err());

        let _g = add_gen(&cfg, Some(c), None, "desktop", json!({})).await;
        assert_eq!(generations(&cfg, LOCAL).await.unwrap()[0]["project_id"], json!(p));
        assert_eq!(generations(&cfg, LOCAL).await.unwrap()[0]["concept_id"], json!(c));
        assert_eq!(projects(&cfg, LOCAL).await.unwrap()[0]["generations"], json!(1));

        assert_eq!(delete_project(&cfg, p).await.unwrap(), Some(json!({"unsorted": 1})));
        assert!(generations(&cfg, LOCAL).await.unwrap()[0]["project_id"].is_null());
        assert!(generations(&cfg, LOCAL).await.unwrap()[0]["concept_id"].is_null());
        assert_eq!(delete_project(&cfg, p).await.unwrap(), None);
    }

    #[tokio::test]
    async fn concepts() {
        let cfg = test_cfg().await;
        let (p, c1) = new_project(&cfg, LOCAL, "Acme").await;
        let c2 = serde_json::from_value::<Uuid>(create_concept(&cfg, p, None).await.unwrap()["id"].clone()).unwrap();
        let names = |v: &Value| -> Vec<String> {
            v[0]["concepts"].as_array().unwrap().iter().map(|c| c["name"].as_str().unwrap().into()).collect()
        };
        assert_eq!(names(&projects(&cfg, LOCAL).await.unwrap()), ["Concept 1", "Concept 2"]);
        assert!(create_concept(&cfg, p, Some("Concept 1")).await.is_err());
        assert!(create_concept(&cfg, p, Some(" ")).await.is_err());
        assert_eq!(create_concept(&cfg, p, None).await.unwrap()["name"], json!("Concept 3"));

        assert_eq!(rename_concept(&cfg, c2, " Bold ").await.unwrap().unwrap()["name"], json!("Bold"));
        assert!(rename_concept(&cfg, c2, "Concept 1").await.is_err());

        let g = add_gen(&cfg, Some(c2), None, "desktop", json!({"direction": {}})).await;
        assert_eq!(concept_project(&cfg, c2).await.unwrap(), Some(p));
        assert!(set_identity(&cfg, c1, Some(g)).await.is_err());
        set_identity(&cfg, c2, Some(g)).await.unwrap();
        assert!(identity(&cfg, c1).await.unwrap().is_none());
        assert_eq!(identity(&cfg, c2).await.unwrap().unwrap()["id"], json!(g));

        // The generation outlives its concept, still in the project.
        assert!(delete_concept(&cfg, c2).await.unwrap().is_some());
        assert_eq!(generations(&cfg, LOCAL).await.unwrap()[0]["project_id"], json!(p));
        let rest = projects(&cfg, LOCAL).await.unwrap();
        assert_eq!(rest[0]["concepts"].as_array().unwrap().len(), 2);
        for c in rest[0]["concepts"].as_array().unwrap().clone() {
            let id = serde_json::from_value::<Uuid>(c["id"].clone()).unwrap();
            if id != c1 {
                delete_concept(&cfg, id).await.unwrap();
            }
        }
        assert!(delete_concept(&cfg, c1).await.is_err());
        assert_eq!(delete_concept(&cfg, Uuid::now_v7()).await.unwrap(), None);
    }

    #[tokio::test]
    async fn moving_a_generation_between_concepts() {
        let cfg = test_cfg().await;
        let (p, c1) = new_project(&cfg, LOCAL, "Acme").await;
        let c2 = serde_json::from_value::<Uuid>(create_concept(&cfg, p, None).await.unwrap()["id"].clone()).unwrap();
        let look = add_gen(&cfg, Some(c1), None, "desktop", json!({"direction": {}})).await;
        set_identity(&cfg, c1, Some(look)).await.unwrap();
        assert_eq!(identity(&cfg, c1).await.unwrap().unwrap()["id"], json!(look));

        assert!(move_generation(&cfg, look, c2).await.unwrap());
        assert!(identity(&cfg, c1).await.unwrap().is_none());
        assert_eq!(identity(&cfg, c2).await.unwrap().unwrap()["id"], json!(look));

        let page = add_gen(&cfg, Some(c2), Some("Home"), "desktop", json!({"direction": {}})).await;
        assert!(move_generation(&cfg, page, c1).await.unwrap());
        assert!(identity(&cfg, c1).await.unwrap().is_none());

        let (_, c3) = new_project(&cfg, LOCAL, "Other").await;
        assert!(move_generation(&cfg, look, c3).await.is_err());
    }

    #[tokio::test]
    async fn project_names_dedup() {
        let cfg = test_cfg().await;
        let a = create_project_dedup(&cfg, LOCAL, "Bakery").await.unwrap().0;
        let b = create_project_dedup(&cfg, LOCAL, "Bakery").await.unwrap().0;
        assert_ne!(a, b);

        let names: Vec<String> =
            projects(&cfg, LOCAL).await.unwrap().as_array().unwrap().iter().map(|p| p["name"].as_str().unwrap().to_string()).collect();
        assert!(names.contains(&"Bakery".to_string()) && names.contains(&"Bakery (2)".to_string()));
    }

    #[tokio::test]
    async fn deleting_generations_clears_identity() {
        let cfg = test_cfg().await;
        let (_, p) = new_project(&cfg, LOCAL, "Acme").await;
        let g1 = add_gen(&cfg, Some(p), None, "desktop", json!({"direction": {"label": "x"}})).await;
        let g2 = add_gen(&cfg, Some(p), None, "desktop", json!({"direction": {"label": "x"}})).await;

        set_identity(&cfg, p, Some(g1)).await.unwrap();
        let unknown = Uuid::now_v7();
        assert_eq!(delete_generations(&cfg, &[g1, g2, unknown]).await, Ok(2));

        assert!(generations(&cfg, LOCAL).await.unwrap().as_array().unwrap().is_empty());
        assert!(projects(&cfg, LOCAL).await.unwrap()[0]["concepts"][0]["identity"].is_null());
    }

    #[tokio::test]
    async fn identity_and_pages() {
        let cfg = test_cfg().await;
        let (pa, a) = new_project(&cfg, LOCAL, "A").await;
        let (_, b) = new_project(&cfg, LOCAL, "B").await;

        let notes = json!({"direction": {"label": "x"}});
        let g1 = add_gen(&cfg, Some(a), None, "desktop", notes.clone()).await;
        let g2 = add_gen(&cfg, Some(a), Some("Home"), "desktop", notes.clone()).await;
        set_verdict(&cfg, g2, "good", None).await.unwrap();
        let _g3 = add_gen(&cfg, Some(a), Some("Home"), "desktop", notes.clone()).await;
        let _g4 = add_gen(&cfg, Some(a), Some("Home"), "mobile", notes).await;

        assert!(set_identity(&cfg, a, Some(g1)).await.is_ok());
        assert!(set_identity(&cfg, b, Some(g1)).await.is_err());
        assert_eq!(identity(&cfg, a).await.unwrap().unwrap()["id"], json!(g1));

        let pages = concept_pages(&cfg, a).await.unwrap();
        assert_eq!(pages.len(), 2);
        assert_eq!((pages[0].0.as_str(), pages[0].1.as_str(), pages[0].2), ("Home", "desktop", g2));
        assert_eq!(pages[1].1, "mobile");

        assert!(!archived(&cfg, "generations", g1).await.unwrap());
        set_archived(&cfg, pa, true).await.unwrap();
        assert!(archived(&cfg, "projects", pa).await.unwrap() && archived(&cfg, "generations", g1).await.unwrap());
        assert_eq!(projects(&cfg, LOCAL).await.unwrap()[0]["archived"], json!(true));
        set_archived(&cfg, pa, false).await.unwrap();
        assert!(!archived(&cfg, "projects", pa).await.unwrap());
    }

    #[tokio::test]
    async fn accounts_and_ownership() {
        let cfg = test_cfg().await;

        assert!(signup(&cfg, "Test User", "short@x.io", "1234567", "").await.is_err());
        assert_eq!(signup(&cfg, "  ", "noname@x.io", "password1", "").await, Err("name is required".into()));
        assert!(signup(&cfg, &"x".repeat(101), "longname@x.io", "password1", "").await.is_err());
        let t = signup(&cfg, "Test User", " Admin@Example.com ", "password1", "").await.unwrap();
        assert_eq!(session(&cfg, &t).await.unwrap(), Some(Actor { id: LOCAL, admin: true }));
        assert!(signup(&cfg, "Test User", "admin@example.com", "password1", "").await.is_err());

        let t2 = signup(&cfg, "Test User", "bob@example.com", "password2", "").await.unwrap();
        let bob = session(&cfg, &t2).await.unwrap().unwrap().id;
        assert_eq!(session(&cfg, &t2).await.unwrap(), Some(Actor { id: bob, admin: false }));

        assert_eq!(login(&cfg, "bob@example.com", "nope", "").await.unwrap(), None);
        assert!(login(&cfg, "BOB@example.com", "password2", "").await.unwrap().is_some());
        logout(&cfg, &t2).await.unwrap();
        assert_eq!(session(&cfg, &t2).await.unwrap(), None);

        let (p2, _) = new_project(&cfg, bob, "Other").await;
        assert_eq!(projects(&cfg, LOCAL).await.unwrap(), json!([]));
        assert_eq!(owner_of(&cfg, "projects", p2).await.unwrap(), Some(bob));

        let tb1 = login(&cfg, "bob@example.com", "password2", "").await.unwrap().unwrap();
        let tb2 = login(&cfg, "bob@example.com", "password2", "").await.unwrap().unwrap();

        assert!(!change_password(&cfg, bob, "wrong", "password3", &tb1).await.unwrap());
        assert!(change_password(&cfg, bob, "password2", "short", &tb1).await.is_err());
        assert!(change_password(&cfg, bob, "password2", "password3", &tb1).await.unwrap());

        assert!(session(&cfg, &tb1).await.unwrap().is_some());
        assert_eq!(session(&cfg, &tb2).await.unwrap(), None);
        assert!(login(&cfg, "bob@example.com", "password3", "").await.unwrap().is_some());
        assert_eq!(account(&cfg, bob).await.unwrap().unwrap()["email"].as_str(), Some("bob@example.com"));
        assert_eq!(account(&cfg, bob).await.unwrap().unwrap()["name"].as_str(), Some("Test User"));
        assert!(set_name(&cfg, bob, "\u{7}").await.is_err());
        assert!(set_name(&cfg, bob, "  Bob Martin ").await.unwrap());
        assert_eq!(account(&cfg, bob).await.unwrap().unwrap()["name"].as_str(), Some("Bob Martin"));

        let ss = sessions(&cfg, bob, &tb1).await.unwrap();
        assert_eq!(ss.as_array().unwrap().iter().filter(|s| s["current"].as_bool() == Some(true)).count(), 1);
        let sid = serde_json::from_value::<Uuid>(
            ss.as_array().unwrap().iter().find(|s| s["current"].as_bool() == Some(true)).unwrap()["id"].clone(),
        )
        .unwrap();
        assert!(!revoke_session(&cfg, LOCAL, sid).await.unwrap());
        let stored: Vec<String> = cfg
            .pool
            .fetch_all("SELECT token_hash FROM sessions WHERE user_id = $1", args![bob])
            .await
            .unwrap()
            .iter()
            .map(|r| r.get::<String, _>(0))
            .collect();
        assert!(stored.contains(&sha256_hex(&tb1)) && !stored.contains(&tb1), "only session token hashes are stored");

        let u = usage(&cfg, bob).await.unwrap();
        assert_eq!((u["total"]["projects"].as_i64(), u["total"]["generations"].as_i64()), (Some(1), Some(0)));
        let d = user_detail(&cfg, bob).await.unwrap().unwrap();
        assert_eq!((d["projects"].as_array().unwrap().len(), d["sessions"].as_array().unwrap().is_empty()), (1, false));
        assert!(d["jobs"].as_array().unwrap().is_empty());
        assert_eq!(user_detail(&cfg, Uuid::new_v4()).await.unwrap(), None);

        assert!(set_disabled(&cfg, LOCAL, LOCAL, true).await.is_err());
        assert!(set_disabled(&cfg, LOCAL, bob, true).await.unwrap());
        assert_eq!(session(&cfg, &tb1).await.unwrap(), None);
        assert_eq!(login(&cfg, "bob@example.com", "password3", "").await.unwrap(), None);

        assert!(set_disabled(&cfg, LOCAL, bob, false).await.unwrap());
        let tb1 = login(&cfg, "bob@example.com", "password3", "").await.unwrap().unwrap();

        assert!(delete_account(&cfg, LOCAL, "password1").await.is_err());
        assert!(!delete_account(&cfg, bob, "nope").await.unwrap());
        assert!(delete_account(&cfg, bob, "password3").await.unwrap());

        assert_eq!(owner_of(&cfg, "projects", p2).await.unwrap(), None);
        assert_eq!(session(&cfg, &tb1).await.unwrap(), None);
        assert!(admin_delete_user(&cfg, LOCAL, LOCAL).await.is_err());
    }

    #[tokio::test]
    async fn share_links() {
        let cfg = test_cfg().await;

        let other = Uuid::now_v7();
        cfg.pool.execute("INSERT INTO users (id, email, created_at) VALUES ($1, 'b', $2)", args![other, Utc::now()]).await.unwrap();

        let (_, p) = new_project(&cfg, LOCAL, "P").await;
        let g1 = add_gen(&cfg, Some(p), None, "desktop", json!({"direction": {}})).await;
        let g2 = add_gen(&cfg, Some(p), Some("Home"), "desktop", json!({})).await;
        let g3 = add_gen(&cfg, None, None, "desktop", json!({})).await;
        set_identity(&cfg, p, Some(g1)).await.unwrap();

        assert!(create_share(&cfg, LOCAL, None, None, None).await.is_err());
        assert!(create_share(&cfg, LOCAL, Some(g1), Some(p), None).await.is_err());
        assert!(create_share(&cfg, LOCAL, Some(g1), None, Some(0)).await.is_err());

        let (sid, token) = create_share(&cfg, LOCAL, None, Some(p), None).await.unwrap();
        let stored: String = cfg.pool.fetch_one("SELECT token_hash FROM shares WHERE id = $1", args![sid]).await.unwrap().get(0);
        assert_eq!(stored, sha256_hex(&token), "only the share token's hash is stored");
        let html = crate::share::page(&cfg, &token, None).await.unwrap().unwrap();
        assert!(html.contains(r#"sandbox="allow-scripts""#) && !html.contains("allow-same-origin"));
        let Some((title, screens)) = shared_screens(&cfg, &token).await.unwrap() else {
            panic!("concept share missing");
        };
        assert_eq!(title, "P · Concept 1");
        assert_eq!(screens.len(), 2);
        assert_eq!(screens[0].id, g1);
        assert_eq!(screens[0].label, "Main screen");
        assert_eq!(screens[1].id, g2);
        assert_eq!(screens[1].label, "Home");

        assert_eq!(shared_html(&cfg, &token, g1).await.unwrap(), Some("<p>x</p>".into()));
        assert_eq!(shared_html(&cfg, &token, g2).await.unwrap(), Some("<p>x</p>".into()));
        assert_eq!(shared_html(&cfg, &token, g3).await.unwrap(), None);

        assert_eq!(shared_screens(&cfg, "abc").await.unwrap(), None);
        let zeros = "0".repeat(64);
        assert_eq!(shared_screens(&cfg, &zeros).await.unwrap(), None);

        let (sid2, token2) = create_share(&cfg, LOCAL, Some(g1), None, None).await.unwrap();
        cfg.pool
            .execute("UPDATE shares SET expires_at = $1 WHERE id = $2", args![Utc::now() - chrono::Duration::minutes(1), sid2])
            .await
            .unwrap();
        assert_eq!(shared_screens(&cfg, &token2).await.unwrap(), None);

        assert!(!revoke_share(&cfg, other, sid).await.unwrap());
        assert!(revoke_share(&cfg, LOCAL, sid).await.unwrap());
        assert_eq!(shared_screens(&cfg, &token).await.unwrap(), None);

        let list = shares(&cfg, LOCAL).await.unwrap();
        assert_eq!(list.as_array().unwrap().len(), 1);
        assert_eq!(list[0]["id"], json!(sid2));
        let expected_label = format!("#{}", &g1.to_string()[28..]);
        assert_eq!(list[0]["label"].as_str(), Some(expected_label.as_str()));
    }

    #[test]
    fn month_start_truncates_to_the_first_at_midnight() {
        use chrono::TimeZone;
        let d = Utc.with_ymd_and_hms(2026, 11, 20, 10, 30, 5).unwrap();
        assert_eq!(month_start(d), Utc.with_ymd_and_hms(2026, 11, 1, 0, 0, 0).unwrap());
    }
}
