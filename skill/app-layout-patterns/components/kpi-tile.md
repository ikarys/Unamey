# Component: kpi-tile

## icon-kpi-tile — Icon KPI tile
- Looks: Leading icon 16-24px in a tinted circle/square or as a plain glyph, then value 14-20px and caption 11-12px. Can repeat vertically, sit in a side rail, or form a small 2x2 grid of separate tiles.
- Use when: Metric tied to a clear object or action, such as notes, pending items, health checks, or counters in a compact list.
- Avoid when: The value is the only meaningful signal, the icon adds noise, or the layout is a dense data table.
- Build notes: Keep icon left or above the value, add aria-label to the icon, and do not make the icon the primary data indicator.
- Seen in: 3 refs; domain:finance ×1, domain:home-automation ×1, domain:operations-dashboard ×1, domain:smart-home ×1, style:bento ×1, style:flat ×1

## multi-cell-stat-card — Multi-cell stat card
- Looks: One card containing 2-4 KPI cells separated by 1px hairlines. Each cell has icon 16-24px, value 14-20px, and label 10-12px. Can be a 2x2 grid or a 3-up horizontal strip in one bordered row.
- Use when: Related metrics that share context and need a grouped overview, such as dashboard header strips or small operations panels.
- Avoid when: Metrics are unrelated, one metric needs large emphasis, or cell width would make labels and numbers unreadable.
- Build notes: Keep equal cell heights, use internal dividers only, avoid outer borders on flat variants, and enforce minimum width for 3-up strips.
- Seen in: 3 refs; domain:analytics ×1, domain:banking ×1, domain:business-dashboard ×1, domain:dashboard ×1, domain:finance-dashboard ×1, style:flat ×1

## number-first-kpi-tile — Number-first KPI tile
- Looks: Card or flat block with small label top, large tabular number 20-40px, optional delta badge/caption below, optional small icon. No chart. Observed as a 3-up row with hairline dividers, a text-only metric block, or a bordered tile.
- Use when: Single scalar metric that needs fast scanning, such as revenue, users, orders, or status counts in a KPI band.
- Avoid when: Trend, distribution, utilization, target progress, or category grouping needs visualization.
- Build notes: Right-align numbers, use tabular-nums, keep delta sign explicit, and do not add a chart when the tile is one of several equal KPIs.
- Seen in: 3 refs; style:flat ×3, domain:operations-dashboard ×2, domain:analytics ×1, domain:business-dashboard ×1, domain:media-dashboard ×1, style:enterprise-classic ×1

## progress-target-kpi-tile — Progress target KPI tile
- Looks: Label plus value plus a thin progress underline/bar 2-4px. Optional target badge, percent, or current/target text. Can be a single tile or a row of 2-3 mini tiles.
- Use when: Metric compared to a known target, quota, capacity, budget, savings goal, or completion threshold.
- Avoid when: No denominator exists, the metric is purely trend-based, or the tile only needs a current value.
- Build notes: Show current/target in the label or tooltip, cap the bar at 100%, and use color only to signal over/under target.
- Seen in: 3 refs; domain:dashboard ×2, style:glassmorphism ×2, domain:banking ×1, domain:crypto-wallet ×1, domain:design-tool ×1, domain:finance-dashboard ×1

## gauge-utilization-kpi-tile — Gauge utilization KPI tile
- Looks: Compact card with label, big value, optional delta, radial gauge 24-48px or utilization bar, status tag, and optional chevron. Observed with temperature gauge plus CPU-style utilization bar.
- Use when: Resource, health, capacity, score, or saturation metric with a bounded 0-100 range.
- Avoid when: Metric is unbounded, purely historical, a plain count, or needs a trend chart instead of a current-state gauge.
- Build notes: Map gauge to a fixed range, show units, keep status text aligned to thresholds, and use chevron only if the tile navigates.
- Seen in: 2 refs; domain:industrial-planning ×1, domain:system-monitoring ×1, style:bento ×1, style:flat ×1

