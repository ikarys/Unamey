# Component: gauge

## single-arc-kpi — Single-arc KPI gauge
- Looks: 180° to 360° thin arc (2-4 px) on a light track; centered value 24-40 px, caption/unit 12-14 px; optional 16-20 px icon above value and delta chip 24 px below; no ticks.
- Use when: One scalar metric (completion, retention, score, usage) that needs a quick status read.
- Avoid when: Data is a composition of parts, a live continuous level, or several metrics in one card.
- Build notes: Animate only the value arc; keep track visible; use 180° for tight columns and 270-360° for cards.
- Seen in: 4 refs; style:flat ×2, domain:healthcare-dashboard ×1, domain:hr-management ×1, domain:media-dashboard ×1, domain:system-monitoring ×1, style:bento ×1

## embedded-status-gauge — Embedded status gauge
- Looks: Small arc or semi-circle 48-80 px, stroke 2-4 px, centered percent 12-16 px; placed inside a KPI tile, side panel, or table cell.
- Use when: Secondary status accent beside text KPIs where a numeric status is enough.
- Avoid when: The gauge is the primary metric or the layout has room for a full KPI gauge.
- Build notes: Pair with a text label; hide caption if width is under 90 px; use one accent colour.
- Seen in: 2 refs; domain:banking ×1, domain:finance-dashboard ×1, domain:industrial-planning ×1, style:flat ×1, style:glassmorphism ×1

## analog-needle-meter — Analog needle meter
- Looks: Rectangular framed meter 180-220 x 80-100 px; dual numeric scale top/bottom, 10-12 px ticks; single needle from centre pivot; label 12 px below.
- Use when: Live continuous level or activity (audio, speed, load) where direction and peaks matter.
- Avoid when: The metric is a discrete target percentage or requires exact small-step precision.
- Build notes: Drive needle from live data; add a hold/peak marker if peaks are meaningful; keep ticks legible at 2x.
- Seen in: 1 refs; domain:audio ×1, domain:audio-mixing ×1, style:glassmorphism ×1, style:liquid-glass ×1

## composite-progress-card — Composite progress card
- Looks: Card with header and expand icon; left 3-row mini list, each row icon 12 px + label + fraction 12-14 px; right radial gauge 120-160 px with centre percent 28-32 px.
- Use when: Show overall completion plus per-task/per-team fractions in one operations panel.
- Avoid when: Only a single percentage is needed or the list has more than 4 rows.
- Build notes: Gauge summarizes list total; list rows should be independently selectable or hoverable.
- Seen in: 1 refs; domain:business-dashboard ×1, domain:operations-dashboard ×1, style:enterprise-classic ×1, style:flat ×1

## hero-ring-kpi — Hero ring KPI
- Looks: Large circular ring 140-180 px, stroke 6-10 px, centre value 32-40 px and caption 12-14 px; optional second ring 80-100 px beside it with a target/actual fraction.
- Use when: Focal dashboard metric or top-level goal that should dominate a section.
- Avoid when: Dense grid, side panel, or when several metrics must share equal visual weight.
- Build notes: Use the secondary ring only for a directly related target/actual pair; keep centre value readable at 24 px minimum.
- Seen in: 1 refs; domain:analytics ×1, domain:operations-dashboard ×1, style:flat ×1

## metric-band-row — Metric band row
- Looks: Horizontal row of 3-5 radial dials 80-120 px each; each dial has 2-3 px arc, centre value 16-20 px, optional 10-12 px caption; spacing 12-16 px.
- Use when: Compact band of related KPIs where each metric needs a visual status but little text.
- Avoid when: Metrics need long captions, tooltips, or are unrelated categories.
- Build notes: Keep one scale and one accent palette; align baselines; cap at 5 to avoid crowding.
- Seen in: 1 refs; domain:operations-dashboard ×1, style:bento ×1, style:glassmorphism ×1

## radial-kpi-tile — Radial KPI tile
- Looks: Card/tile 200-280 px square; donut ring 120-160 px with 4-6 px stroke; centre number 32-40 px with unit; below, title 14-16 px and sub-count 12 px.
- Use when: Category metric in a dashboard row where the tile label, fill amount, and count are all needed.
- Avoid when: The metric has no title/count, or the tile would compete with a larger focal gauge.
- Build notes: Keep tile hue as a group encoder; do not rely on hue alone for status; add a text label.
- Seen in: 1 refs; domain:asset-management ×1, style:flat ×1

## segmented-ring-kpi — Segmented ring KPI
- Looks: Open ring with 3-5 colour-coded segments, thin stroke 3-4 px; centered delta/value 28-36 px and small caption 12 px; no ticks.
- Use when: Show several contributing parts around a single aggregate KPI (portfolio change, budget mix).
- Avoid when: Only one progress fill is needed or segments would be illegible at small size.
- Build notes: Segment order must map to a legend; centre value should be the sum/total, not a segment.
- Seen in: 1 refs; domain:cryptocurrency ×1, domain:dashboard ×1, style:bento ×1

## side-readout-dial — Side-readout dial
- Looks: Circular dial 80-120 px with partial arc; centre icon 24-32 px + short label/value 14-16 px; adjacent text block 12-14 px with metric name and unit.
- Use when: Single physical or environmental metric where the value is better read outside the circle.
- Avoid when: The metric is a percentage of completion or space allows a normal centred gauge.
- Build notes: Centre icon should identify the domain; side readout carries the precise value and unit.
- Seen in: 1 refs; domain:golf-scorekeeping ×1, domain:golf-sports ×1, style:glassmorphism ×1
