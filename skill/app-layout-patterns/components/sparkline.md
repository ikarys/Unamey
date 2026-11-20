# Component: sparkline

## annotated-line-sparkline — Annotated line sparkline
- Looks: Smooth 1px line sparkline about 80x20-28px; may include small x tick labels, a filled dot for the current or last point, a floating value chip near a peak, and a dim caption below the chart.
- Use when: Compact trend under a metric or inside a progress card when the user needs a now marker, minimal time context, or a brief live-activity hint.
- Avoid when: The data needs full axis scales, many labelled categories, or discrete bar-style values.
- Build notes: Support optional tick labels, current-point marker, floating delta chip, and caption; keep chart height 20-28px; omit labels and markers for the minimal live hint variant.
- Seen in: 2 refs; domain:golf-scorekeeping ×1, domain:golf-sports ×1, domain:ml-operations ×1, style:glassmorphism ×1, style:terminal ×1

## bar-sparkline — Bar sparkline
- Looks: Axis-less mini bar chart with ~20 vertical bars, bar width ~6px, small gaps, no labels or values, muted low-emphasis styling; bar height scales with data.
- Use when: Low-emphasis trend footer under a card or list when only the shape of the trend matters.
- Avoid when: Exact values, deltas, targets, or category labels are needed; bars can imply discrete periods.
- Build notes: Render from an array of positive values at a fixed height of ~20-28px; omit axes; optional tooltip; keep colour muted so it does not compete with the primary metric.
- Seen in: 1 refs; domain:finance ×1, style:flat ×1

## semantic-delta-line-chip — Semantic delta line chip
- Looks: Rounded tinted panel about 80x28px with a semantic green or red background, a smooth 1px line sparkline inside, and a small percentage value plus directional arrow beside or overlaid on the chart.
- Use when: Per-row trend indicator where gain or loss must be readable quickly and a compact delta label is required.
- Avoid when: Space is very tight, semantic backgrounds create visual noise, or the trend needs a precise time axis.
- Build notes: Bind sign to tint and arrow direction; treat chart and label as one fixed-size pill; no axes; ensure text contrast on the tinted background.
- Seen in: 1 refs; domain:crypto-wallet ×1, domain:dashboard ×1, style:glassmorphism ×1
