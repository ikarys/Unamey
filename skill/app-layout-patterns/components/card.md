# Component: card

## dashboard-tile-card — Dashboard tile card
- Looks: Rounded 8-24px panel with 1px border or fill contrast, 16-20px padding. Header row: 14-16px title left, optional dropdown/kebab/add icon right. Body slot for KPI, chart, table, list, or text; internal hairline dividers for stacked sections.
- Use when: Default container for dashboard modules, KPI/chart/list panels, and repeated tiles where a header identifies the module and the body changes.
- Avoid when: When one number is the primary content, or when a full-width banner/carousel is needed.
- Build notes: Keep header height fixed, allow body scroll, use kebab for per-tile actions, and keep radius/padding consistent across tiles.
- Seen in: 13 refs; style:flat ×5, style:glassmorphism ×4, style:enterprise-classic ×3, domain:business-dashboard ×2, domain:dashboard ×2, domain:ai-ops ×1

## entity-card — Entity / project card
- Looks: Fixed-height tile ~180-250px. Top: 24-40px icon/avatar left, kebab/status badge right. Title 14-16px, 2-3 line description. Footer slot: progress bar with %, avatar stack +N, status text, split outcome bar, or two action buttons.
- Use when: Projects, assets, people, teams, services, categories, or decision items that need identity, status, progress, collaborators, and quick actions.
- Avoid when: For media-heavy catalog items or full-width aligned list rows.
- Build notes: Make the footer a switchable slot, clamp description to 2 lines, use status color only on badge/text, and keep cards equal height in grids.
- Seen in: 7 refs; style:flat ×4, domain:dashboard ×2, domain:design-tool ×2, style:glassmorphism ×2, domain:banking ×1, domain:design-system ×1

## operational-module-card — Operational module card
- Looks: Self-contained panel with header: monogram/icon + title + status badge. Body bundles 1-3 sections: description, 4-column KPI row, compact form row, endpoints/links, forecast strip, control cluster, or tile grid of device/balance tiles. Footer action buttons. 16-20px padding, 12-16px radius.
- Use when: Service, device, environment, wallet, or telemetry panels where state, metrics, configuration, and controls belong to one object.
- Avoid when: For generic chart containers or a single KPI.
- Build notes: Keep section order stable, use internal hairlines, allow collapse if tall, make tile-grid tiles clickable with a selected state, and expose status in the header.
- Seen in: 6 refs; domain:smart-home ×2, style:bento ×2, style:glassmorphism ×2, style:liquid-glass ×2, style:terminal ×2, domain:audio ×1

## kpi-metric-card — KPI metric card
- Looks: Single dominant metric with 24-48px value, label above, delta caption with arrow/percentage. Optional 2-4 small stat chips, progress bar, sparkline, avatar+label row, or a high-contrast summary block occupying the lower half.
- Use when: When the card's purpose is one headline number, balance, total, score, or rate with secondary deltas.
- Avoid when: When multiple independent metrics need equal weight, or when the card is a list/chart container.
- Build notes: Make the number the largest type, use a loading skeleton for the value, and avoid adding many CTA actions.
- Seen in: 5 refs; style:glassmorphism ×3, style:flat ×2, domain:analytics ×1, domain:crypto-wallet ×1, domain:dashboard ×1, domain:finance ×1

## banner-media-card — Banner / media card
- Looks: Full-width or large panel, ~120px+ tall, 12-24px radius, background artwork/image, centered 1-2 line title. Optional carousel slides with page dots below, optional corner-bracket frame and status line.
- Use when: Top-of-dashboard or feed anchor, onboarding, status hero, promotional banner, or media carousel.
- Avoid when: When the card needs many controls, data rows, or equal-weight KPIs.
- Build notes: Keep text readable over artwork with a scrim if needed, limit to one CTA, use dots for carousels, and avoid auto-advance for critical content.
- Seen in: 3 refs; style:glassmorphism ×2, domain:community-app ×1, domain:fintech-wallet ×1, domain:home-automation ×1, domain:smart-home ×1, style:terminal ×1

## callout-action-card — Callout / action card
- Looks: Compact 8-16px radius tinted or bordered surface. Leading icon 16-24px, bold heading 14-16px, 1-2 line body. Right-aligned solid/outline CTA 32-40px tall, or one full-width button. Optional status checklist with dots.
- Use when: Info, warning, empty-state, promo, or task nudge that needs one clear action.
- Avoid when: For primary data containers, multi-item lists, or panels with many controls.
- Build notes: Use tint only for attention, keep one CTA maximum, make it dismissable if non-blocking, and align width to the parent rail.
- Seen in: 2 refs; domain:system-monitoring ×1, domain:travel-booking ×1, style:bento ×1, style:flat ×1

## row-card — Row card
- Looks: Full-width horizontal tile 48-72px tall, 1px border. Left: checkbox or logo/icon. Center: ID/title and fixed columns with uppercase 10-11px micro-labels for status, date, client, assignee, route legs, or price. Right: kebab or CTA.
- Use when: Scannable list items, work orders, results, bookings, tickets, or records where columns must align across rows.
- Avoid when: When items need multi-line detail, media headers, or a grid layout.
- Build notes: Use fixed column widths, truncate long values with tooltips, keep 8px vertical rhythm, add row hover state, and support batch selection via checkbox.
- Seen in: 2 refs; style:flat ×2, domain:travel-booking ×1, domain:work-orders ×1

## catalog-media-card — Catalog media card
- Looks: Card ~200-320px wide. Media/image header occupies top ~55% with rounded top corners. Below: title, 1-2 line description, optional footer row with two icon+number metrics or tags.
- Use when: Entity listings, channels, products, courses, venues, or resources where a visual thumbnail and two summary stats are needed.
- Avoid when: When there is no media, or when the card is a full-width hero banner.
- Build notes: Set a fixed media aspect ratio, keep footer metrics at 12px, make the whole card clickable, and add a hover/focus state.
- Seen in: 1 refs; domain:community-app ×1, style:glassmorphism ×1

## status-skeleton-tile — Status skeleton tile
- Looks: Fixed ~96px rounded-square tile with one status icon or loading spinner above 1-2 short skeleton text lines; compact single-purpose module card.
- Use when: At-a-glance module state on a dashboard, app home, or operations shell: loading, success, empty, or unavailable state for one linked feature.
- Avoid when: The tile must show KPIs, charts, tables, dense rows, multiple actions, or editable content.
- Build notes: Use in a uniform grid; swap spinner for status icon when resolved; keep placeholder lines to 2 max; tap target opens the full module.
- Seen in: 1 refs; domain:calendar-planner ×1, domain:calendar-productivity ×1, domain:productivity ×1, style:glassmorphism ×1, style:liquid-glass ×1

## toolbar-card — Toolbar card
- Looks: Single horizontal row 40-56px tall, full-width panel, 1px border. Left group: context selectors, counts, status meta. Right group: search input, add/action buttons, menu. Hairline separators between groups.
- Use when: Above tables or lists to combine branch/file context, filters, search, and actions in one row.
- Avoid when: When actions belong to a single item, or when many filters need a sidebar.
- Build notes: Keep controls in one row, collapse overflow into a menu, make it sticky above the table, and right-align primary actions.
- Seen in: 1 refs; domain:code-repository ×1, domain:developer-tools ×1, style:enterprise-classic ×1
