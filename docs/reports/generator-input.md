# Generator input: what the tool round costs (2026-11-19)

Source: dev database, 19 generate / start jobs since 2026-11-07, local qwen3.8-27b.

- A variant makes one extra call in most cases: the generator opens 2-3 skill files with `read_skill_file`, and the
  next call resends the whole prompt (~33k tokens, ~30k of them cached within the generation).
- `ux/interactions.md` was opened in 18 of 19 jobs: it is now a core file, handed over already open (+~1.8k tokens
  in the cached prefix). In the 6 replayed variants below it was never opened again.
- Components the planner names, preloaded too (tried, reverted): the planner's picks did not match what the generator
  opened (kpi-tile, gauge, segmented-control, nav-rail, driven by the archetype), so the round stayed and the prompt grew.

Replays of three starts, same brief and seed (`scripts/replay_starts.py`, before = original job incl. the brief call):

| concept | before calls / reads | after calls / reads |
|---|---|---|
| 01a1f083 (2 variants) | 4 / 3 | 6 / 5 |
| 01a1f08a | 4 / 5 | 4 / 3 |
| 01a1f0a1 | 4 / 5 | 3 / 3 |

Too few runs to read a trend: the files opened vary with the archetype more than with what is preloaded.
Also fixed: core components listed again by a structure (button, badge) were sent twice.
