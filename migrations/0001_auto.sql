CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "admin" BOOLEAN NOT NULL DEFAULT false,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "password_hash" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "sessions" (
    "id" UUID PRIMARY KEY,
    "token_hash" TEXT NOT NULL UNIQUE,
    "user_id" UUID NOT NULL CONSTRAINT "sessions_user_id_fkey" REFERENCES "users" ("id") ON DELETE CASCADE,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "last_seen" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "expires_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" ("user_id");

CREATE TABLE IF NOT EXISTS "jobs" (
    "id" UUID PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "progress" TEXT NOT NULL DEFAULT '',
    "log" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "finished_at" TIMESTAMPTZ,
    "owner_id" UUID NOT NULL CONSTRAINT "jobs_owner_id_fkey" REFERENCES "users" ("id") ON DELETE CASCADE,
    CONSTRAINT "jobs_status" CHECK (status IN ('queued','running','done','failed'))
);

CREATE INDEX IF NOT EXISTS "jobs_owner_id_idx" ON "jobs" ("owner_id");

CREATE TABLE IF NOT EXISTS "settings" (
    "key" TEXT PRIMARY KEY,
    "value" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "projects" (
    "id" UUID PRIMARY KEY,
    "name" TEXT NOT NULL,
    "owner_id" UUID NOT NULL CONSTRAINT "projects_owner_id_fkey" REFERENCES "users" ("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "identity_id" UUID,
    "archived_at" TIMESTAMPTZ,
    CONSTRAINT "projects_owner_name" UNIQUE ("owner_id", "name")
);

CREATE INDEX IF NOT EXISTS "projects_owner_id_idx" ON "projects" ("owner_id");

CREATE INDEX IF NOT EXISTS "projects_identity_id_idx" ON "projects" ("identity_id");

CREATE TABLE IF NOT EXISTS "generations" (
    "id" UUID PRIMARY KEY,
    "brief_json" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "notes_json" JSONB,
    "html" TEXT,
    "skill_version" TEXT NOT NULL,
    "verdict" TEXT,
    "verdict_note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "project_id" UUID CONSTRAINT "generations_project_id_fkey" REFERENCES "projects" ("id") ON DELETE SET NULL,
    "page" TEXT,
    "target" TEXT NOT NULL DEFAULT 'desktop',
    "owner_id" UUID NOT NULL CONSTRAINT "generations_owner_id_fkey" REFERENCES "users" ("id") ON DELETE CASCADE,
    CONSTRAINT "generations_verdict" CHECK (verdict IN ('good','mixed','bad')),
    CONSTRAINT "generations_target" CHECK (target IN ('desktop','mobile'))
);

CREATE INDEX IF NOT EXISTS "generations_project_id_idx" ON "generations" ("project_id");

CREATE INDEX IF NOT EXISTS "generations_owner_id_idx" ON "generations" ("owner_id");

CREATE TABLE IF NOT EXISTS "shares" (
    "id" UUID PRIMARY KEY,
    "token_hash" TEXT NOT NULL UNIQUE,
    "owner_id" UUID NOT NULL CONSTRAINT "shares_owner_id_fkey" REFERENCES "users" ("id") ON DELETE CASCADE,
    "generation_id" UUID CONSTRAINT "shares_generation_id_fkey" REFERENCES "generations" ("id") ON DELETE CASCADE,
    "project_id" UUID CONSTRAINT "shares_project_id_fkey" REFERENCES "projects" ("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "expires_at" TIMESTAMPTZ,
    CONSTRAINT "shares_one_target" CHECK ((generation_id IS NULL) <> (project_id IS NULL))
);

CREATE INDEX IF NOT EXISTS "shares_owner_id_idx" ON "shares" ("owner_id");

CREATE INDEX IF NOT EXISTS "shares_generation_id_idx" ON "shares" ("generation_id");

CREATE INDEX IF NOT EXISTS "shares_project_id_idx" ON "shares" ("project_id");

ALTER TABLE "projects" ADD CONSTRAINT "projects_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "generations" ("id") ON DELETE SET NULL;

