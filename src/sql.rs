//! One database handle over PostgreSQL and SQLite: bound arguments, decoded rows, transactions and the few SQL dialect differences.

use chrono::{DateTime, Utc};
use rango::{DatabaseConfig, FromRow, Model, ModelValues, SqlValue};
use serde_json::Value;
use sqlx::postgres::{PgArguments, PgRow};
use sqlx::query::Query;
use sqlx::sqlite::{SqliteArguments, SqliteRow};
use sqlx::{ColumnIndex, Postgres, Row as _, Sqlite, ValueRef};
use uuid::Uuid;

#[derive(Clone)]
pub enum Db {
    Pg(rango::PgPool),
    // Struct variant so patterns read `Db::Sqlite { pool, .. }` with or without the test-only field.
    Sqlite {
        pool: rango::SqlitePool,
        // Held only so the temp file outlives the pool; dropped last.
        #[cfg(test)]
        #[allow(dead_code)]
        tmp: Option<std::sync::Arc<TempDb>>,
    },
}

pub enum Tx {
    Pg(sqlx::Transaction<'static, Postgres>),
    Sqlite(sqlx::Transaction<'static, Sqlite>),
}

pub enum Row {
    Pg(PgRow),
    Sqlite(SqliteRow),
}

fn bind_pg<'q>(mut q: Query<'q, Postgres, PgArguments>, args: Vec<SqlValue>) -> Query<'q, Postgres, PgArguments> {
    for a in args {
        q = match a {
            // Typed NULLs so Postgres infers the parameter type.
            SqlValue::NullBool => q.bind(Option::<bool>::None),
            SqlValue::NullSmallInt => q.bind(Option::<i16>::None),
            SqlValue::NullInt => q.bind(Option::<i32>::None),
            SqlValue::NullBigInt => q.bind(Option::<i64>::None),
            SqlValue::NullFloat => q.bind(Option::<f32>::None),
            SqlValue::NullDouble => q.bind(Option::<f64>::None),
            SqlValue::NullDecimal => q.bind(Option::<rango::Decimal>::None),
            SqlValue::NullText => q.bind(Option::<String>::None),
            SqlValue::NullBytes => q.bind(Option::<Vec<u8>>::None),
            SqlValue::NullUuid => q.bind(Option::<Uuid>::None),
            SqlValue::NullDateTime => q.bind(Option::<DateTime<Utc>>::None),
            SqlValue::NullDate => q.bind(Option::<chrono::NaiveDate>::None),
            SqlValue::NullTime => q.bind(Option::<chrono::NaiveTime>::None),
            SqlValue::NullJson => q.bind(Option::<sqlx::types::Json<Value>>::None),
            SqlValue::Bool(v) => q.bind(v),
            SqlValue::SmallInt(v) => q.bind(v),
            SqlValue::Int(v) => q.bind(v),
            SqlValue::BigInt(v) => q.bind(v),
            SqlValue::Float(v) => q.bind(v),
            SqlValue::Double(v) => q.bind(v),
            SqlValue::Decimal(v) => q.bind(v),
            SqlValue::Text(v) => q.bind(v),
            SqlValue::Bytes(v) => q.bind(v),
            SqlValue::Uuid(v) => q.bind(v),
            SqlValue::DateTime(v) => q.bind(v),
            SqlValue::Date(v) => q.bind(v),
            SqlValue::Time(v) => q.bind(v),
            SqlValue::Json(v) => q.bind(sqlx::types::Json(v)),
        };
    }
    q
}

