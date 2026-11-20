# Component: search

## rail-list-filter-search — Rail list filter search
- Looks: Full-width input pinned to the top of a sidebar or rail, 36px tall, leading magnifier icon, muted placeholder, placed directly above the list it filters.
- Use when: Navigation, contact, file, session, or project lists where search narrows only the visible list in the same rail.
- Avoid when: Search should open a global command palette, show cross-app results, or affect content outside the rail.
- Build notes: Filter the list on keystroke, keep focus inside the rail, show a no-match state within the list, and avoid opening unrelated overlays.
- Seen in: 6 refs; style:flat ×4, domain:dashboard ×3, domain:design-tool ×2, domain:ai-agent-console ×1, domain:asset-management ×1, domain:design-system ×1

## leading-icon-inline-search — Leading-icon inline search
- Looks: Single-line rounded input, 36-40px tall, 230-260px wide or container-width, leading 16px magnifier icon, muted placeholder, no trailing action.
- Use when: General text search in a topbar, filter row, or content area where the query is the main control and no extra actions are needed.
- Avoid when: The field needs a clear button, keyboard hint, submit icon, or is a narrow local list filter that should be treated separately.
- Build notes: Debounce input, show an empty-results state, support Esc to clear, and keep the leading icon non-clickable unless it has an action.
- Seen in: 3 refs; style:flat ×2, domain:ai-ops ×1, domain:community-app ×1, domain:hr-management ×1, style:glassmorphism ×1

## trailing-icon-search-pill — Trailing-icon search pill
- Looks: Rounded pill input, 36-40px tall, placeholder left, magnifier icon on the right edge, no leading icon; borderless surface or subtle 1px border.
- Use when: Topbar or toolbar search where the left text area should stay uncluttered and the icon can serve as a visual submit cue.
- Avoid when: Search is in a narrow rail, needs a leading icon for recognition, or already has a clear button or keyboard hint.
- Build notes: Make the icon non-blocking for text entry, allow click to focus or submit, and keep the icon hit area at least 24px.
- Seen in: 3 refs; style:flat ×2, domain:fintech-wallet ×1, domain:iot ×1, domain:smart-home ×1, domain:work-orders ×1, style:glassmorphism ×1

## dual-icon-search-field — Dual-icon search field
- Looks: Long rounded input spanning about 30% of a row, with leading and trailing icon slots and placeholder text between them.
- Use when: Search needs both a leading type indicator and a trailing action such as submit, filter, open, or clear.
- Avoid when: Only one control is needed, because two icons add noise and reduce usable input width.
- Build notes: Reserve stable icon hit areas, do not let icons shrink the text area below about 120px, and label icon buttons for accessibility.
- Seen in: 1 refs; domain:operations-dashboard ×1, style:bento ×1, style:glassmorphism ×1

## inset-no-icon-search-field — Inset no-icon search field
- Looks: Wide sunken inset input about 380px x 34px, left-aligned placeholder, no magnifier icon or trailing action; recessed surface with a darker top edge and lighter bottom edge.
- Use when: Dense toolbars where adjacent menu or action controls already explain the row and search can be a quiet text slot.
- Avoid when: Search is the only control in the row, discoverability matters, or users need an explicit search affordance.
- Build notes: Keep the placeholder explicit, add a visible focus border, and do not rely on inset shading alone for state.
- Seen in: 1 refs; domain:general ×1, style:enterprise-classic ×1, style:skeuomorphic ×1

## search-field-with-clear-affordance — Search field with clear affordance
- Looks: Rounded pill input with a leading magnifier icon and a small inline clear “x” button at the right; clear appears only when the query is non-empty.
- Use when: Persistent search box where users often need to reset the query with one click.
- Avoid when: The query is ephemeral, always empty, or the field already has a trailing submit icon or keyboard hint.
- Build notes: Hide clear when empty, clear text on click while keeping focus, and support Backspace clearing.
- Seen in: 1 refs; domain:ui-kit ×1, style:glassmorphism ×1

## search-field-with-kbd-hint — Search field with kbd hint
- Looks: Rounded rectangular input about 230px wide and 36px tall, leading magnifier icon, placeholder text, and a trailing keyboard-shortcut chip such as “/” with a 1px border.
- Use when: Desktop or global search where users expect a keyboard shortcut to focus the field.
- Avoid when: Mobile-first UIs, tight toolbar spaces, or when no global shortcut is available.
- Build notes: Make the chip non-editable, focus the field on the registered shortcut, and prevent the chip from intercepting input clicks.
- Seen in: 1 refs; domain:code-repository ×1, domain:developer-tools ×1, style:enterprise-classic ×1
