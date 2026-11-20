# Edit patches vs full rewrite (2026-11-19)

Run on the dev studio (qwen3.8-27b), commit d6e4bd0. Same parent, same edit, `mode: patch` then `mode: full`.

Findings:
- Patches applied in 4 of 5 cases with 3x to 7x less output (1.4k-6.3k vs 7.4k-12.6k tokens) and 2x to 4x faster; input unchanged.
- impeccable detect finds the same number of issues on the patch and full results in every case.
- The fallback (case 1) was a no-op request (the filters were already above the map): the model answered with notes only, read as a failure. Fixed after this run: a notes-only answer ends the job with "nothing to change", no second call. The case was replaced by a real layout edit.
- Visual quality: compare each pair in the studio (result ids below).

| parent | edit | requested | applied | prompt | out | s | result |
|---|---|---|---|---|---|---|---|
| 01a1f0a3 | {"layout": "move the filters into a row above the main content"} | patch | patch-fallback | 27621 | 10426 | 31 | 01a1f2cb-56e2-779a-87ec-91be1e8d479a |
| 01a1f0a3 | {"layout": "move the filters into a row above the main content"} | full | full | 13664 | 9336 | 24 | 01a1f2cb-b8ad-7584-9142-f69d0dfcd7b5 |
| 01a1f088 | {"layout": "make the side panel narrower and put the KPI row at the top"} | patch | patch | 11343 | 1397 | 5 | 01a1f2cb-cfe9-71a2-9fee-ba246ac1cbb8 |
| 01a1f088 | {"layout": "make the side panel narrower and put the KPI row at the top"} | full | full | 11050 | 7375 | 21 | 01a1f2cc-2265-71c1-b470-de2c02189ef6 |
| 01a1f064 | {"identity": {"density": "compact"}} | patch | patch | 13422 | 2350 | 8 | 01a1f2cc-44e4-7440-ad86-9b30f7834c10 |
| 01a1f064 | {"identity": {"density": "compact"}} | full | full | 13129 | 8914 | 25 | 01a1f2cc-aa10-7685-9975-3c0b544622a8 |
| 01a1f060 | {"identity": {"decoration": "none"}} | patch | patch | 16117 | 6326 | 20 | 01a1f2cd-0063-70d5-acca-eb736d9fdea3 |
| 01a1f060 | {"identity": {"decoration": "none"}} | full | full | 15824 | 12574 | 36 | 01a1f2cd-914b-7528-b1dd-c42d3e76ecb4 |
| 01a1f087 | refine quieter | patch | patch | 29043 | 1592 | 9 | 01a1f2cd-c195-76a4-b8f8-83b1ed630ad2 |
| 01a1f087 | refine quieter | full | full | 28741 | 11986 | 35 | 01a1f2ce-5531-7013-bffd-03e51147fc9a |
