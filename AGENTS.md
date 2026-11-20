# Working rules for agents

Read this before changing anything. It completes the conventions in the
vibecoding convention (https://github.com/ikarys/vibecoding-convention),
which stays the reference where they overlap.

## Branches

- `main` is the release branch: only `develop` is merged into it, and only
  when the maintainer asks.
- `develop` is the integration branch. All work lands there.
- Every change is made on a short-lived branch off `develop`
  (`feat/<topic>`, `fix/<topic>`), committed and pushed as soon as tests and
  lint pass.
- The agent merges its own branch into `develop` itself (no pull request
  needed) once `just test`, `cargo clippy -- -D warnings` and `cargo fmt
  --check` pass, then pushes `develop` and deletes the branch. The maintainer
  reviews on `develop`.
- Never force-push, never rebase a pushed branch, never merge into `main`
  without being asked.

## Commits

- English, imperative subject, a body that says why.
- Every commit with AI-written content ends with one
  `Assisted-by: <Tool>:<model>` trailer per model, never `Co-Authored-By`.

## Before merging

- `just test` (Rust tests on SQLite, then on the shared dev Postgres, + `tsc`), `cargo clippy
  -- -D warnings`, `cargo fmt --check`.
- A behaviour change gets a test; a user-visible change updates `README.md`
  or `docs/`.

## Vibecoding Convention (level 1)

This project follows the Vibecoding Convention at level 1; see `VIBECODING.md`.

Before calling a change done, these must pass:
- `just test`
- `cargo clippy -- -D warnings` and `cargo fmt --check`
- `gitleaks git`

Rules while editing:
- Deleting, skipping or weakening a test requires the reason in the commit message.
- A new dependency is checked against the registry (exists under that exact name,
  established, the one the code needs) and taken at the registry's current
  version; the check is noted in the commit.
- No secret in any file, prompt or config (`dev.key`, `dev.db` stay git-ignored).
- Every input is hostile: request bodies, files, environment, model output.
  A change that touches SQL, authentication, sessions, sharing, sealed keys or
  file paths names the vulnerability class it guards against and its test, and
  updates `SECURITY.md`.
- Signal over noise: comments give a reason, a constraint or a trap. No TODO,
  placeholder, commented-out or dead code in a delivered change.

Never without a human: merge into `main`, release, add CI, delete data.
