# UX: flows

## progressive-disclosure — Progressive disclosure
- Looks: Show the minimum fields needed for the current decision. Reveal advanced fields behind Advanced, More options, overflow menus, collapsible sections, See all links, expand-in-place cards, detail links, or dropdown option lists. Keep required fields and primary actions visible.
- Use when: The task has common and expert paths, the full form has more than 8-10 fields, or secondary actions would crowd the main view.
- Avoid when: All fields are required, the user is an expert who needs all fields, or hiding fields changes the meaning of the action.
- Build notes: Do not hide validation errors; if a hidden field is invalid, reveal it and focus it. Use overflow menus for secondary actions, not the primary task action.
- Seen in: 21 refs; style:flat ×12, style:glassmorphism ×5, style:enterprise-classic ×3, domain:business-dashboard ×2, domain:dashboard ×2, domain:design-tool ×2

## filters-search-placement — Filters and search placement
- Looks: Put global search and key filters in the page header or above the list. Put record-level filters, sort controls, and time-range controls in the table/chart toolbar. Use a persistent filter sidebar for complex result sets, embed time-range tabs in the chart they affect, and use a global period selector only when it rescales every panel.
- Use when: The user narrows a large dataset before scanning, triaging, comparing, or acting.
- Avoid when: The dataset is small, filters are rarely used, or the page is a single detail view.
- Build notes: Preserve filter state across navigation, debounce search, show active filters as removable chips, and avoid multiple competing period controls for the same data.
- Seen in: 20 refs; style:flat ×10, style:glassmorphism ×7, domain:dashboard ×4, domain:analytics ×2, domain:operations-dashboard ×2, style:bento ×2

## master-detail-triage — Master list plus detail triage
- Looks: Use a list, tree, category rail, selector, or summary card grid on one side and a detail/center pane for the selected item. For dashboard overviews, use self-contained summary cards with chevrons or drill-in targets; for tables, expose one dominant row action or detail chevron.
- Use when: The user works through a queue, inbox, monitoring list, catalog, room grid, device grid, session list, or dashboard cards and inspects one item or section at a time.
- Avoid when: The list has fewer than 5 items, the detail requires full-width space, or the user needs to compare multiple items side by side.
- Build notes: Preserve selection, provide next/previous shortcuts and keyboard selection, show an empty state, and use card drill-in for read-only summaries instead of opening full pages for every card.
- Seen in: 20 refs; style:flat ×10, style:glassmorphism ×5, domain:dashboard ×3, domain:operations-dashboard ×3, domain:design-tool ×2, domain:smart-home ×2

## context-view-switcher — Context and view-mode switching
- Looks: Use a persistent left rail, top tab strip, segmented control, header toggle, icon row, or paging dots to switch major app context, role, section, category, layout mode, or comparable view. Keep the active context visible and do not treat it as a record-level filter.
- Use when: The user moves between dashboard sections, roles, device categories, grid/list layouts, wallet/account pages, or top-level repository areas without leaving the app.
- Avoid when: The control is a one-off data filter, belongs inside a single form, or switching it should discard unsaved work without warning.
- Build notes: Persist the selected context, show one active state, support collapse/keyboard access where relevant, and keep global search or quick actions available across contexts.
- Seen in: 18 refs; style:glassmorphism ×7, style:flat ×5, domain:dashboard ×4, style:enterprise-classic ×4, domain:analytics-dashboard ×1, domain:asset-management ×1

## surface-decision-inline-drawer-modal-page — Surface decision rules
- Looks: Use inline controls for one field or low-risk state toggle, a drawer for multi-field non-blocking edits, a modal for a short decisive action, and a full page for complex tasks. For object-specific actions, pre-fill a scoped overlay from the selected card; for dashboard state, use immediate toggles, sliders, or tool switches in place.
- Use when: The edit scope, risk, context-loss requirement, and selected-object pre-fill determine the surface.
- Avoid when: The task is long, needs many tools, or the user must leave the current context; do not use a modal for a full workflow.
- Build notes: Match surface to data size: one field/toggle inline, 3-8 fields drawer, 1-2 fields modal, 10+ fields page; require explicit save for named profiles or multi-field changes.
- Seen in: 14 refs; style:flat ×6, style:glassmorphism ×4, style:bento ×3, domain:dashboard ×2, domain:smart-home ×2, style:terminal ×2

