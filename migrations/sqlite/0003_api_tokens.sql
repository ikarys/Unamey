CREATE TABLE IF NOT EXISTS "api_tokens" (
    "id" TEXT PRIMARY KEY,
    "token_hash" TEXT NOT NULL UNIQUE,
    "user_id" TEXT NOT NULL CONSTRAINT "api_tokens_user_id_fkey" REFERENCES "users" ("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used" TEXT
);

CREATE INDEX IF NOT EXISTS "api_tokens_user_id_idx" ON "api_tokens" ("user_id");