/// Same encodings as rango's SQLite ops, so rows written through either path read back alike.
fn bind_sqlite<'q>(mut q: Query<'q, Sqlite, SqliteArguments<'q>>, args: Vec<SqlValue>) -> Query<'q, Sqlite, SqliteArguments<'q>> {
    for a in args {
        q = match a {
            SqlValue::NullBool | SqlValue::NullSmallInt | SqlValue::NullInt | SqlValue::NullBigInt => q.bind(Option::<i64>::None),
            SqlValue::NullFloat | SqlValue::NullDouble => q.bind(Option::<f64>::None),
            SqlValue::NullBytes => q.bind(Option::<Vec<u8>>::None),
            SqlValue::NullDecimal
            | SqlValue::NullText
            | SqlValue::NullUuid
            | SqlValue::NullDateTime
            | SqlValue::NullDate
            | SqlValue::NullTime
            | SqlValue::NullJson => q.bind(Option::<String>::None),
            SqlValue::Bool(v) => q.bind(v as i64),
            SqlValue::SmallInt(v) => q.bind(v as i64),
            SqlValue::Int(v) => q.bind(v as i64),
            SqlValue::BigInt(v) => q.bind(v),
            SqlValue::Float(v) => q.bind(v as f64),
            SqlValue::Double(v) => q.bind(v),
            SqlValue::Decimal(v) => q.bind(v.to_string()),
            SqlValue::Text(v) => q.bind(v),
            SqlValue::Bytes(v) => q.bind(v),
            SqlValue::Uuid(v) => q.bind(v.to_string()),
            // RFC 3339 text so lexical order is time order.
            SqlValue::DateTime(v) => q.bind(v.to_rfc3339()),
            SqlValue::Date(v) => q.bind(v.to_string()),
            SqlValue::Time(v) => q.bind(v.to_string()),
            SqlValue::Json(v) => q.bind(v.to_string()),
        };
    }
    q
}

impl Db {
    pub async fn connect(url: &str) -> Result<Db, String> {
        let cfg = DatabaseConfig::from_url(url);
        match cfg.backend() {
            rango::BackendKind::Sqlite => {
                let pool = rango::connect_sqlite(url).await.map_err(|e| e.to_string())?;
                Ok(Db::Sqlite {
                    pool,
                    #[cfg(test)]
                    tmp: None,
                })
            }
            rango::BackendKind::Postgres => Ok(Db::Pg(rango::connect_postgres(&cfg).await.map_err(|e| e.to_string())?)),
            // Only the scheme is reported: the rest of the URL may carry credentials.
            _ => Err(format!("unsupported DATABASE_URL scheme '{}' (use postgres:// or sqlite://)", url.split(':').next().unwrap_or(""))),
        }
    }

    pub fn is_sqlite(&self) -> bool {
        matches!(self, Db::Sqlite { .. })
    }

    pub async fn begin(&self) -> Result<Tx, sqlx::Error> {
        Ok(match self {
            Db::Pg(p) => Tx::Pg(p.begin().await?),
            Db::Sqlite { pool, .. } => Tx::Sqlite(pool.begin().await?),
        })
    }

    pub async fn fetch_all(&self, sql: &str, args: Vec<SqlValue>) -> Result<Vec<Row>, sqlx::Error> {
        match self {
            Db::Pg(p) => Ok(bind_pg(sqlx::query(sql), args).fetch_all(p).await?.into_iter().map(Row::Pg).collect()),
            Db::Sqlite { pool, .. } => {
                Ok(bind_sqlite(sqlx::query(sql), args).fetch_all(pool).await?.into_iter().map(Row::Sqlite).collect())
            }
        }
    }

    pub async fn fetch_optional(&self, sql: &str, args: Vec<SqlValue>) -> Result<Option<Row>, sqlx::Error> {
        match self {
            Db::Pg(p) => Ok(bind_pg(sqlx::query(sql), args).fetch_optional(p).await?.map(Row::Pg)),
            Db::Sqlite { pool, .. } => Ok(bind_sqlite(sqlx::query(sql), args).fetch_optional(pool).await?.map(Row::Sqlite)),
        }
    }

    pub async fn fetch_one(&self, sql: &str, args: Vec<SqlValue>) -> Result<Row, sqlx::Error> {
        match self {
            Db::Pg(p) => Ok(Row::Pg(bind_pg(sqlx::query(sql), args).fetch_one(p).await?)),
            Db::Sqlite { pool, .. } => Ok(Row::Sqlite(bind_sqlite(sqlx::query(sql), args).fetch_one(pool).await?)),
        }
    }

