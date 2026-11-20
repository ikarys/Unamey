# UX: hierarchy

## visual-weight-matches-decision-value — Visual weight matches decision value
- Looks: Use size, contrast, and position to encode importance. Critical numbers get the largest type and highest contrast; supporting metadata gets smaller, muted text. Avoid equal-weight cards for unrelated items.
- Use when: The screen supports a decision where one metric, state, or exception changes the user's next action.
- Avoid when: The screen is a neutral record view where all fields have equal review value.
- Build notes: Do not rely on color alone; combine size, position, label, text state, and iconography. Marketing heroes, decorative photos, 3D metaphors, promo cards, and unlabeled charts should not out-weigh the data or action they support.
- Seen in: 38 refs; style:flat ×16, style:glassmorphism ×13, domain:dashboard ×5, style:bento ×4, style:enterprise-classic ×4, style:liquid-glass ×4

## central-workspace-secondary-rails — Central workspace with secondary rails
- Looks: The center content canvas is the largest region and the visual anchor. Left navigation/tree and right inspector/detail rails are narrower, lower-contrast, and secondary. Top bars may carry global controls but should not dominate the data canvas. Active rail items use a clear highlight, not a full-weight panel.
- Use when: The user's main task is inspecting, editing, monitoring, or composing content in a central canvas, while navigation, properties, presence, logs, or quick commands are supporting context.
- Avoid when: Navigation is the primary task, the screen is a single form, or a rail contains decisions, alerts, or actions that must be read before the center content.
- Build notes: Keep rails collapsible, label icons, and prevent toasts, inspector cramping, or decorative rails from out-weighing the center work surface.
- Seen in: 21 refs; style:flat ×9, style:glassmorphism ×6, style:enterprise-classic ×4, domain:business-dashboard ×2, domain:dashboard ×2, domain:design-system ×2

## frequency-based-control-placement — Frequency-based control placement
- Looks: Put frequently used controls in the header, toolbar, or object summary. Put rarely used settings in an overflow menu, page settings, or a dedicated screen. Order by task frequency, not alphabetically.
- Use when: The tool is used daily and has a stable set of high-frequency actions such as filter, export, assign, view history, or duplicate.
- Avoid when: Usage data is new, the action is role-specific, or hiding it would make the task path unclear.
- Build notes: Keep one obvious fallback path for hidden controls and log usage before moving actions.
- Seen in: 19 refs; style:flat ×8, style:glassmorphism ×8, domain:dashboard ×3, domain:design-tool ×2, domain:operations-dashboard ×2, style:bento ×2

## priority-placement-top-left-larger — Priority placement
- Looks: Place the most important item in the top-left area, top band, or center hero and make it the largest, first element. For a page, start with a one-line status, then the key object state, then the primary action, then supporting data. A single hero metric may be full-width or centered when it is the only first read.
- Use when: The screen has one main answer, such as current status, approval state, top task, primary metric, current hole, balance, roster size, or active monitoring state.
- Avoid when: Items are equally important, the user needs a flat record scan, or making one item larger would hide other required information.
- Build notes: Keep the top item visible without expansion and do not rotate it based on arbitrary UI decoration.
- Seen in: 13 refs; style:glassmorphism ×7, style:flat ×5, style:bento ×3, domain:dashboard ×2, style:liquid-glass ×2, domain:calendar-planner ×1

## flat-equal-card-grid — Flat equal card grid
- Looks: A regular grid of same-size cards, tiles, dials, or component specimens with no enlarged hero, no dominant KPI, and no clear first object. Content is presented as peers, often in rows, bento cells, or catalog groups.
- Use when: The content is a peer set of equally weighted items, such as a component catalog, device list, record browse, or specimen sheet where no single item should dominate.
- Avoid when: The user must make one decision, monitor one primary metric, scan for exceptions, or complete a task; a dominant item, KPI, alert band, or section header is needed.
- Build notes: If one item must be prioritized, break equality with size, position, badge, selection elevation, or section labels; add search/filter for catalogs.
- Seen in: 12 refs; style:glassmorphism ×5, style:bento ×3, style:flat ×3, domain:design-system ×2, domain:operations-dashboard ×2, style:liquid-glass ×2

