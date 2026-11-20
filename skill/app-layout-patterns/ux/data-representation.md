# UX: data-representation

## compact-list-for-few-fields — Compact list for few fields
- Looks: Use a dense list row with primary label on the left, 2-4 key fields inline, a status chip, and a chevron or action. Row height should be about 36-48px. Support grouped section headers, relative dates, long IDs/hashes with copy affordances, empty values as dimmed text, and a detail drawer or page for the full record.
- Use when: Records have few fields and the user scans, selects, filters, or drills into items.
- Avoid when: Records have many comparable fields, the user needs to sort multiple columns, or fields require long text.
- Build notes: Truncate text with tooltips and provide a detail drawer or page for the full record.
- Seen in: 27 refs; style:flat ×11, style:glassmorphism ×11, domain:dashboard ×3, domain:design-system ×3, domain:operations-dashboard ×3, style:bento ×3

## progress-completion-indicator — Progress/completion indicator
- Looks: Use a 4-8px horizontal bar with fill, a right-aligned % or used/total label, and an optional target tick. Use a 64-96px radial gauge only for one 0-100 value with a centered number. Show denominator, units, and state text; for many items, use one bar per row instead of a grid of identical gauges.
- Use when: The value is completion, capacity, utilization, budget, quota, goal, load, or progress from 0 to a known maximum.
- Avoid when: The user needs exact multi-series comparison, categorical composition, unbounded values, many target levels, or a plain KPI number is clearer.
- Build notes: Include used/total, over/under state with text, empty/0/100 states, and avoid interactive knobs on read-only bars; do not duplicate a bar and gauge for the same value.
- Seen in: 27 refs; style:flat ×10, style:glassmorphism ×10, domain:dashboard ×4, domain:operations-dashboard ×3, style:bento ×3, style:enterprise-classic ×3

## status-state-indicator — Status/state indicator
- Looks: Use an 8-12px dot plus 12-14px text label, a pill badge with text, a colored text label, or a small icon with an accessible label. Keep one state system per surface: same shape, color, text, and legend. On cards/tiles, place state in a consistent corner; on rows, place it after identity.
- Use when: The user needs to scan ready/blocked, online/offline, active/disabled, pass/fail, stale/healthy, selected/unselected, or unread states across many items.
- Avoid when: State is the only field and a full table/list is needed, the state requires long explanation, there are more than 5-6 states, or the control is an input choice rather than a read-only state.
- Build notes: Provide a legend, stale/loading states, keyboard focus and aria labels, avoid competing badge/text conventions, and do not rely on red/green alone.
- Seen in: 24 refs; style:flat ×8, style:glassmorphism ×8, style:bento ×4, domain:dashboard ×3, domain:design-system ×3, style:enterprise-classic ×3

## kpi-card-for-single-value — KPI card for single value
- Looks: Use one card per key metric with label, large value, unit, and small delta or target. Keep to 4-6 KPI cards in a row; use a compact strip if more are required. Sub-metric chips may be added only when they share the same unit and time range; keep chip text around 12px and avoid cramped footers.
- Use when: A single number summarizes health, volume, cost, utilization, or performance and the user needs it at a glance.
- Avoid when: The value is one of many comparable records, the metric needs contextual breakdown, or the card would hide exceptions.
- Build notes: Include time range, refresh time, and a drill-down target; avoid sparklines when the value is stale or misleading.
- Seen in: 21 refs; style:flat ×8, style:glassmorphism ×8, domain:dashboard ×3, style:enterprise-classic ×3, domain:business-dashboard ×2, domain:smart-home ×2

## time-series-trend — Time-series trend
- Looks: Use a line or area chart for values over time. Show axis labels, time range, current point, legend, and anomaly markers. For many series, use small multiples or a selectable series control. Support range tabs, crosshair tooltips, peak callouts, forecast bands, data gaps, and explicit timezone handling; do not use axis-less charts as data.
- Use when: The question is how a value changed over time and the data has regular timestamps.
- Avoid when: Data is sparse, unordered, categorical, or the user needs exact row-level inspection.
- Build notes: Support zoom, hover values, export, data gaps, and explicit timezone handling.
- Seen in: 16 refs; style:flat ×6, style:glassmorphism ×6, domain:dashboard ×2, style:bento ×2, style:terminal ×2, domain:ai-ops ×1

## table-for-many-comparable-fields — Table for many comparable fields
- Looks: Use a table when records have many comparable fields. Must-haves include sticky header, sortable columns, row selection, filter chips, density control, row expansion for details, and visible column ownership. Use one header row, not repeated column labels per card; support filter count badges, saved views, embedded date cells, and clear selected-row state.
- Use when: The user compares many records across many fields, exports data, applies bulk edits, or audits values.
- Avoid when: Only a few fields matter, the data is hierarchical, the data is a time series, or the user needs a single KPI.
- Build notes: Freeze key ID columns, put row actions in an overflow, and provide saved views for complex filters.
- Seen in: 12 refs; style:flat ×7, domain:dashboard ×3, domain:design-system ×2, domain:design-tool ×2, style:glassmorphism ×2, domain:analytics ×1

