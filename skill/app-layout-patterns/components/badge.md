# Component: badge

## status-dot-pill — Status dot pill
- Looks: Rounded pill 20-32px tall, 4-8px horizontal padding, 10-12px label; leading 6-8px dot, icon, or check; tinted/neutral fill, optional 1px border; may be paired with a separate dot+label row.
- Use when: One-word service, device, task, or role state that needs a visible label, such as Ready, Active, Connected, or Online.
- Avoid when: State can be shown with a dot alone, a count, or a metric value; row density is too high for a pill.
- Build notes: Keep dot and text in the same semantic color; use neutral gray for idle; do not stack two dots in one pill; ensure label contrast.
- Seen in: 5 refs; domain:ui-kit ×2, style:glassmorphism ×2, domain:component-library ×1, domain:ml-operations ×1, domain:prediction-markets ×1, domain:system-monitoring ×1

## text-label-chip — Text label chip
- Looks: Small rounded pill 16-24px tall, 4-8px horizontal padding, 8-12px text; no required dot/icon; filled tint, outline, or neutral background; may contain a short number.
- Use when: Short category, priority, visibility, role, tier, or status label in tables, filters, card metadata, or buttons.
- Avoid when: Label exceeds 2-3 words, state needs a dot/icon, or value is a metric count/delta.
- Build notes: Use one palette per category; outline for low emphasis; center text; keep count chips under 3 digits.
- Seen in: 5 refs; style:flat ×2, style:glassmorphism ×2, domain:analytics ×1, domain:banking ×1, domain:business-dashboard ×1, domain:code-repository ×1

## state-marker — Compact state marker
- Looks: 6-10px dot, 12-20px glyph circle, 28-32px circular icon badge, triangle, check/info circle, or small outlined pill; filled, outline, or tinted; no required text; placed beside text, avatar, list row, or table cell.
- Use when: Presence, online/offline, pass/fail, info, warning, unread, or item-type indicator where a word is optional.
- Avoid when: User must read state without a label; multiple unrelated states in one marker; high-color-count category tags.
- Build notes: Filled = active/pass, hollow/gray = idle/offline, red triangle = warning; add tooltip/aria-label; do not combine dot and large glyph.
- Seen in: 3 refs; style:flat ×3, domain:analytics ×1, domain:asset-management ×1, domain:operations-dashboard ×1, domain:work-orders ×1

## value-delta-chip — Value/delta chip
- Looks: Pill 16-24px tall, 4-8px horizontal padding, 10-12px signed value (+/-, %) with up/down arrow, or a short word such as LIVE; green/red tint or colored text; placed under KPI, beside metric, or in table row.
- Use when: Change vs previous period, profit/loss, rank delta, live status, or trend direction next to a numeric value.
- Avoid when: Absolute count, status label, item count, or state without a baseline.
- Build notes: Pair with parent metric; keep arrow and sign same direction; use neutral for no change; do not use for counts.
- Seen in: 3 refs; style:flat ×2, domain:ai-ops ×1, domain:golf-scorekeeping ×1, domain:golf-sports ×1, domain:media-dashboard ×1, style:glassmorphism ×1

## category-chip-set — Category chip set
- Looks: Row/wrap of 16-28px rounded chips, 8-12px label, distinct tint/fill per category, optional leading icon or trailing add chip; no status dot.
- Use when: Tag filters, channel categories, node types, platform types, or many-value categorical filters.
- Avoid when: Values are semantic pass/fail states, counts, deltas, or only two states; when one chip per row would clutter.
- Build notes: Assign one hue per category; support removable chips in filter contexts; keep chips selectable if used as filters; do not mix status colors.
- Seen in: 2 refs; domain:dashboard ×1, domain:design-system ×1, domain:design-tool ×1, style:flat ×1, style:fluent ×1

## count-badge — Count badge
- Looks: 16-24px circle or 18-28px pill, 4-6px padding, 10-12px number; saturated fill, often red, or neutral dark fill; anchored top-right of icon, tab, or button, overlapping edge.
- Use when: Notification, alert, queue, unread, or button item counts.
- Avoid when: Count is a KPI metric, long text, or more than 3 digits without a count container.
- Build notes: Cap display at 99+; reserve for actionable counts; keep badge from covering icon label; clear count when appropriate.
- Seen in: 2 refs; domain:fintech-wallet ×1, domain:general ×1, style:enterprise-classic ×1, style:glassmorphism ×1, style:skeuomorphic ×1

## icon-stat-tag — Icon stat tag
- Looks: Inline 11px text with leading 12-16px micro-icon; no background or low-contrast fill; muted text; often two tags left/right in card footer.
- Use when: Card-footer metrics such as online count, members, views, or followers.
- Avoid when: Number needs emphasis, is a KPI delta, or row is dense with colored chips.
- Build notes: Use muted secondary color; icon should be non-semantic if text explains metric; avoid borders/fills that make it look like a badge.
- Seen in: 1 refs; domain:community-app ×1, style:glassmorphism ×1

## progress-callout-pill — Progress callout pill
- Looks: Floating pill 24-36px tall, 8-12px text, percentage/value plus short label; overlaid on chart or graph; solid/tinted fill.
- Use when: Highlighting a progress, completion, or achievement value above a chart/visual.
- Avoid when: Inside tables, forms, or dense dashboards; when the value belongs to a KPI card with standard delta chip.
- Build notes: Anchor to chart data point; keep one callout per chart; ensure it does not obscure axis labels; use only for callouts, not row status.
- Seen in: 1 refs; domain:calendar-planner ×1, domain:calendar-productivity ×1, domain:productivity ×1, style:glassmorphism ×1, style:liquid-glass ×1