    pub async fn execute(&self, sql: &str, args: Vec<SqlValue>) -> Result<u64, sqlx::Error> {
        match self {
            Db::Pg(p) => Ok(bind_pg(sqlx::query(sql), args).execute(p).await?.rows_affected()),
            Db::Sqlite { pool, .. } => Ok(bind_sqlite(sqlx::query(sql), args).execute(pool).await?.rows_affected()),
        }
    }

    pub async fn insert<M: Model + ModelValues + FromRow>(&self, m: M) -> rango::Result<M> {
        match self {
            Db::Pg(p) => rango::insert(p, m).await,
            Db::Sqlite { pool, .. } => rango::sqlite::insert(pool, m).await,
        }
    }

    pub async fn get<M: Model + ModelValues + FromRow>(&self, pk: &SqlValue) -> rango::Result<Option<M>> {
        match self {
            Db::Pg(p) => rango::get(p, pk).await,
            Db::Sqlite { pool, .. } => rango::sqlite::get(pool, pk).await,
        }
    }

    pub fn json_text(&self, col: &'static str, path: &[&'static str]) -> String {
        if self.is_sqlite() {
            format!("json_extract({col}, '$.{}')", path.join("."))
        } else {
            format!("{col} #>> '{{{}}}'", path.join(","))
        }
    }

    pub fn month(&self, col: &'static str) -> String {
        if self.is_sqlite() { format!("substr({col}, 1, 7)") } else { format!("to_char({col}, 'YYYY-MM')") }
    }
}

impl Tx {
    pub async fn fetch_optional(&mut self, sql: &str, args: Vec<SqlValue>) -> Result<Option<Row>, sqlx::Error> {
        match self {
            Tx::Pg(t) => Ok(bind_pg(sqlx::query(sql), args).fetch_optional(&mut **t).await?.map(Row::Pg)),
            Tx::Sqlite(t) => Ok(bind_sqlite(sqlx::query(sql), args).fetch_optional(&mut **t).await?.map(Row::Sqlite)),
        }
    }

    pub async fn fetch_one(&mut self, sql: &str, args: Vec<SqlValue>) -> Result<Row, sqlx::Error> {
        match self {
            Tx::Pg(t) => Ok(Row::Pg(bind_pg(sqlx::query(sql), args).fetch_one(&mut **t).await?)),
            Tx::Sqlite(t) => Ok(Row::Sqlite(bind_sqlite(sqlx::query(sql), args).fetch_one(&mut **t).await?)),
        }
    }

    pub async fn execute(&mut self, sql: &str, args: Vec<SqlValue>) -> Result<u64, sqlx::Error> {
        match self {
            Tx::Pg(t) => Ok(bind_pg(sqlx::query(sql), args).execute(&mut **t).await?.rows_affected()),
            Tx::Sqlite(t) => Ok(bind_sqlite(sqlx::query(sql), args).execute(&mut **t).await?.rows_affected()),
        }
    }

    pub async fn insert<M: Model + ModelValues + FromRow>(&mut self, m: M) -> rango::Result<M> {
        match self {
            Tx::Pg(t) => rango::insert(&mut **t, m).await,
            Tx::Sqlite(t) => rango::sqlite::insert(&mut **t, m).await,
        }
    }

    pub async fn commit(self) -> Result<(), sqlx::Error> {
        match self {
            Tx::Pg(t) => t.commit().await,
            Tx::Sqlite(t) => t.commit().await,
        }
    }
}

impl Row {
    /// Panics like `sqlx::Row::get` when the column is missing or does not decode.
    pub fn get<T: Col, I>(&self, i: I) -> T
    where
        I: ColumnIndex<PgRow> + ColumnIndex<SqliteRow>,
    {
        match self {
            Row::Pg(r) => T::from_pg(r, &i),
            Row::Sqlite(r) => T::from_sqlite(r, &i),
        }
        .unwrap_or_else(|e| panic!("decoding column {i:?}: {e}"))
    }
}

