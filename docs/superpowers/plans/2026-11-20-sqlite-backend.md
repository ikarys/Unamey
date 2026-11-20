# SQLite Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `studio` runs on SQLite in a local file when `DATABASE_URL` is unset and on PostgreSQL when the URL says so, with the same raw SQL exercised by the same tests on both.

**Architecture:** One `src/sql.rs` module replaces `src/pg.rs`: an enum `Db` over the two rango pools, `Tx` over the two sqlx transactions, `Row` over the two sqlx rows, with four query methods that bind `rango::SqlValue` the way rango does, so rango-written and raw-written rows agree. Every raw query is rewritten in portable SQL (placeholders `$n`, times bound from Rust, JSON reads through one dialect helper, JSON writes in Rust). SQLite migrations are a second rango-generated set, embedded in the binary and applied at startup; Postgres keeps `rango migrate`.

**Tech Stack:** Rust, sqlx 0.8.6 (`postgres` + `sqlite` features), rango-orm v0.1.1 (`postgres` + `sqlite` features), rango CLI for `makemigrations`.

**Spec:** `docs/superpowers/specs/2026-11-20-sqlite-backend-design.md`

## Global Constraints

- Backends: SQLite and PostgreSQL only; backend chosen at runtime from the `DATABASE_URL` scheme; unknown scheme is a startup error.
- `DATABASE_URL` unset: `sqlite://studio.db` (relative to the working directory, like `studio.key`), file mode 0600 on Unix.
- Placeholders `$1, $2, ...` in order of first use; never `$2` before `$1`.
- No `now()`, `date_trunc`, `interval`, `::type`, `ILIKE`, `->`, `->>`, `#>`, `#>>`, `jsonb_*`, `to_jsonb`, `json_build_object`, `to_char`, `AT TIME ZONE`, `right()`, `chr()`, `ANY()` in any SQL string.
- Spliced SQL fragments are `&'static str` literals only (JSON column and path, table names already checked).
- Raw `INSERT`s always set `created_at`: rango's SQLite DDL default is `CURRENT_TIMESTAMP` (`YYYY-MM-DD HH:MM:SS`), which the RFC 3339 decoders of rango and `Row` refuse.
- Commits: English imperative subject, body with the why, trailer `Assisted-by: Claude Code:claude-fable-5-1` (plus `Assisted-by: local:qwen3.8-27b` when the local model wrote content). New dependency features are checked against the registry and the check is noted in the commit.
- Before merging: `just test` (both backends), `cargo clippy -- -D warnings`, `cargo fmt --check`, `gitleaks git`.
- Rust ≥ 1.85 (edition 2024 already in `Cargo.toml`), SQLite as bundled by sqlx (≥ 3.35: `RETURNING`, `FILTER`, `NULLS LAST` available).

## Review Focus

Inputs the spec implies but no existing test exercises; each line names the task whose tests now pin it.

1. A row written by the SQLite column default (`CURRENT_TIMESTAMP`) is unreadable by rango and `Row`: the seed and every raw `INSERT` set `created_at` explicitly, and Task 2 reads the seeded user back on SQLite.
2. `DATABASE_URL=mysql://...` or `DATABASE_URL=garbage` must fail at startup with a message naming the scheme, not panic later. Task 1 tests `Db::connect` on an unknown scheme.
3. The SQLite file and its `-wal`/`-shm` side files hold password and token hashes and sealed keys: Task 3 asserts mode 0600 on the main file after first start; SQLite creates the side files with the main file's mode.
4. Time comparisons on SQLite compare RFC 3339 strings lexically; `to_rfc3339()` has 0, 3, 6 or 9 fractional digits and `+00:00`. Task 1's round trip stores a timestamp with nanoseconds and a timestamp on a whole second and asserts `<` ordering in SQL matches Rust.
5. `Option` arguments must bind as typed NULLs so Postgres can infer `$n IS NULL OR col = $n` without casts and SQLite binds a NULL: Task 1 tests `fetch_all` with `None::<Uuid>` and `None::<String>` on both backends.

---

### Task 1: `src/sql.rs`: pools, transactions, rows, binding

**Files:**
- Modify: `Cargo.toml:21-22` (rango-orm `features = ["postgres", "sqlite"]`; sqlx add `"sqlite"`)
- Create: `src/sql.rs`
- Modify: `src/main.rs:8-15` (add `mod sql;` next to `mod pg;`; `pg` is removed in Task 3)
- Test: `src/sql.rs` (`mod tests`)

