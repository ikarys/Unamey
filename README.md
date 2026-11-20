# Unamey

<img src="docs/logo/unamey-800.png" width="180" alt="Unamey logo: a chameleon curled on itself, in teal, blue and orange.">

[![Vibecoding Convention](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/ikarys/Unamey/main/audit/status.json)](VIBECODING.md)

A mockup studio for apps built with coding agents. Describe the product, get several looks as real HTML screens, compare and rework them, pick one, generate the other pages on it, then hand the agent a pack of files to build from: a skill, the tokens, and one HTML page per screen.

The idea is to decide the design on screens you can see, before the agent writes code, instead of correcting it afterwards one prompt at a time. Single Rust binary (`studio`) with a React front, running on a local model or an API provider. Self-hosted, AGPL-3.0.

**Site: <https://ikarys.github.io/Unamey/>**, with the screens, the workflow and what a coding agent alone already does as well.

![Three looks of a padel club app](docs/screenshots/looks.png)

## What it does, honestly

A strong coding agent (Claude Code with Opus and the `frontend-design` skill, say) already produces a clean, task-fit screen from a two-sentence brief, and on a one-shot screen Unamey's pack did not make it better (`docs/reports/2026-11-19-agent-comparison.md`). What Unamey gives you is a different workflow: several concrete looks to choose from before any code exists, rework on the mockup rather than in the codebase, one look carried across every page, desktop and mobile, and the decision handed to the agent as files. Whether this saves correction rounds on a real multi-screen project is the open question; the measurement is in progress.

## The pack

`packs/<project>/`: `SKILL.md` (product, chosen style and structure, shell, tokens, do / don't rules, pages), `tokens.css`, `reference.html` (the look's page) and `pages/<page>.html` / `pages/<page>.mobile.html`. Copy it to `<app>/.claude/skills/ui-pack/` and ask the coding agent to build the screens following that skill.

## Requirements

- Rust stable, Node 20+, `just`.
- Docker, for the dev PostgreSQL the recipes expect: a container named `devpg` on `127.0.0.1:5432`, user `dev`, password `dev`, allowed to create databases. One way: `docker run -d --name devpg --restart unless-stopped -p 127.0.0.1:5432:5432 -e POSTGRES_USER=dev -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=studio postgres:17`. Deployments set `DATABASE_URL` themselves.
- An OpenAI-compatible LLM endpoint that accepts tool calls. Development uses a llama.cpp-style server running `qwen3.8-27b`, a reasoning model; hosted providers (OpenRouter, OVHcloud AI Endpoints...) work the same way through the Settings drawer.
- Optional: Chromium (`chromium` on PATH) for the PNG export and URL capture.
- Optional: the `impeccable` skill for the finish layer, configured with `STUDIO_IMPECCABLE_DIR`.

## Run

```bash
just dev          # backend on 7700 + Vite on http://localhost:5180
just multi-user   # same, in multi-user mode (accounts)
just build        # front into web/dist + release binary
just run          # serve the built front from the binary on 7700
just test         # cargo test on the dev Postgres + tsc
just lint         # clippy
just dev-reset    # drop the dev data
```

`just dev` needs the dev PostgreSQL (`just db` applies the migrations) and works on `dev-skill/`, copied once from the shipped skill. Open the app once `cargo` has finished compiling; before that, `/api` answers 503. The database starts empty: set a provider in Settings (click the model name in the top bar). The Help button in the top bar opens the user guide inside the app, in English or French; the same guide is published at <https://ikarys.github.io/Unamey/help.html>. `just setup` installs the rango CLI once.

The server binds to `127.0.0.1` by default; `GET /healthz` answers `ok` without auth. Generated HTML is previewed in iframes with `sandbox="allow-scripts"` only, never `allow-same-origin`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | required | PostgreSQL URL (`just` recipes use the local one) |
| `STUDIO_KEY_FILE` | `studio.key` | master key sealing the provider API keys (created at first use, mode 0600; `just` recipes use `dev.key`, keep it private) |
| `STUDIO_LLM_URL` | `http://127.0.0.1:8000/v1` | seeds the first provider at first start only; settings then live in the DB |
| `STUDIO_MODEL` | `qwen3.8-27b` | seeds the first provider's model at first start only |
| `STUDIO_SKILL_DIR` | `skill/app-layout-patterns` | layout vocabulary used by the generator |
| `STUDIO_PACKS_DIR` | `packs` | exported packs |
| `STUDIO_IMPECCABLE_DIR` | not set | optional `impeccable` skill directory |
| `STUDIO_BIND` | `127.0.0.1` | listen address; `0.0.0.0` behind a proxy |
| `PORT` | `7700` | listen port (`--port` wins) |
| `STUDIO_ORIGIN` | not set | the public origin (`https://…`) switches to multi-user mode |

Providers: each one sets its endpoint, key, models, optional prices (a screen shows its cost only when its model has one) and how many variants run at once (1 for a local model, up to 3 with an API). Routes: the active model draws the pages, an optional cheaper planner model writes the briefs and directions, and up to 5 fallbacks are tried when a model errors.

Multi-user mode: with `STUDIO_ORIGIN` set, the API needs a session. The first account becomes the admin and keeps everything made in local mode; later accounts see their own projects only. Put a TLS reverse proxy in front.

## Docs

- `docs/architecture.md`: layout, HTTP API, schema, security.
- `docs/reports/`: measurements against a coding agent alone.
- `docs/roadmap.md`: what exists and what is next.

## Status

Early, open source. Works end to end on a local model or an API provider. The quality of the generated pages depends on the model behind it: the same pipeline gave a truncated master-detail on the local 27B model and a complete dashboard on a hosted model. Not done yet: a multi-screen measurement of correction rounds, and a blind usability test.

Written with AI assistance (Claude Code and a local model), reviewed by the maintainer: see [VIBECODING.md](VIBECODING.md) and how each claim is checked in [VERIFICATION.md](VERIFICATION.md).

## Contributing, security, licence

- [CONTRIBUTING.md](CONTRIBUTING.md): how to run the checks, AI-assisted contributions.
- [SECURITY.md](SECURITY.md): how to report a vulnerability, what is protected and what is not.
- Licence: [AGPL-3.0](LICENSE). Copyright Ikarys <bikarys@proton.me>.