## scoped-create-entry — Scoped create entry points
- Looks: Place add/create controls where the user is: global + in header/sidebar, + per card/widget/list section, dashed empty-state tile, list-footer add row, mobile FAB, or header add button. Contextual entries should pre-fill the target collection, object type, or parent scope.
- Use when: Users regularly add records to specific lists, dashboards, wallets, rooms, devices, budgets, projects, or tool cards.
- Avoid when: Creation is rare, high-risk, requires a long setup flow, or the screen already has multiple competing unlabeled + controls.
- Build notes: Prefer one global entry plus clearly scoped contextual entries; open the editor with scope prefilled; label create actions and avoid redundant duplicate entry points.
- Seen in: 9 refs; style:flat ×4, style:glassmorphism ×3, domain:dashboard ×2, domain:smart-home ×2, domain:ai-ops ×1, domain:analytics ×1

## action-feedback-toast-inline — Feedback after actions
- Looks: Use inline status for field-level changes, toasts for global actions that do not change the current view, progress bars for long operations, and state-dependent buttons for current system state. Show loading spinners on in-flight actions and encode state in the action row, such as enabling Start while disabling Stop.
- Use when: The user performs an action and needs confirmation, progress, or current-state feedback without leaving the screen.
- Avoid when: The action is silent and not user-initiated, or the result is already visible directly in the UI.
- Build notes: Auto-dismiss toasts after 4-6 seconds, keep destructive toasts longer, disable in-flight controls, and show a clear success or failure state after completion.
- Seen in: 3 refs; domain:crypto-wallet ×1, domain:dashboard ×1, domain:design-tool ×1, domain:ml-operations ×1, style:flat ×1, style:glassmorphism ×1

## bulk-actions-on-selection — Bulk actions on selection
- Looks: Use per-row checkboxes or a select-all control when batch operations are possible. Show a bulk action bar as soon as the selection is non-empty, with count, enabled actions, and clear selection. For list management, use Add/Clear all controls when the list itself is the batch object.
- Use when: The user applies the same operation to many records, such as assign, tag, approve, export, delete, add, or clear criteria.
- Avoid when: Actions require per-record input, the selection is large and heterogeneous, or the operation is destructive without review.
- Build notes: Show a result summary after the action, use a progress indicator for long jobs, and do not leave visible checkboxes without an action path when selection is intended.
- Seen in: 3 refs; style:flat ×3, domain:ai-agent-console ×1, domain:analytics ×1, domain:business-dashboard ×1, domain:work-orders ×1

## stepper-wizard-for-multistep — Stepper for multi-step input
- Looks: Use a horizontal stepper with numbered steps, current step, completed steps, and a persistent back/next bar. For guided intro or onboarding, use a swipe carousel with pagination dots and one final CTA. Validate per step and show a summary before submit.
- Use when: The task has 3-7 distinct phases, each with a clear subset of fields and a review point, or the app needs a short guided introduction.
- Avoid when: The form is short, steps are arbitrary, users need to jump freely, or the data is mostly read-only.
- Build notes: Preserve state when moving back, mark optional steps, avoid step changes that delete data without warning, and allow skip plus completion persistence for onboarding carousels.
- Seen in: 2 refs; domain:calendar-planner ×1, domain:calendar-productivity ×1, domain:industrial-planning ×1, domain:productivity ×1, style:flat ×1, style:glassmorphism ×1

## destructive-confirm-undo — Confirmation and undo for destructive actions
- Looks: For low-risk destructive actions, execute immediately and show a visible undo toast for 5-10 seconds. For high-risk actions, use a confirmation dialog that names the object and consequence, then provide undo if possible. For dismissible non-data elements, allow inline close without undo when the item is not critical data.
- Use when: The action deletes, archives, cancels, overwrites, removes an item, or dismisses a non-critical panel/promo.
- Avoid when: The action is non-destructive, the data cannot be restored, or the user needs a multi-step approval workflow.
- Build notes: Disable the destructive button while processing and show a clear success or failure state after completion.
- Seen in: 1 refs; domain:media-dashboard ×1, style:flat ×1
