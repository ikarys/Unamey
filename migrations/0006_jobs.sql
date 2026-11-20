ALTER TABLE "jobs" ADD COLUMN "llm_calls" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "jobs" ADD COLUMN "llm_seconds" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "jobs" ADD COLUMN "prompt_tokens" BIGINT NOT NULL DEFAULT 0;

ALTER TABLE "jobs" ADD COLUMN "cached_tokens" BIGINT NOT NULL DEFAULT 0;

ALTER TABLE "jobs" ADD COLUMN "out_tokens" BIGINT NOT NULL DEFAULT 0;

ALTER TABLE "jobs" ADD COLUMN "cost" DOUBLE PRECISION;

ALTER TABLE "jobs" ADD COLUMN "model" TEXT;


-- Backfill from the "llm: 63s · prompt N tok (cached N) · out N tok · ..." log lines of older jobs (cost and model unknown).
UPDATE "jobs" j SET "llm_calls" = t.calls, "llm_seconds" = t.seconds, "prompt_tokens" = t.prompt, "cached_tokens" = t.cached, "out_tokens" = t.out
FROM (
    SELECT id, COUNT(*) AS calls, SUM(m[1]::int) AS seconds, SUM(m[2]::bigint) AS prompt, SUM(m[3]::bigint) AS cached, SUM(m[4]::bigint) AS out
    FROM "jobs", regexp_matches("log", 'llm: (\d+)s · prompt (\d+) tok \(cached (\d+)\) · out (\d+) tok', 'g') AS m
    GROUP BY id
) t
WHERE j.id = t.id;