/// Decodes one column; SQLite stores UUIDs, timestamps and JSON as text.
pub trait Col: Sized {
    fn from_pg<I: ColumnIndex<PgRow>>(r: &PgRow, i: I) -> Result<Self, sqlx::Error>;
    fn from_sqlite<I: ColumnIndex<SqliteRow>>(r: &SqliteRow, i: I) -> Result<Self, sqlx::Error>;
}

fn decode_err<E: std::error::Error + Send + Sync + 'static>(e: E) -> sqlx::Error {
    sqlx::Error::Decode(Box::new(e))
}

macro_rules! col_native {
    ($($t:ty),*) => {$(
        impl Col for $t {
            fn from_pg<I: ColumnIndex<PgRow>>(r: &PgRow, i: I) -> Result<Self, sqlx::Error> {
                r.try_get(i)
            }
            fn from_sqlite<I: ColumnIndex<SqliteRow>>(r: &SqliteRow, i: I) -> Result<Self, sqlx::Error> {
                r.try_get(i)
            }
        }
    )*};
}
col_native!(String, bool, i32, i64, f64);

macro_rules! col_text {
    ($t:ty, $parse:expr) => {
        impl Col for $t {
            fn from_pg<I: ColumnIndex<PgRow>>(r: &PgRow, i: I) -> Result<Self, sqlx::Error> {
                r.try_get(i)
            }
            fn from_sqlite<I: ColumnIndex<SqliteRow>>(r: &SqliteRow, i: I) -> Result<Self, sqlx::Error> {
                $parse(r.try_get::<String, _>(i)?)
            }
        }
    };
}
col_text!(Uuid, |s: String| s.parse().map_err(decode_err));
col_text!(DateTime<Utc>, |s: String| s.parse().map_err(decode_err));
col_text!(Value, |s: String| serde_json::from_str(&s).map_err(decode_err));

impl<T: Col> Col for Option<T> {
    fn from_pg<I: ColumnIndex<PgRow>>(r: &PgRow, i: I) -> Result<Self, sqlx::Error> {
        if r.try_get_raw(&i)?.is_null() { Ok(None) } else { T::from_pg(r, i).map(Some) }
    }
    fn from_sqlite<I: ColumnIndex<SqliteRow>>(r: &SqliteRow, i: I) -> Result<Self, sqlx::Error> {
        if r.try_get_raw(&i)?.is_null() { Ok(None) } else { T::from_sqlite(r, i).map(Some) }
    }
}

/// Converts a Rust value to a bindable argument; `None` becomes the typed NULL of its type.
pub trait Arg {
    fn arg(self) -> SqlValue;
}

macro_rules! arg_from {
    ($($t:ty => $null:ident),*) => {$(
        impl Arg for $t {
            fn arg(self) -> SqlValue {
                SqlValue::from(self)
            }
        }
        impl Arg for Option<$t> {
            fn arg(self) -> SqlValue {
                self.map_or(SqlValue::$null, SqlValue::from)
            }
        }
    )*};
}
arg_from!(String => NullText, bool => NullBool, i32 => NullInt, i64 => NullBigInt, f64 => NullDouble, Uuid => NullUuid, DateTime<Utc> => NullDateTime, Value => NullJson);

impl Arg for &String {
    fn arg(self) -> SqlValue {
        SqlValue::from(self.as_str())
    }
}
impl Arg for &str {
    fn arg(self) -> SqlValue {
        SqlValue::from(self)
    }
}
impl Arg for Option<&str> {
    fn arg(self) -> SqlValue {
        self.map_or(SqlValue::NullText, SqlValue::from)
    }
}

macro_rules! args {
    ($($a:expr),* $(,)?) => { vec![$($crate::sql::Arg::arg($a)),*] };
}
pub(crate) use args;

/// The SQLite migration set, embedded so a developer needs no CLI; names are the file stems the rango CLI records.
const SQLITE_MIGRATIONS: &[(&str, &str)] = &[
    ("0001_auto", include_str!("../migrations/sqlite/0001_auto.sql")),
    ("0002_local_user", include_str!("../migrations/sqlite/0002_local_user.sql")),
];

