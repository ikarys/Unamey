# Studio architecture

A local web studio that fights the generic look of model-generated UIs. Two outputs:

1. **A pack per generation** (`packs[/<project-slug>]/<id>-<slug>/`): `SKILL.md` (product description + screen brief, archetype and structure, a `## Shell` section (from `notes_json.shell`, the generator's own description of the chrome), design tokens, do / don't) + `tokens.css` (tokens as CSS variables, with the status colours read from the reference page) + `reference.html` (the generated page to imitate). A project pack (`packs/<project-slug>/{SKILL.md, reference.html, pages/<page-slug>.html}`) bundles the identity's `SKILL.md` (with a `## Pages` section listing each page and its brief) plus one HTML per page name (a good generation if any, else the latest); mobile pages are `pages/<page-slug>.mobile.html`. This is what gets copied into an app as `.claude/skills/ui-pack/` before asking a model to build screens. It is the main deliverable.
2. **The `app-layout-patterns` skill**: a fixed library of layout / component / UX variants, once learned from reference screens, read by the generator.

Flow: generate screens from a brief with a fixed skill (`skill/app-layout-patterns`, once learned from reference screenshots; the pipeline that built it was removed on 2026-11-06, see git history), each forced into a design **archetype** (`prompts/archetypes.json`: 16 distinct looks with their structure, neutrals, hue and font candidates, do / don't) picked by seed or by hand and a **structure** (`prompts/structures.json`: 16 named region layouts with a use-when, chosen by the planner from the brief, distinct across variants unless the user's words fix the layout; pages drop it and keep the archetype) → pick the best screen → export its pack.

## Layout

```
Cargo.toml            single binary crate `studio` (no workspace: one real boundary only)
src/
  main.rs             CLI: `studio serve [--port 7700]` (database: `DATABASE_URL`, a PostgreSQL URL or `sqlite://<file>`, default `sqlite://studio.db`; address: `STUDIO_BIND`, `PORT`)
  authz.rs            PURE authorization policy: `Actor {id, admin}`, `LOCAL` (user `00000000-…-0001`, admin, the implicit actor of single-tenant mode), `can_use(actor, api prefix)` (admin-only prefixes: admin, cache, settings, users), `can_access(actor, owner_id)` (owner only: an admin manages accounts and settings, never another user's content) + unit tests. http.rs applies it
  config.rs           `Llm` = the active endpoint, model, key and `parallel` (variants of one job generated at once, 1..=3, per provider under settings key `parallel`) (`cfg.llm()`); env defaults `STUDIO_LLM_URL` / `STUDIO_MODEL` only seed the first provider. Providers live in the `settings` table: key `providers` (JSON array of llm-providers `Provider`; each model keeps its `ModelPrefs`, whose `price` is optional, API keys only as `ApiKey::Sealed` with the master key file `STUDIO_KEY_FILE` (default `studio.key`), mode 0600, never returned by the API) key `active` (`ModelRef`, the generator's first target), key `routing` (`{planner: ModelRef|null, fallbacks: [ModelRef]}`, max 5) and key `extras` (`{provider: {model: object}}`, sent as the crate's `ChatRequest.extra`). `cfg.routes()` holds the resolved targets per stage: generator = active + fallbacks, planner = (planner or active) + fallbacks, deduplicated. At first start the env defaults become provider `default`. API: `GET /api/settings` -> `{providers:[{id,name,base_url,api_key_set,parallel,models,prices:{model:{input_per_m,cached_per_m,output_per_m}},extras:{model:object}}], active, routing, endpoint_ok}`; `PUT /api/settings` with `{providers:[{id,name,base_url,api_key?,parallel?,models,prices?,extras?}], active, routing?}` (`prices` = $ per million tokens, only for priced models; `api_key` absent keeps the stored key, `""` removes it); `POST /api/settings/models` `{id?,base_url,api_key?}` -> `{models}` (502 with the endpoint error when unreachable). Editable live from the Settings drawer, paths (env: see README)
  models.rs           rango models = the schema; `rango makemigrations` writes `migrations/` (PostgreSQL, applied by `rango migrate`, `just db`) and `just makemigrations-sqlite` writes `migrations/sqlite/` (embedded, applied at startup); a test checks the two snapshots describe the same tables
  sql.rs              `Db` over the Postgres or SQLite pool chosen by `DATABASE_URL`: `fetch_*`, `execute`, `begin`, `insert`, `get`, plus `json_text` / `month` for the SQL the two dialects spell differently; SQL text uses `$n` placeholders and nothing Postgres-only (times are bound from Rust, JSON fields are read whole and picked in Rust); `test_db()` = a fresh database per test (a SQLite temp file, or a clone of the migrated `studio_test` when `TEST_DATABASE_URL` is set)
  db.rs               async queries on `cfg.pool` (rango for single-row inserts, portable SQL through `sql::Db` for joins / bulk updates; sync callers use `cfg.block`); ids are UUID v7, timestamps leave the API as `YYYY-MM-DD HH:MM:SS` UTC; accounts: `signup` (argon2 password hash; the first account claims the seeded admin user), `login` (email + password → 90-day session, sha256 of the token stored), `session`, `logout`, `owner_of(table, id)`
  llm.rs              thin wrapper over llm-providers-connector: one call per `Stage` (planner, generator) tries the stage's targets in order; a target that errors is skipped for 60 s (tried last, never dropped); `Answer` carries the model that answered and the failures, logged as `llm fallback:` in the job log
  pipeline/
    capture.rs        headless Chromium screenshot of an HTML page (showcase export)
    brief.rs          brief helper: quick description → one LLM call (prompts/brief.md) → structured brief {brief, users, data_objects, style_tags, colours, density, pages} + the user's `description` verbatim; normalised, never stored
    generate.rs       brief → planner (one direction per seeded archetype, prompts/directions.md) → tool loop (read_skill_file, reasoning effort low: the planner already decided) → notes + HTML → generations; target desktop | mobile | both (`both` = desktop then mobile with the desktop HTML as reference); `run_page` pages under the identity (no planner, identity direction and HTML as reference, identity seed); every LLM call logs its seconds / tokens / thinking in the job; the variant's totals are also stored in `notes_json.usage` (`prompt`, `cached`, `completion`, `seconds`, `calls`, plus a `planner` sub-object for the shared planner call, not summed into the totals; refine versions get the same)
    refine.rs         generation + impeccable action → planner (N moves) → N rewritten versions, one batch; `rewrite` (shared with edit.rs) asks the model for search/replace edits (prompts/patch.md, applied by patch.rs) instead of the whole document, the model may still answer with a whole document; edits that do not apply fall back to a full rewrite; a request with `"mode": "full"` forces the full rewrite (A/B: scripts/compare_edits.py); the outcome is `notes.edit.mode` / `notes.refine.mode` = patch | whole | patch-fallback | full
    patch.rs          parses `<edit><find>…</find><replace>…</replace></edit>` blocks and applies them in order: each excerpt must occur exactly once (exact, then ignoring trailing spaces at line ends); a cut block is an error
    edit.rs           scoped edit of one generation: new identity tokens and / or a layout-only text → one rewrite (refine::rewrite) → one new generation, same project / page / target
    finish.rs         bridge to the external `impeccable` skill (finish rules in the prompt, detect on the HTML)
    field.rs          field-use briefs (gloves, sunlight, outdoors): the binding size floor in the prompt and the small-text lint on the HTML (findings join `notes_json.detect`)
                      (generate.rs `is_desktop_app`: desktop-app briefs get prompts/desktop_app.md, the OS window-chrome rules)
    pack.rs           generation → packs[/<project-slug>]/<id>-<slug>/{SKILL.md, reference.html}; project → packs/<project-slug>/{SKILL.md, reference.html, pages/<page-slug>.html, pages/<page-slug>.mobile.html}
  jobs.rs             background jobs on tokio's blocking pool, state in the `jobs` table
  http.rs             axum server, JSON routes, share pages, static files from web/dist, `/healthz`
prompts/              generate.md, directions.md, refine.md, edit.md, patch.md, brief.md, mobile.md, desktop_app.md, archetypes.json, structures.json, skill_head.md (include_str!)
migrations/            SQL generated from models.rs for PostgreSQL (with snapshot.json); migrations/sqlite/ the same for SQLite
type_aliases.json
web/                  React 19 + Vite + Tailwind 4 + lucide-react; see docs/ui-spec.md
```

The dependencies are:
- `llm-providers-connector` (crates.io, https://github.com/ikarys/llm-providers-connector);
- `rango-orm` (git tag v0.1.1, https://github.com/ikarys/rango-orm) and `sqlx` 0.8 on PostgreSQL and SQLite, `tokio`;
- `axum`, `serde_json`, `ureq` 3 (rustls), `url`;
- `sha2`, `base64`;
- `image` (jpeg, png, webp).

Everything runs on tokio. The axum handlers await the DB directly; sync work (the generation pipeline, LLM calls through `llm-providers-connector`, Chromium, zipping a pack, `ureq`) runs in `spawn_blocking`, where it reaches the DB through `cfg.block`. A job is one blocking task; the model lock still runs them one at a time.

## Schema additions

The schema is `src/models.rs` (tables users, sessions, jobs, projects, generations, shares, settings), turned into `migrations/*.sql` by `rango makemigrations`. Primary keys are UUIDs; the admin user `00000000-0000-0000-0000-000000000001` (`local`) is seeded by a migration. Deleting a user cascades to their rows; deleting a generation or a project cascades to its shares.

`skill_version` is the sha256 of the skill files. Verdicts can then be compared across skill versions.

`project_id` is nullable: a generation without a project is unsorted. Deleting a project only unsorts its generations. `identity_id` is nullable: a project without an identity cannot generate pages yet. `page` is nullable: a generation without a page name is an exploration (a candidate identity); with one it is a page of its project. `target` is `desktop` or `mobile`; a request with `both` stores two generations.

Project names are unique per owner. Passwords are argon2 hashes; session tokens are stored as sha256 only.

## Accounts and tenancy

Two modes, chosen by the `STUDIO_ORIGIN` env var:

- unset (default, local use): single-tenant. Every request acts as the seeded admin user; the Host/Origin guard requires 127.0.0.1 or localhost. Nothing to sign in to.
- set to the public origin (e.g. `https://studio.example.com`): multi-user. Every `/api/*` request needs the `studio_session` cookie (401 "sign in" otherwise, except `POST /api/signup`, `POST /api/login` and `POST /api/logout`); an `Origin` header, when present, must equal `STUDIO_ORIGIN` (403); the cookie is `HttpOnly; SameSite=Lax; Path=/`, `Secure` when the origin is https. Put a TLS reverse proxy in front (`STUDIO_BIND=0.0.0.0` when the proxy is on another host).

Accounts: `POST /api/signup {email, password}` (password ≥ 8 chars) creates the account and a 90-day session. The first account claims user 1 (`local`), so it is the admin and owns the data made in single-tenant mode; later accounts are members. `POST /api/login {email, password}` opens a session. Signup is open: anyone who reaches the origin can register (add a closed-signup switch before any public exposure).

Policy (`authz.rs`): admin-only prefixes answer 403 "admin only" for members; owned rows (jobs, projects, generations) are listed per owner and answer 404 by id for anyone but the owner, admins included (never 403: existence is not leaked). `status`, `archetypes`, `me` are open to any signed-in user.

## HTTP API (JSON unless noted)

| Method | Path | Purpose |
|---|---|---|
| GET | /api/me | `{id, admin, multi_user}` |
| POST | /api/signup | `{email, password}` → `{ok}` + session cookie; 400 in single-user mode, bad email, short password or email already registered |
| POST | /api/login | `{email, password}` → `{ok}` + session cookie; 400 in single-user mode; 401 wrong email or password |
| POST | /api/logout | clears the session and the cookie |
| GET | /api/users | admin: `[{id, email, admin, created_at}]` |
| GET | /api/status | `{endpoint_ok, model, jobs_running, jobs_failed}` |
| GET | /api/settings | `{llm_url, model, api_key_set, endpoint_ok, models}` (the key itself is never returned) |
| PUT | /api/settings | `{llm_url, model, api_key?}`; `api_key` absent = keep, empty = clear; returns the same view |
| GET | /api/jobs | recent jobs |
| GET | /api/jobs/:id | job with log |
| POST | /api/brief | `{text}` (≤ 2000 chars) → job id; one LLM call expands a quick description into the structured brief; result `{brief, users, data_objects, style_tags, colours, density, pages, description}`; nothing stored |
| POST | /api/generate | `{brief, users, data_objects, style_tags, density, pages?: string[] (suggested page names, stored with the request, not used by the generator), variants?: 1-3, seed?, archetype?: id, project?: project id, page?: page name, target?: desktop | mobile | both, parent?: generation id (internal: joins that generation's batch)}` → job id; a page needs `project` (400 "a page needs a project") and the project must have an identity (400 "pick the project's identity first"); 400 "unknown target" for an unknown `target`; the job result is `{generation_ids, seed}` |
| GET | /api/archetypes | `[{id, name, feel}]` |
| GET | /api/projects | `[{id, name, created_at, generations, identity}]` (generations = count, identity = generation id or null), ordered by name |
| POST | /api/projects | `{name}` → `{id, name}`; 400 when the name is empty or already exists |
| PUT | /api/projects/:id | `{name}` → `{id, name}`; 404 unknown, 400 empty/duplicate |
| PUT | /api/projects/:id/identity | `{generation: id | null}` → `{id, identity}`; 404 unknown project; 400 when the generation is not in the project or has no direction |
| POST | /api/projects/:id/pack | → `{dir, skill_md, pages}` (pages = count of (page, target) files); 400 when the project has no identity |
| DELETE | /api/projects/:id | `{unsorted}` = number of generations that became unsorted (their `project_id` set to NULL, generations are never deleted); 404 unknown |
| GET | /api/generations | history (no html): label, batch, archetype, detect_count, verdict, project_id, page, target |
| GET | /api/generations/:id | full, html included, page, target; `request` is the stored generate request (brief, users, data_objects, style_tags, density, ...); `cost` is in dollars (planner call included), null unless the model is priced in Settings |
| POST | /api/generations/:id/verdict | `{verdict, note}` |
| POST | /api/generations/:id/pack | writes the pack → `{dir, skill_md}` |
| POST | /api/generations/:id/refine | `{action: bolder|quieter|distill|typeset|colorize|layout, count?: 1-3}` → job id; N versions of the page along one impeccable action, stored as one batch; versions keep the parent's page and target; result `{generation_ids, from, action}` |
| POST | /api/generations/:id/edit | `{identity?: {changed tokens only: theme, canvas, surface, border, text, muted, accent, font, mono, radius, density}, layout?: text ≤ 500 chars}` → job id; 400 on a bad token or layout; the job fails with "nothing to change" when nothing differs; result `{generation_ids: [id], from}`; the new generation keeps the parent's project, page and target |
| POST | /api/generations/:id/alternative | `{archetype: id}` → job id; one more variant of the same request and seed with that archetype, joined to the generation's batch (created if it had none); result `{generation_ids, seed}` |

Static: `/` and `/assets/*` from `web/dist`. The preview iframe uses `srcdoc` with `sandbox="allow-scripts"`, where the scripts are needed by Tailwind CDN. It never gets `allow-same-origin`, so generated HTML cannot reach the API.

## Security

- Bind 127.0.0.1 by default (`STUDIO_BIND`). Multi-user mode (`STUDIO_ORIGIN`) expects a TLS reverse proxy; the Origin check and the cookie flags are the CSRF line.
- Authorization is one pure policy (`authz.rs`), applied once in `http.rs` before routing (prefix check) and per owned row (`owned` helper → 404).
- URL import:
  - accepts http/https only;
  - rejects private, loopback and link-local hosts after DNS resolution;
  - caps size and timeout;
  - Chromium gets its own temp profile.
- Validate uploaded images by decoding them with `image`; store the re-encoded normalised copy as well.
- SQL is parameterised everywhere. Proposal ops are validated by `ops.rs` before they touch the DB.
