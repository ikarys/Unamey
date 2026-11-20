# UX: icons-actions

## icon-only-universal-actions — Icon-only for universal actions
- Looks: Use icon-only buttons only for close, menu, search, settings, notifications, account, expand, collapse, row overflow, and similar universal actions. Provide a tooltip, aria-label, and visible focus state. In dense inspectors, card footers, right-edge utility strips, and bottom navs, icon-only glyphs are acceptable only when the set is small, standard, and consistently placed.
- Use when: Space is limited and the meaning is widely known, especially in dense toolbars, card footers, utility rails, and mobile bottom navigation.
- Avoid when: The action is destructive, rare, domain-specific, or the icon is not part of a standard set.
- Build notes: Test icon recognition with users; if recognition is below about 80%, add a label.
- Seen in: 24 refs; style:glassmorphism ×10, style:flat ×8, domain:dashboard ×5, style:enterprise-classic ×4, domain:operations-dashboard ×3, style:bento ×3

## primary-action-hierarchy — Primary action hierarchy
- Looks: Use one primary action per region: solid, high contrast, larger, or more saturated than secondary controls, 36-40px height in desktop forms. Rank by fill, size, saturation, placement, and label weight. Avoid equal-weight rows, scattered chips, or low-weight primary links when a clear next step exists.
- Use when: The user must choose the main next action, especially in cards, dashboards, wizards, panels, and mobile bottom bars.
- Avoid when: The region has multiple equally important actions; promote one to primary and move others to secondary or overflow.
- Build notes: Place the primary action where the user's eye lands and keep it enabled when possible.
- Seen in: 21 refs; style:flat ×8, style:glassmorphism ×8, domain:dashboard ×4, style:enterprise-classic ×3, domain:operations-dashboard ×2, style:bento ×2

## status-icons-with-color-text — Status icons with color and text
- Looks: Pair status icons with a text label and a non-color cue: warning triangle plus Warning, error circle plus Error, check plus Done, dots for OK/attention, badges for counts, up/down arrows for direction or delta. Use consistent color semantics: red, amber, green, gray. Do not encode state by color, luminance, or a lone dot without adjacent text.
- Use when: The UI shows system, record, filter, unread, trend, completion, direction, or attention state.
- Avoid when: The state is subtle, informational, or the user has a color-vision deficiency; do not use color alone.
- Build notes: Keep icon and text in the same component and avoid animated status icons for persistent states.
- Seen in: 21 refs; style:flat ×12, style:glassmorphism ×5, domain:dashboard ×3, domain:operations-dashboard ×3, domain:analytics ×2, domain:business-dashboard ×2

## icon-label-by-default — Icon plus label by default
- Looks: Show an icon and a text label for all non-universal actions. Use a 16px icon with a 13-14px label in buttons, menus, and toolbars. In sparse or label-first interfaces, text labels and status dots may carry meaning without icons, but the label must remain the source of truth.
- Use when: The action is not instantly recognizable, the user may be new, the action is high-stakes, or the interface has no reliable icon set.
- Avoid when: The action is a universal, high-frequency control in a constrained space, such as close, menu, or search, and a tooltip is available.
- Build notes: Never rely on icon color or shape alone to explain the action; the label is the source of truth.
- Seen in: 15 refs; style:flat ×6, style:glassmorphism ×6, style:liquid-glass ×3, domain:design-tool ×2, style:enterprise-classic ×2, style:terminal ×2

## one-icon-one-meaning — One icon, one meaning
- Looks: Use the same icon for the same concept everywhere: trash for delete, gear for settings, download for export. Extend this to asset, brand, source, record-type, and metric identity glyphs: one glyph per coin, folder, file type, brand, category, or metric class. Do not reuse an icon for two meanings in the same product.
- Use when: The app has recurring actions, record types, assets, brands, sources, or metric categories across pages.
- Avoid when: A custom glyph is needed for a unique domain concept; in that case, define it in a style guide and test it.
- Build notes: Maintain an icon usage map and avoid swapping icons between versions without a migration note.
- Seen in: 13 refs; style:flat ×6, style:glassmorphism ×3, domain:business-dashboard ×2, domain:dashboard ×2, style:bento ×2, style:enterprise-classic ×2

