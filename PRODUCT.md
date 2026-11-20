# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Developers (solo or small team) about to build an application with a coding agent (Claude Code or similar). They want a credible, specific visual direction fixed before any screen is coded, and they hand it to the agent as a pack.
- Designers and product people exploring visual directions for an application, to compare, pick and show, without necessarily coding behind.

Both work at a desk, on a large screen, in sessions of a few minutes to an hour: write a brief, generate a few looks, compare, pick, iterate on pages.

## Product Purpose

Unamey turns a short brief into a design pack per project: a `SKILL.md` (archetype, tokens, do / don't rules, brief) plus a standalone `reference.html` page to imitate, and one HTML per page of the project. Success is a pack that makes a coding agent produce screens that look like one deliberate product, not the generic LLM dashboard.

## Positioning

Coding agents with a design skill produce screens that are clean but generic, and visual only: no structure derived from the task, objects of the brief missing or hidden, so developers spend correction rounds (hours, tokens) fixing them prompt by prompt. The product decides the screen from the brief first: users, data objects and main task set one of 16 named structures (chosen by rule, justified by the planner), every named object gets a visible region, and a 9-step method maps each component back to the brief. Only then is the look forced into one of 12 named archetypes with tokens and a real page to imitate, so the direction is concrete and transferable to another agent. The saving in correction rounds is a claim under measurement (`docs/reports/`), not yet a result.

## Operating Context

- Project = one client or product; a project holds several concepts (a style plus its pages). One concept reference (identity) per concept; pages are generated under it, desktop and / or mobile.
- Brief helper expands a quick description into the structured brief, reviewed before generating; the user's own words stay binding.
- Variants are compared side by side, refined along `impeccable` actions, edited by scoped token changes, exported as a zip pack and copied into the target app as `.claude/skills/ui-pack/`.
- Runs against a local LLM (slow, one generation at a time) or an API provider (several variants at once). Single Rust binary plus Postgres, self-hosted on a VPS with systemd; multi-user mode with accounts.

## Capabilities and Constraints

- Archetypes and structures are a fixed catalogue (`prompts/archetypes.json`, `prompts/structures.json`); every generation belongs to one of each.
- Pack format: `SKILL.md` + `reference.html` (+ `pages/*.html`, `pages/*.mobile.html`). Agents consume it as a skill.
- Generated pages are standalone HTML (Tailwind CDN, inline SVG icons), previewed in sandboxed iframes (scripts only, never same-origin).
- Every feature must stay usable with a slow local model; the API path only adds parallelism.
- Strict isolation between users: owner-scoped queries, per-owner disk paths, per-user job caps, admin-only global views.
- Terminology: project, concept, look / variant, page, target (desktop, mobile), pack, archetype, structure, direction, identity (concept reference).
- Open source (AGPL-3.0), no hosted offer: single-user by default, multi-user mode for self-hosting a team.

## Brand Commitments

Name: Unamey (binary `studio`). Interface copy in English and French. No other binding brand asset yet.

## Evidence on Hand

- Real generated pages and packs in the dev database and `packs/`; screenshots in `docs/screenshots/`.
- No customers, testimonials or benchmarks: future surfaces must not invent any.

## Product Principles

- The direction is forced and named; the user picks between concrete looks, never tunes abstract rules.
- Content first: the mockup owns the screen, the chrome stays in one bar and collapsible columns.
- Controls are loud: solid accent for selected states, a visible label on every control.
- Users never see, affect or slow each other.
- Everything works on a local model; an API only makes it faster.

## Accessibility & Inclusion

Desktop-first operator UI: keyboard-reachable controls, visible focus, text contrast at 4.5:1 or better. No further product-specific requirement established.