## log-console-for-text-streams — Log console for text streams
- Looks: Use a full-width monospace console area for raw logs, or a narrative event feed for actor/verb/timestamp rows. Keep chronological order, use icons or badges for event type, preserve selection and filters across updates, and separate raw output, narration, code blocks, and toasts visually. Virtualize long streams and pause follow when the user scrolls up.
- Use when: The user is diagnosing runtime behavior, ingesting event streams, reading service logs, checking import jobs, or reviewing diagnostic output where chronological text is the primary unit.
- Avoid when: The data is highly structured with many sortable dimensions, the user needs to edit entries, or the screen is a summary dashboard where a table of key metrics is more useful than raw logs.
- Build notes: Virtualize long logs, preserve selection and filters across updates, pause follow when the user scrolls up, and make line click actions such as copy, jump to source, or open detail context-aware.
- Seen in: 7 refs; style:flat ×6, domain:business-dashboard ×2, domain:design-tool ×2, domain:ai-agent-console ×1, domain:ai-ops ×1, domain:analytics ×1

## part-whole-bar — Part-to-whole bar
- Looks: Use stacked horizontal bars for composition when comparing categories. If only one total is needed, use a single stacked bar with labels and percentages. Donut/ring charts are acceptable only for 3-5 parts with a side legend showing names, percentages, and values; avoid unlabeled bars, bubble areas without scale, and decorative segments.
- Use when: The user needs to see how parts make up a total, such as cost, capacity, queue, inventory, or usage.
- Avoid when: There are more than 5-7 parts, parts are not mutually exclusive, or exact values are more important than composition.
- Build notes: Sort parts by size, show values in tooltips, and avoid 3D pies or decorative segments.
- Seen in: 7 refs; style:flat ×3, domain:dashboard ×2, style:glassmorphism ×2, domain:asset-management ×1, domain:calendar-planner ×1, domain:calendar-productivity ×1

## hierarchy-tree-and-relations — Hierarchy tree and relation graph
- Looks: Use an indented tree for parent-child data with expand/collapse, counts, path breadcrumbs, and per-type icons. Use a node-link graph only for many-to-many relationships, and provide a list fallback. Show change badges, file type context, and node context in a side panel, not only in tooltips.
- Use when: The data is naturally nested, such as folders, organizations, BOM, regions, or accounts, or relationships are the main question.
- Avoid when: The hierarchy is flat, the graph has more than about 30 nodes without a filter, or the user needs to edit many attributes.
- Build notes: Limit visible tree depth to 4-6 levels and show node context in a side panel, not only in tooltips.
- Seen in: 4 refs; style:flat ×3, domain:dashboard ×2, domain:ai-agent-console ×1, domain:design-system ×1, domain:design-tool ×1, domain:industrial-planning ×1

## ranked-comparison-list — Ranked comparison list
- Looks: Use a ranked list with rank number, item name, key metric, proportional bar, and delta. Limit visible ranks to 10-20; provide show all and sort controls. Label every trailing column and make the ranking basis explicit; do not rank by a hidden composite score without explanation.
- Use when: The user needs to identify best, worst, outliers, top contributors, or capacity hogs.
- Avoid when: Items are not comparable on one metric, ranking is arbitrary, or the user needs full multi-field editing.
- Build notes: Make the ranking basis explicit and do not rank by a hidden composite score without explanation.
- Seen in: 2 refs; domain:dashboard ×1, domain:golf-scorekeeping ×1, domain:golf-sports ×1, style:glassmorphism ×1, style:material ×1

## calendar-for-schedules — Calendar for schedules
- Looks: Use a month/week/day calendar with a 60-80px time gutter, hour grid, and event blocks sized to start/end times. For multiple resources, use resource columns with one calendar lane per person, team, machine, or room. Events show title, time, owner, and conflict state; provide month/week/day toggle, today button, drag-to-move, resize handle, and a compact side panel for new/edit details.
- Use when: The primary task is planning time slots, appointments, shifts, meetings, reservations, or capacity across dates and resources, especially when start/end times and overlaps matter.
- Avoid when: The data is only deadlines without time slots, a long historical list, a project timeline with dependencies, or a read-only report where a table would be faster to scan.
- Build notes: Handle time zones explicitly, validate conflicts before save, show overlapping events with clear color or offset stacking, and support keyboard creation and editing of events.
- Seen in: 0 refs

