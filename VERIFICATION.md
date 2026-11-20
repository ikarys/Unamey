# How it is built and verified

This project is written with AI assistance. Claude Code (`claude-opus-5-5`) frames
and reviews it. A local model (`qwen3.8-27b`) writes part of the code. It
follows Vibecoding Convention level 1
(https://github.com/ikarys/vibecoding-convention), declared in
[VIBECODING.md](VIBECODING.md). Each claim names a check you can run.

## Requirements and their checks

| Requirement | How it is checked |
|---|---|
| Pipeline behaviour: brief validation, planner structures and archetypes, prompts, patch edits, tokens, packs | `just test` (Rust unit and DB tests, run twice: on SQLite, then on PostgreSQL; then `tsc --noEmit` on the web front) |
| Clean code | `cargo clippy -- -D warnings`, `cargo fmt --check` |
| No secrets in the history | `gitleaks git` |
| User isolation in multi-user mode | Owner-scoped queries, tests listed in [SECURITY.md](SECURITY.md) |
| Security guards | [SECURITY.md](SECURITY.md) lists each guard with its test or says untested |
| Architecture: domain logic (`src/pipeline`) without HTTP, persistence in `src/db.rs`, authorization as a policy in `src/authz.rs` | Described in `docs/architecture.md`; reviewed by hand, no automated check |
| Design quality claim: fewer correction rounds than a coding agent alone | Under measurement, reports in `docs/reports/`, not a result yet |

## Not checked

- No CI yet. Checks run by hand before each merge.
- No coverage measurement.
- No blind usability test yet. It is planned before the first release.
- Generated design quality depends on the model used.
