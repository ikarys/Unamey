# Component: notification-toast

## stacked-panel-status-toast — Stacked panel status toast
- Looks: Full-width or panel-width horizontal bars/pills stacked vertically, rounded 6-8px, solid semantic tint, leading status icon, one-line message, trailing x dismiss.
- Use when: Multiple status messages need to appear in a panel corner or app region and users may need to clear them manually.
- Avoid when: Only one short auto-dismiss event is needed, or space is too narrow for stacked full-width rows.
- Build notes: Stack newest last or first, cap visible items, use aria-live, make x hit area at least 24px, do not rely on colour alone for state.
- Seen in: 3 refs; domain:dashboard ×2, domain:design-tool ×2, style:flat ×2, domain:design-system ×1, style:fluent ×1

## ephemeral-status-pill — Ephemeral status pill
- Looks: Single compact pill with leading circular status icon chip and one-line message, no close control, auto-dismiss.
- Use when: One transient success, info, or save confirmation that should not require user action.
- Avoid when: Multiple concurrent notifications, long messages, or cases where the user must keep the message visible.
- Build notes: Use role=status, auto-dismiss after 3-5s, keep text to one line, no dismiss button needed.
- Seen in: 1 refs; domain:design-system ×1, style:neumorphism ×1
