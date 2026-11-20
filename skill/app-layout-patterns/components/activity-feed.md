# Component: activity-feed

## icon-tile-activity-card — Icon-tile activity card
- Looks: Card with a title and 3-dot overflow in the header. Body is a list of ~64px rows: left rounded-square icon tile, middle bold 13px title plus gray 12px description, right gray timestamp. Icon tile tint varies by event type or severity; rows separated by spacing or hairlines.
- Use when: Business feed where each event needs a short title, explanation, and visual event-type or severity cue. Best for standard-density dashboards, alerts, audit summaries, or operations cards.
- Avoid when: Very dense log views, narrow side panels, or when entries are only timestamp + one-line message. Use a timestamp-led list instead.
- Build notes: Keep row height stable; reserve icon tile for category/severity; add text or icon state so severity is not color-only; include overflow actions, empty state, loading skeleton, and optional 'view all' link.
- Seen in: 1 refs; domain:ai-ops ×1, style:flat ×1

## timestamp-status-edge-list — Timestamp status-edge list
- Looks: Compact vertical list of event rows. Each row has a fixed-width left timestamp column, a colored left border accent by status, and a short message to the right. Thin dividers separate rows; column is scrollable.
- Use when: Chronological activity, log, test-run, or alert history where time order and quick status scanning matter. Best for compact detail panels, sidebars, and operational logs.
- Avoid when: Entries require rich titles, descriptions, icons, or actions per row. Use an icon-tile activity card or table instead.
- Build notes: Align timestamps in a monospace or fixed-width column; keep accent bar consistent; add non-color status cues; support scrolling with stable row heights; consider grouping by date if the list is long.
- Seen in: 1 refs; domain:industrial-planning ×1, style:flat ×1
