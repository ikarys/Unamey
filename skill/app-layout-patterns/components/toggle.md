# Component: toggle

## settings-row-switch — Settings row switch
- Looks: Row with left-aligned label, optional leading 16-24px icon, optional live value/metric, and trailing 36-40px pill switch; label can also trail the switch in compact rows; rows use dividers or card padding.
- Use when: Settings panels, property inspectors, feature flags, device controls where each boolean has a named row.
- Avoid when: Dense toolbars, inline labels beside an input, exclusive mode selection, or many independent booleans that fit a compact control group.
- Build notes: Make whole row clickable only if the switch is the sole action; keep switch on right, truncate labels, support disabled rows, section headers with summary values; semantic colors only for meaningful states.
- Seen in: 6 refs; domain:design-system ×2, domain:smart-home ×2, style:glassmorphism ×2, domain:component-library ×1, domain:dashboard ×1, domain:fintech-wallet ×1

## pill-switch — Pill switch
- Looks: 36x18px to 40x22px rounded track with circular thumb; thumb left for off, right for on; on fill accent/semantic color, off muted track. May have adjacent text label.
- Use when: Independent boolean on/off in settings, device cards, toolbar controls.
- Avoid when: Choice among mutually exclusive modes, multi-select, or when state needs a named row/section grouping.
- Build notes: Use switch role, keyboard toggle, disabled state, focus ring; keep thumb visible in off; glow/glass are style, not state.
- Seen in: 3 refs; style:glassmorphism ×2, domain:audio ×1, domain:audio-mixing ×1, domain:system-monitoring ×1, domain:ui-kit ×1, style:bento ×1

## boolean-control-group — Boolean control group
- Looks: Compact inspector group mixing pill switch, square checkbox with tick, and small icon toggle buttons in a row; controls share 12-16px spacing and baseline alignment.
- Use when: Property panels with multiple independent booleans or mixed control types, such as enabled flag, checked list item, and icon tool toggles.
- Avoid when: Exclusive selection, a single setting, or uniform lists that are clearer as a settings row list.
- Build notes: Keep each control independently toggleable, label or tooltip each control, provide disabled states, avoid mixing more than 2-3 control types in one cluster.
- Seen in: 1 refs; domain:dashboard ×1, domain:design-tool ×1, style:flat ×1

## icon-segmented-toggle — Icon segmented toggle
- Looks: Rounded track containing 2+ icon buttons in a row or 2-column grid; active cell highlighted with fill/outline; icons 16-20px, cells 28-32px; may sit beside an independent on/off pill switch.
- Use when: Formatting, alignment, layout mode, or compact toolbar state selection where icons are clearer than text.
- Avoid when: Simple on/off, long labels, many options without grouping, contexts requiring visible text.
- Build notes: Use exclusive radio behavior, tooltips for icons, visible active state, 4px gaps, group related icons in rows/columns.
- Seen in: 1 refs; domain:design-tool ×1, style:flat ×1

## segmented-text-toggle — Segmented text toggle
- Looks: Two or more pill buttons with text labels in a shared rounded track; selected segment filled/tinted, unselected dim; no sliding thumb; small radius.
- Use when: Mutually exclusive modes, permission levels, filter views such as Normal/Dangerous.
- Avoid when: Independent booleans, option sets larger than 3, icon-only controls.
- Build notes: Implement as radio/segmented group, arrow-key selection, equal min widths, high-contrast selected state, disabled segments.
- Seen in: 1 refs; domain:ai-agent-console ×1, style:flat ×1
