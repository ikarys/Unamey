# Component: toolbar

## icon-button-strip — Icon button strip
- Looks: Horizontal row of equal icon-only buttons with no text labels; 24-32px hit targets and 8-12px spacing; buttons may be outline-bordered or borderless ghost.
- Use when: Card footer actions, record-level utilities, or compact inline view controls such as back, forward, and zoom.
- Avoid when: When actions require first-time discoverability, labels are needed, or more than 6-8 actions are needed in one row.
- Build notes: Use tooltips and aria-labels, group related actions, support hover/focus/disabled states, and align the strip to the edge of its container.
- Seen in: 2 refs; domain:design-tool ×1, domain:ui-kit ×1, style:flat ×1, style:glassmorphism ×1

## bottom-tab-fab-bar — Bottom tab bar with FAB
- Looks: Bottom navigation strip with 3-5 evenly spaced icon tabs and a reserved centre slot for an elevated FAB; active tab uses stronger weight or colour, inactive tabs stay muted.
- Use when: Mobile app navigation where primary destinations are tabs and the main create/action button belongs in the centre.
- Avoid when: Desktop dashboards, dense back-office layouts, or when the main action is better placed in a top toolbar.
- Build notes: Keep tab count low, prevent FAB overlap with tabs, reserve the centre gap, and use state changes rather than size alone to mark the active tab.
- Seen in: 1 refs; domain:calendar-planner ×1, domain:calendar-productivity ×1, domain:productivity ×1, style:glassmorphism ×1, style:liquid-glass ×1

## section-selector-header — Section selector header
- Looks: Full-width header row with a left section label and a right bordered select for the active item; separated from content by 1px top/bottom hairlines; compact height around 32-40px.
- Use when: Dashboards or back-office panels where the user needs to switch sections and choose which record/entity is currently being viewed.
- Avoid when: When the selected item is already shown in a page title, or when the row needs multiple action buttons instead of a selector.
- Build notes: Bind the select to the current item, keep the label non-interactive, provide disabled state when no items exist, and keep the row visually distinct from content below.
- Seen in: 1 refs; domain:ml-operations ×1, style:terminal ×1
