# Component: chart

## axisless-sparkline-trend — Axis-less sparkline trend
- Looks: Single-series line/area, no axes/grid/legend; 60-120px tall; optional vertex dots, corner delta labels, or KPI footer.
- Use when: Small KPI tile where trend shape matters more than exact values.
- Avoid when: User needs to read values, compare series, or inspect specific points.
- Build notes: Keep plot clipping; use one accent; tooltip optional; no axis labels unless required.
- Seen in: 3 refs; domain:analytics-dashboard ×1, domain:finance ×1, domain:system-monitoring ×1, style:bento ×1, style:enterprise-classic ×1, style:flat ×1

## crosshair-trend-chart — Interactive crosshair trend chart
- Looks: Line/area plot with y-axis ticks, x time labels, faint grid; hover vertical crosshair/dot, tooltip; optional top-right range segmented control and peak annotation pill.
- Use when: Time-series monitoring or review where user must inspect exact value at a point.
- Avoid when: Space is too small for axes, or data is categorical non-time series.
- Build notes: Tooltip follows cursor; pinned state for current value; range control re-queries data; annotation only for max/min/events.
- Seen in: 3 refs; domain:ai-ops ×1, domain:cryptocurrency ×1, domain:dashboard ×1, domain:healthcare-dashboard ×1, style:bento ×1, style:flat ×1

## categorical-bar-chart — Categorical bar chart
- Looks: Vertical bars over categories/days; optional month selector, summary footer, semantic status color, selected bar emphasis, tooltip, reference line.
- Use when: Per-category status, daily values, scores, or forecast selection.
- Avoid when: Continuous time trends or many categories exceeding 15-20.
- Build notes: Bar width 8-24px; tooltip on hover/tap; active bar can persist; keep baseline and y ticks if values matter.
- Seen in: 2 refs; domain:golf-scorekeeping ×1, domain:golf-sports ×1, domain:travel-booking ×1, style:flat ×1, style:glassmorphism ×1

## donut-share-chart — Donut share chart
- Looks: Ring 120-180px with segment gaps, center total/label; external dot legend rows with name/value/ticker.
- Use when: Share-of-whole for 3-6 categories; compact card KPI.
- Avoid when: More than 6 categories, small differences, or values need precise comparison.
- Build notes: Center label 12-16px; legend outside ring; segment order by value; no axis needed.
- Seen in: 2 refs; domain:crypto-wallet ×1, domain:dashboard ×1, domain:finance ×1, style:flat ×1, style:glassmorphism ×1

## kpi-composite-trend-card — KPI-led trend card
- Looks: Card with large headline number + delta/label above, chart below (area or bars), optional segmented status footer; minimal axes.
- Use when: Dashboard tile where a summary metric is primary and chart supports trend.
- Avoid when: Chart is the main analysis surface or needs full axes/legend.
- Build notes: Number hierarchy 28-40px, delta pill; chart 80-160px; footer 3-column stats if needed.
- Seen in: 2 refs; style:flat ×2, domain:analytics ×1, domain:business-dashboard ×1, domain:media-dashboard ×1

## multi-series-legend-trend — Multi-series trend chart
- Looks: Two or more line/area series with dot legend beside/below plot, axes, grid, hover tooltip; optional dotted current-time cursor for live data.
- Use when: Comparing related metrics over time (channels, categories, cohorts).
- Avoid when: More than 4-5 series or exact values matter without zoom/legend interaction.
- Build notes: Limit series to 4-5; use stroke style differences; legend click filters; tooltip lists all visible series.
- Seen in: 2 refs; domain:banking ×1, domain:finance-dashboard ×1, domain:industrial-planning ×1, style:flat ×1, style:glassmorphism ×1

## bubble-value-cluster — Bubble value cluster
- Looks: 3-5 rounded bubbles sized by value, label + number centered; no axes; compact spacing.
- Use when: Compact category totals on mobile or a KPI block where relative size is enough.
- Avoid when: Precise comparison, many categories, or data-dense dashboards.
- Build notes: Bubble diameter 48-120px; cap at 5 items; tap can open details; avoid overlapping labels.
- Seen in: 1 refs; domain:calendar-planner ×1, domain:calendar-productivity ×1, domain:productivity ×1, style:glassmorphism ×1, style:liquid-glass ×1

## leader-line-hero-annotation — Leader-line hero annotation
- Looks: Central illustration, render, photo, or asset occupies the main panel. 2-4 leader lines run from dot anchors on the asset to compact callouts. Each callout contains a short label, a bold value, and a unit. An optional caption/status block sits below or beside the visual with icon, status label, and helper text.
- Use when: A single entity needs spatial context and a few key metrics should be read directly on the object, such as equipment state, anatomy view, product diagnostic, device map, or hero dashboard card.
- Avoid when: The view needs many metrics, trend detail, comparison, tabular drill-down, or the asset has no stable anchor points for labels.
- Build notes: Keep callouts to 2-4; anchor lines to fixed points; truncate long labels; provide neutral, warning, and critical states; hide callouts gracefully on small screens or replace with a compact metric list.
- Seen in: 1 refs; domain:healthcare-dashboard ×1, style:glassmorphism ×1

## multi-chart-panel — Multi-chart panel
- Looks: One panel with multiple small charts (line, bars, waveform) sharing a single accent; compact titles/legends; no heavy grid.
- Use when: Operations monitor showing several related low-level metrics in one view.
- Avoid when: Each metric needs full axes, interaction, or is the primary focus.
- Build notes: Keep each chart 60-120px tall; consistent baseline; use one accent; allow drill-down.
- Seen in: 1 refs; domain:analytics ×1, domain:operations-dashboard ×1, style:flat ×1

## stacked-area-band — Stacked area band
- Looks: Layered area series over date axis, no legend in plot; x date labels; wide header visual above KPIs.
- Use when: Volume/mix over time where total shape is primary and series identity is secondary.
- Avoid when: Exact per-series values are needed or more than 4 layers are hard to read.
- Build notes: Use 3-4 layers; stack or overlay consistently; tooltip can reveal layer values; keep date axis only if needed.
- Seen in: 1 refs; domain:asset-management ×1, style:flat ×1

## waveform-status-chart — Waveform status chart
- Looks: Full-width signal/waveform line in card; header icon/title; one-line status footer with dot + label + subtext.
- Use when: Live signal, telemetry, ECG/audio/activity where normal/abnormal state matters.
- Avoid when: Discrete values need axes or user needs exact point values.
- Build notes: Waveform can scroll; status footer must map to latest value; avoid grid clutter.
- Seen in: 1 refs; domain:healthcare-dashboard ×1, style:glassmorphism ×1
