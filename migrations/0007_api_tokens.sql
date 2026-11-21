CREATE TABLE IF NOT EXISTS "api_tokens" (
    "id" UUID PRIMARY KEY,
    "token_hash" TEXT NOT NULL UNIQUE,
    "user_id" UUID NOT NULL CONSTRAINT "api_tokens_user_id_fkey" REFERENCES "users" ("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "last_used" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "api_tokens_user_id_idx" ON "api_tokens" ("user_id");

