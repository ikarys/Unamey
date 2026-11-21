# Roadmap

Open source under AGPL-3.0 since 2026-11-19, no hosted offer: single-user by default, a multi-user mode for
self-hosting a team. This file lists the user needs the product must cover, what exists today, and the order to build the rest.

## Needs

| # | Need | Today | Gap |
| --- | --- | --- | --- |
| 1 | Generations grouped by **project** | Gallery groups by batch / brief | A `projects` table; a brief belongs to a project; the pack is the project's |
| 2 | A mockup is **one or several pages** (home + product details) | Done: one identity per project, pages generated under it, project pack with one HTML per page | — |
| 3 | **Desktop and / or mobile** | Done: target per generation (desktop, mobile, both), mobile rules in prompts/mobile.md, phone frame in the preview, *.mobile.html in the project pack | Mobile references at import (not needed yet) |
| 4 | **Brief helper**: a quick description expanded by an LLM into the structured brief, reviewed before sending | Done: Describe + Expand in the Generate form, one LLM call, the user reviews the filled brief and the suggested pages (autocomplete on Page) | — |
| 5 | **Iterate and compare** | Variants, batch Compare, Add variant, refine Versions | Done |
| 6 | **Change archetype** | Add variant | Done |
| 8 | **Visual universe** before any screen: three divergent worlds (metaphor, palette, materials, risk), safer / bolder / re-roll, optional steer | Done (2026-11-21): `POST /api/universes`, the chosen universe rides `/api/start` as the binding colours request; rebuilt server-side by `universe::clean` | Universe not yet stored with the project |
| 7 | **Scoped edits**: change colours, theme, font, radius, density, or the layout, without a free prompt | Done: editable identity tokens + layout-only text in the Direction panel, Apply = one new generation (same project, page, target) | Scope enforced by prompt only; diff check if drift shows up |

## Order

1. Projects (1). Everything else hangs off it: pages, target, pack.
2. Pages (2). Done. Flow: explore variants → pick one as the project's identity → generate pages under it → project pack = SKILL.md + one HTML per page.
3. Mobile (3). Done. `target: desktop | mobile | both`; "both" produces a desktop and a mobile page per page name, same identity.
4. Scoped edits (7). Done. Editable tokens and the scoped layout text, one rewrite call, no planner. Since 2026-11-19 edits and refines ask for search/replace edits instead of the whole document to cut output tokens, with a full-rewrite fallback.
6. Visual universe (8). Done 2026-11-21. Prompted by a comparison with Impeccable, which is better for one or two page websites; Unamey targets multi-screen apps.
5. Brief helper (4). Done. One call, no storage; suggested pages ride along in the request.

## Open decisions

- Decided: mobile as distinct screens (one generation per target), not one responsive page.
- Decided: one identity per project (nullable), candidates stay in the gallery.
- Decided: layout text scope enforced by prompt only; add a diff check (tokens unchanged) if drift shows up.

## Accounts and multi-user mode

Done (2026-11-05): accounts, ownership and the authorization policy (`docs/architecture.md`,
"Accounts and tenancy"). Single-tenant by default, email + password accounts in multi-user mode with
`STUDIO_ORIGIN` (open signup for now); the reference API routes and Settings are admin-only (SSRF surface of URL capture limited to the admin).

