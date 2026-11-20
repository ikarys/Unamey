-- A project's single validated look becomes a concept: every project gets "Concept 1" holding its identity, generations and shares.
CREATE TABLE IF NOT EXISTS "concepts" (
    "id" UUID PRIMARY KEY,
    "project_id" UUID NOT NULL CONSTRAINT "concepts_project_id_fkey" REFERENCES "projects" ("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "identity_id" UUID CONSTRAINT "concepts_identity_id_fkey" REFERENCES "generations" ("id") ON DELETE SET NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "concepts_project_name" UNIQUE ("project_id", "name")
);

CREATE INDEX IF NOT EXISTS "concepts_project_id_idx" ON "concepts" ("project_id");

CREATE INDEX IF NOT EXISTS "concepts_identity_id_idx" ON "concepts" ("identity_id");

ALTER TABLE "generations" ADD COLUMN "concept_id" UUID CONSTRAINT "generations_concept_id_fkey" REFERENCES "concepts" ("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "generations_concept_id_idx" ON "generations" ("concept_id");

ALTER TABLE "shares" ADD COLUMN "concept_id" UUID CONSTRAINT "shares_concept_id_fkey" REFERENCES "concepts" ("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "shares_concept_id_idx" ON "shares" ("concept_id");

INSERT INTO "concepts" ("id", "project_id", "name", "identity_id", "created_at") SELECT gen_random_uuid(), p."id", 'Concept 1', p."identity_id", p."created_at" FROM "projects" p;

UPDATE "generations" g SET "concept_id" = c."id" FROM "concepts" c WHERE c."project_id" = g."project_id";

UPDATE "shares" s SET "concept_id" = c."id" FROM "concepts" c WHERE c."project_id" = s."project_id";

ALTER TABLE "shares" DROP CONSTRAINT "shares_one_target";

ALTER TABLE "shares" DROP COLUMN "project_id";

ALTER TABLE "shares" ADD CONSTRAINT "shares_one_target" CHECK ((generation_id IS NULL) <> (concept_id IS NULL));

ALTER TABLE "projects" DROP COLUMN "identity_id";