/// Applies the pending SQLite migrations, recorded in the same `_rango_migrations` table the rango CLI uses, one transaction per file.
pub async fn migrate_sqlite(pool: &rango::SqlitePool) -> Result<(), String> {
    sqlx::query("CREATE TABLE IF NOT EXISTS _rango_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, applied_at TEXT NOT NULL DEFAULT (datetime('now')))").execute(pool).await.map_err(|e| format!("migrations table: {e}"))?;
    let applied: std::collections::HashSet<String> = sqlx::query_scalar::<_, String>("SELECT name FROM _rango_migrations")
        .fetch_all(pool)
        .await
        .map_err(|e| format!("migrations table: {e}"))?
        .into_iter()
        .collect();
    for (name, sql) in SQLITE_MIGRATIONS {
        if applied.contains(*name) {
            continue;
        }
        let mut tx = pool.begin().await.map_err(|e| format!("migration {name}: {e}"))?;
        sqlx::raw_sql(sql).execute(&mut *tx).await.map_err(|e| format!("migration {name}: {e}"))?;
        sqlx::query("INSERT INTO _rango_migrations (name) VALUES (?)")
            .bind(name)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("migration {name}: {e}"))?;
        tx.commit().await.map_err(|e| format!("migration {name}: {e}"))?;
    }
    Ok(())
}

/// Makes the SQLite file private (0600): it holds password hashes, session token hashes and the sealed provider keys.
/// The WAL side files inherit the directory's mode. Called after `connect`, which creates the file.
pub fn restrict_mode(url: &str) {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let path = url.trim_start_matches("sqlite://").trim_start_matches("sqlite:");
        if let Err(e) = std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o600)) {
            eprintln!("warning: cannot restrict {path}: {e}");
        }
    }
    #[cfg(not(unix))]
    let _ = url;
}

#[cfg(test)]
pub struct TempDb(pub std::path::PathBuf);

#[cfg(test)]
impl Drop for TempDb {
    fn drop(&mut self) {
        for suffix in ["", "-wal", "-shm"] {
            let mut p = self.0.clone().into_os_string();
            p.push(suffix);
            let _ = std::fs::remove_file(p);
        }
    }
}

