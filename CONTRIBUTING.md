# Contributing

This project is maintained by Ikarys <bikarys@proton.me>. Pull requests are
welcome.

## How to run

- `just dev` needs Rust, Node, `just` and the dev PostgreSQL described in the README (Requirements).
- `just test`
- `cargo clippy -- -D warnings`
- `cargo fmt --check`
- `gitleaks git`

## Branches

Work off `develop` on `feat/` or `fix/` branches. `main` is the release
branch.

## AI-assisted contributions

AI-assisted contributions are accepted with disclosure.

- Each AI-written commit ends with `Assisted-by: <Tool>:<model>`.
- Never use `Co-Authored-By` for a model.
- The PR description says what was run and shows the result.
- The contributor knows every change and answers review themselves.
- A behaviour change comes with its test and doc update.
- One change per PR.

## Licence

Contributions are under AGPL-3.0.
