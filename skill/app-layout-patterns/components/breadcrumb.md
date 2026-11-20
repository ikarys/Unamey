# Component: breadcrumb

## icon-root-breadcrumb — Icon root page breadcrumb
- Looks: 12-14px home or app-root glyph plus separator plus current page label; compact 1-2 level path; can sit under a bold page title or inside a page-header banner.
- Use when: Admin or back-office pages that are one level under the app root, where a quick home/dashboard context is enough and a visible root anchor is expected.
- Avoid when: Multi-level drill-down where intermediate nodes are important, dense dashboards where a full text path gives more context, or small screens where icon plus label is hard to scan.
- Build notes: Root glyph links to home/dashboard and the current label is plain text; if repeated next to a page title, keep it 12-13px with lower contrast; ensure readable contrast on colored headers.
- Seen in: 2 refs; domain:analytics ×1, domain:business-dashboard ×1, domain:dashboard ×1, style:flat ×1, style:material ×1

## text-segment-breadcrumb — Text segment breadcrumb
- Looks: 12-14px text path with 1-2 segments; slash or chevron separator; parent segment muted, current segment stronger; no icon; compact line height; no trailing separator.
- Use when: Shallow scope context such as org / repo, module / page, parent / current in tool headers; when only 1-2 levels matter and space is limited.
- Avoid when: Deep hierarchy with 3+ clickable ancestors, when the user needs a home/root action, or when a full navigation menu already provides context.
- Build notes: Make ancestor segments links and the current item non-clickable text; truncate long labels with ellipsis if needed; keep 13px text and 4-8px gap around separators.
- Seen in: 2 refs; domain:code-repository ×1, domain:developer-tools ×1, domain:hr-management ×1, style:enterprise-classic ×1, style:flat ×1
