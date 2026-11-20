# Studio UI spec

The studio exists to fight samey UI, so its own front must not look like the default dark-zinc / indigo / Inter dashboard. It follows one archetype from `prompts/archetypes.json`, **industrial**: dark, warm, dense, mono labels, one signal colour. Everything below is binding for `web/`.

## 1. Tokens

Declared once in `web/src/app.css` under Tailwind's `@theme` so utilities exist (`bg-canvas`, `text-ink-2`, `border-line`, `bg-accent`...). Nothing else is used for colour, font or radius: no `zinc-*`, `indigo-*`, `gray-*`, no arbitrary hex in TSX.

| Token | Value | Use |
|---|---|---|
| `canvas` | `#141210` | page background |
| `surface` | `#1C1915` | panels, rows, inputs |
| `raised` | `#242019` | selected row, hover, cards |
| `line` | `#2E2A23` | 1px borders |
| `line-strong` | `#3D382F` | input borders, dividers that must read |
| `ink` | `#EDE6D8` | primary text |
| `ink-2` | `#9C937F` | secondary text |
| `ink-3` | `#6B6456` | faint text, placeholders |
| `accent` | `#FF8A3D` | primary action, selection, active tab, focus |
| `accent-ink` | `#1A110A` | text on accent |
| `ok` | `#7DD3A0` | done, good, create |
| `warn` | `#F2C94C` | mixed, queued |
| `bad` | `#F07070` | failed, bad, retire |
| `info` | `#8CC7F0` | update op, running |

- Fonts: **IBM Plex Sans** (`@fontsource/ibm-plex-sans` 400/500/600) for text, **IBM Plex Mono** (`@fontsource/ibm-plex-mono` 400/500) for ids, seeds, hex values, logs, tags, section labels and nav. Inter is removed.
- Base size 13px, `font-variant-numeric: tabular-nums`. Section labels: mono, 10.5px, uppercase, `tracking-[0.08em]`, `ink-2`.
- Radius: 3px on inputs, buttons, chips, thumbnails. Panels and rails are square.
- Depth: 1px lines only, no shadows. Selected rows: 2px `accent` left bar + `raised` background. Focus: 1px `accent` outline, 1px offset.
- Density: compact. Rows 30px, toolbars and panel headers 40px, inputs 28px, buttons 28px.
- The preview canvas (behind iframes) is `canvas` with a dotted grid: `radial-gradient(var(--color-line-strong) 1px, transparent 1px)` at 16px.
- Scrollbars 8px, thumb `line-strong`.

## 2. Shell

One **40px top bar**, nothing else around the screen (no left rail, no bottom status bar):

