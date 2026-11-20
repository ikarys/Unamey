# Component: icon-button

## ghost-icon-button — Ghost icon button
- Looks: Borderless icon-only button, 16-32px glyph in a 24-40px hit area; no background, no border until hover; monochrome stroke; used for search, plus, kebab, gear, settings, and toolbar glyphs.
- Use when: Secondary actions in topbars, card headers, list rows, and toolbars where visual weight must stay low and labels are not needed.
- Avoid when: Primary CTA, dense data grids needing strong targets, or actions that must be obvious without hover/focus cues.
- Build notes: Keep at least 32px tap target, add tooltip/aria-label, show hover/focus ring, and avoid adding fill for secondary actions.
- Seen in: 11 refs; style:flat ×7, domain:analytics ×2, domain:dashboard ×2, style:glassmorphism ×2, domain:ai-agent-console ×1, domain:business-dashboard ×1

## tinted-icon-button — Tinted icon button
- Looks: Single centered outline glyph on a tinted rounded square or circle, 28-56px; fill may be solid, translucent, or accent-colored; no text label.
- Use when: Standard action units in dashboards, currency/view controls, card actions, topbar utility buttons, and quick-action tiles.
- Avoid when: Very dense tables where tinted tiles consume space, or primary CTA that needs a text button.
- Build notes: Use one neutral tint for resting states, accent for active/primary, keep 8-12px padding, and do not rely on colour alone for state.
- Seen in: 9 refs; style:glassmorphism ×7, style:bento ×3, domain:ui-kit ×2, style:liquid-glass ×2, domain:component-library ×1, domain:cryptocurrency ×1

## badge-icon-button — Badge icon button
- Looks: Icon-only button with a small red dot or count badge at the top-right; base button is 24-32px ghost or filled.
- Use when: Notifications, alerts, unread counts, and pending items in topbars, account menus, and operations dashboards.
- Avoid when: Actions without persistent state, or when a dot would be mistaken for a toggle or status control.
- Build notes: Badge should not be a separate button unless the count is actionable, cap counts at 99+, hide when zero, and preserve the main hit area.
- Seen in: 2 refs; domain:ai-ops ×1, domain:healthcare-dashboard ×1, style:flat ×1, style:glassmorphism ×1

## floating-icon-button — Floating icon button
- Looks: Single circular button 48-64px, often a plus glyph, positioned to float over a card corner, panel bottom, or nav rail edge.
- Use when: Primary quick-create action anchored to a summary panel, card, or empty state; standalone CTA without a full-width button.
- Avoid when: Multiple primary actions on one screen, dense data views, or actions that should sit adjacent to related controls.
- Build notes: Add elevation/shadow, keep a 24px safe inset, do not stack more than one floating CTA per region, and provide a focus ring.
- Seen in: 2 refs; style:glassmorphism ×2, domain:banking ×1, domain:crypto-wallet ×1, domain:dashboard ×1, domain:finance-dashboard ×1

## disclosure-icon-button — Disclosure icon button
- Looks: Icon-only button with a trailing chevron to indicate it expands a menu, drawer, or panel; 24-32px glyph, ghost fill, chevron aligned right or down.
- Use when: Topbar account/notifications entries, settings links, collapsible sections, and menu triggers where expansion direction matters.
- Avoid when: Plain actions with no expanded state, or when a kebab already owns overflow for the same target.
- Build notes: Include chevron in the hit target, set aria-expanded, rotate/translate on open, and keep metrics consistent with ghost buttons.
- Seen in: 1 refs; domain:work-orders ×1, style:flat ×1

## labeled-icon-button — Labeled icon button
- Looks: Icon above a short text caption, usually a circular or rounded tile with a 40-56px icon area; often used in equal-spaced 4-up rows.
- Use when: Card quick actions, dashboard shortcuts, wallet operations, and feature entry points where a label improves discoverability.
- Avoid when: Compact toolbars, dense lists, or icon-only utility clusters where captions create clutter.
- Build notes: Keep labels to 1-2 words, center icon and text, maintain a full touch target including the label, and avoid text wrapping.
- Seen in: 1 refs; domain:banking ×1, domain:finance-dashboard ×1, style:glassmorphism ×1

## micro-icon-button — Micro icon button
- Looks: Very small 16-24px square or tile with one glyph, often flat or beveled, no label.
- Use when: Scrollbar arrows, pagination micro-controls, inline toggles, and tiny utility buttons inside compact widgets.
- Avoid when: Primary actions, touch-first mobile UIs, or contexts where a 24px minimum hit area is required.
- Build notes: Use only where users expect tiny controls, extend the hit area to 24px where possible, and keep glyphs 12-14px.
- Seen in: 1 refs; domain:general ×1, style:enterprise-classic ×1, style:skeuomorphic ×1

## selected-icon-button — Selected icon button
- Looks: Icon button that shows a selected/on state with a tinted background and accent icon; inactive state is bare or faint; rounded square 32-40px.
- Use when: View-mode toggles, navigation rail items, filter active states, steppers, and on/off controls represented by icons.
- Avoid when: One-shot actions, destructive actions, or contexts where multiple selected states need labels for clarity.
- Build notes: Use aria-pressed or aria-current, keep selected contrast high, and group related selected states as one control when possible.
- Seen in: 1 refs; domain:iot ×1, domain:smart-home ×1, style:flat ×1