**Interfaces:**
- Produces:
  - `pub enum Db { Pg(rango::PgPool), Sqlite { pool: rango::SqlitePool, #[cfg(test)] tmp: Option<std::sync::Arc<TempDb>> } }` (`Clone`); the struct variant lets every pattern read `Db::Sqlite { pool, .. }` with or without the test field.
  - `pub enum Tx { Pg(sqlx::Transaction<'static, sqlx::Postgres>), Sqlite(sqlx::Transaction<'static, sqlx::Sqlite>) }`.
  - `pub enum Row { Pg(sqlx::postgres::PgRow), Sqlite(sqlx::sqlite::SqliteRow) }`.
  - `impl Db`: `pub async fn connect(url: &str) -> Result<Db, String>` (scheme via `rango::DatabaseConfig::from_url(url).backend()`: `Sqlite` → `rango::connect_sqlite(url)`, `Postgres` → `rango::connect_postgres(&cfg)`, else `Err(format!("unsupported DATABASE_URL scheme in {url_without_credentials}"))`), `pub fn is_sqlite(&self) -> bool`, `pub async fn begin(&self) -> Result<Tx, sqlx::Error>`, `pub async fn fetch_all(&self, sql: &str, args: Vec<SqlValue>) -> Result<Vec<Row>, sqlx::Error>`, `fetch_optional(..) -> Result<Option<Row>, _>`, `fetch_one(..) -> Result<Row, _>`, `execute(..) -> Result<u64, _>` (rows affected), `pub async fn insert<M>(&self, m: M) -> rango::Result<M>`, `pub async fn get<M>(&self, pk: &SqlValue) -> rango::Result<Option<M>>` where `M: rango::Model + rango::ModelValues + rango::FromRow`.
  - `impl Tx`: the same four query methods and `insert` taking `&mut self`, plus `pub async fn commit(self) -> Result<(), sqlx::Error>`.
  - `impl Row`: `pub fn get<T: Col, I>(&self, i: I) -> T where I: sqlx::ColumnIndex<PgRow> + sqlx::ColumnIndex<SqliteRow>` (panics with the column index and the sqlx error, like `sqlx::Row::get`).
  - `pub trait Col: Sized` (private decoding, implemented for `Uuid`, `String`, `bool`, `i32`, `i64`, `f64`, `DateTime<Utc>`, `serde_json::Value`, `Option<T: Col>`). SQLite arms: `Uuid` and `DateTime<Utc>` parse a `String` (`str::parse`), `Value` is `serde_json::from_str` of a `String`, `bool` and ints decode natively; Postgres arms call `try_get`.
  - `pub trait Arg { fn arg(self) -> SqlValue; }` for `&str`, `String`, `bool`, `i32`, `i64`, `f64`, `Uuid`, `DateTime<Utc>`, `Value` (via `SqlValue::from`) and `Option<T>` (`None` → the typed null: `NullText`, `NullBool`, `NullInt`, `NullBigInt`, `NullDouble`, `NullUuid`, `NullDateTime`, `NullJson`). Macro `args![a, b, ..]` → `vec![a.arg(), b.arg(), ..]`.
  - Dialect helpers on `Db`: `pub fn json_text(&self, col: &'static str, path: &[&'static str]) -> String` (Pg: `col #>> '{a,b}'`; SQLite: `json_extract(col, '$.a.b')`), `pub fn month(&self, col: &'static str) -> String` (Pg: `to_char(col, 'YYYY-MM')`; SQLite: `substr(col, 1, 7)`).
  - `#[cfg(test)] pub async fn test_db() -> Db`: `TEST_DATABASE_URL` set → clone of `studio_test` exactly as `pg::test_pool()` does today; unset → `Db::connect` on a fresh file `std::env::temp_dir()/unamey-test-<uuid simple>.db` (mode 0600 set after connect). `#[cfg(test)] pub struct TempDb(pub PathBuf)` removes the file and its `-wal`/`-shm` siblings in `Drop`; `test_db` stores it in the `tmp` field so the file lives as long as the pool (`None` in `connect`). Task 2 adds the migration call.
- Binding: one private `fn bind_pg(q, args)` and `fn bind_sqlite(q, args)` matching rango's encodings (SQLite: `Bool` → `i64`, `Int`/`SmallInt` → `i64`, `Uuid` → `to_string()`, `DateTime` → `to_rfc3339()`, `Json` → `to_string()`, typed nulls → `Option::<T>::None` of the same Rust type; Postgres: native types, `Json` as `sqlx::types::Json`). `Decimal`, `Date`, `Time`, `Bytes`, `Float` are never produced by `Arg` but the match stays exhaustive: bind them natively (Postgres) or as text/f64 (SQLite) the way rango does, no `unreachable!`.

- [ ] **Step 1: Enable the features and check the registry**

