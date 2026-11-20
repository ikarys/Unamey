# App shells

## sidebar-topbar — Sidebar topbar
- Looks: Left sidebar 200-320px with logo, profile, grouped nav; topbar 56-120px spanning the main area with page title, search, user block, badges, and primary actions.
- Use when: General back-office, admin panels, SaaS tools, and operations apps with global navigation and user context.
- Avoid when: Mobile-first screens, icon-only shells, design-tool command bars, or KPI-first screens without global controls.
- Build notes: Make topbar sticky; put primary action on the right; support collapsed sidebar to 72px.
- Seen in: 8 refs; style:flat ×5, domain:business-dashboard ×2, domain:ai-ops ×1, domain:analytics ×1, domain:dashboard ×1, domain:finance ×1

## top-tab-shell — Top tab shell
- Looks: No left sidebar; topbar 40-72px with logo, horizontal text tabs or segmented control, right icon/avatar cluster; optional secondary tab bar 40px; content full-width or centered around 1080px.
- Use when: Light tools, portals, landing-connected dashboards, mobile-first web apps, and views with 3-6 top-level modes.
- Avoid when: Deep navigation, many sections, data-heavy operations, or persistent left navigation is required.
- Build notes: Use hamburger for hidden menu on small widths; keep primary action in the topbar right cluster.
- Seen in: 7 refs; style:glassmorphism ×3, style:flat ×2, domain:code-repository ×1, domain:developer-tools ×1, domain:golf-scorekeeping ×1, domain:golf-sports ×1

## tree-sidebar-workspace — Tree sidebar workspace
- Looks: Left sidebar 210-290px with collapsible file, folder, project, or session tree plus search; topbar 36-64px, sometimes stacked app bar and tab bar, with create, share, publish, avatar; main area is canvas, columns, or inspector.
- Use when: Design tools, IDEs, document workspaces, project managers, and apps with hierarchical content.
- Avoid when: Simple CRUD screens, flat lists, mobile layouts, or no clear hierarchy.
- Build notes: Persist tree selection; make tree width resizable; keep right inspector separate from main canvas.
- Seen in: 4 refs; style:flat ×3, domain:dashboard ×2, domain:design-tool ×2, domain:ai-agent-console ×1, domain:design-system ×1, style:fluent ×1

## icon-rail-shell — Icon rail shell
- Looks: Narrow left rail 56-72px with stacked icon buttons, active tick or fill, optional top brand/bell; topbar 64-80px with title, search, and actions.
- Use when: Dense dashboards, finance tools, monitoring views, and apps with 4-8 navigation items.
- Avoid when: Novice users, long labels, many nav groups, or screens that need visible text navigation.
- Build notes: Use hover labels or tooltips; allow rail to expand into a 210px sidebar; keep active state obvious.
- Seen in: 3 refs; domain:banking ×1, domain:cryptocurrency ×1, domain:dashboard ×1, domain:finance-dashboard ×1, domain:iot ×1, domain:smart-home ×1

## sidebar-kpi-band — Sidebar KPI band
- Looks: Left sidebar 200-240px full height with grouped nav; no global topbar; main area starts with a KPI band; content cards below.
- Use when: Dashboards where the primary task is reading metrics and navigation is secondary.
- Avoid when: Global search, breadcrumbs, user actions, or multiple persistent panels are required.
- Build notes: Keep KPI band fixed height; add in-content page title; collapse sidebar to icon rail if needed.
- Seen in: 2 refs; domain:analytics-dashboard ×1, domain:media-dashboard ×1, style:enterprise-classic ×1, style:flat ×1, style:glassmorphism ×1

## sidebar-right-panel — Sidebar right utility panel
- Looks: Left sidebar 210-230px full height; no global topbar; main content plus right rail with its own header, search, or user block.
- Use when: Chat, properties, filters, details, audit logs, or account context that must stay visible beside main content.
- Avoid when: Single-column reports, small screens, or when the right panel is only a temporary drawer.
- Build notes: Collapse right rail below 1200px; keep right header independent from main page title.
- Seen in: 2 refs; style:flat ×2, domain:asset-management ×1, domain:hr-management ×1

## mobile-header-shell — Mobile header shell
- Looks: No sidebar; in-screen header 56px with hamburger left, centered title, and right icons; content scrolls below.
- Use when: Mobile or tablet views of back-office, wallet, monitoring, and operational apps.
- Avoid when: Desktop full-width dashboards, complex multi-pane work, or when persistent navigation is needed.
- Build notes: Hamburger opens drawer; limit right icons to 2-3; truncate titles.
- Seen in: 1 refs; domain:crypto-wallet ×1, domain:dashboard ×1, style:glassmorphism ×1

## sidebar-icon-category-bar — Sidebar icon category bar
- Looks: Left sidebar 256px with text nav; full-width topbar 56px as an icon rail of categories with active underline; right cluster for add, search, chat, overflow.
- Use when: Operations tools with many object categories such as rooms, devices, zones, or asset types.
- Avoid when: More than 8 top-level categories, users need text labels, or forms dominate the screen.
- Build notes: Add tooltips for icons; keep active state visible; hide right cluster on narrow widths.
- Seen in: 1 refs; domain:home-automation ×1, domain:smart-home ×1, style:terminal ×1
