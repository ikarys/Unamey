# Component: select

## pill-scoped-filter-select — Pill scoped filter select
- Looks: Small pill ~120-250px wide and 24-30px tall with current value or placeholder and right chevron; transparent, inset, thin border, or frosted fill; placed in card headers, chart corners, or composer edges
- Use when: Filtering one dashboard card, chart, section, or choosing a mode/model adjacent to a composer without a full form label
- Avoid when: Global page filters, labelled form rows, or dense inspector grids
- Build notes: Empty state shows placeholder, menu aligns to pill edge, keep chevron right, no outer label
- Seen in: 5 refs; style:glassmorphism ×3, style:flat ×2, domain:ai-agent-console ×1, domain:audio ×1, domain:audio-mixing ×1, domain:banking ×1

## inspector-grid-select — Inspector grid select
- Looks: Compact select fields in 2- or 4-column property grids; label left or small caps above, value text, right chevron; ~32px row height, accent border on active field, monospace values for numeric configs
- Use when: Property inspectors, config panels, and form grids with many related selects
- Avoid when: Single toolbar filter, card-header filter, or space-constrained mode picker
- Build notes: Group under section labels, disabled state shows a dim dash, keep chevron fixed, support keyboard navigation and autocomplete
- Seen in: 4 refs; domain:dashboard ×2, domain:design-tool ×2, style:flat ×2, domain:design-system ×1, domain:ml-operations ×1, style:fluent ×1

## icon-leading-toolbar-select — Icon-leading toolbar select
- Looks: Rounded compact control with leading 16px icon, label or value, trailing chevron; 1px border or transparent fill, ~6px radius, ~32px height
- Use when: Toolbar actions where an icon identifies the function, such as sort, locale, branch, file, or split dropdown actions
- Avoid when: When a text label alone is clearer, in form rows, or in card-header pill filters
- Build notes: Truncate long values, rotate chevron on open, accessible name from label, optional split region for a primary action plus menu
- Seen in: 2 refs; domain:code-repository ×1, domain:developer-tools ×1, domain:travel-booking ×1, style:enterprise-classic ×1, style:flat ×1

## labelled-field-select — Labelled field select
- Looks: Single rounded field with 4-8px radius, label inside or above, value left, chevron right; full row width or compact sidebar-bottom control; 1px border
- Use when: Preferences, settings, and simple form rows where one select occupies a row
- Avoid when: Dense property grids, filter bars, or card headers where a pill or ghost select is better
- Build notes: Label can be a placeholder or small caps above, disabled state dims and uses a dash, focus border only
- Seen in: 2 refs; domain:home-automation ×1, domain:smart-home ×1, domain:system-monitoring ×1, style:bento ×1, style:terminal ×1

## ghost-filter-bar-select — Ghost filter bar select
- Looks: Borderless inline select in a filter bar: text prefix label, current value, trailing chevron; no visible box, ~32px row height, low visual weight
- Use when: List or table filters where the label must stay visible, such as status, assignee, client, or sort controls
- Avoid when: Form creation fields, dense inspector grids, or card-scoped filters
- Build notes: Visible prefix acts as the label, menu opens downward, add focus/open border only when active
- Seen in: 1 refs; domain:work-orders ×1, style:flat ×1