## hero-emphasis-kpi-tile — Hero emphasis KPI tile
- Looks: Large emphasis KPI block with oversized number 32-48px, tiny uppercase label, split colored banner, borderless overlay on a contextual image, or centered value with a corner percentage badge. Used for one top-priority metric.
- Use when: Single metric that must dominate a view, such as hero score, balance, campaign target, or featured operational result.
- Avoid when: Dense KPI grid, multiple equal metrics, small mobile tiles, or data tables where the metric should not stand out.
- Build notes: Reserve for one tile per view, ensure contrast on images or colored fills, and keep badge secondary to the main value.
- Seen in: 2 refs; domain:dashboard ×1, domain:golf-scorekeeping ×1, domain:golf-sports ×1, style:glassmorphism ×1, style:material ×1

## trend-chart-kpi-tile — Trend chart KPI tile
- Looks: KPI header with value and optional status tag, plus an inline area/bar sparkline 40-80px high. May include tooltip, time axis, delta badge, or pinned last-point marker. Card width commonly 150-380px.
- Use when: Metric where recent shape matters, such as revenue, traffic, latency, usage, or rate change over a short time window.
- Avoid when: Only a current value is needed, the tile is too small for a readable axis, or many equal KPIs must fit in one row.
- Build notes: Keep axes minimal, pin the last data point if useful, and use tooltip for exact values rather than full axis labels.
- Seen in: 2 refs; domain:ai-ops ×1, domain:healthcare-dashboard ×1, style:flat ×1, style:glassmorphism ×1

## category-accent-kpi-tile — Category accent KPI tile
- Looks: Card around 150x70px with a left vertical accent bar 3-4px, label top-left, and large value. The bar encodes category or status rather than decoration.
- Use when: Multiple KPIs grouped by status or category, such as total, completed, in progress, waiting, or risk buckets.
- Avoid when: Category is obvious from the label, no status color system exists, or the tile sits in a dense table where a bar is too much.
- Build notes: Use a fixed status palette, do not rely on color alone, and keep the value left-aligned with the bar as a non-interactive key.
- Seen in: 1 refs; domain:hr-management ×1, style:flat ×1

## headline-microstats-tile — Headline microstats tile
- Looks: Large headline KPI card with title row, big value, divider, then a horizontal row of 3-4 mini stat chips. Each chip has small icon, label, and number 10-12px. Rounded corners around 12px.
- Use when: One primary KPI that needs supporting breakdown in the same card, such as summary, pipeline, or status overview.
- Avoid when: Secondary stats are numerous, the primary value is not dominant, or the layout is too narrow for a chip row.
- Build notes: Limit chips to 3-4, keep them read-only, and wrap to a vertical list if labels exceed one line.
- Seen in: 1 refs; domain:analytics-dashboard ×1, style:enterprise-classic ×1, style:glassmorphism ×1

## inline-meta-stat-strip — Inline meta stat strip
- Looks: Single-line row of small mono metrics, about 11-12px, separated by spaces or middle dots, no boxes or dividers, muted gray text, right- or center-aligned, one token may be colored as a tag.
- Use when: Footer, status bar, or dense header meta summarising run data such as time, token count, rate, model, and queue state.
- Avoid when: Primary KPIs need large labels, trends, sparklines, units, or high-contrast scannability.
- Build notes: Keep one line with 4-8px gaps, use ellipsis or truncate on narrow widths, and mark colored tokens as status/tag only.
- Seen in: 1 refs; domain:ai-agent-console ×1, style:flat ×1

## threshold-inline-metric — Threshold inline metric
- Looks: Borderless inline metric block in a row: small uppercase label, large monospace value 18-28px, and dim trailing context such as /total or free x. Optional red-tint background when a threshold is exceeded.
- Use when: Ops, monitoring, or infrastructure values where many metrics sit in a dense grid and threshold state must be visible at a glance.
- Avoid when: Consumer-facing dashboards, formal KPI cards, charts, or layouts where metrics need stronger separation.
- Build notes: Use mono or tabular numerals, keep baseline state flat, and apply tint only when a real threshold is crossed.
- Seen in: 1 refs; domain:ml-operations ×1, style:terminal ×1
