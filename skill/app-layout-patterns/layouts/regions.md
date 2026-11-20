# Region arrangements

## left-nav-split-dashboard — Left nav split dashboard
- Looks: Left nav 200-320px full height plus topbar 56-80px; main starts with an optional full-width KPI band 96-150px, then a 2/3 primary column (charts, tables, stacked cards) beside a 1/3 right column of stacked context cards, gauges, activity, or security info.
- Use when: Overview dashboards that need KPIs plus secondary context, or form pages with persistent status cards.
- Avoid when: When the right column must inspect a selected row, or when the main area is a pure card grid.
- Build notes: Right column should scroll independently; KPI band should wrap to 2x2 on narrow widths.
- Seen in: 7 refs; style:flat ×5, domain:business-dashboard ×2, domain:ai-ops ×1, domain:analytics ×1, domain:asset-management ×1, domain:dashboard ×1

## three-pane-inspector-shell — Three-pane inspector shell
- Looks: Left nav/tree 210-290px, optionally preceded by a 64px icon rail, fluid center work area, and right inspector 210-340px; topbar 36-64px optional; center can hold card grids, list+detail, logs, or device grids.
- Use when: Object-centric tools where selection in the center drives details, logs, metadata, or controls on the right.
- Avoid when: Read-only dashboards with no selected entity, or simple filtered lists.
- Build notes: Sync center selection to the inspector; collapse the inspector to a drawer below 1280px.
- Seen in: 7 refs; style:flat ×5, domain:dashboard ×2, domain:design-tool ×2, domain:ai-agent-console ×1, domain:community-app ×1, domain:design-system ×1

## card-grid-dashboard — Card grid dashboard
- Looks: Optional left nav 200-320px and/or topbar 56-80px; main is a 3-4 column card grid with equal ~230-290px rows or mixed card heights, 16-24px gutters; optional KPI/filter row above the grid.
- Use when: Tile-based monitoring, mixed widgets, asset or status cards, and content made of independent cards.
- Avoid when: Row-oriented lists, master-detail record editing, or forms needing persistent context.
- Build notes: Keep card heights explicit, allow empty/loading per card, and avoid mixed spans breaking the grid.
- Seen in: 5 refs; style:flat ×2, domain:analytics-dashboard ×1, domain:finance ×1, domain:home-automation ×1, domain:prediction-markets ×1, domain:smart-home ×1

## topbar-asymmetric-dashboard — Topbar asymmetric dashboard
- Looks: Topbar 56-80px; no full left nav, optional floating icon pill 56px; main uses asymmetric columns 22/46/22 or 2/3+1/3 with left filters, center detail/visual, right stacked cards; optional full-width bottom chart band 150px.
- Use when: Visual monitoring with filters, a central detail, and side metrics; trend charts can span left+center columns.
- Avoid when: When a persistent left navigation tree is required, or when rows dominate the screen.
- Build notes: Bottom band should span only intended columns; keep the center visual tall and side cards independent.
- Seen in: 3 refs; style:glassmorphism ×3, domain:banking ×1, domain:finance-dashboard ×1, domain:golf-scorekeeping ×1, domain:golf-sports ×1, domain:healthcare-dashboard ×1

## full-width-stacked-console — Full-width stacked console
- Looks: No side navigation; full-width topbar/control bands 40-80px; vertical stack of KPI band 150-290px, section header rows with trailing selects, and full-width detail cards; may include 40/60 or 45/55 split sections.
- Use when: Operations consoles for services, models, nodes, jobs, or devices where each section is a self-contained control block.
- Avoid when: When users need persistent navigation or side context; use a three-pane inspector shell instead.
- Build notes: Each section header should carry status/actions; keep inner KPI/form rows to 4 columns maximum.
- Seen in: 2 refs; domain:ml-operations ×1, domain:operations-dashboard ×1, style:bento ×1, style:glassmorphism ×1, style:terminal ×1

## filter-rail-results-list — Filter rail results list
- Looks: Full-width topbar 72px, context/booking bar 56px, optional summary band 300px; below that a 300px left filter rail beside a right results list with sort header, banners, and stacked result cards.
- Use when: Search, booking, catalog, allocation, or inventory results where filters drive a ranked list.
- Avoid when: When filters are minimal enough for a toolbar, or when content is a dashboard grid.
- Build notes: Filter rail should be sticky; result list needs loading, empty, and pagination states.
- Seen in: 1 refs; domain:travel-booking ×1, style:flat ×1

## floating-action-panel-dashboard — Floating action panel dashboard
- Looks: Left icon nav 64-72px plus topbar 64px; main asymmetric 1/3 left stacked cards plus 2/3 right chart/wallet stack; a floating detail/transfer panel about 1/3 width overlaps the right edge with offset.
- Use when: Dashboards where a persistent action, transfer, or detail panel must overlay without consuming main grid space.
- Avoid when: Dense data grids where an overlay hides cells, or when the action is a modal workflow.
- Build notes: Panel must be dismissible, keyboard accessible, and must not trap main content behind it.
- Seen in: 1 refs; domain:cryptocurrency ×1, domain:dashboard ×1, style:bento ×1

## left-nav-filtered-list — Left nav filtered list
- Looks: Left nav 280-320px full height plus topbar 56-64px; main is a title row, a filter/sort bar 44-56px, then a vertical list of equal-height row cards grouped by time or status.
- Use when: Operations queues, work orders, tickets, approvals, and other row-first workflows.
- Avoid when: Visual dashboards, card grids, or two-pane detail views.
- Build notes: Row cards should expose id, due date, client, and status; the filter bar must persist above rows.
- Seen in: 1 refs; domain:work-orders ×1, style:flat ×1

## list-detail-inspector — List detail inspector
- Looks: Full-width header/toolbar 56-96px; main split 2/3 list/detail (file table, README, record rows) plus 1/3 inspector 300-360px; no persistent left navigation.
- Use when: Repository, document, or record browsing where metadata and actions sit beside the primary list.
- Avoid when: When a left navigation tree is required, or when the detail is a full-page form.
- Build notes: List and inspector should scroll independently; keep the inspector width fixed on desktop.
- Seen in: 1 refs; domain:code-repository ×1, domain:developer-tools ×1, style:enterprise-classic ×1

## two-column-panel-widget — Two-column panel widget
- Looks: Thin status/top bar 28-56px; left large panel about 55% width containing grouped tile grids; right about 38% width vertical stack of widget cards of varying heights; no side navigation.
- Use when: Control-center, preferences, or quick-action screens where grouped settings and live widgets sit side by side.
- Avoid when: When content is a data list, table, or dashboard KPI grid.
- Build notes: Left tiles and right widgets should scroll independently; avoid nested scrolling inside widget cards.
- Seen in: 1 refs; domain:quick-settings ×1, style:bento ×1, style:glassmorphism ×1, style:liquid-glass ×1
