# Component: list

## data-row-list — Data row list
- Looks: Vertical list of 44-80px rows; each row = 28-40px media tile/avatar/icon, 13-14px label, 11-12px sublabel, right-aligned 13-14px value; optional trend arrow, sparkline chip, progress bar, rank number, or action pill; spacing or hairline dividers.
- Use when: Record lists with one primary metric per row: transactions, holdings, media items, ranked entities, contacts with balances.
- Avoid when: Multi-column sortable tables, read-only key-value detail, or grouped section headers dominate the layout.
- Build notes: Right-align numeric values; use semantic green/red only for direction/status; truncate sublabels; row click opens detail.
- Seen in: 7 refs; style:glassmorphism ×4, domain:dashboard ×2, style:flat ×2, domain:banking ×1, domain:crypto-wallet ×1, domain:finance ×1

## selection-option-list — Selection option list
- Looks: Vertical list of 36-56px option rows/tiles; leading 16-32px icon/avatar/badge, 13-14px label, optional right meta, chevron, or filter footer; one tinted selected row/pill, hover state, spacing or hairline separation; narrow 70-120px picker variant.
- Use when: Left navigation, year/month picker, filter rail, master list driving a detail pane, member/component lists with one active item.
- Avoid when: Rows need large value columns, multi-select checkboxes, multi-row cards, or dense data tables.
- Build notes: Selected state uses tinted fill/outline; keep option width stable; footer can host filter/action; chevron signals drill-in.
- Seen in: 7 refs; style:flat ×4, domain:dashboard ×2, domain:design-system ×2, domain:design-tool ×2, domain:analytics ×1, domain:general ×1

## event-task-feed-list — Event task feed list
- Looks: Vertical 44-80px rows/cards for events, tasks, chat, alerts, and agenda; leading icon/avatar/badge, 13-14px title, 11-12px subline for time/due date/caption, optional inline media, rounded message bubble, numbered index, trailing kebab/chevron/CTA; active row tinted; spacing or hairlines.
- Use when: Activity streams, task queues, announcements, schedules, chat/alert previews, and time-ordered narrative rows.
- Avoid when: Rows need aligned numeric values, sortable columns, selection-only lists, or read-only key-value data.
- Build notes: Use secondary color for time/subline; bubbles max-width 70-80%; truncate long text; chevron for navigation, kebab for actions.
- Seen in: 5 refs; style:glassmorphism ×3, style:flat ×2, domain:ai-agent-console ×1, domain:business-dashboard ×1, domain:calendar-planner ×1, domain:calendar-productivity ×1

## metric-status-row-list — Metric status row list
- Looks: Vertical 32-52px rows; leading 8-12px dot/icon, 13px label, right-aligned 13px value/unit/status word/delta badge/up-down arrow; optional trailing chevron; no row fill or hairline dividers.
- Use when: KPI breakdowns, asset legends, health checks, score lists, and metric readouts beside gauges or summaries.
- Avoid when: Rows represent people/entities needing identity media, long descriptions, or rich actions.
- Build notes: Align values in a fixed right column; color values by severity/direction; delta badges use +/− and arrow.
- Seen in: 4 refs; style:glassmorphism ×2, domain:code-repository ×1, domain:cryptocurrency ×1, domain:dashboard ×1, domain:developer-tools ×1, domain:golf-scorekeeping ×1

## checklist-control-list — Checklist control list
- Looks: Vertical 32-48px rows under optional 14px section headers; each row has checkbox, status dot, toggle, switch, slider, button, or other trailing control; 13px label, 12px helper text, 1px section dividers.
- Use when: Filters, settings, device controls, quick actions, and criteria rows where each item is controlled by a binary or inline control.
- Avoid when: Rows are read-only metadata, require value/trend columns, or are event feeds.
- Build notes: Controls right-aligned; disabled state gray; group headers collapsible with chevron; checkboxes for multi-select, toggles for settings.
- Seen in: 3 refs; domain:home-automation ×1, domain:smart-home ×1, domain:system-monitoring ×1, domain:travel-booking ×1, style:bento ×1, style:flat ×1

## grouped-sectioned-list — Grouped sectioned list
- Looks: Sequence of 12-14px section headers for time/status/category followed by 44-64px rows; rows may have avatar/icon, label, sublabel, status dot, or value; groups separated by 8-12px spacing or thin divider; sticky headers optional.
- Use when: Work-order queues, presence lists, time-grouped activity, and master lists needing temporal or status grouping.
- Avoid when: Flat picker lists, dense data tables, single-column option pickers, or cards with price/CTA.
- Build notes: Keep row anatomy consistent within groups; header labels muted; handle empty groups; use sticky headers for long scrolls.
- Seen in: 2 refs; style:flat ×2, domain:asset-management ×1, domain:work-orders ×1

## metadata-key-value-list — Metadata key-value list
- Looks: Card/panel with optional header and edit/menu action; stacked 32-48px rows of outline icon, 13px label left, 13px value right; can include titled sections, italic placeholders, and link CTAs; 1px dividers between rows/sections.
- Use when: Read-only detail inspector, object profile, document metadata, and empty-state info panel.
- Avoid when: Rows are interactive records, need selection, trend charts, or dense multi-column data.
- Build notes: Keep label column fixed; truncate values with ellipsis; section headers 14px bold; use links for empty states.
- Seen in: 2 refs; domain:code-repository ×1, domain:developer-tools ×1, domain:fintech-wallet ×1, style:enterprise-classic ×1, style:glassmorphism ×1

## result-card-list — Result card list
- Looks: Vertical stack of 80-140px cards separated by 12px gap or hairline; card has header with logo/icon/bookmark/menu, one or more sub-rows for route/item/spec, right-aligned 14-16px price/value and CTA button, footer meta chips/tags; compact variant is a text block left plus CTA right.
- Use when: Search results, quotes, travel comparison, and actionable product items where each item needs a decision CTA.
- Avoid when: Dense record browsing, read-only metadata, simple option selection, or metric-only lists.
- Build notes: Keep CTA size and right alignment consistent; align sub-rows; use badges for scarcity/meta; add expand link for details.
- Seen in: 2 refs; domain:operations-dashboard ×1, domain:travel-booking ×1, style:bento ×1, style:flat ×1, style:glassmorphism ×1

## metric-matrix-grid — Metric matrix grid
- Looks: Tight 3x2/2x3 grid of small stat cells; each cell has a 12-16px icon, 12px label, 13-14px value; no cell borders, separation by 8-12px spacing.
- Use when: KPI or resource summary card with 4-6 metrics and no row action.
- Avoid when: Rows need ordering, selection, trend chips, or more than about 8 metrics.
- Build notes: Keep cells equal height; use overflow scroll or switch to a row list for longer sets.
- Seen in: 1 refs; domain:analytics-dashboard ×1, style:enterprise-classic ×1, style:glassmorphism ×1
