-- The single-tenant user (authz::LOCAL): owns everything when STUDIO_ORIGIN is unset; the admin in multi-user mode.
-- created_at is explicit: the column default (CURRENT_TIMESTAMP) stores a form the RFC 3339 decoders refuse.
INSERT OR IGNORE INTO "users" ("id", "email", "admin", "disabled", "created_at") VALUES ('00000000-0000-0000-0000-000000000001', 'local', 1, 0, '2025-01-01T00:00:00+00:00');
