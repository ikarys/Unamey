# Security

## Reporting a vulnerability

Write to bikarys@proton.me. Response time: best effort, acknowledged within 7 days.
There is no fixed fix time. Do not open a public issue for a
vulnerability. This project has a single maintainer.

## What this software protects, and what it does not

In multi-user mode (`STUDIO_ORIGIN` set), it protects each user's projects,
generations, jobs, account, and provider API keys stored in the database.
The browser, other users, and LLM output are trust boundaries; model HTML is
hostile, and the LLM provider is trusted with the briefs. Out of scope are
the host and its admin, the database server or file, the admin account (it manages
accounts, providers and settings and sees global counts, but cannot open
another user's content), single-user mode (binds 127.0.0.1, one local
user, no accounts), denial of service, and LLM spend abuse beyond the
per-user job cap.

## Threat model: known vulnerability classes and their coverage

| Class | Where it could happen here | Covered by (tool rule or test) |
|---|---|---|
| SQL injection | `src/db.rs` queries | Parameterised queries through rango-orm and sqlx binds; the one spliced table name is checked against a fixed list (`owner_of`), and the JSON column and path literals spliced by `sql::Db::json_text` are `&'static str` from the code, never input; `db::tests::job_query_bounds_its_input` |
| Server-side request forgery | Headless Chromium rendering model HTML for the showcase (`src/pipeline/showcase.rs`) | Proxy to a dead port with a bypass list of the Tailwind and Google Fonts hosts only; `pipeline::showcase::tests::chromium_reaches_only_the_allowed_hosts` |
| Path traversal | Model tool call reading skill files (`src/pipeline/generate.rs` confine); static files served by `src/http.rs` | `pipeline::generate::tests::confinement`, `http::tests::static_paths_never_leave_the_root` |
| Broken authorization / cross-user access | Every owner-scoped table, `src/authz.rs` policy | `authz::tests::member_uses`, `authz::tests::admin_uses`, `authz::tests::access`, `authz::tests::view_as_member_only_drops_rights`, `db::tests::accounts_and_ownership`, `db::tests::status_shows_only_the_actors_jobs`, `http::tests::other_users_get_404_on_owned_routes` |
| XSS from model output | Generated HTML shown in the app and on share pages | Share pages: sandboxed iframe (`allow-scripts`, never `allow-same-origin`) and `Content-Security-Policy: sandbox allow-scripts`; `share::tests::esc_escapes`, `share::tests::screens_get_an_opaque_origin`, `db::tests::share_links`, `pipeline::showcase::tests::page_escapes_the_screen`; in the app, `just test` fails on any `<iframe` in `web/src` without `sandbox="allow-scripts"` or with `allow-same-origin` |
| Credential storage | Passwords, sessions, API keys | argon2 password hashes, session and share tokens stored hashed, API keys sealed with the key file (`STUDIO_KEY_FILE`) via llm-providers-connector MasterKey; `db::tests::accounts_and_ownership` (login, password change revokes other sessions, only the session token hash is stored), `db::tests::share_links` (only the share token hash is stored) |
| CSRF and DNS rebinding | HTTP API | Session cookie `HttpOnly SameSite=Lax`; in single-user mode `Host` and `Origin` must be `127.0.0.1` or `localhost` (`src/http.rs` local_origin); no test |
| Brute force on login | Multi-user login | Not covered: no rate limiting yet (known gap) |
| Secrets in code | Repository | `gitleaks git` run by hand before each push; no CI yet |
| Vulnerable dependencies | `Cargo.lock`, `web/package-lock.json` | `cargo audit` and `npm audit` run by hand before a release; no CI yet |

## Claims and their tests

| Claim | Test |
|---|---|
| Model tool calls are confined when reading skill files | `pipeline::generate::tests::confinement` |
| The SQLite database file is readable by the server's user only (mode 0600 set at startup before the first write; SQLite gives the WAL and shm side files the main file's mode, and startup also fixes side files already there) | `sql::tests::sqlite_file_is_private` |
| Only the owner reaches a project, concept, generation or job, admins included; another user gets 404 on every owned route | `authz::tests::access`, `http::tests::other_users_get_404_on_owned_routes`, `db::tests::accounts_and_ownership`, `db::tests::status_shows_only_the_actors_jobs` |
| Members get 403 on admin-only API prefixes; admin view as member drops rights | `authz::tests::member_uses`, `authz::tests::admin_uses`, `authz::tests::view_as_member_only_drops_rights` |
| Static files never leave `web/dist` | `http::tests::static_paths_never_leave_the_root` |
| Showcase rendering reaches only the Tailwind and Google Fonts hosts | `pipeline::showcase::tests::chromium_reaches_only_the_allowed_hosts` |
| Session and share tokens are stored only as SHA-256 hashes | `db::tests::accounts_and_ownership`, `db::tests::share_links` |
| Titles and labels on share pages are HTML-escaped; the showcase page escapes the screen into its frame | `share::tests::esc_escapes`, `pipeline::showcase::tests::page_escapes_the_screen` |
| Wrong passwords are refused, a password change revokes the other sessions, a signed-out session no longer works | `db::tests::accounts_and_ownership` |
| A share link serves only the screens it was created for, and stops working once revoked or expired | `db::tests::share_links` |
| Share screens get an opaque origin (`sandbox allow-scripts` CSP, sandboxed iframe) | `share::tests::screens_get_an_opaque_origin`, `db::tests::share_links` |
| Local origin check in single-user mode | **untested** |
| SQL parameterisation | partial: `db::tests::job_query_bounds_its_input`; the rest relies on binds |
| Sealed API keys are never returned by the API | **untested** |

## Known gaps

- No login rate limiting.
- Open signup in multi-user mode.
- No CSP on the main app.
- Packs on disk are not removed when an account is deleted.
- In multi-user mode the first account to sign up becomes the admin: create it before exposing the origin.
- Writing a pack returns its absolute path on the server to the caller.
