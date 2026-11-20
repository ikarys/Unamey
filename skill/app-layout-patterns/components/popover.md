# Component: popover

## chart-detail-list-popover — Chart detail list popover
- Looks: Compact floating rounded card about 200px wide, anchored to a chart point or segment; header label, 3–5 small text rows at 12px, optional divider and circular avatar row; subtle shadow.
- Use when: Show a short item list, files, metrics, or collaborators tied to a chart element on hover or click.
- Avoid when: Only one value is needed, or the content requires a full table, filters, or form input.
- Build notes: Limit rows; ellipsize long names; show avatar overflow as +N; close on outside click or Escape; anchor stable relative to chart element.
- Seen in: 1 refs; domain:asset-management ×1, style:flat ×1

## point-annotation-popover — Point annotation popover
- Looks: Small floating rounded panel with shadow, anchored to a map/scene point; max two text lines: title plus value; width fits one short value, typically 120–160px.
- Use when: Label a hovered or selected marker, point, or scene element with one short fact.
- Avoid when: Detail needs multiple rows, a list, actions, avatars, or a persistent panel.
- Build notes: Anchor with an optional arrow; keep it non-blocking; hide on scroll/zoom/blur; do not use for forms or long text.
- Seen in: 1 refs; domain:analytics-dashboard ×1, style:enterprise-classic ×1, style:glassmorphism ×1