`cargo tree -e features -i sqlx | grep -c sqlite` prints a positive count after editing `Cargo.toml`; `cargo build` compiles. Note in the commit: "sqlx 0.8.6 `sqlite` feature and rango-orm v0.1.1 `sqlite` feature checked in the lockfile / crates.io".

- [ ] **Step 2: Write the failing tests in `src/sql.rs`**

```rust
#[tokio::test]
async fn round_trip_binds_like_rango() {
    let db = test_db().await;
    // the column types rango would generate for each backend, so the probe binds like the real tables
    let ddl = if db.is_sqlite() {
        "CREATE TABLE sql_probe (id TEXT PRIMARY KEY, at TEXT NOT NULL, ok INTEGER NOT NULL, n BIGINT, x DOUBLE PRECISION, j TEXT, s TEXT)"
    } else {
        "CREATE TABLE sql_probe (id UUID PRIMARY KEY, at TIMESTAMPTZ NOT NULL, ok BOOLEAN NOT NULL, n BIGINT, x DOUBLE PRECISION, j JSONB, s TEXT)"
    };
    db.execute(ddl, vec![]).await.unwrap();
    let id = Uuid::now_v7();
    let whole = Utc.with_ymd_and_hms(2026, 11, 20, 10, 0, 0).unwrap();
    let frac = whole + chrono::Duration::nanoseconds(123_456_789);
    db.execute("INSERT INTO sql_probe (id, at, ok, n, x, j, s) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        args![id, frac, true, 7i64, 1.5f64, json!({"a": {"b": "c"}}), None::<String>]).await.unwrap();
    db.execute("INSERT INTO sql_probe (id, at, ok, n, x, j, s) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        args![Uuid::now_v7(), whole, false, None::<i64>, None::<f64>, None::<Value>, "s"]).await.unwrap();
    let r = db.fetch_one("SELECT id, at, ok, n, x, j, s FROM sql_probe WHERE id = $1", args![id]).await.unwrap();
    assert_eq!(r.get::<Uuid, _>("id"), id);
    assert_eq!(r.get::<DateTime<Utc>, _>("at"), frac);
    assert!(r.get::<bool, _>(2));
    assert_eq!(r.get::<Option<i64>, _>("n"), Some(7));
    assert_eq!(r.get::<Option<f64>, _>("x"), Some(1.5));
    assert_eq!(r.get::<Option<Value>, _>("j"), Some(json!({"a": {"b": "c"}})));
    assert_eq!(r.get::<Option<String>, _>("s"), None);
    // lexical order of RFC 3339 text equals time order, whole second vs nanoseconds
    let later = db.fetch_all("SELECT id FROM sql_probe WHERE at > $1 ORDER BY at", args![whole]).await.unwrap();
    assert_eq!(later.len(), 1);
    // typed NULL arguments: Postgres infers the type, SQLite binds NULL
    let all = db.fetch_all("SELECT id FROM sql_probe WHERE ($1 IS NULL OR id = $1) AND ($2 IS NULL OR s = $2)", args![None::<Uuid>, None::<String>]).await.unwrap();
    assert_eq!(all.len(), 2);
    let j = db.json_text("j", &["a", "b"]);
    let s: String = db.fetch_one(&format!("SELECT {j} FROM sql_probe WHERE id = $1"), args![id]).await.unwrap().get(0);
    assert_eq!(s, "c");
    let m: String = db.fetch_one(&format!("SELECT {} FROM sql_probe WHERE id = $1", db.month("at")), args![id]).await.unwrap().get(0);
    assert_eq!(m, "2026-11");
}

#[tokio::test]
async fn transaction_commits_and_drops() {
    let db = test_db().await;
    db.execute("CREATE TABLE sql_tx (n BIGINT)", vec![]).await.unwrap();
    let mut tx = db.begin().await.unwrap();
    tx.execute("INSERT INTO sql_tx (n) VALUES ($1)", args![1i64]).await.unwrap();
    drop(tx);
    let mut tx = db.begin().await.unwrap();
    tx.execute("INSERT INTO sql_tx (n) VALUES ($1)", args![2i64]).await.unwrap();
    tx.commit().await.unwrap();
    let n: i64 = db.fetch_one("SELECT COUNT(*) FROM sql_tx", vec![]).await.unwrap().get(0);
    assert_eq!(n, 1);
}

#[tokio::test]
async fn unknown_scheme_is_refused() {
    let e = Db::connect("mysql://u:p@h/db").await.err().unwrap();
    assert!(e.contains("unsupported") && e.contains("mysql") && !e.contains("u:p"), "{e}");
}
```

- [ ] **Step 3: Run them to see them fail**

