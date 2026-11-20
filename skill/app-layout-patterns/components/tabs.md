# Component: tabs

## underline-text-tabs — Underline text tabs
- Looks: Row of text labels 12-14px with 16-24px spacing; optional leading 16px outline icon; no background fill; active item has a 2-3px underline under the label/icon; inactive labels are muted; optional full-width hairline under the row.
- Use when: Primary section navigation, panel subsections, chart/KPI time-range filters such as Day/Week/Month/Year, and secondary nav where icons aid scanning.
- Avoid when: High-emphasis mode switching, long labels, many tabs, or when a filled control state is needed.
- Build notes: Underline width should match the active label, not the full tab; no hover fill; maintain accessible tablist semantics; icons are optional and must be consistent.
- Seen in: 4 refs; style:glassmorphism ×2, domain:code-repository ×1, domain:crypto-wallet ×1, domain:dashboard ×1, domain:developer-tools ×1, domain:fintech-wallet ×1

## closable-document-tabs — Closable document tabs
- Looks: Horizontal strip under topbar; leading '+' add button; text tabs 12-14px; active tab has a 2px underline on the top or bottom edge and stronger label; one or more tabs show a trailing 12-14px close 'x'; optional thin hairline under the row; tabs left-aligned with empty trailing space.
- Use when: Parallel open documents, workspaces, records, or unsaved items in back-office and operations tools.
- Avoid when: Simple section navigation, persistent app navigation, more than 8 visible tabs, or when no close/add behavior is needed.
- Build notes: Allow close on inactive tabs; keep active tab non-closable if state can be lost; scroll horizontally on overflow; truncate labels with ellipsis; support arrow-key tab order.
- Seen in: 3 refs; domain:dashboard ×2, domain:design-tool ×2, style:flat ×2, domain:design-system ×1, style:fluent ×1

## minimal-text-tabs — Minimal text tabs
- Looks: Inline text labels 11-13px; no underline, no pill, no background; active item is stronger or bolder; inactive items are muted; horizontal spacing about 16px; short uppercase tokens are acceptable.
- Use when: Compact secondary navigation, month/period switchers, small toolbar filters, and dense tool panels where chrome must stay minimal.
- Avoid when: Primary navigation, low-contrast displays, long labels, or when the active state must be obvious without an indicator.
- Build notes: Use weight and tone to separate the active state; keep maximum 4-6 visible items; overflow with scroll or ellipsis; ensure focus visibility.
- Seen in: 2 refs; domain:analytics ×1, domain:component-library ×1, domain:operations-dashboard ×1, domain:ui-kit ×1, style:flat ×1, style:glassmorphism ×1

## pill-tabs — Pill tabs
- Looks: Row of label tabs or icon+label tabs 13-14px; active tab is a filled/tinted rounded-full pill with high-contrast text; inactive tabs are transparent with muted text; optional leading 16px outline icon; container may have a thin border.
- Use when: Mode switching, filter groups, card-level navigation, and small sets of 2-5 mutually exclusive options.
- Avoid when: Long labels, many options, document-style close behavior, or contexts requiring an underline continuous with surrounding chrome.
- Build notes: Pill height 28-32px; active fill comes from style; support keyboard arrows; keep inactive hover subtle; do not add close glyphs here.
- Seen in: 2 refs; domain:design-system ×1, domain:travel-booking ×1, style:flat ×1, style:glassmorphism ×1, style:liquid-glass ×1

## raised-badge-tabs — Raised badge tabs
- Looks: Row of raised tab shapes about 40px high and 120-180px wide; active tab is inset and flatter than inactive raised tabs; one tab can carry a count badge; trailing flat square slot 32-40px for avatar/icon.
- Use when: Desktop app-shell navigation with a notification count and profile/avatar slot, where tab width and visual separation are acceptable.
- Avoid when: Dense dashboards, compact toolbars, more than 4-5 tabs, flat business panels, or small screens.
- Build notes: Badge overlays the top-right of one tab and is not a separate tab; keep the active inset state readable; fix the trailing slot width; treat raised/inset shape as structure, bevel as style.
- Seen in: 1 refs; domain:general ×1, style:enterprise-classic ×1, style:skeuomorphic ×1