## floating-task-overlay — Floating task overlay
- Looks: A small elevated panel, drawer, FAB, toast stack, CTA, or edit badge floats above the main canvas to mark the active task or transient state. It outranks background content by elevation, shadow, saturation, or overlap.
- Use when: The user is in the middle of one transaction, send/receive, file detail, publish, create, edit, or toast-driven state while background dashboard context should remain visible.
- Avoid when: The overlay hides filters, selectable items, key controls, chart tabs, or more than a small portion of data; use an inline panel, drawer, sticky bar, or dedicated screen instead.
- Build notes: Keep overlays compact, preserve background context, avoid stacked toasts, and do not put edit badges on every tap target.
- Seen in: 9 refs; domain:dashboard ×4, style:glassmorphism ×4, style:bento ×2, style:flat ×2, style:liquid-glass ×2, domain:asset-management ×1

## primary-action-next-to-object — Primary action next to object
- Looks: Put the main verb for the selected object in the same visual group as the object header, status, and key facts. Use one primary button with secondary actions nearby or in an overflow.
- Use when: The page is centered on one record, device, ticket, order, case, or workflow item.
- Avoid when: The page contains many objects and the action applies to a selection, or the action is rare and should be hidden.
- Build notes: Disable only when preconditions are missing and explain why with helper text or tooltip.
- Seen in: 9 refs; style:flat ×6, domain:asset-management ×1, domain:code-repository ×1, domain:developer-tools ×1, domain:healthcare-dashboard ×1, domain:hr-management ×1

## exceptions-and-alerts-first — Exceptions and alerts first
- Looks: Put errors, risks, blocked items, unresolved exceptions, and aging items in a top band, left column, or dedicated queue before normal data. Order by severity: blocking, high, medium, low.
- Use when: The user is operating, monitoring, approving, or resolving work and must notice problems before normal records.
- Avoid when: All items are normal, the page is a historical report, or the alert is informational with no required action.
- Build notes: Each exception should show owner, age, severity, and an actionable link or action. Do not bury the only negative signal in a normal list, KPI footer, welcome card, or icon badge without a visible path to resolution.
- Seen in: 8 refs; style:flat ×5, style:terminal ×2, domain:ai-agent-console ×1, domain:ai-ops ×1, domain:analytics ×1, domain:asset-management ×1

## sticky-key-actions-and-totals — Sticky key actions and totals
- Looks: Keep page-level totals, active filters, and the main submit/save action visible while scrolling. Use a top sticky bar for totals/filters and a bottom sticky action bar for long forms.
- Use when: The screen contains a long table, long form, long log, or long checklist where the user must act while reviewing content.
- Avoid when: The page is short, the sticky bar would hide important content, or on mobile it would collide with the keyboard.
- Build notes: Preserve focus and scroll position when the sticky element appears.
- Seen in: 5 refs; style:flat ×5, domain:ai-agent-console ×1, domain:analytics ×1, domain:business-dashboard ×1, domain:industrial-planning ×1, domain:travel-booking ×1

## group-by-task-not-source — Group by task, not data source
- Looks: Organize sections around user tasks such as approve, resolve, assign, inspect, or reconcile. A task group can combine fields from multiple systems, APIs, or tables.
- Use when: The workflow uses data from several sources but the user completes one business outcome.
- Avoid when: The user is debugging a data source, comparing raw exports, or needs source-level provenance as the primary view.
- Build notes: Keep source metadata visible as a small label, tooltip, or detail field when mixed data may cause ambiguity.
- Seen in: 0 refs

## summary-before-detail — Summary before detail
- Looks: Show a compact summary block above details with totals, counts, deltas, constraints, current state, scope, mode, period, filters, or search summary. Put details below as expandable sections, tables, tabs, drawers, lists, or charts. The summary can be a KPI band, resource strip, status strip, or editable context header.
- Use when: The user first needs to know whether a record, queue, device, process, search scope, portfolio, machine, or period is healthy, blocked, unusual, or correctly scoped before reading detail.
- Avoid when: The detail is the only content, the page is a single-field edit, or a summary would duplicate the same data.
- Build notes: Summary values must update after edits and provide a clear path to the detailed source.
- Seen in: 0 refs
