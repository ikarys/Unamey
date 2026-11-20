# Style axes

## charts — Charts
- Looks: Observed positions: no-chart uses progress tracks/trend arrows, green/red proportion bar, linear progress bars, flat device-state tiles, decorative KPI surface, empty card surface; chart uses dual line with no gridlines and floating tooltip, sparkline + semantic categorical bars + partial-arc gauge, compact dark plots with thin gridlines, multi-hue series, bar columns, dotted cursors, tooltip boxes.
- Use when: Use progress bars for simple completion/status; proportion bars for binary share; categorical bars for discrete categories; line/area for time series; gauges for single target values; no charts for list/detail screens.
- Avoid when: Avoid no-chart KPI tiles when trend is essential; avoid multi-hue line charts for more than 4 series; avoid gauges for detailed comparisons; avoid gridless charts when exact values need reading.
- Build notes: Provide tooltip with exact value, axis only when values need scale, use 1-2px strokes, keep chart height 80-240px for cards; fallback to numbers when width < 320px.
- Seen in: 9 refs; style:glassmorphism ×4, style:flat ×3, domain:dashboard ×2, domain:banking ×1, domain:community-app ×1, domain:design-system ×1

## color-usage — Colour usage
- Looks: Observed positions: single green accent #2bd97f on near-black with red negative deltas; light gray-lavender canvas with white cards, green #16a34a, red low-stock; white cards on light-gray canvas with per-tile purple/blue/green tints and #6c5ce7; monochrome blue glass family #4A8FD6; near-black base with #5b8cff active and purple/teal/orange/red category KPI bars.
- Use when: Use single accent for status-heavy operations screens; semantic light palette for commerce/inventory; per-tile tints for KPI category grouping; monochrome for restrained brand surfaces; category colors for multi-series KPI bars.
- Avoid when: Do not use many high-saturation category colors on small tables; do not use monochrome when series need distinct identification; do not put accent on large surfaces in data-dense views.
- Build notes: Reserve accent for interactive/primary, use red/green/amber only for semantics; ensure 4.5:1 text contrast; category palettes need 4-6 max distinguishable hues.
- Seen in: 5 refs; style:flat ×4, domain:ai-ops ×1, domain:hr-management ×1, domain:media-dashboard ×1, domain:quick-settings ×1, domain:travel-booking ×1

## density — Density
- Looks: Observed positions: compact uses 11-13px text, tight inspector rows, small uppercase labels; standard uses 11px captions under large KPI numerals; spacious uses large frosted calendar cells, wide gaps, pill controls.
- Use when: Use compact for dense tables, log inspectors, numeric detail panels; standard for mixed KPI + table dashboards; spacious for low-data overviews, calendars, mobile summary screens.
- Avoid when: Do not use compact for KPI-heavy overview screens; do not use spacious for dense operations tables or narrow desktop panes.
- Build notes: Keep row height, control min-height, and gap scales consistent; compact needs 11-13px minimum body text; spacious needs larger touch targets.
- Seen in: 5 refs; style:flat ×3, style:glassmorphism ×2, style:liquid-glass ×2, domain:ai-agent-console ×1, domain:calendar-planner ×1, domain:calendar-productivity ×1

## depth — Depth
- Looks: Observed positions: glass uses translucent dark panels over blurred multicolor gradients; borders-only uses flat charcoal/near-black panels with 1px dividers; subtle-shadows uses blue-gray cards on near-black canvas with soft shadow; layered-shadows uses indigo/navy cards on purple gradient backdrop; surface-tints uses violet/indigo neutral cards with no visible elevation.
- Use when: Use borders-only for compact desktop tools and tables; subtle-shadows for standard KPI cards on dark canvases; surface-tints for flat neutral dashboards; layered-shadows for focused card states; glass for translucent panels over non-busy backgrounds.
- Avoid when: Avoid glass over high-detail data tables; avoid layered-shadows for dense compact grids; avoid borders-only when hierarchy needs elevation.
- Build notes: Define one elevation token set; glass needs 1-2px border and blur, not drop shadow; borders-only needs 1px contrast; shadows must not create borders on light canvases.
- Seen in: 5 refs; style:flat ×2, style:glassmorphism ×2, domain:analytics-dashboard ×1, domain:asset-management ×1, domain:component-library ×1, domain:cryptocurrency ×1

## iconography — Iconography
- Looks: Observed positions: no glyph set, text/monograms only; outline thin monochrome glyphs at small text scale; outline regular white/neutral glyphs; duotone/filled small glyphs in tinted circles; duotone colour-filled KPI/activity icons.
- Use when: Use no icons for terminal/text-only tools; outline thin for compact filters; outline regular for standard navigation; duotone/tinted chips for KPI rows and category data.
- Avoid when: Do not mix filled and outline styles in one navigation set; do not use tinted chips for every micro-action; do not use no icons when scanability needs visual anchors.
- Build notes: Use one 16-20px grid; outline stroke 1.5-2px; tinted icon chips need 32-40px container and 16-18px glyph; monochrome state colors for hover/focus.
- Seen in: 5 refs; style:flat ×2, domain:analytics ×1, domain:business-dashboard ×1, domain:general ×1, domain:healthcare-dashboard ×1, domain:system-monitoring ×1

## radius — Radius
- Looks: Observed positions: 0px sharp terminal panels; 4-6px small admin cards/buttons; 8-10px medium enterprise cards; 12-16px large stat cards; 999px pill calendar/glass controls.
- Use when: Use sharp for terminal/legacy data tools; small for dense admin forms; medium for standard SaaS dashboards; large for KPI cards and mobile summary cards; pill for tags, toggles, calendar chips.
- Avoid when: Avoid large radius on dense tables and small controls; avoid pill on data grids; avoid sharp when brand requires soft cards.
- Build notes: Apply radius to card, button, input, chart chip as one scale; keep inner controls 2-4px less than outer card; pill is 999px.
- Seen in: 5 refs; domain:operations-dashboard ×3, style:enterprise-classic ×2, style:flat ×2, domain:analytics ×1, domain:business-dashboard ×1, domain:code-repository ×1

## typography — Typography
- Looks: Observed positions: very thin huge numerals vs small uppercase labels; uppercase tracked micro-labels with tabular/monospace token values; monospace/tech display labels, status lines, seven-segment clock; condensed uppercase wide-tracking titles with numeric tick labels; placeholder bars with weak weight contrast.
- Use when: Use tabular numerals and strong size contrast for KPI dashboards; monospace for logs, code, terminal metrics; condensed uppercase for instrument/control panels; placeholder bars only for wireframes.
- Avoid when: Avoid monospace for long body copy; avoid weak placeholder weight in production; avoid huge thin display numerals in dense tables.
- Build notes: Set font-variant-numeric: tabular-nums for metrics; keep micro-labels 10-11px uppercase with 0.08em tracking; body minimum 12px.
- Seen in: 5 refs; style:glassmorphism ×3, domain:audio ×1, domain:audio-mixing ×1, domain:crypto-wallet ×1, domain:dashboard ×1, domain:design-system ×1
