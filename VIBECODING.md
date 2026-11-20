---
# AI involvement, AI-DECLARATION.md keys (https://github.com/DimwitLabs/AI-DECLARATION.md)
version: "0.1.1"
level: copilot
processes:
  design: pair
  implementation: copilot
  testing: copilot
  documentation: copilot
  review: assist
  deployment: none
# Vibecoding Convention (https://github.com/ikarys/vibecoding-convention)
convention:
  version: "0.1"
  level: 1
  adopted_at: 84cbdcf11f728a7c4b35b3f6c66ec96d722a2baf
  status: active
  tools:
    - "Claude Code:claude-opus-5-5"
    - "local:qwen3.8-27b"
  attribution_trailers: [Assisted-by]
  agent_instruction_files: [AGENTS.md]
  maintainers: [Ikarys]
  review: "single maintainer reviews every change on develop; merges into main happen only on the maintainer's explicit request"
  security_response: "best effort, acknowledged within 7 days"
  licence: AGPL-3.0-only
  commands:
    test: "just test"
    lint: "cargo clippy -- -D warnings"
    format: "cargo fmt --check"
    audit: "cargo audit && (cd web && npm audit)"
    secrets: "gitleaks git"
    outdated: "cargo outdated && (cd web && npm outdated)"
---

# Vibecoding declaration

This project follows the [Vibecoding Convention](https://github.com/ikarys/vibecoding-convention) version 0.1 at level 1.

## AI assistance

Claude Code frames the work, writes briefs, writes code and reviews; a local
model (qwen3.8-27b) writes part of the code and documentation from those
briefs. The maintainer decides the scope, tries the product by hand and reads
every change before it reaches `main`. Nearly all of the code is AI-written.

## Review

Work happens on short-lived branches off `develop`. The agent merges a branch
into `develop` only once `just test`, `cargo clippy -- -D warnings` and
`cargo fmt --check` pass; the maintainer reads the changes on `develop` and
asks for the merge into `main`. No merge into `main` happens without that
request.

## Provenance and licence

This project is licensed under AGPL-3.0-only. Parts of it are written by AI
assistants and may not be protected by copyright in some jurisdictions; the
maintainers accept this. To the maintainers' knowledge, no verbatim
reproduction of licence-incompatible code was included. Safeguards used:
human check of long generated blocks.

## Status

Active, single maintainer. Security reports: see [SECURITY.md](SECURITY.md).

## Exceptions

- Level 2 is not claimed yet (2026-11-19): there is no CI, the checks run by
  hand before each merge, and coverage is not measured.
