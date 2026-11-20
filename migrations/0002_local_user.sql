-- The single-tenant user (authz::LOCAL): owns everything when STUDIO_ORIGIN is unset; the admin in multi-user mode.
INSERT INTO "users" ("id", "email", "admin") VALUES ('00000000-0000-0000-0000-000000000001', 'local', true) ON CONFLICT DO NOTHING;