## secondary-tertiary-overflow — Secondary, tertiary, and overflow actions
- Looks: Use outlined buttons for secondary actions, text buttons for tertiary actions, trailing chevron/text buttons for card-level detail, and a three-dot overflow or compact icon row for less frequent row actions. Keep destructive, critical, and daily actions visible; move only lower-priority actions into overflow.
- Use when: There are 3+ actions in a region, card footers, table rows, inspectors, or panels with limited space.
- Avoid when: The tertiary action is destructive, critical, or used daily; give it a visible label.
- Build notes: Order the overflow menu by frequency, separate destructive items, and keep the menu within the viewport.
- Seen in: 8 refs; style:flat ×4, style:glassmorphism ×3, domain:operations-dashboard ×2, style:bento ×2, domain:ai-agent-console ×1, domain:business-dashboard ×1

## standard-icon-metaphors — Standard icon metaphors
- Looks: Use widely recognized icons for standard actions: magnifier for search, plus for create, arrow/chevron for navigation or expand, bell for notifications, document for file, chart for analytics, swap arrows for reversal, QR for scan/receive, paper-plane for send, media transport glyphs for playback, and chevrons for collapsible sections. Keep line weight and fill consistent.
- Use when: The action is common and users already have a mental model, including micro-actions such as expand, swap, send, receive, and collapse.
- Avoid when: The action is domain-specific, ambiguous, or culturally loaded; use a label or a custom icon with a label.
- Build notes: Prefer outline icons for actions and filled icons for selected or active states when supported.
- Seen in: 7 refs; style:glassmorphism ×4, style:flat ×3, style:liquid-glass ×2, domain:ai-agent-console ×1, domain:component-library ×1, domain:design-system ×1

## disabled-vs-hidden — Disabled vs hidden
- Looks: Disable an action when it is relevant but not currently possible, and show a tooltip explaining why. Hide an action when it is not relevant to the current context or role. Use labeled toggles, steppers, locks, checkboxes, and radio controls for state; if a toggle, lock, checkbox, or radio has no label, add helper text or a tooltip.
- Use when: The user should understand the next required step, missing permission, missing precondition, locked state, or on/off state.
- Avoid when: The action will never apply to the current object, or the disabled state would confuse the user.
- Build notes: Keep disabled buttons focusable only if they provide useful explanation; otherwise use helper text.
- Seen in: 5 refs; style:flat ×2, domain:analytics ×1, domain:dashboard ×1, domain:design-system ×1, domain:finance ×1, domain:fintech-wallet ×1

## action-placement-conventions — Action placement conventions
- Looks: Place page-level actions in the top-right toolbar, form submit in the bottom-right, dialog actions in the bottom-right with cancel to the left of confirm, table actions in the table toolbar or row overflow, card-level add actions in the card top-right, row-level actions at the row end, card detail actions at the card bottom, and utility controls in a consistent right-edge strip.
- Use when: The layout follows standard business-app patterns and the user expects predictable action locations across pages, cards, rows, and wizards.
- Avoid when: The action is tied to a specific data region, the layout is a custom dashboard with task-based zones, or the action belongs to a selected object header.
- Build notes: Keep action placement consistent across screens and do not move the primary action between pages without a reason.
- Seen in: 2 refs; style:flat ×2, domain:industrial-planning ×1, domain:travel-booking ×1

## destructive-action-styling — Destructive action styling
- Looks: Style destructive or commit actions with a distinct treatment: red text, red outlined button, filled state-specific control such as STOP, confirmation dialog, and a clear label such as Delete, Cancel, Stop, or Publish. Push destructive or commit actions to the far right of dialog and toolbar action groups when they are not the sole next step.
- Use when: The action removes, overwrites, stops, publishes, or ends a record or workflow.
- Avoid when: The action is reversible with easy undo and low risk; use a normal secondary button with undo.
- Build notes: Use a confirmation dialog for high-risk actions and show the object name and impact in the dialog.
- Seen in: 2 refs; domain:design-system ×2, domain:dashboard ×1, style:fluent ×1, style:neumorphism ×1