Run: `cargo test sql::tests`. Expected: compile error (`sql` undefined), then after the skeleton: failures.

- [ ] **Step 4: Implement `src/sql.rs` as specified in Interfaces**

`fetch_optional` and `fetch_one` call sqlx's `fetch_optional` / `fetch_one` on the bound query (not `fetch_all().pop()`). `Db::begin` wraps `pool.begin()`. Keep the module under ~300 lines: one `match self` per method, the two bind functions, the `Col` impls via a small macro for the native types.

- [ ] **Step 5: Run the tests on both backends**

Run: `cargo test sql::tests` (SQLite) and `TEST_DATABASE_URL=postgres://dev:dev@127.0.0.1:5432/studio cargo test sql::tests` (after `just test`'s `studio_test` exists; until Task 7 run its three Postgres lines by hand). Expected: PASS on both. Check no `unamey-test-*.db` file remains in `/tmp`.

- [ ] **Step 6: Commit**

```bash
git add Cargo.toml Cargo.lock src/sql.rs src/main.rs
git commit -m "Add the Db/Tx/Row layer over the Postgres and SQLite pools"
```

---

### Task 2: SQLite migrations, embedded applier, snapshot parity

**Files:**
- Create: `migrations/sqlite/rango.toml`, `migrations/sqlite/0001_initial.sql`, `migrations/sqlite/0002_local_user.sql`, `migrations/sqlite/snapshot.json`
- Modify: `src/sql.rs` (`migrate_sqlite`, `test_db`), `Justfile` (`makemigrations-sqlite` recipe)
- Test: `src/sql.rs`

**Interfaces:**
- Consumes: `Db`, `test_db()` from Task 1.
- Produces: `pub async fn migrate_sqlite(pool: &rango::SqlitePool) -> Result<(), String>`: creates `_rango_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, applied_at TEXT NOT NULL DEFAULT (datetime('now')))` if missing, reads applied names, and for each embedded file not yet applied runs its SQL (`sqlx::raw_sql`) and `INSERT INTO _rango_migrations (name) VALUES (?)` in one transaction, in file order. `const SQLITE_MIGRATIONS: &[(&str, &str)]` lists `("0001_initial", include_str!("../migrations/sqlite/0001_initial.sql"))`, ... (name = file stem, as the rango CLI records it).

- [ ] **Step 1: Generate the SQLite set**

`migrations/sqlite/rango.toml`:
```toml
[database]
backend = "sqlite"
[models]
src = "../../src/models.rs"
```
Run from `migrations/sqlite/`: `rango makemigrations --output .` (install with `just setup` if missing). Rename the generated file to `0001_initial.sql` if the CLI picks another stem, and check it holds every table of `src/models.rs` with the CHECK, UNIQUE and FOREIGN KEY constraints (`grep -c "CREATE TABLE" 0001_initial.sql` prints 8, one per model struct).

- [ ] **Step 2: Write the seed**

`migrations/sqlite/0002_local_user.sql`:
```sql
-- The single-tenant user (authz::LOCAL): owns everything when STUDIO_ORIGIN is unset; the admin in multi-user mode.
-- created_at is explicit: the column default would store a form the RFC 3339 decoders refuse.
INSERT OR IGNORE INTO "users" ("id", "email", "admin", "disabled", "created_at") VALUES ('00000000-0000-0000-0000-000000000001', 'local', 1, 0, '2025-01-01T00:00:00+00:00');
```

- [ ] **Step 3: Write the failing tests**

```rust
#[tokio::test]
async fn sqlite_migrations_apply_once_and_seed_local() {
    if std::env::var("TEST_DATABASE_URL").is_ok() { return; }
    let db = test_db().await; // migrated by test_db after this task
    let Db::Sqlite { pool, .. } = &db else { unreachable!() };
    migrate_sqlite(pool).await.unwrap(); // second run: nothing pending, no error
    let n: i64 = db.fetch_one("SELECT COUNT(*) FROM _rango_migrations", vec![]).await.unwrap().get(0);
    assert_eq!(n as usize, SQLITE_MIGRATIONS.len());
    let local: crate::models::User = db.get(&SqlValue::Uuid(Uuid::from_u128(1))).await.unwrap().expect("local user seeded");
    assert!(local.admin.0);
}

#[test]
fn both_migration_sets_describe_the_same_schema() {
    // {table: [(column, nullable, primary_key)]} from each snapshot; col_type differs by backend on purpose
    let shape = |s: &str| -> BTreeMap<String, Vec<(String, bool, bool)>> { /* parse "tables" → columns name/nullable/primary_key, sorted */ };
    let pg = shape(include_str!("../migrations/snapshot.json"));
    let lite = shape(include_str!("../migrations/sqlite/snapshot.json"));
    assert_eq!(pg, lite);
}
```
The existing `pg::tests::schema_seeds_local_and_enforces_relations` moves to `sql::tests` in Task 3; the tests above cover the SQLite-specific part.

- [ ] **Step 4: Run to see them fail**

Run: `cargo test sql::tests`. Expected: `migrate_sqlite` undefined.

- [ ] **Step 5: Implement `migrate_sqlite` and call it from `test_db()` on the SQLite arm**

Add the Justfile recipe:
```make
# After a change in src/models.rs, together with `just makemigrations`: the SQLite set (commit it with its snapshot.json).
makemigrations-sqlite:
    cd migrations/sqlite && rango makemigrations --output .
```

- [ ] **Step 6: Run the tests**

Run: `cargo test sql::tests`. Expected: PASS. Then `cd migrations/sqlite && rango makemigrations --output . --check` (or run it and `git status` shows nothing new): the set is in sync with the models.

- [ ] **Step 7: Commit**

```bash
git add migrations/sqlite src/sql.rs Justfile
git commit -m "Add the SQLite migration set and apply it at startup"
```

---

### Task 3: Switch `Config.pool` to `Db` and port every call site

The type change breaks every caller at once, so this task is one compile unit: mechanical port of all 100 SQL call sites to the new API, SQL text unchanged except where the Row API forces it. Postgres-only SQL stays and is rewritten in Tasks 4–6; after this task `cargo test` is green on Postgres and red on SQLite only in the queries those tasks list.

**Files:**
- Modify: `src/config.rs:23,74` (`pub pool: Db`, `Config::new(pool: Db, ..)`)
- Modify: `src/main.rs:17,44` (usage string: "DATABASE_URL: a PostgreSQL URL, or unset for sqlite://studio.db"; `start`: `let url = std::env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite://studio.db".into()); let pool = Db::connect(&url).await?; if let Db::Sqlite { pool: p, .. } = &pool { sql::migrate_sqlite(p).await?; sql::restrict_mode(&url); }`)
- Delete: `src/pg.rs` (its test moves to `src/sql.rs::tests`, using `test_db()` and `db.execute("DELETE FROM projects WHERE id = $1", args![pid])`)
- Modify: `src/db.rs` (all `sqlx::query(...)` chains, `job_json(r: &Row, ..)`, `new_session(tx: &mut Tx, ..)`, `delete_other_sessions(tx: &mut Tx, ..)`, 8 transactions → `cfg.pool.begin()` / `tx.commit()`, `project_unique_sqlx` folded into `project_unique_rango` by matching `rango::Error::UniqueViolation` on `db.insert`, and for raw inserts `sqlx::Error::as_database_error().is_unique_violation()` stays), `src/jobs.rs` (`exec`, `llm_call`, `mark_stale`, `insert(&cfg.pool, row)` → `cfg.pool.insert(row)`), `src/cache.rs:55`, `src/pipeline/generate.rs:584` (`fetch_all` + `Row::get::<String,_>(0)` for now), `src/pipeline/pack.rs:172,201` (`fetch_optional` + `Row::get` per column instead of `query_as` tuples), `src/pipeline/edit.rs:175`, `src/pipeline/refine.rs:51` (`cfg.pool.get::<models::Generation>(&SqlValue::Uuid(id))`), `src/http.rs:788-830` tests (`test_db()`, `cfg.pool.execute("INSERT INTO users (id, email, created_at) VALUES ($1, $2, $3)", args![alice, "a@x.io", Utc::now()])`), `src/db.rs` tests (`test_cfg()` → `crate::sql::test_db()`; the three raw job inserts and the user insert at :1769, :1788, :1814, :2077 add `created_at`).
- Test: existing suite.

**Interfaces:**
- Consumes: everything from Task 1 and `migrate_sqlite` from Task 2.
- Produces: `pub fn restrict_mode(url: &str)` in `src/sql.rs`: on Unix, `set_permissions(path, 0o600)` on the file named by a `sqlite://<path>` or `sqlite:<path>` URL (ignore errors other than logging; the file exists after `connect`). `Config.pool: Db`.

- [ ] **Step 1: Write the failing test for the file mode (SQLite only, Unix)**

```rust
#[cfg(unix)]
#[tokio::test]
async fn sqlite_file_is_private() {
    if std::env::var("TEST_DATABASE_URL").is_ok() { return; }
    use std::os::unix::fs::PermissionsExt;
    let db = test_db().await;
    let Db::Sqlite { tmp: Some(tmp), .. } = &db else { unreachable!() };
    assert_eq!(std::fs::metadata(&tmp.0).unwrap().permissions().mode() & 0o777, 0o600);
}
```
(`test_db` calls `restrict_mode` after `connect`, the same way `start` does.)

- [ ] **Step 2: Port the call sites**

Mechanical rule: `sqlx::query(S).bind(a).bind(b).fetch_all(&cfg.pool).await` → `cfg.pool.fetch_all(S, args![a, b]).await`; `.execute(..)` → `cfg.pool.execute(..)` (ignore the count where it was ignored, `rows_affected()` → the returned `u64`); `sqlx::query_scalar::<_, T>(S)...fetch_one` → `cfg.pool.fetch_one(S, args).await?.get::<T, _>(0)`; `row.get(i)` / `row.get("name")` unchanged in shape. Transactions: `let mut tx = cfg.pool.begin().await.map_err(es)?; ... tx.commit().await.map_err(es)?`. Remove `use sqlx::Row;` where no sqlx row remains. Keep `use rango::prelude::*` only for the field types; `insert`/`get` calls go through `Db`/`Tx` (both backends' same-named ops in the prelude would be ambiguous).

- [ ] **Step 3: Compile and run the suite on Postgres**

Run: `cargo build`, `cargo clippy -- -D warnings`, then the three `just test` Postgres lines by hand and `TEST_DATABASE_URL=postgres://dev:dev@127.0.0.1:5432/studio cargo test`. Expected: all green (same 93 + new tests). Run `cargo test` (SQLite): the failures are only in tests reaching the queries listed in Tasks 4–6; write the failing test names into the commit body.

- [ ] **Step 4: Commit**

```bash
git add -A src Cargo.toml
git commit -m "Route every query through Db and open SQLite when DATABASE_URL is unset"
```

---

### Task 4: Portable SQL: settings, sessions, users, usage

**Files:**
- Modify: `src/db.rs:136-200` (`set_settings`/settings reads: `date_trunc('month', now())` ×2), `:300-310` (`session`: `expires_at > now() AND NOT u.disabled`, `last_seen = now()` every `interval '5 minutes'`), `:395` (`expires_at > now()`), `:474-500` (`usage`: `to_char`, `date_trunc` ×2), `:2114` (test: `now() - interval '1 minute'`)
- Test: `src/db.rs` tests (existing session/usage tests, run on SQLite)

**Interfaces:**
- Consumes: `Db::month`, `args!`.
- Produces: `fn month_start(now: DateTime<Utc>) -> DateTime<Utc>` in `src/db.rs` (first day of `now`'s month, 00:00:00 UTC) and `const SESSION_TOUCH: chrono::Duration = Duration::minutes(5)`; `session` compares `last_seen < $n` with `Utc::now() - SESSION_TOUCH` bound.

- [ ] **Step 1: Write the failing unit test**

```rust
#[test]
fn month_start_truncates_to_the_first_at_midnight() {
    let d = Utc.with_ymd_and_hms(2026, 11, 20, 10, 30, 5).unwrap();
    assert_eq!(month_start(d), Utc.with_ymd_and_hms(2026, 11, 1, 0, 0, 0).unwrap());
}
```

- [ ] **Step 2: Rewrite the queries**

`NOT u.disabled` → `u.disabled = $n` with `false` bound (SQLite stores 0/1; `NOT` on an integer works too but the bound form reads the same on both). `now()` → bind `Utc::now()`; `date_trunc('month', now())` → bind `month_start(Utc::now())`; `to_char(created_at, 'YYYY-MM') AS month` → `format!("SELECT {} AS month, COUNT(*) ... GROUP BY 1 ORDER BY 1 DESC LIMIT 12", cfg.pool.month("created_at"))`.

- [ ] **Step 3: Run the touched tests on both backends**

Run: `cargo test db::tests` (SQLite) and the same with `TEST_DATABASE_URL`. Expected: the session, settings, usage and user tests PASS on both; remaining SQLite failures are only in job and generation tests.

- [ ] **Step 4: Commit**

```bash
git add src/db.rs
git commit -m "Make the settings, session and usage queries portable"
```

---

### Task 5: Portable SQL: jobs and cache

**Files:**
- Modify: `src/db.rs:820` (`json_build_object('concept', concept_id, 'page', page)::jsonb` → select `concept_id, page` and build `json!({"concept": .., "page": ..})` in Rust), `:864` (`$1::uuid IS NULL` → `$1 IS NULL`), `:924-931` (`ILIKE` → `lower(x) LIKE lower($1)`, `j.id::text` → `CAST(j.id AS TEXT)`, drop `::text` on `$2`/`$3`; `NULLS LAST`, `LIMIT $4 OFFSET $5` stay), `:960` (`COALESCE(SUM(x), 0)::bigint` → `CAST(COALESCE(SUM(x), 0) AS BIGINT)`, `now() - interval '24 hours'` → bind `Utc::now() - Duration::hours(24)`; `FILTER` stays), `src/jobs.rs:32` (`log || $1 || chr(10)` → `log || $1` with `format!("{line}\n")` bound), `:41` (`$5::float8 IS NULL` → `$5 IS NULL`), `:106,113` (`finished_at = now()` → bind; the restart message gets its `\n` in Rust), `src/cache.rs:55` (reads by index through `Row`; SQL already portable).
- Test: `src/db.rs` tests on jobs (`search_jobs`, counts, 24 h totals) on SQLite.

**Interfaces:**
- Consumes: `Row::get`, `args!`.
- Produces: nothing new.

- [ ] **Step 1: Add the failing test for case-insensitive search**

In `db::tests`, next to the existing `search_jobs` test: insert a job for a user whose email is `Alice@X.io`, search `q = "alice"`, assert one hit; search `q = "ALICE"`, assert one hit. (Postgres `ILIKE` did this; `lower() LIKE lower()` must keep it on both.)

- [ ] **Step 2: Run it to see it fail on SQLite**

Run: `cargo test db::tests::search`. Expected: FAIL (`ILIKE` unknown).

- [ ] **Step 3: Rewrite the queries listed in Files**

The `LIKE` escape in `search_jobs` already escapes `\`, `%` and `_` with `\`: add `ESCAPE '\'` after each `LIKE lower($1)` (Postgres defaults to `\`, SQLite has no default escape).

- [ ] **Step 4: Run the job tests on both backends**

Run: `cargo test db::tests` and `cargo test jobs` (SQLite), then with `TEST_DATABASE_URL`. Expected: every job and cache test PASS on both.

- [ ] **Step 5: Commit**

```bash
git add src/db.rs src/jobs.rs src/cache.rs
git commit -m "Make the job queries portable"
```

---

### Task 6: Portable SQL: generations, concepts, shares, pack, planner

**Files:**
- Modify: `src/db.rs:983-1060` (`generations` list: select `notes_json` whole and `html IS NOT NULL`; compute `batch`, `direction.label`, `detect` count, `archetype.name`, `identity.accent`, `identity.canvas` in Rust from the `Option<Value>`), `:1086` (`join_batch`: in a transaction, `SELECT notes_json FROM generations WHERE id = $1` → if `notes["batch"]` is a string keep it, else set it to `batch.to_string()` → `UPDATE generations SET notes_json = $2 WHERE id = $1` → return the batch string), `:1282` (`COALESCE(archived_at, now())` → bind `Utc::now()`), `:1321,1323` (`= ANY($1)` → `IN ($1, $2, ...)` built with `(1..=ids.len()).map(|i| format!("${i}"))`, args from the ids; an empty list returns early), `:1332,1389` (`notes_json -> 'direction' IS NOT NULL` → `format!("{} IS NOT NULL", cfg.pool.json_text("notes_json", &["direction"]))`), `:1423` (`brief_json->>'brief'` → `json_text("brief_json", &["brief"])`), `:1447` (`alternative_request`: select `notes_json` whole, `seed = notes["seed"].as_i64()`), `:1504,1557,1568` (shares: `now()` bound; `g.notes_json #>> '{direction,label}'` → `json_text`; `right(id::text, 8)` → `substr(CAST(id AS TEXT), length(CAST(id AS TEXT)) - 7)`; `'#' || ...` and `COALESCE(page, label, '#' || tail, 'deleted')` stay), `src/pipeline/generate.rs:584` (`recent_identities`: `SELECT notes_json FROM generations WHERE owner_id = $1 AND {identity} IS NOT NULL ORDER BY created_at DESC, id DESC LIMIT 4` with `identity = cfg.pool.json_text("notes_json", &["direction","identity"])`; in Rust `notes["direction"]["identity"].to_string()`), `src/pipeline/pack.rs:172` (select `g.created_at` and format with `db::ts()`; make `ts` `pub(crate)`), `:201` (`p.name || '-' || c.name` stays).
- Test: `src/db.rs` tests (generations list, batch, delete, shares) on SQLite; the `generation()` pack test if one exists in `pack.rs`.

**Interfaces:**
- Consumes: `Db::json_text`, `Tx`, `args!`.
- Produces: `pub(crate) fn ts(d: DateTime<Utc>) -> String` (existing format `%Y-%m-%d %H:%M:%S`).

- [ ] **Step 1: Add the failing tests**

In `db::tests`: (a) `join_batch` on a generation whose `notes_json` is `NULL` returns the job id and a second call with another job id returns the first (the existing test at `:1849-1857` does this; make sure it runs on SQLite); (b) `delete_generations` with an empty id list is a no-op returning `Ok`; (c) shares list label: a generation with `notes_json = {"direction": {"label": "Calm"}}` lists as `Calm`, one without notes and without page lists as `#` + the last 8 hex of its id.

- [ ] **Step 2: Run them to see them fail on SQLite**

Run: `cargo test db::tests`. Expected: FAIL on `jsonb_set` / `ANY` / `#>>`.

- [ ] **Step 3: Rewrite the queries listed in Files**

- [ ] **Step 4: Run the whole suite on both backends**

Run: `cargo test` (SQLite) and `TEST_DATABASE_URL=... cargo test`. Expected: all PASS on both. `grep -nE "now\(\)|::(text|uuid|jsonb|bigint|float8)|ILIKE|->>?|#>>?|jsonb_|to_jsonb|json_build|to_char|AT TIME ZONE|right\(|chr\(|ANY\(" src --include=*.rs | grep -v "^src/sql.rs"` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/db.rs src/pipeline/generate.rs src/pipeline/pack.rs
git commit -m "Make the generation, share and pack queries portable"
```

---

### Task 7: Justfile, docs, security notes, final verification

**Files:**
- Modify: `Justfile` (`dev_env` → `DATABASE_URL=sqlite://dev.db STUDIO_KEY_FILE=dev.key STUDIO_SKILL_DIR=dev-skill`; `dev` no longer depends on `db`; new `dev-pg origin="": db` running the same body with `DATABASE_URL={{db_url}}`; `multi-user` stays on `dev`; `ab`, `style-examples` on `dev_env`; `dev-reset` also `rm -f dev.db dev.db-wal dev.db-shm`; `run` on `sqlite://studio.db` with no `DATABASE_URL`; `test`: `cargo test` first (SQLite), then the three Postgres lines with `TEST_DATABASE_URL=postgres://dev:dev@127.0.0.1:5432/studio cargo test`, then `tsc` and the iframe check; update the `test` comment)
- Modify: `README.md:26` (Docker becomes optional: "Docker, only for `just dev-pg` / the Postgres half of `just test`"), `:38` (`just test` comment), `:43` (Run paragraph: `just dev` on `dev.db`, `just dev-pg` for Postgres), `:49` (`DATABASE_URL | sqlite://studio.db | PostgreSQL URL or sqlite:// file; the SQLite file is created 0600`)
- Modify: `docs/index.html:178` (requirement line), `docs/architecture.md:15,18,19,43` (`sql.rs` description, rango v0.1.1, both backends), `docs/roadmap.md:82-106` (one paragraph: SQLite is back through sqlx, Postgres stays for deployments), `SECURITY.md:15` (claim: every value bound; the JSON column/path literals in `json_text` are `&'static str`; SQLite file 0600 and side files, test `sql::tests::sqlite_file_is_private`), `VERIFICATION.md:13` (what `just test` proves on which backend), `CONTRIBUTING.md:8` (`cargo test` alone needs no Docker), `AGENTS.md:30` (`just test` description)
- Test: `just test`, manual smoke.

- [ ] **Step 1: Edit the Justfile and docs as listed**

- [ ] **Step 2: Run the full verification**

Run: `just test`, `cargo clippy -- -D warnings`, `cargo fmt --check`, `gitleaks git`. Expected: all green, the Rust suite runs twice (SQLite then Postgres).

- [ ] **Step 3: Manual smoke on SQLite**

Run: `rm -f /tmp/smoke.db*; DATABASE_URL=sqlite:///tmp/smoke.db STUDIO_KEY_FILE=/tmp/smoke.key cargo run -- serve --port 7799 &`, then `curl -s http://127.0.0.1:7799/healthz` → `ok`, `curl -s http://127.0.0.1:7799/api/me` → the local user JSON, `stat -c %a /tmp/smoke.db` → `600`. Stop the server. Then `just dev-pg` starts on the Postgres dev data (stop it once `/api/me` answers).

- [ ] **Step 4: Commit**

```bash
git add Justfile README.md docs AGENTS.md SECURITY.md VERIFICATION.md CONTRIBUTING.md
git commit -m "Run just dev and the tests on SQLite by default, document both backends"
```

- [ ] **Step 5: Merge per AGENTS.md**

`git checkout develop && git merge --no-ff feat/sqlite && git push origin develop && git branch -d feat/sqlite && git push origin --delete feat/sqlite`.
