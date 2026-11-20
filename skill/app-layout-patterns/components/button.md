# Component: button

## standard-button-set — Standard action button set
- Looks: Filled primary, outline/ghost secondary, and text tertiary buttons; centered label, optional leading icon; heights ~24-40px, radius 4-8px; compact to standard density.
- Use when: Forms, toolbars, modal footers, list headers, and inline section actions where one main action plus lower-emphasis utilities are needed.
- Avoid when: The screen needs a single large CTA, an icon-only floating create action, or two state-dependent paired controls.
- Build notes: Keep one primary per view, give text actions at least 44px hit area, dim disabled state, and use a spinner only for async actions.
- Seen in: 7 refs; style:flat ×6, domain:ai-agent-console ×1, domain:analytics ×1, domain:crypto-wallet ×1, domain:dashboard ×1, domain:industrial-planning ×1

## trailing-affordance-button — Affordance button with trailing icon or count
- Looks: Label button with trailing chevron, arrow, filter icon, or numeric count badge; filled, outline, or ghost; height ~28-40px, radius 4-999px; compact to standard density.
- Use when: Dropdowns, menus, filter expanders, see-all list footers, card footers, and actions that need a count or disclosure affordance.
- Avoid when: Simple confirm, cancel, save, or submit actions where a trailing chevron would imply a menu that does not open.
- Build notes: Chevron and count must update with state, count badge needs right padding, focus ring should include the badge, and do not use leading icon plus trailing chevron to mean two separate actions.
- Seen in: 7 refs; style:flat ×3, domain:design-tool ×2, style:bento ×2, style:glassmorphism ×2, domain:banking ×1, domain:code-repository ×1

## pill-cta-button — Pill CTA button
- Looks: Fully rounded pill button with high-emphasis fill or outline; icon plus label; optional 1px border; heights ~36-48px; compact, full-width, or card-level sizes.
- Use when: Single dominant call-to-action on a page, card, header, auth flow, wallet connection, or upgrade prompt.
- Avoid when: Dense business toolbars, tables, modal footers, list rows, or screens with multiple same-weight primary actions.
- Build notes: Use one pill CTA per view, keep label 14-16px, leading icon 16-20px, and use full-width only for page- or card-level actions.
- Seen in: 5 refs; style:glassmorphism ×3, style:flat ×2, domain:ai-ops ×1, domain:component-library ×1, domain:design-system ×1, domain:fintech-wallet ×1

## floating-action-button — Floating action button
- Looks: Elevated button anchored to a viewport edge, card corner, or bottom bar; circular icon-only 48-56px or rounded pill 40-48px tall; drop shadow; single glyph or short label.
- Use when: Global create, submit, connect, or upgrade action that should persist across sections; one dominant action per screen.
- Avoid when: Dense tables, modal interiors, rows with many actions, or screens with multiple equal-weight primary actions.
- Build notes: Use one floating action per screen, hide it when the action is invalid, and do not pair it with an inline primary CTA of the same weight.
- Seen in: 3 refs; domain:calendar-planner ×1, domain:calendar-productivity ×1, domain:dashboard ×1, domain:finance ×1, domain:productivity ×1, style:flat ×1

## paired-state-button — Paired state buttons
- Looks: Two adjacent equal-width buttons for mutually exclusive states or choices; filled or tinted; height ~32-40px, small radius; common patterns are Start/Stop, Yes/No, Approve/Reject.
- Use when: Run/stop, play/pause, approve/reject, yes/no decisions, and system state toggles where the current state must be visible.
- Avoid when: More than two outcomes, independent actions, or when a segmented control, toggle, or single state button is clearer.
- Build notes: Only one visual state should look active, labels must not imply both can be clicked, keep widths equal, and show loading if the state change is async.
- Seen in: 2 refs; domain:ml-operations ×1, domain:prediction-markets ×1, style:flat ×1, style:terminal ×1

## quick-action-tile — Quick-action tile
- Looks: Rounded rectangular tile 60-200px wide; icon top-left, center, or above label; 13-14px label that may wrap to two lines; fixed sizes for grids; optional lit/unlit active state.
- Use when: Command palettes, shortcut grids, device controls, playback pads, and multi-select quick actions where icon-plus-label blocks are useful.
- Avoid when: Linear form actions, dense toolbars, single CTA flows, or table rows where standard buttons are more compact.
- Build notes: Use consistent tile sizes, maintain 8-12px gutters, make active state obvious, and keep labels to two lines maximum.
- Seen in: 2 refs; style:glassmorphism ×2, style:liquid-glass ×2, domain:audio ×1, domain:audio-mixing ×1, domain:quick-settings ×1, style:bento ×1

## list-row-action-button — List-row action button
- Looks: Small compact button 28-32px tall, right-aligned inside list rows or cards; ghost, outline, or low-emphasis fill; label or icon; pill or rounded rectangle shape.
- Use when: Per-row actions in tables and cards, such as like, share, open, quick edit, or row-level utility actions that should not compete with page primary actions.
- Avoid when: Page-level primary actions, destructive confirmations, or rows with many actions where an overflow menu is clearer.
- Build notes: Keep 8-12px spacing, hide the button when the row is not actionable, and use icon-only with a tooltip when the label is redundant.
- Seen in: 1 refs; domain:media-dashboard ×1, style:flat ×1

## stateful-loading-button — Stateful loading button
- Looks: Label button with optional trailing spinner; full state set includes default, hover, pressed, disabled, and loading; pill or rounded rectangle; compact height; disabled uses low contrast and no shadow.
- Use when: Async actions that need pending feedback, such as save, publish, connect, submit, or sync.
- Avoid when: Instant local actions, read-only controls, or screens where a global progress indicator is more appropriate.
- Build notes: Lock clicks while loading, preserve button width, use a 14-16px spinner, make disabled non-focusable, and restore the label on success or error.
- Seen in: 1 refs; domain:design-system ×1, style:neumorphism ×1