- left: wordmark `AI·UI·MOCKUP` (mono, 500, `ink`; a link to `#/generate`, the blank Generate screen), then the two nav tabs **Generate · Gallery** (mono uppercase, `ink-2`; active = `ink` text + 2px `accent` bottom border).
- right: endpoint dot (`ok` / `bad` / `ink-3` unknown) + model id in mono, (for the admin, a link to the Admin area; models and routes live in Admin > Models, see section 6); a jobs button `N running · N failed` (`info` spinner while running, `bad` text when failed) that opens the Jobs drawer; a `?` button for shortcuts.
- Hash routing `#/<screen>` as today; Generate mirrors its selection in the hash (`#/generate?id=n`, `replaceState`) and blanks itself when the hash becomes `#/generate`; keys `1-4` switch screens, `?` toggles shortcuts, `Esc` closes drawer/overlay. Generate is the start screen.
- Accounts (`GET /api/me` at start): a member (not admin) sees only Generate and Gallery, no Settings button; in multi-user mode a `Sign out` button (LogOut icon) sits at the right of the bar. The admin manages accounts in Admin > Users: a table of accounts (status, join date, generations this month and in total, cost this month with a bar relative to the top spender) with Suspend / Reactivate and Delete (confirmed) on every account except their own and the built-in admin; each row shows the account's name with the email under it (accounts created before names existed show the email only); clicking it opens that account's page (`#/admin/users?u=<id>`, data from `GET /api/users/:id`): same actions, generations and cost tiles, the last 12 months of activity, the account ID (copy button, for support calls), the project list (names and counts only, admins do not open users' work), the active sessions and the 10 most recent jobs with their errors; in single-user mode the screen explains how to turn accounts on. Signed out (401 on `me`), the shell shows the Login screen: a centred card with Email and Password, Sign in, and a toggle to Create account, which also asks for a required full name (hint: the first account becomes the admin). The name can be changed later in Account > Profile (`POST /api/account/name`), which prompts for it when it is missing.

Jobs drawer: right drawer 480px, `surface`, header 40px "Jobs" + close. Rows: status dot, `#id kind` (mono), progress text (mono, `ink-2`; a failed job shows its `error:` log line in `bad` instead), status. Click a row to unfold the log in a mono console block on `canvas`. Failed merge jobs get a "Retry merge" link.

Admin > Jobs (`#/admin/jobs`, every account's jobs from `GET /api/admin/jobs`, 50 per page, polled every 3 s): the header counts running, queued and failed-in-24 h jobs; four tiles sum the last 24 h (jobs, LLM time, prompt + output tokens with the share served from the prompt cache, cost). A search box (debounced) matches the account name or email, the kind or the job ID; a status filter shows counts under the search, plus a kind select. Every column header but progress sorts the list (status, kind, account, start time, duration, LLM time, cost; unpriced jobs sort last), server-side. Pagination below the table shows `Showing a–b of N jobs` with Previous / Next. Each row shows the status, kind, account (name, email, link to its page), start time, duration (live while running), LLM calls, time and tokens in/out, cost, and the live progress or the error. A row unfolds the job's facts (full ID with copy, timings, token breakdown, generation IDs) and its log. Each LLM call adds its time, tokens and cost to the job's own columns, priced at the serving model's price at that moment; the cost stays empty once a call ran on an unpriced model, and jobs older than this record have tokens but no cost.

Toast: bottom-centre pill, `raised` background, `line-strong` border, mono 12px.

Shortcuts overlay: centred card on a dimmed backdrop, two-column list `key → action`.

## 3. Generate (home)

Three columns: **brief + history 380px** | **preview fluid** | **direction 340px**. Columns are separated by 1px `line`.

### Brief column

The column follows the project's state, so the flow reads as steps: explore looks, choose one, add pages, export.

- Section label `PROJECT` with a `New` text action at its right (blank form, no project, nothing selected, Look mode; the same action sits at the right of the `GENERATIONS` label): a select with a first option `New project from the brief` (the implicit creation below), then each project as `name · count`, then `New project…` which swaps the select for an inline `Project name` input with a **Create** button (Enter creates, Escape cancels). It filters the history list below the form (the first option shows the generations without a project); `Generations · n` counts the shown ones. The screen starts blank: nothing selected, no project. Opening a generation selects its project. When no project is selected and the user generates, a project is created first, named from the brief's first line (max 40 chars), and selected.
- When the project has an identity, a segmented control `Pages · Look` right under the project select chooses the mode (default `Pages`). Without an identity the column is in `Look` mode and the control is hidden.

**Look mode** (no identity, or `Look` chosen):

- Section label `1 · EXPLORE A LOOK`, under it a muted line: `Generate a few looks, then set one as the project's look (right column).`
- Section label `DESCRIBE`: a 2-row textarea (placeholder `Quick description · e.g. a tool for a bakery chain to plan daily production and track waste`, max 2000 chars) and a button **Expand** (lucide Sparkles icon; "Expanding…" while the job runs; disabled when empty or running; title "One model call fills the brief, users, data objects, style tags, density and suggested pages; you review, then generate"). On completion the brief fields and density are filled and a toast says `Brief filled from your description; review it, then generate`; on failure a toast `Brief helper failed`. The suggested pages appear as a mono hint `pages · Dashboard · Orders · …` under the style tags; they ride along in the request and feed the page list once the look is chosen.
- Section label `BRIEF`. Fields in order: brief (textarea, 6 rows), users (input), data objects (textarea, 3 rows, "one per line or comma separated"), style tags (input, placeholder `theme:dark, style:flat`).
- One row with two segmented controls: density (compact / comfortable / spacious) and variants (1 / 2 / 3). Segmented control = `surface` track, 1px `line-strong`, active segment `accent` with `accent-ink` text.
- Section label `TARGET`: a segmented control with a Monitor icon (`Desktop 1440px`), a Smartphone icon (`Phone 390px`), and `Both` (`A desktop page and its mobile version, one batch`).
- Section label `ARCHETYPE`. A **chip grid** (3 columns) of the 12 archetypes from `/api/archetypes` plus a first chip **Seeded** (default; "differs per variant"). Chip: 28px, mono 11px, `line-strong` border; selected = `accent` border + `accent` text; `title` = the archetype's `feel`.
- Seed: mono input (placeholder `seed · empty = random`) with a small "clear" button. Opening a generation fills it (with the rest of the form) from that generation's request.
- Primary button **Generate** (full width, `accent`). Disabled without a brief or while a job runs (then reads `Generating…`). Each click starts a new batch; nothing is replaced (no hint line).

**Pages mode** (identity set, `Pages` chosen):

- Section label `2 · PAGES`, under it a muted line: `Pages reuse the look of #n: archetype, tokens and shell.`
- The page list: one row per distinct page name already generated in the project (mono name, count of generations, click selects the newest generation of that page), then one chip `+ <name>` per suggested page (from the identity generation's `request.pages`) not generated yet; clicking a chip fills the Page input and focuses the brief. The archetype grid, the seed row, users and style tags are hidden in this mode.
- Section label `NEW PAGE`: a `Page` input (placeholder `Page name · e.g. Report`, `<datalist>` of the suggested names), the brief textarea (6 rows, placeholder `What this page shows and does`), the data objects textarea (3 rows), the density row (no variants control: one page per run), the `TARGET` control, then a primary button **Generate page** (disabled without a page name and a brief, or while a job runs).

Below the form, section label `GENERATIONS · n` and the history list, newest first. Row 30px: `#id` mono `ink-3`, label (truncate), a mono page-name tag on page rows, a lucide Smartphone icon (12px, `ink-3`) on mobile rows, a lucide Fingerprint icon on the identity generation of its project, archetype name (mono 10px, `ink-2`, from `notes.direction.archetype.name` when present), finish-issue count when > 0 (mono, `ink-3`), verdict dot (`ok` / `warn` / `bad`) at the right. Selected row = accent bar + `raised`. Rows of the same batch share a thin left tick in `line-strong` so a 2-3 variant run reads as one block. The `New` text action at the right of the label does the same as the one on `PROJECT`.

### Preview column

- Toolbar 40px: viewport segmented control (1440 / 1024 / 390, with lucide Monitor / Tablet / Smartphone) at the left; the generation label centred (mono); `model · skill-version` at the right (`ink-3`, mono).
- For a mobile generation the viewport segmented control is replaced by a mono `mobile · 390` text, and the page is shown in a phone frame: 390x844, `rounded-[28px]`, 6px `ink-3` border, scaled to fit the column.
- Compare strip when the selected generation has siblings: horizontal row of 320×200 scaled iframes (`transform: scale(0.222)` of 1440×900, `pointer-events-none`; mobile pages are a 390x844 iframe scaled 0.222 and centred in the 320x200 box), label + finish-issue count + verdict under each, selected = `accent` border. Toggle `Compare / Hide` at the right of the strip header.
- Compare side by side (toggle in the result top bar, remembered in localStorage; offered whenever the concept has at least two generations at the same viewport, so a page can be compared with the reference look or another page): the preview box shows two variants as live iframes in two equal columns; both side panels fold to their 44 px rail while comparing and their rail button leaves compare mode (the panels come back as they were); the thumbnails aside becomes the picker (click adds, replacing the older pick when two are picked; click a picked one to remove it, leaving a dashed empty slot; chips 1 / 2). A "Pan" toggle (on by default) overlays the previews so dragging moves both; off, the mockups are clickable again. A zoom segmented control (Fit, 50, 100, 150 %) applies to both; scrolling one column scrolls the other (each iframe reports its content height; both iframes take the taller one, so the sheets match and the column scrolls, not the iframe. A page sized to its viewport echoes the frame height back, which is ignored, so the pair height never ratchets up). Column header = rank, name, concept-reference badge, "Viewing" chip, "Open" button; clicking the name switches the current generation without leaving compare.
- Preview area: dotted canvas, the iframe centred at the chosen width, 1px `line-strong` border, white background, `sandbox="allow-scripts"` only (never `allow-same-origin`), `srcDoc` with the click-swallowing script injected after `<head>` as today.
- Running state (replaces the preview while the job runs): a 480px **console card** on `surface`: header line `Generating · m:ss · usually 1-2 min` with an indeterminate `accent` bar; a 3-step stepper (Queued / Reading the skill n files / Writing the screen n kB) driven by the job's JSON progress and log as today; under it the **tail of the job log** (last 12 lines) in a mono block on `canvas`, so the model's tool calls are visible.
- Empty state (nothing selected): centred, mono label `NO GENERATION SELECTED` and three numbered lines: `1 describe the app and generate a few looks · 2 set one as the project's look · 3 add pages, then export the pack`.

### Direction column

Scrollable body, then a sticky action block at the bottom.

Body, in order:
1. Section label `DIRECTION`. Archetype name (sans 14px 600, `ink`), feel (`ink-2`), then the direction text (`notes.direction.direction`, `ink-2`, 12px) when present. When the generation is an edit, a mono line `Edited from #n · accent, theme · layout: … — <change>` under the direction label, like the refine line.
2. **Identity tokens** from `notes.direction.identity` (`theme, canvas, surface, border, text, muted, accent, font, mono, radius, density`; any may be missing): six native `<input type="color">` swatches (20px, 1px `line-strong` border) for canvas / surface / border / text / muted / accent, each with its hex in mono 10px under it; a non-hex value stays a read-only swatch. Under them a row with two segmented controls, Theme (light / dark) and Density (compact / comfortable / spacious); then a row with a Font select (the archetype's font candidates plus the current font), a Mono input and a Radius number input (0-32). Then a 2-row textarea `Layout only · e.g. move the filters above the table` (max 500 chars). Then a primary button **Apply** (lucide Pencil icon; title "Same structure with the new tokens; the layout text changes only the arrangement. Makes a new generation."), disabled while a job runs, without HTML, or when nothing changed and the layout text is empty; next to it, when tokens changed, a `reset` link and the mono list of changed keys. Applying starts the job like Versions does (the preview shows the running console, then the new generation is selected).
3. Seed line: `seed 418731` mono. Below it, when the generation has a stored `request`, a closed `BRIEF` group shows the brief text and its users / data objects / style tags / density. When `notes.usage` exists, a muted mono line `tokens · prompt 45.2k (32.1k cached) · out 14.0k · 78 s · planner: prompt 2.5k, out 3.3k · $0.0123` (the cost only when the model is priced in Settings).
4. Collapsible groups (`<details>` with a mono summary, open by default for the first): `METHOD STEPS` (ordered list of step title + note), `INVENTED` (list, `warn` text), `FINISH ISSUES · n` (rule + detail, `bad` for non-advisory, `ink-3` for advisory), `SKILL FILES READ` (mono chips).

Sticky action block (`surface`, top 1px `line`), three groups with mono section labels, in this order:

1. `LOOK` (only when the generation belongs to a project). If it is the project's identity: a row `✓ Look of <project name>` in `accent` with a text `clear` action. Otherwise a button **Use as the project's look** (lucide Fingerprint; title "Pages of this project will reuse this direction: archetype, tokens, shell"); it is the primary (`accent`) button while the project has no look yet, secondary otherwise.
2. `ITERATE`: a row **Other archetype…** select (the other 11 archetypes) + **Add variant** (secondary, lucide Plus, disabled until one is picked or while a job runs; title "Same brief and seed, one more look next to this one, shown in Compare"); a row with the refine action select, the 1 / 2 / 3 count and **Versions** (lucide Wand2; title "Rewrite this page N ways along one impeccable action; same look"). Opening a generation loads its request (brief, users, objects, tags, density, seed, archetype) into the Generate form; if that replaces a brief the user had typed (or the brief helper's "Expand" replaces it), a `status` banner at the top of the form says so with a primary **Restore what I wrote** button, cleared by generating, blanking or restoring.
3. `DELIVER`: one button **Pack** (lucide Package; primary unless the Look button is primary). When the project has a look it exports the project pack (`POST /api/projects/:id/pack`, title "SKILL.md + reference.html of the look + one HTML per page"), otherwise the pack of this generation alone (title "SKILL.md + reference.html of this screen"). After success: the pack dir in mono (break-all), a line `SKILL.md + reference.html[ + n pages] → copy into the app as .claude/skills/ui-pack/`, and a `Copy SKILL.md` text button.

Review (admin only, `me.admin`): a closed `<details>` with a mono `REVIEW` summary at the very end of the block: when siblings > 1, **Pick this one** (secondary, records verdict good with "Preferred over …"); the verdict segmented control good / mixed / bad, the note input (Enter or blur saves), and a 16px status line (`Saved with skill xxxxxxxx` with a `ok` check / `Not saved yet` / `Pick a verdict to record it`). Members never see it.

## 4. Gallery

`toolbar | grid`: one scrolling grid, no inspector.

- Header 40px: title `Gallery · n`, verdict segmented (`all · good · mixed · bad · none`), archetype select, text filter on label / brief, sort select (`most recent` default: projects and concepts with the newest generation first; `name`), remembered in localStorage.
- Groups by project first (heading = project name, sorted by name, count, mono `identity #<id>` when set, then mono `rename` / `delete` text actions; rename = native prompt, delete = native confirm stating that the screens stay, unsorted), then unsorted generations grouped by brief (first line, max 80 chars, with the count); inside a group cards by id desc, cards of one batch side by side with a mono `batch #n` tag.
- Card 320px: thumbnail 320×200 (the page in a `srcdoc` iframe scaled 0.222, scripts only, never `allow-same-origin`; mobile pages are a 390x844 iframe scaled 0.222 and centred in the 320x200 box), then label, a mono page-name tag when present, a lucide Smartphone icon after the page tag on mobile cards, then mono `#id · archetype · n findings · date` and the verdict dot. HTML is fetched per card when it scrolls into view.
- Click opens the generation in Generate (`#/generate?id=n`).

## 5. Working details

- Loading: skeleton rows (`raised`, soft pulse). Errors: an error row (`bad` text, Retry).
- Every `title` tooltip from today stays. Every interactive element reachable by keyboard with the accent focus ring.
- No new dependencies beyond the two font packages. Lucide icons at 14px in toolbars, 16px in buttons.
- `api.ts` and `hooks/` are the contract; screens only change presentation and layout.

## 6. Admin > Models

Two tabs in the screen header (segmented control, selected = `accent` fill): **Providers** and **Routes**, plus the endpoint dot. The provider list and models table sit in a centred frame (max 1024px); the side panel docks at the right edge outside it, so opening it recentres the frame instead of squeezing the table. Nothing scrolls as one long form; every block saves on its own.

- **Providers tab**, master-detail: a left column lists providers (name + model count, selected = `accent` fill) with `Add provider` at its foot. The centre shows the selected provider: a connection summary (mono base URL · key set or not · parallel calls) with `Edit connection`, then its models table (mono id, in / cached / out $ per million tokens, extras, role badges `Active` / `Planner` / `Fallback`) with `Fetch models` and `Add model`.
- A **right side panel** (Esc or `×` closes it) holds one edit at a time: the connection form (name, base URL, API key never shown back with a `forget key` action, parallel calls, `Remove provider`), or one model (id only when adding, prices, a mono JSON `Request extras` textarea that must be an object, `Delete model`). The edited row stays highlighted with an `accent` ring. Save writes that block only and shows a toast.
- Actions that would break routing stay disabled with the reason written under them (a model used by a route, the only provider).
- **Routes tab**: `Active model` (grouped by provider), `Planner model` (`Same as active` first), the ordered `Fallbacks` list (Up / Remove, max 5) and `Save routes`.
