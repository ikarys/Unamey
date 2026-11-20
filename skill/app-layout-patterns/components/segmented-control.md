# Component: segmented-control

## text-track-pill — Text track with active pill
- Looks: Rounded outer track 32-44px tall containing 2-6 short text segments; active segment is a filled or elevated pill inside the track, often high-contrast; inactive segments transparent or muted; optional 1px dividers.
- Use when: Compact single-choice switches such as time range, view mode, theme picker, color picker, or topbar toggle.
- Avoid when: More than 6 options, long labels, icon detail is needed, or the control must occupy full content width as a primary filter.
- Build notes: Keep active pill inset about 2-4px; animate selection in 120-200ms; use equal or auto segment widths; do not rely only on colour for state.
- Seen in: 6 refs; style:glassmorphism ×4, style:flat ×2, domain:ai-ops ×1, domain:analytics ×1, domain:calendar-planner ×1, domain:calendar-productivity ×1

## icon-left-label-segment — Icon-left label segment
- Looks: Rounded track or adjacent pills 36-44px tall; each segment has a 12-16px icon left of a 12-14px label; active segment filled or accented, inactive transparent or outlined; usually 2-4 options.
- Use when: View/layout switch, list filter, dashboard mode toggle, or topbar view switch where icon plus label is useful in a compact height.
- Avoid when: More than 4 options, very narrow space, or icon-only segments would be clearer.
- Build notes: Use 8px icon-label gap; keep widths equal; active fill can be accent or elevated; keep icons monochrome and consistent.
- Seen in: 3 refs; style:flat ×2, domain:design-tool ×1, domain:operations-dashboard ×1, domain:prediction-markets ×1, style:bento ×1, style:glassmorphism ×1

## borderless-text-tabs — Borderless text tabs
- Looks: Inline row of text options with no outer track; active option uses brighter text, underline, or 1px outline; inactive options muted; supports 3-12 short labels; often placed above a chart or list.
- Use when: Low-emphasis chart time ranges, month pickers, or view labels where the selection can be inferred from surrounding context.
- Avoid when: The active choice must stand out in dense toolbars, labels are long, or there are more than 12 options.
- Build notes: Use role=tablist with left/right keyboard support; ensure active contrast is at least 4.5:1; do not add a heavy container if the design intent is low-emphasis.
- Seen in: 2 refs; domain:cryptocurrency ×1, domain:dashboard ×1, domain:travel-booking ×1, style:bento ×1, style:flat ×1

## fullwidth-category-pill-row — Full-width category pill row
- Looks: Horizontal row of large equal-width pill buttons spanning content width, about 44px tall, with generous horizontal padding; active segment filled, inactive segments transparent or muted; text labels only.
- Use when: Primary content filter with 3-6 categories at the top of a page, list, or dashboard where filtering is the main navigation task.
- Avoid when: Dense forms, sidebars, compact chart controls, narrow panels, or more than 6 categories.
- Build notes: Use 8px gaps; wrap or collapse to a menu on small screens; keep labels short; active state should be visible without colour alone.
- Seen in: 1 refs; domain:prediction-markets ×1, style:flat ×1

## icon-only-joined-group — Icon-only joined button group
- Looks: Group of joined square or rectangular buttons sharing borders, 28-36px tall; icon-only 14-18px; active button has lighter or accent fill; used in toolbars for mutually exclusive options.
- Use when: Toolbar properties such as text align, fill, layout mode, or compact view toggle where labels are unnecessary.
- Avoid when: Users need text labels, there are more than 5 options, or accessibility requires visible names without relying on tooltips.
- Build notes: Use role=group with aria-pressed on each button; provide tooltips and visible focus rings; avoid relying on icon shape alone for state.
- Seen in: 1 refs; domain:dashboard ×1, domain:design-system ×1, style:fluent ×1

## icon-over-label-segment — Icon-over-label segment
- Looks: Rounded container with 2-3 vertical segments; each segment has a 16-20px icon above a 12px label; selected segment is an inset or elevated pill; container may have a thin border.
- Use when: Top-level section switch with two or three options where icons aid recognition and the layout allows 56-72px height.
- Avoid when: Compact toolbars, more than 3 options, or when labels must remain scannable in a single line.
- Build notes: Stack icon and label with 4-6px gap; keep segment widths equal; active pill should have clear contrast or elevation, not only a tint.
- Seen in: 1 refs; domain:design-system ×1, style:glassmorphism ×1, style:liquid-glass ×1