/// A fresh database per test: `$TEST_DATABASE_URL` set means a clone of `studio_test` (migrated by `just test`), else a temp SQLite file.
#[cfg(test)]
pub async fn test_db() -> Db {
    if let Ok(base) = std::env::var("TEST_DATABASE_URL") {
        let name = format!("studio_test_{}", Uuid::new_v4().simple());
        let admin = rango::connect_postgres(&DatabaseConfig::from_url(base.clone())).await.expect("connect to Postgres");
        sqlx::raw_sql(&format!("CREATE DATABASE {name} TEMPLATE studio_test")).execute(&admin).await.expect("create the test database");
        admin.close().await;
        let mut url = url::Url::parse(&base).expect("TEST_DATABASE_URL");
        url.set_path(&name);
        return Db::connect(url.as_str()).await.expect("connect to the test database");
    }
    let path = std::env::temp_dir().join(format!("unamey-test-{}.db", Uuid::new_v4().simple()));
    let tmp = std::sync::Arc::new(TempDb(path.clone()));
    let url = format!("sqlite://{}", path.display());
    let Db::Sqlite { pool, .. } = Db::connect(&url).await.expect("open the test database") else { unreachable!() };
    restrict_mode(&url);
    migrate_sqlite(&pool).await.expect("migrate the test database");
    Db::Sqlite { pool, tmp: Some(tmp) }
}
#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{Generation, Project, User};
    use chrono::TimeZone;
    use rango::{FieldDateTime, FieldJson, FieldText, FieldUuid, ForeignKey};
    use serde_json::json;

    const LOCAL: Uuid = Uuid::from_u128(1);

    fn generation(owner: Uuid, project: Option<Uuid>) -> Generation {
        Generation {
            id: FieldUuid(Uuid::new_v4()),
            brief_json: FieldJson(serde_json::json!({})),
            model: FieldText("m".into()),
            notes_json: None,
            html: None,
            skill_version: FieldText("v".into()),
            verdict: None,
            verdict_note: None,
            created_at: FieldDateTime(Utc::now()),
            project_id: project.map(ForeignKey::new),
            concept_id: None,
            page: None,
            target: FieldText("desktop".into()),
            owner_id: ForeignKey::new(owner),
        }
    }

    #[tokio::test]
    async fn schema_seeds_local_and_enforces_relations() {
        let db = test_db().await;
        let local = db.get::<User>(&SqlValue::Uuid(LOCAL)).await.unwrap().expect("local user seeded");
        assert!(local.admin.0);

        let pid = Uuid::new_v4();
        let project = Project {
            id: FieldUuid(pid),
            name: FieldText("p".into()),
            owner_id: ForeignKey::new(LOCAL),
            created_at: FieldDateTime(Utc::now()),
            archived_at: None,
        };
        db.insert(project).await.unwrap();
        let g = db.insert(generation(LOCAL, Some(pid))).await.unwrap();

        // A generation with a bad target, or a second project with the same name, is refused.
        let mut bad = generation(LOCAL, None);
        bad.target = FieldText("tv".into());
        assert!(db.insert(bad).await.is_err());
        let dup = Project {
            id: FieldUuid(Uuid::new_v4()),
            name: FieldText("p".into()),
            owner_id: ForeignKey::new(LOCAL),
            created_at: FieldDateTime(Utc::now()),
            archived_at: None,
        };
        assert!(db.insert(dup).await.is_err());

        // Deleting the project keeps its generation (project_id set to NULL).
        db.execute("DELETE FROM projects WHERE id = $1", args![pid]).await.unwrap();
        let kept = db.get::<Generation>(&SqlValue::Uuid(g.id.0)).await.unwrap().expect("generation kept");
        assert!(kept.project_id.is_none());
    }

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
        let frac = whole + chrono::Duration::microseconds(123_456);
        db.execute(
            "INSERT INTO sql_probe (id, at, ok, n, x, j, s) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            args![id, frac, true, 7i64, 1.5f64, json!({"a": {"b": "c"}}), None::<String>],
        )
        .await
        .unwrap();
        db.execute(
            "INSERT INTO sql_probe (id, at, ok, n, x, j, s) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            args![Uuid::now_v7(), whole, false, None::<i64>, None::<f64>, None::<Value>, "s"],
        )
        .await
        .unwrap();
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
        let all = db
            .fetch_all(
                "SELECT id FROM sql_probe WHERE ($1 IS NULL OR id = $1) AND ($2 IS NULL OR s = $2)",
                args![None::<Uuid>, None::<String>],
            )
            .await
            .unwrap();
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

    #[tokio::test]
    async fn sqlite_migrations_apply_once_and_seed_local() {
        if std::env::var("TEST_DATABASE_URL").is_ok() {
            return;
        }
        let db = test_db().await; // migrated by test_db
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
        let shape = |path: &str| {
            let v: serde_json::Value = serde_json::from_str(path).unwrap();
            let mut map: std::collections::BTreeMap<String, Vec<(String, bool, bool)>> = std::collections::BTreeMap::new();
            for (table, obj) in v["tables"].as_object().unwrap() {
                let mut cols = obj["columns"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .map(|c| {
                        (c["name"].as_str().unwrap().to_string(), c["nullable"].as_bool().unwrap(), c["primary_key"].as_bool().unwrap())
                    })
                    .collect::<Vec<_>>();
                cols.sort();
                map.insert(table.clone(), cols);
            }
            map
        };
        let pg = shape(include_str!("../migrations/snapshot.json"));
        let lite = shape(include_str!("../migrations/sqlite/snapshot.json"));
        assert_eq!(pg, lite);
    }

    #[cfg(unix)]
    #[tokio::test]
    async fn sqlite_file_is_private() {
        if std::env::var("TEST_DATABASE_URL").is_ok() {
            return;
        }
        use std::os::unix::fs::PermissionsExt;
        let db = test_db().await;
        let Db::Sqlite { tmp: Some(tmp), .. } = &db else { unreachable!() };
        assert_eq!(std::fs::metadata(&tmp.0).unwrap().permissions().mode() & 0o777, 0o600);
    }
}
