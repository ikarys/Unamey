# Component: tree

## asset-tree — Asset Tree
- Looks: Indented expand/collapse tree with chevron, node icon, and label; optional trailing count badge, color swatch, or lock icon; compact rows with clear selected-row fill; section headers can be tiny uppercase labels; ~16px indent per level.
- Use when: Navigate nested files, folders, components, libraries, colors, or team assets in a side rail.
- Avoid when: Flat lists, data tables, or read-only logs where hierarchy and selection are unnecessary.
- Build notes: Persist expanded/collapsed state, allow single row selection, virtualize long trees, keep badges/swatches optional.
- Seen in: 2 refs; domain:dashboard ×2, domain:design-system ×1, domain:design-tool ×1, style:flat ×1, style:fluent ×1

## version-file-tree — Version File Tree
- Looks: Compact indented file list, optionally preceded by labelled version rows with Edit buttons; each file row shows path/name and a right-aligned diff delta such as +0.
- Use when: Show changed files between versions, manifests, build outputs, or audit snapshots.
- Avoid when: General navigation trees without per-row change values or version comparison context.
- Build notes: Treat version header rows as controls, not tree nodes; right-align deltas; clicking a row should open the file or diff view.
- Seen in: 1 refs; domain:ai-agent-console ×1, style:flat ×1
