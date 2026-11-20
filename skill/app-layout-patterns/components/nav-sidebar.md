# Component: nav-sidebar

## docked-bottom-utility-rail — Docked bottom-utility rail
- Looks: Main nav list occupies the top/middle; one or more pinned rows at the bottom separated by a divider: settings, theme toggle, user/account block, floating action button, timer/status card; rail width typically 200–300px.
- Use when: Persistent app-level actions or status indicators that should not scroll with the navigation list.
- Avoid when: Short menus with little vertical space, mobile rails, or page-specific actions that belong in the content area.
- Build notes: Keep the bottom block fixed; use icon+label when width exceeds ~200px; do not let bottom actions compete with the active nav state.
- Seen in: 4 refs; domain:business-dashboard ×1, domain:fintech-wallet ×1, domain:home-automation ×1, domain:operations-dashboard ×1, domain:smart-home ×1, domain:system-monitoring ×1

## profile-header-rail — Profile-header rail
- Looks: Top 48–72px user block with circular avatar, name, role, and optional status dot; below it a scrollable icon+label menu; optional section labels; active row as tinted pill or left accent; 40–44px rows.
- Use when: Apps where user account, workspace, role, or profile context must be visible and switchable from the sidebar.
- Avoid when: Brand-led navigation, anonymous utilities, or when the rail must remain a pure page menu.
- Build notes: Avatar block opens account/profile menu; keep status dot small; nav list scrolls independently from header.
- Seen in: 4 refs; style:flat ×3, domain:analytics ×1, domain:asset-management ×1, domain:business-dashboard ×1, domain:dashboard ×1, domain:media-dashboard ×1

## data-row-metric-rail — Data-row metric rail
- Looks: Sidebar rows behave as entity/data rows: leading circular icon or outline icon, primary label, optional secondary sublabel, and a right-aligned value, badge, or status indicator such as balance, KPI, count, warning, or sign-coded badge; optional groups and dividers; active row tinted.
- Use when: Account, portfolio, device, queue, tenant, or entity lists where each navigation item carries a live value or operational status.
- Avoid when: Pure page navigation, dense table-like data, or rows needing more than two or three metrics.
- Build notes: Right-align values; color badges by sign or severity; row click navigates; truncate sublabels and values safely.
- Seen in: 3 refs; style:flat ×2, domain:analytics-dashboard ×1, domain:finance ×1, domain:work-orders ×1, style:enterprise-classic ×1, style:glassmorphism ×1

## grouped-icon-label-rail — Grouped icon-label rail
- Looks: 200–320px left rail; brand/logo block at top; scrollable vertical list of 40–44px icon+label rows; optional 11–12px uppercase section labels and hairline dividers; active row shown as tinted rounded pill, left accent bar, or lighter fill; inactive rows muted text.
- Use when: Primary section navigation for dashboards, back-office tools, and operations apps with a flat or shallow menu.
- Avoid when: Deep file/project trees, live per-row metrics, searchable object lists, or very narrow icon-only shells.
- Build notes: Keep one active state; add a collapsed icon-only mode; separate bottom utilities from the scrollable menu.
- Seen in: 3 refs; style:flat ×2, domain:ai-ops ×1, domain:community-app ×1, domain:hr-management ×1, style:glassmorphism ×1

## hierarchical-tree-resource-rail — Hierarchical tree-resource rail
- Looks: 250–320px rail; optional search field; collapsible tree with chevrons, indented children, and optional vertical tree connectors; leaf rows use icon, swatch, or label plus optional metadata such as count, lock, gear, or status; section headers optional; active/expanded rows tinted.
- Use when: Project, file, asset, config, component, or catalog navigation with multiple nesting levels.
- Avoid when: Flat section menus, mobile layouts, or shallow trees where expand/collapse adds unnecessary friction.
- Build notes: Persist expanded state; lazy load children; show count badges on parents; avoid deep indentation beyond about four levels.
- Seen in: 3 refs; domain:dashboard ×1, domain:design-system ×1, domain:design-tool ×1, domain:system-monitoring ×1, style:bento ×1, style:flat ×1

## compact-icon-profile-rail — Compact icon-profile rail
- Looks: 64–96px narrow rail; top app mark or profile avatar; middle icon-only rows with small state dots; bottom row of 3–5 icon buttons; labels omitted.
- Use when: Space-constrained desktop or web shells, secondary utility navigation, or a collapsed sidebar state.
- Avoid when: Primary navigation that requires readable labels, many sections, or users who need clear text differentiation.
- Build notes: Use 20–24px icons, tooltips, and an active dot; treat this as a collapsed companion to a full label rail.
- Seen in: 1 refs; domain:ui-kit ×1, style:glassmorphism ×1

## searchable-session-list-rail — Searchable session-list rail
- Looks: 250–300px rail; header actions plus search field; optional date or label caption; scrollable flat list of sessions, conversations, tickets, or recent items; rows 36–44px; active item shown with inset highlight; optional per-row kebab menu.
- Use when: Support conversations, chat sessions, tickets, recent objects, or any object list that needs quick search and row-level actions.
- Avoid when: Hierarchical navigation, brand menus, or large datasets without server-side search and pagination.
- Build notes: Search filters the list; kebab menu handles row actions; keep active item visible; use load-more or virtualization for long lists.
- Seen in: 1 refs; domain:ai-agent-console ×1, style:flat ×1
