# Component: topbar

## global-app-topbar — Global app topbar
- Looks: 48-72px horizontal bar; left brand, identity, or breadcrumb; optional center text nav or search; right icon buttons and user avatar; 1px bottom hairline or flat fill.
- Use when: App shell header where users need orientation, global navigation, notifications, and account access across pages.
- Avoid when: Single screens with local actions only, or workbenches that need command buttons and view switchers.
- Build notes: Keep actions right-aligned, use 28-32px icon buttons, add avatar menu, make it sticky, and collapse center nav on narrow widths.
- Seen in: 8 refs; style:flat ×5, domain:business-dashboard ×2, style:enterprise-classic ×2, domain:ai-ops ×1, domain:analytics ×1, domain:code-repository ×1

## command-workbench-topbar — Workbench command topbar
- Looks: 56-64px bar; left logo or status cluster; center grouped command buttons and/or segmented view switcher; right secondary button, accent CTA, and avatar; dividers between command groups.
- Use when: Editor, builder, publishing, analysis, or tool workspace where the topbar is the main action menu.
- Avoid when: Read-only list, dashboard, or settings screens that only need a title, search, or user controls.
- Build notes: Group related verbs, show active segment, keep primary CTA distinct, support keyboard shortcuts, and collapse overflow into menus.
- Seen in: 5 refs; domain:dashboard ×2, domain:design-tool ×2, style:flat ×2, style:glassmorphism ×2, domain:design-system ×1, domain:golf-scorekeeping ×1

## page-title-header — Page title header
- Looks: In-content header 48-80px; left page title 18-24px, optional small label above it; right search or action buttons; no full-width app chrome.
- Use when: Detail, settings, list, or report page inside an app where the header names the current view and exposes local actions.
- Avoid when: Global app shell needing brand, navigation, breadcrumbs, or persistent user controls.
- Build notes: Place inside the content column, right-align actions, allow title truncation, and keep height lower than a global topbar.
- Seen in: 2 refs; domain:finance ×1, domain:system-monitoring ×1, style:bento ×1, style:flat ×1

## screen-title-header — Screen title header
- Looks: 40-56px transparent or flat bar; back chevron or menu glyph left, centered title 14-16px, right icon cluster 24-28px.
- Use when: Phone-width app screen, modal, wizard, or desktop panel where navigation is back/forward and actions are icon-only.
- Avoid when: Desktop back-office pages needing labels, search fields, breadcrumbs, or a full user menu.
- Build notes: Center the title absolutely, reserve safe padding, use icon buttons with tooltips, and disable back when unavailable.
- Seen in: 2 refs; domain:analytics ×1, domain:crypto-wallet ×1, domain:dashboard ×1, domain:operations-dashboard ×1, style:flat ×1, style:glassmorphism ×1

## search-led-topbar — Search-led topbar
- Looks: 48-64px bar dominated by a search field, centered or left-aligned; right utility icon cluster; minimal or no brand block.
- Use when: Content browsing, admin catalog, support, or command-palette entry where searching is the primary entry point.
- Avoid when: Screens whose main task is creating, publishing, or command execution, or where breadcrumb scope matters more than search.
- Build notes: Make the input 32-36px tall, add shortcut hint, keep icons right, debounce results, and handle empty, loading, and no-result states.
- Seen in: 2 refs; style:glassmorphism ×2, domain:community-app ×1, domain:fintech-wallet ×1

## breadcrumb-topbar — Breadcrumb topbar
- Looks: 36-56px thin bar; left slash-separated breadcrumb with current scope highlighted; right icon actions; no large title.
- Use when: Nested project, folder, account, or resource hierarchy where users need to see path and jump to a parent scope.
- Avoid when: Flat app screens with no hierarchy, or when a page title better explains context.
- Build notes: Limit visible segments to 3-4, truncate the middle, make the last segment non-clickable, and add an overflow menu for hidden levels.
- Seen in: 1 refs; domain:ai-agent-console ×1, style:flat ×1

## browser-style-topbar — Browser-style topbar
- Looks: 48-64px app-chrome bar; window controls or traffic lights left, back/forward chevrons, centered address or identity pill, right action icon group.
- Use when: Embedded browser view, preview pane, multi-document shell, or app frame that needs document identity and navigation.
- Avoid when: Standard back-office pages where app navigation, user actions, or page title matter more than document URL.
- Build notes: Disable back/forward when unavailable, make the address pill focusable or read-only, keep action icons 24-28px, and respect OS safe areas.
- Seen in: 1 refs; domain:banking ×1, domain:finance-dashboard ×1, style:glassmorphism ×1

## kpi-header — KPI header
- Looks: 56-72px header; left title, centered primary KPI value 24-32px with muted unit suffix, right action buttons; transparent or flat background.
- Use when: Wallet, account, budget, inventory, monitoring, or balance page where one headline metric should be visible without scrolling.
- Avoid when: Pages with multiple KPIs, dense tables, or when the metric is better placed in a card below the header.
- Build notes: Show a skeleton while loading, align baselines, keep the KPI non-clickable unless it drills down, and update the value in place.
- Seen in: 1 refs; domain:cryptocurrency ×1, domain:dashboard ×1, style:bento ×1

## minimal-status-app-chrome — Minimal status app chrome
- Looks: 32-48px thin rounded or full-width bar; left small brand mark, right compact status dots/icons and avatar; no nav, search, or text controls.
- Use when: Desktop app frame, floating panel, or background service UI where only connection status and account access are needed.
- Avoid when: Pages needing navigation, search, breadcrumbs, command actions, or page titles.
- Build notes: Use 16-20px icons, give status dots tooltips, keep the avatar menu accessible, and ensure the bar does not block content.
- Seen in: 1 refs; domain:operations-dashboard ×1, style:bento ×1, style:glassmorphism ×1

## ops-console-topbar — Ops console topbar
- Looks: 48-56px bar; left logo or menu tabs, center search and date-range control, right account icons and optional window controls; thin bottom accent possible.
- Use when: Operations, monitoring, incident, reporting, or analytics console where time range and account/workspace context must stay visible.
- Avoid when: Generic pages without time-range filtering, or when the date picker belongs in a page filter row.
- Build notes: Keep the date control 32px tall, preserve selected range on navigation, collapse tabs to a menu on narrow widths, and separate window controls from app actions.
- Seen in: 1 refs; domain:industrial-planning ×1, style:flat ×1
