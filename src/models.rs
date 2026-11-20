//! Rango models: the PostgreSQL schema. `rango makemigrations` turns changes here into `migrations/*.sql`.

use rango::prelude::*;

#[derive(Model)]
#[model(table = "users")]
pub struct User {
    pub id: FieldUuid,
    #[field(unique)]
    pub email: FieldText,
    /// Shown to admins (support); required at signup, null on accounts created before it existed.
    pub name: Option<FieldText>,
    #[field(default = "false")]
    pub admin: FieldBool,
    #[field(default = "false")]
    pub disabled: FieldBool,
    pub password_hash: Option<FieldText>,
    #[field(auto_now_add)]
    pub created_at: FieldDateTime,
}

#[derive(Model)]
#[model(table = "sessions")]
pub struct Session {
    pub id: FieldUuid,
    #[field(unique)]
    pub token_hash: FieldText,
    pub user_id: ForeignKey<User>,
    pub user_agent: Option<FieldText>,
    #[field(auto_now_add)]
    pub created_at: FieldDateTime,
    #[field(auto_now_add)]
    pub last_seen: FieldDateTime,
    pub expires_at: FieldDateTime,
}

#[derive(Model)]
#[model(table = "jobs", constraints = [
    CheckConstraint::new("status IN ('queued','running','done','failed')").name("jobs_status"),
])]
pub struct Job {
    pub id: FieldUuid,
    pub kind: FieldText,
    pub status: FieldText,
    #[field(default = "''")]
    pub progress: FieldText,
    #[field(default = "''")]
    pub log: FieldText,
    #[field(auto_now_add)]
    pub created_at: FieldDateTime,
    pub finished_at: Option<FieldDateTime>,
    pub owner_id: ForeignKey<User>,
    /// `{concept, page}`: where the result will land, so the gallery can show the job in place while it runs.
    pub target_json: Option<FieldJson>,
    /// LLM totals, added by `Job::llm_call` after each call, so the admin can sort and sum jobs in SQL.
    #[field(default = "0")]
    pub llm_calls: FieldInt,
    #[field(default = "0")]
    pub llm_seconds: FieldInt,
    #[field(default = "0")]
    pub prompt_tokens: FieldBigInt,
    #[field(default = "0")]
    pub cached_tokens: FieldBigInt,
    #[field(default = "0")]
    pub out_tokens: FieldBigInt,
    /// Dollars at the serving model's price when the call ran; null when that model has no price.
    pub cost: Option<FieldDouble>,
    /// The model that served the last call.
    pub model: Option<FieldText>,
}

#[derive(Model)]
#[model(table = "projects", constraints = [
    UniqueConstraint::on(&["owner_id", "name"]).name("projects_owner_name"),
])]
pub struct Project {
    pub id: FieldUuid,
    pub name: FieldText,
    pub owner_id: ForeignKey<User>,
    #[field(auto_now_add)]
    pub created_at: FieldDateTime,
    pub archived_at: Option<FieldDateTime>,
}

/// One style direction of a project: its own look exploration, reference and pages.
#[derive(Model)]
#[model(table = "concepts", constraints = [
    UniqueConstraint::on(&["project_id", "name"]).name("concepts_project_name"),
])]
pub struct Concept {
    pub id: FieldUuid,
    #[field(on_delete = "cascade")]
    pub project_id: ForeignKey<Project>,
    pub name: FieldText,
    /// The generation every page of the concept derives from.
    #[field(on_delete = "set_null")]
    pub identity_id: Option<ForeignKey<Generation>>,
    #[field(auto_now_add)]
    pub created_at: FieldDateTime,
}

#[derive(Model)]
#[model(table = "generations", constraints = [
    CheckConstraint::new("verdict IN ('good','mixed','bad')").name("generations_verdict"),
    CheckConstraint::new("target IN ('desktop','mobile')").name("generations_target"),
])]
pub struct Generation {
    pub id: FieldUuid,
    pub brief_json: FieldJson,
    pub model: FieldText,
    pub notes_json: Option<FieldJson>,
    pub html: Option<FieldText>,
    pub skill_version: FieldText,
    pub verdict: Option<FieldText>,
    pub verdict_note: Option<FieldText>,
    #[field(auto_now_add)]
    pub created_at: FieldDateTime,
    /// Deleting a project keeps its generations in the gallery.
    #[field(on_delete = "set_null")]
    pub project_id: Option<ForeignKey<Project>>,
    /// Invariant (db.rs): a generation with a concept has `project_id = concept.project_id`.
    #[field(on_delete = "set_null")]
    pub concept_id: Option<ForeignKey<Concept>>,
    pub page: Option<FieldText>,
    #[field(default = "'desktop'")]
    pub target: FieldText,
    pub owner_id: ForeignKey<User>,
}

#[derive(Model)]
#[model(table = "shares", constraints = [
    CheckConstraint::new("(generation_id IS NULL) <> (concept_id IS NULL)").name("shares_one_target"),
])]
pub struct Share {
    pub id: FieldUuid,
    #[field(unique)]
    pub token_hash: FieldText,
    pub owner_id: ForeignKey<User>,
    pub generation_id: Option<ForeignKey<Generation>>,
    #[field(on_delete = "cascade")]
    pub concept_id: Option<ForeignKey<Concept>>,
    #[field(auto_now_add)]
    pub created_at: FieldDateTime,
    pub expires_at: Option<FieldDateTime>,
}

#[derive(Model)]
#[model(table = "settings")]
pub struct Setting {
    #[field(primary_key)]
    pub key: FieldText,
    pub value: FieldText,
}