Done (2026-11-06): an Account screen (multi-user mode): profile, change password (signs out the other
sessions), delete account (password required; deletes the user's projects, generations and jobs; the
admin account #1 cannot be deleted). Packs already written to `packs/` on disk are not removed.

Done (2026-11-06), product UI: English / French (`web/src/i18n.ts`, `web/src/locales/`); a home flow
(free prompt, then a stepper: project cards, style cards with example screenshots and "Surprise me", theme and
variant cards with a summary); a Styles page with zoomable examples (`just style-examples` regenerates them);
archived projects (hidden from pickers, read-only, restorable); a showcase PNG export of a screen (browser or
phone frame, rendered by a locked-down Chromium); Account tabs for sessions and usage; an admin area.

Done (2026-11-06): **share links**, so testers and their clients can see a mockup without an
account. A read-only link per generation or per project page set: random token (≥128 bits) stored hashed,
revocable, optional expiry, no app data beyond the screens. The shared HTML is model output: render it in a
sandboxed iframe (`allow-scripts`, never `allow-same-origin`) with a strict CSP on the share page, and never
on the app's origin with cookies in reach. Pack download stays account-only.
Built as: `shares` table, `POST/GET/DELETE /api/shares`, public `/s/<token>` (no-JS viewer, strict CSP) and
`/s/<token>/<gid>` (`CSP: sandbox allow-scripts`, so the screen gets an opaque origin even when opened directly);
Share panel in the Generate sidebar. The link is shown once (only its hash is stored).

Decided 2026-11-07: **concepts**. A project is the client; inside it, several concepts, each one style
direction with its own look exploration, reference look and pages, so a user can show two styles (pages
included) before the client picks. A new project starts with "Concept 1"; projects and concepts are renamable.
The reference is implicit: "Add a page on this look" sets it; it can be cleared. Changing the reference keeps
the existing pages' look; each such page offers "Regenerate in this style". Later: a bulk regenerate showing
the cost first (per page and total, from the stored `cost`), once per-generation costs are settled.

Decided 2026-11-07, after concepts: **agent links**, so a user's own coding agent can pull or request work.
- Level 1, read: a token link (same model as share links: hashed, revocable, expiry) that serves a concept as
  agent-readable files (manifest JSON, tokens, HTML screens, pack zip). No model call, no write.
- Level 2, request: a separate token scoped to one concept that can ask for a page. Needs quotas
  first; MCP server later.
Prompt-injection stance: the model has no capability worth hijacking (no tools beyond a canonicalized read,
screens served sandboxed), so the risk is abuse and hostile output, handled by:
- structured input only (page name, short brief with length caps, target), never free system text;
- least-privilege tokens (one concept, read or request, never account access);
- server-side output sanitizing of generated HTML (strip `<script>`, `on*` attributes, `javascript:` URLs)
  on top of the sandbox;
- human approval by default for agent requests (shown in the studio, the user runs them);
- per-token quotas and an audit log of requests; content moderation when signup opens.

## Reference library: removed (2026-11-06)

Frozen on 2026-11-05 after an A/B run (`just ab`) showed a modest gain from the skill and none on structural
variety (that comes from the archetypes, the structures and the planner). Removed on 2026-11-06 before the move
to Postgres: the generator keeps reading `skill/app-layout-patterns` from disk as a fixed asset; the import /
extract / merge / review / export pipeline, its tables and the URL capture (SSRF surface) are gone, see git history.

## Self-hosting

One binary that serves the built front (`just build`), PostgreSQL, Chromium for screenshots, behind a TLS
proxy. In place: bind address and port from the environment (`STUDIO_BIND`, `PORT`), a public `GET /healthz`,
argon2 passwords, hashed session and share tokens, HttpOnly cookies, origin check, sandboxed model HTML,
API keys sealed with `STUDIO_KEY_FILE`. Missing before opening a server to strangers: closed signup or
invites, login rate limiting, a CSP on the SPA (see `SECURITY.md`).

## Backend migration (decided 2026-11-06)

Before the first deploy, in this order, one commit each:

1. Remove the reference library. Done.
2. Base: tokio + axum + rango-orm (the user's ORM, PostgreSQL backend); Postgres in Docker for `just dev` and
   `just test`; rango models for every table, migrations generated by `rango makemigrations`, applied by
   `rango migrate` (dev recipe, container start). UUID primary keys everywhere (rango `ForeignKey` targets UUIDs;
   ids in URLs can no longer be enumerated). Queries the builder can't express (joins, JSON) use sqlx on the same
   `PgPool`. Postgres starts empty: no import of the SQLite data. Done: `src/models.rs`, `migrations/`, `src/pg.rs`
   (pool + per-test database cloned from the migrated `studio_test`), `just setup | db | makemigrations | test`;
   rusqlite pinned to 0.32 until step 3 (its `libsqlite3-sys` must match sqlx's).
3. `db.rs` to async rango / sqlx, by domain (accounts, settings, jobs, projects and generations, shares). Done: every
   query is async on the pool, rusqlite is gone, ids are UUID v7 in the API (strings), the master key file comes from
   `STUDIO_KEY_FILE`; until step 4 the threads block on the DB through `cfg.block`. The db tests run on `pg::test_pool()`.
4. `http.rs` to axum; jobs become tokio tasks; blocking work (LLM calls through `llm-providers-connector`,
   Chromium) runs in `spawn_blocking`. Done: one fallback handler keeps the route table, `GET /healthz`, address from
   `STUDIO_BIND` / `PORT`, tiny_http is gone.
5. Front: ids become strings.

## SQLite backend (2026-11-20)

SQLite is back, next to PostgreSQL this time: `DATABASE_URL` picks the backend at runtime (a `postgres://` URL, or
`sqlite://<file>`, the default), through sqlx on both and rango-orm for the models. `just dev` and `cargo test` run on
SQLite with no Docker; Postgres stays the deployment target and `just test` runs the suite on both. The SQL is
written once in the common dialect (`src/sql.rs` holds the two spellings that differ: JSON paths and month buckets).
No data moves between the two: a deployment that switches backends starts empty.
SQLite transactions open with `BEGIN IMMEDIATE`, so two read-then-write transactions queue instead of one failing.

## Agent access

Done (2026-11-21): `/s/<token>/llms.txt` on every share link. Decided against, for now: a stored universe per project (pages already inherit it through the identity tokens) and API tokens / an MCP server (a new authentication surface; share links cover read-only agent access).
