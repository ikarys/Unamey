# Component: data-table

## status-cell-table — Status cell table
- Looks: Compact 4-5 column table with 11-12px text, row separators by spacing or 1px lines; optional avatar/icon in first column; one or more cells use semantic status dot + label or tinted pill values.
- Use when: Rows are entities whose state is central (active, pending, failed, approved) and users need to scan status quickly.
- Avoid when: Primary task is comparing many numeric values, sorting large datasets, inline editing, or rows have many neutral fields.
- Build notes: Use 6-8px dots or 20-24px pills, map colors to meaning, keep non-status cells gray, and do not rely on color alone.
- Seen in: 2 refs; style:glassmorphism ×2, domain:analytics-dashboard ×1, domain:operations-dashboard ×1, style:bento ×1, style:enterprise-classic ×1

## card-managed-table — Card managed table
- Looks: Card container with title bar and right-aligned '...' menu, hairline under title, small uppercase column headers, and rows with checkbox, avatar + name + sublabel, text, date, and priority badge; 1px row separators.
- Use when: Project, task, ticket, or record management inside a dashboard card where the table is an object with header actions and row selection.
- Avoid when: Full-page data grid, dense multi-column scanning, advanced filtering, inline editing, or no card boundary is desired.
- Build notes: Use 16px checkboxes, 16px card padding, 14-16px title, 40-48px row height, and keep the header sticky if the card scrolls.
- Seen in: 1 refs; domain:analytics ×1, domain:business-dashboard ×1, style:flat ×1

## file-list-table — File list table
- Looks: 3-column borderless row table with ~36px rows and 1px separators; columns are resource name with type icon, short message/commit, and right-aligned timestamp; header may show avatar, SHA, and count.
- Use when: Repository, file, asset, or document lists where each row is a file/folder and context is version, commit, or last update.
- Avoid when: Generic multi-field records, bulk selection, priority badges, or many sortable numeric columns are needed.
- Build notes: Use 14-16px type icons, truncate message text, keep timestamps secondary, make row click open item, and avoid vertical gridlines.
- Seen in: 1 refs; domain:code-repository ×1, domain:developer-tools ×1, style:enterprise-classic ×1

## numeric-variance-table — Numeric variance table
- Looks: Dense header plus many thin rows, 11-12px right-aligned tabular numbers, 1px row separators, no zebra striping; positive/negative/deviation cells tinted green/red or another conditional color.
- Use when: Financial, KPI, inventory, or performance data where numbers are the main content and deviations must be spotted.
- Avoid when: Categorical status, long text, row actions, or non-numeric comparisons dominate the table.
- Build notes: Use tabular-nums, fixed column widths, right alignment, units in headers, and color only value cells, not whole rows.
- Seen in: 1 refs; domain:industrial-planning ×1, style:flat ×1

## stateful-row-list — Stateful row list
- Looks: Stacked full-width rounded rows with a single visible text column; states are default fill, hover glow/fill, and selected tinted outline ring; rows share card-style elevation.
- Use when: Vertical pickers, account/connection lists, settings options, or single-field choices where selection state is the main interaction.
- Avoid when: Multi-column data comparison, dense scanning, bulk selection, sorting, or sortable table data is required.
- Build notes: Use 36-44px row height, 8-12px radius, hover fill around 40-50%, selected 2px ring, and aria-selected for accessibility.
- Seen in: 1 refs; domain:design-system ×1, style:neumorphism ×1
