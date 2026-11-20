# Pages as edits of the identity page (2026-11-19): abandoned

## Idea

A page added to a concept shares about 48 % of its HTML with the identity page (head, tailwind config, custom CSS,
SVG symbols, shell). Instead of writing the whole page, the model got the identity page as the current document and
answered with search/replace edits (prompts/patch.md format, plus a `...` line to elide the middle of a long `find`).
Fewer output tokens were expected.

## Result

Not cheaper with either model, so the code was not kept (branch `feat/page-from-identity`, never merged).

- Both models copy large `find` excerpts and rarely elide, so the edits are about as long as the page.
- Edits fail now and then (cut block), and the fallback whole page then costs the edits call on top.
- The model sometimes answers with the whole document anyway.
- qwen once kept the old content next to the new one (Network rules).

Same 4 pages, `patch` = edits requested, `full` = whole page. `out` counts all LLM calls of the job, thinking included.

## qwen3.8-27b (local)

| concept | page | requested | applied | calls | prompt | out | html chars | result |
|---|---|---|---|---|---|---|---|---|
| 01a1efb4 | Network rules | patch | edits | 3 | 114026 | 15693 | 37900 | 01a1f302-505f-77a7-8082-2cb5cba36d22 |
| 01a1efb4 | Network rules | full | full | 3 | 112561 | 12250 | 20128 | 01a1f303-1317-7504-bef9-7d1e89fab8ea |
| 01a1efb4 | App catalog | patch | edits | 1 | 33796 | 12146 | 32835 | 01a1f303-ca63-70f3-b28f-1c05e3ea2976 |
| 01a1efb4 | App catalog | full | full | 3 | 112676 | 17402 | 29970 | 01a1f304-c6fe-73ad-9356-dd3f27cfb9f2 |
| 01a1efb4 | Key Vault access | patch | edits | 2 | 76273 | 17572 | 24020 | 01a1f305-cceb-73f0-bf73-e9bb78d60b73 |
| 01a1efb4 | Key Vault access | full | full | 3 | 110105 | 12325 | 22429 | 01a1f306-95e2-7650-8bc5-3f3ff8bfcba4 |
| 01a1f057 | Tournois | patch | full | 2 | 74744 | 12024 | 19496 | 01a1f307-58ad-7050-af70-f334fcf35abb |
| 01a1f057 | Tournois | full | full | 2 | 72641 | 12348 | 23254 | 01a1f308-0d61-72b2-a1da-e67cd8990b65 |

## DeepSeek-V4.1-Flash-1017 (OVHcloud AI Endpoints, anonymous access)

| concept | page | requested | applied | calls | prompt | out | html chars | result |
|---|---|---|---|---|---|---|---|---|
| 01a1efb4 | Network rules | patch | edits | 1 | 32995 | 34321 | 29627 | 01a1f328-c8cb-7103-b9f9-e9224a068ae1 |
| 01a1efb4 | Network rules | full | full | 2 | 66246 | 25158 | 30890 | 01a1f32a-b57a-70b7-b71a-9cfcaef70daa |
| 01a1efb4 | App catalog | patch | edits | 2 | 67876 | 43912 | 54537 | 01a1f32d-df44-76ac-946f-c11ac8feda16 |
| 01a1efb4 | App catalog | full | full | 1 | 32571 | 28052 | 46398 | 01a1f32f-8739-71df-afc1-a7c8595ed6bf |
| 01a1efb4 | Key Vault access | patch | full | 3 | 98619 | 60453 | 36825 | 01a1f333-809e-767c-a6a0-0579160b9a9e |
| 01a1efb4 | Key Vault access | full | full | 1 | 32344 | 26308 | 43677 | 01a1f335-9e68-74ff-9e96-30dd7e1b0e5b |
| 01a1f057 | Tournois | patch | full | 1 | 33239 | 29463 | 31376 | 01a1f337-c096-7748-8fd3-aa87b9ed87c8 |
| 01a1f057 | Tournois | full | full | 1 | 33239 | 26519 | 29199 | 01a1f339-a468-75c6-852f-a839b93bca98 |

DeepSeek side notes: 10–22k thinking tokens per call, pages of 30–46k HTML characters (qwen: 20–30k), no cached input
on OVH (every call bills its ~33k prompt tokens). Page quality was not judged.