## kanban-for-workflow-states — Kanban for workflow states
- Looks: Use a horizontal board with columns representing workflow states, each column showing a name, count, and optional WIP limit. Cards should be 240-320px wide with title, owner avatar, priority, due date, and a small state badge. Dragging moves items between states; column totals update immediately. Clicking a card opens a right-side drawer or modal detail pane, not a full page navigation.
- Use when: Work items move through a small number of visible states, such as To Do, In Progress, Review, Blocked, Done, and the user needs to see queue health, bottlenecks, and current ownership at a glance.
- Avoid when: There are more than 8-10 states, the user needs to compare many fields, sort by multiple columns, audit history, or the data is primarily numeric/reporting data.
- Build notes: Enforce drop rules by role or workflow state, show validation errors on invalid moves, keep cards accessible with keyboard move actions, and provide an empty state with the next expected action.
- Seen in: 0 refs

## live-device-state-tiles — Live device state tiles
- Looks: Use a responsive grid of 220-320px device tiles, each with device name/ID, a status dot or badge, one primary metric, one compact control, and a last-update timestamp. Controls can be a toggle for power, a slider for setpoint, a small gauge for load, or a button for restart. Clicking a tile opens a detail drawer with more metrics, controls, history sparklines, and actions. Show stale, error, and loading states on the tile, not only in the detail view.
- Use when: The user monitors and controls many live devices, machines, sensors, edge nodes, or IoT assets, and needs to see current state plus a quick action without opening each item.
- Avoid when: The main need is historical analysis, high-frequency raw telemetry, a large sortable table of metrics, or a read-only inventory list with no live control value.
- Build notes: Refresh via polling or websocket with visible last-update time, mark data stale after a threshold, use optimistic updates with rollback for controls, and restrict controls by permission and device health.
- Seen in: 0 refs

## map-for-geo — Map for geo
- Looks: Use a map as the dominant left or center panel when location is the main way to orient the user. Pins represent records; clusters appear at low zoom with counts and expand on zoom. Pair the map with a right-side list of the same records; selecting a pin highlights the list row, selecting a row centers the pin, and filters apply to both. Keep a compact map toolbar for zoom, locate, basemap, and layer toggles.
- Use when: Position is essential to the decision, such as field technicians, stores, delivery zones, assets on a site, incident locations, or route planning, and the user needs spatial context to act.
- Avoid when: Coordinates are secondary metadata, the list is larger than the map can explain, the user needs dense tabular comparison, or the screen is a mobile detail view where a map adds noise.
- Build notes: Debounce map moves and filter changes, sync list and map selection with stable IDs, show cluster thresholds clearly, and provide a table fallback for exports or accessibility.
- Seen in: 0 refs

## status-board-for-many-items — Status board for many items
- Looks: Use a grid of compact status cards or a board with columns by state. Each card shows identity, state, owner, age, and one key action. Use color plus text for state.
- Use when: The user monitors many independent items such as devices, jobs, tickets, accounts, or live systems and needs to spot failures quickly.
- Avoid when: Items require detailed side-by-side comparison, the list is very long, or state is the only meaningful field.
- Build notes: Provide filters, sorting, and a detail view; do not make the board the only place full data is visible.
- Seen in: 0 refs

## stepper-for-process-state — Stepper for process state
- Looks: Place a horizontal stepper above the working panel for 3-7 ordered stages; each step has a 28-32px node, label, and state: completed check, current highlight, upcoming neutral, blocked red with reason tooltip. For 8+ steps, long approvals, or narrow screens, use a vertical stepper with a sticky current-step card. The step panel shows only the active step's form or details; do not show all steps as one long form.
- Use when: The user must move through a sequence of stages, such as onboarding, checkout, approval, import wizard, provisioning, or case intake, and needs to know where they are, what is complete, and what is blocked.
- Avoid when: The data is a flat list of independent records, a historical audit trail, a Gantt-like schedule, or a process with many parallel branches that cannot be reduced to a clear linear path.
- Build notes: Persist current step, disable or gate forward navigation by validation, allow return to completed steps only when editing is allowed, and include keyboard focus, aria-current, and visible blocked reasons.
- Seen in: 0 refs

## value-target-bullet — Value vs target bullet
- Looks: Use a bullet chart with one bar for actual, a vertical line for target, and optional bands for poor, acceptable, and good. Show numeric actual and target beside the chart.
- Use when: The user must judge a value against a goal, quota, budget, SLA, plan, or threshold.
- Avoid when: There is no target, the target changes by record without explanation, or the comparison is categorical rather than numeric.
- Build notes: Keep the target visible even when actual is far off; do not use gauges when precise values matter.
- Seen in: 0 refs
