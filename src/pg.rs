//! PostgreSQL pool. The schema lives in `models.rs`; `rango migrate` applies `migrations/` (see the Justfile).

use rango::{DatabaseConfig, PgPool};

/// Connects to `$DATABASE_URL`.
pub async fn connect() -> Result<PgPool, String> {
    let cfg = DatabaseConfig::from_env().map_err(|_| "DATABASE_URL is not set".to_string())?;
    rango::connect_postgres(&cfg).await.map_err(|e| e.to_string())
}

/// A fresh database per test, cloned from `studio_test` (migrated by `just test`). `just test` drops them before each run.
#[cfg(test)]
pub async fn test_pool() -> PgPool {
    let base = std::env::var("DATABASE_URL").expect("DATABASE_URL (run the tests with `just test`)");
    let name = format!("studio_test_{}", uuid::Uuid::new_v4().simple());
    let admin = rango::connect_postgres(&DatabaseConfig::from_url(base.clone())).await.expect("connect to Postgres");
    sqlx::raw_sql(&format!("CREATE DATABASE {name} TEMPLATE studio_test")).execute(&admin).await.expect("create the test database");
    admin.close().await;
    let mut url = url::Url::parse(&base).expect("DATABASE_URL");
    url.set_path(&name);
    rango::connect_postgres(&DatabaseConfig::from_url(url.to_string())).await.expect("connect to the test database")
}

#[cfg(test)]
mod tests {
    use crate::models::{Generation, Project, User};
    use rango::prelude::*;
    use uuid::Uuid;

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
            created_at: FieldDateTime(chrono::Utc::now()),
            project_id: project.map(ForeignKey::new),
            concept_id: None,
            page: None,
            target: FieldText("desktop".into()),
            owner_id: ForeignKey::new(owner),
        }
    }

    #[tokio::test]
    async fn schema_seeds_local_and_enforces_relations() {
        let pool = super::test_pool().await;
        let local = get::<_, User>(&pool, &SqlValue::Uuid(LOCAL)).await.unwrap().expect("local user seeded");
        assert!(local.admin.0);

        let pid = Uuid::new_v4();
        let project = Project {
            id: FieldUuid(pid),
            name: FieldText("p".into()),
            owner_id: ForeignKey::new(LOCAL),
            created_at: FieldDateTime(chrono::Utc::now()),
            archived_at: None,
        };
        insert(&pool, project).await.unwrap();
        let g = insert(&pool, generation(LOCAL, Some(pid))).await.unwrap();

        // A generation with a bad target, or a second project with the same name, is refused.
        let mut bad = generation(LOCAL, None);
        bad.target = FieldText("tv".into());
        assert!(insert(&pool, bad).await.is_err());
        let dup = Project {
            id: FieldUuid(Uuid::new_v4()),
            name: FieldText("p".into()),
            owner_id: ForeignKey::new(LOCAL),
            created_at: FieldDateTime(chrono::Utc::now()),
            archived_at: None,
        };
        assert!(insert(&pool, dup).await.is_err());

        // Deleting the project keeps its generation (project_id set to NULL).
        sqlx::query("DELETE FROM projects WHERE id = $1").bind(pid).execute(&pool).await.unwrap();
        let kept = get::<_, Generation>(&pool, &SqlValue::Uuid(g.id.0)).await.unwrap().expect("generation kept");
        assert!(kept.project_id.is_none());
    }
}
