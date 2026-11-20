CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "name" TEXT,
    "admin" INTEGER NOT NULL DEFAULT false,
    "disabled" INTEGER NOT NULL DEFAULT false,
    "password_hash" TEXT,
    "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "sessions" (
    "id" TEXT PRIMARY KEY,
    "token_hash" TEXT NOT NULL UNIQUE,
    "user_id" TEXT NOT NULL CONSTRAINT "sessions_user_id_fkey" REFERENCES "users" ("id") ON DELETE CASCADE,
    "user_agent" TEXT,
    "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" ("user_id");

CREATE TABLE IF NOT EXISTS "jobs" (
    "id" TEXT PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "progress" TEXT NOT NULL DEFAULT '',
    "log" TEXT NOT NULL DEFAULT '',
    "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TEXT,
    "owner_id" TEXT NOT NULL CONSTRAINT "jobs_owner_id_fkey" REFERENCES "users" ("id") ON DELETE CASCADE,
    "target_json" TEXT,
    "llm_calls" INTEGER NOT NULL DEFAULT 0,
    "llm_seconds" INTEGER NOT NULL DEFAULT 0,
    "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
    "cached_tokens" INTEGER NOT NULL DEFAULT 0,
    "out_tokens" INTEGER NOT NULL DEFAULT 0,
    "cost" REAL,
    "model" TEXT,
    CONSTRAINT "jobs_status" CHECK (status IN ('queued','running','done','failed'))
);

CREATE INDEX IF NOT EXISTS "jobs_owner_id_idx" ON "jobs" ("owner_id");

CREATE TABLE IF NOT EXISTS "projects" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL CONSTRAINT "projects_owner_id_fkey" REFERENCES "users" ("id") ON DELETE CASCADE,
    "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TEXT,
    CONSTRAINT "projects_owner_name" UNIQUE ("owner_id", "name")
);

CREATE INDEX IF NOT EXISTS "projects_owner_id_idx" ON "projects" ("owner_id");

CREATE TABLE IF NOT EXISTS "settings" (
    "key" TEXT PRIMARY KEY,
    "value" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "concepts" (
    "id" TEXT PRIMARY KEY,
    "project_id" TEXT NOT NULL CONSTRAINT "concepts_project_id_fkey" REFERENCES "projects" ("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "identity_id" TEXT CONSTRAINT "concepts_identity_id_fkey" REFERENCES "generations" ("id") ON DELETE SET NULL,
    "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "concepts_project_name" UNIQUE ("project_id", "name")
);

CREATE INDEX IF NOT EXISTS "concepts_project_id_idx" ON "concepts" ("project_id");

CREATE INDEX IF NOT EXISTS "concepts_identity_id_idx" ON "concepts" ("identity_id");

CREATE TABLE IF NOT EXISTS "generations" (
    "id" TEXT PRIMARY KEY,
    "brief_json" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "notes_json" TEXT,
    "html" TEXT,
    "skill_version" TEXT NOT NULL,
    "verdict" TEXT,
    "verdict_note" TEXT,
    "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "project_id" TEXT CONSTRAINT "generations_project_id_fkey" REFERENCES "projects" ("id") ON DELETE SET NULL,
    "concept_id" TEXT CONSTRAINT "generations_concept_id_fkey" REFERENCES "concepts" ("id") ON DELETE SET NULL,
    "page" TEXT,
    "target" TEXT NOT NULL DEFAULT 'desktop',
    "owner_id" TEXT NOT NULL CONSTRAINT "generations_owner_id_fkey" REFERENCES "users" ("id") ON DELETE CASCADE,
    CONSTRAINT "generations_verdict" CHECK (verdict IN ('good','mixed','bad')),
    CONSTRAINT "generations_target" CHECK (target IN ('desktop','mobile'))
);

CREATE INDEX IF NOT EXISTS "generations_project_id_idx" ON "generations" ("project_id");

CREATE INDEX IF NOT EXISTS "generations_concept_id_idx" ON "generations" ("concept_id");

CREATE INDEX IF NOT EXISTS "generations_owner_id_idx" ON "generations" ("owner_id");

CREATE TABLE IF NOT EXISTS "shares" (
    "id" TEXT PRIMARY KEY,
    "token_hash" TEXT NOT NULL UNIQUE,
    "owner_id" TEXT NOT NULL CONSTRAINT "shares_owner_id_fkey" REFERENCES "users" ("id") ON DELETE CASCADE,
    "generation_id" TEXT CONSTRAINT "shares_generation_id_fkey" REFERENCES "generations" ("id") ON DELETE CASCADE,
    "concept_id" TEXT CONSTRAINT "shares_concept_id_fkey" REFERENCES "concepts" ("id") ON DELETE CASCADE,
    "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TEXT,
    CONSTRAINT "shares_one_target" CHECK ((generation_id IS NULL) <> (concept_id IS NULL))
);

CREATE INDEX IF NOT EXISTS "shares_owner_id_idx" ON "shares" ("owner_id");

CREATE INDEX IF NOT EXISTS "shares_generation_id_idx" ON "shares" ("generation_id");

CREATE INDEX IF NOT EXISTS "shares_concept_id_idx" ON "shares" ("concept_id");

