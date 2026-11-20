---
name: app-layout-patterns
description: Vocabulary and assembly method for BUSINESS APPLICATION interfaces (dashboards, back-office, admin, operations and desktop tools). Use when designing or building an app screen, choosing components, arranging panels, or picking a visual style. Not for marketing or landing pages.
---

# App layout patterns

A library of parts learned from real application screens: component variants, layout bricks and style axes. It is a set of proven suggestions, not a closed catalogue and not templates. Never copy one reference screen; assemble a screen from parts chosen for THIS project, and bring your own design knowledge wherever the library is thin or does not fit.

## Assembly method

UX decides, style follows. Work through these steps in order and write the result of each step down (a few lines) before writing code.

1. **Frame the job.** Who uses the screen, how often, and for what decision or action? List the data objects and actions it involves, with each object's shape (single value, value vs target, time series, ranked list, records with few or many fields, hierarchy, sequence of steps, schedule, geo, live device state, free text) and volume.
2. **Rank by importance.** Order objects and actions by how much the user needs them and how often (see `ux/hierarchy.md`). The top 1-3 items get the most prominent positions (top, left, largest); the primary action sits next to what it acts on. Nothing the user needs often goes below a long table or behind a scroll.
3. **Choose a representation per object, from its shape.** Use `ux/data-representation.md`: a value with a target is a gauge or progress, a sequence is a stepper or timeline, a schedule is a calendar, workflow states are a kanban, records with few fields are cards or a list. A table is for many records with many comparable fields, not a default.
4. **Choose the flow.** Use `ux/flows.md` for how the task unfolds: multi-step input → stepper, triage → master list + detail, quick edit → inline or drawer, rare details → progressive disclosure, destructive action → confirmation. Make what the flow hides or reveals actually work with the native, script-free patterns of `ux/interactions.md` (collapsible side column, accordion, popover menu, drawer, floating canvas actions, CSS tabs).
5. **Place by priority.** Pick the shell (`layouts/shells.md`) and region arrangement (`layouts/regions.md`) that give the ranked items of step 2 their positions. One dominant region, supporting ones smaller.
6. **Build each part from a variant.** Open `components/<type>.md` and pick the variant whose "Use when" matches. Make icons carry meaning and actions readable (`ux/icons-actions.md`). If no variant fits, adapt the closest one or design a new one from your own knowledge, and say so in your step notes.
7. **Fix the style axes once.** Pick one position per axis from `styles/axes.md` (density, depth, colour usage, radius, typography, iconography, charts) from the users and context, not from taste, and apply it everywhere. Unlisted positions and style families (Material 3, Fluent, Carbon, Swiss, brutalist, skeuomorphic...) are allowed when they suit the project; translate them into the same axes. One accent colour plus semantic status colours; colour carries meaning, not decoration. The brief's style tags bind: `accent:cool` means a blue, teal, cyan or violet accent, `accent:warm` a red, orange, amber or pink one, `theme:dark` a dark canvas; name the tag next to the colour you pick.
8. **Add the working details.** Real-looking data (no lorem), empty / loading / error states, hover and focus states, tooltips on icon-only buttons and truncated values, units on every number, keyboard reachability. The sample data must agree with the state the screen shows: if filters, tabs or a search are active, every visible row, card and count satisfies them; totals and counters match what they summarise.
9. **Check.** The top-ranked items are visible without scrolling; every component maps to an object or action from step 1 (delete the others); each object's representation matches its shape; the layout still works with 3x more data; every key action named in the brief has a visible control; the colours obey the style tags; the visible data obeys the active filters and the counts add up; every clickable element is obviously clickable at a glance. Fix what fails before writing the HTML, and say in this note what you fixed.

## Rules

- Prefer the variant that fits the data over the one that looks richest.
- Surfaces can be quiet, controls never are. Every clickable element must stand out from its background at a glance: primary actions in solid accent, secondary actions with a visible border and accent tint or text, the selected option of a segmented control or tab in solid accent (not a grey a few shades off white), clickable rows and cards with an icon, chevron or border plus a hover state. A disabled control says why next to it. If a user has to wonder where the buttons are, they leave.
- Library first, not library only: adapt sizes, density and anatomy to the project, and invent when the library has no good answer.
- Combine variants from different topics freely; tags such as `style:fluent` or `domain:devops` only tell where a variant was seen, not where it must be used.
- When the user names a style family (e.g. liquid glass, neumorphism), keep its traits on surfaces and chrome, never at the cost of text contrast or data legibility.
- Stack-agnostic: build with the project's framework and component library; the variants describe what to build, not which library.

## Library index

Open only the files you need for the current step.

**UX**
- [ux/data-representation.md](ux/data-representation.md) — 17 variants: Compact list for few fields, Progress/completion indicator, Status/state indicator, KPI card for single value, Time-series trend, Table for many comparable fields, Log console for text streams, Part-to-whole bar, Hierarchy tree and relation graph, Ranked comparison list, Calendar for schedules, Kanban for workflow states, Live device state tiles, Map for geo, Status board for many items, Stepper for process state, Value vs target bullet
- [ux/flows.md](ux/flows.md) — 10 variants: Progressive disclosure, Filters and search placement, Master list plus detail triage, Context and view-mode switching, Surface decision rules, Scoped create entry points, Feedback after actions, Bulk actions on selection, Stepper for multi-step input, Confirmation and undo for destructive actions
- [ux/hierarchy.md](ux/hierarchy.md) — 11 variants: Visual weight matches decision value, Central workspace with secondary rails, Frequency-based control placement, Priority placement, Flat equal card grid, Floating task overlay, Primary action next to object, Exceptions and alerts first, Sticky key actions and totals, Group by task, not data source, Summary before detail
- [ux/icons-actions.md](ux/icons-actions.md) — 10 variants: Icon-only for universal actions, Primary action hierarchy, Status icons with color and text, Icon plus label by default, One icon, one meaning, Secondary, tertiary, and overflow actions, Standard icon metaphors, Disabled vs hidden, Action placement conventions, Destructive action styling
- [ux/interactions.md](ux/interactions.md) — 9 variants, native HTML/CSS, no script: Collapsible side column, Accordion sections, Floating canvas actions, Expanding pill button, Popover menu, Drawer over content, CSS tabs, Toggle switch, Hover reveal row actions

**Layouts**
- [layouts/regions.md](layouts/regions.md) — 10 variants: Left nav split dashboard, Three-pane inspector shell, Card grid dashboard, Topbar asymmetric dashboard, Full-width stacked console, Filter rail results list, Floating action panel dashboard, Left nav filtered list, List detail inspector, Two-column panel widget
- [layouts/shells.md](layouts/shells.md) — 8 variants: Sidebar topbar, Top tab shell, Tree sidebar workspace, Icon rail shell, Sidebar KPI band, Sidebar right utility panel, Mobile header shell, Sidebar icon category bar

**Components**
- [components/activity-feed.md](components/activity-feed.md) — 2 variants: Icon-tile activity card, Timestamp status-edge list
- [components/avatar.md](components/avatar.md) — 7 variants: Circular user avatar, Avatar name row, Avatar stack with overflow, Avatar menu trigger, Brand logo avatar, Square avatar slot, Circular icon avatar
- [components/badge.md](components/badge.md) — 8 variants: Status dot pill, Text label chip, Compact state marker, Value/delta chip, Category chip set, Count badge, Icon stat tag, Progress callout pill
- [components/breadcrumb.md](components/breadcrumb.md) — 2 variants: Icon root page breadcrumb, Text segment breadcrumb
- [components/button.md](components/button.md) — 8 variants: Standard action button set, Affordance button with trailing icon or count, Pill CTA button, Floating action button, Paired state buttons, Quick-action tile, List-row action button, Stateful loading button
- [components/calendar.md](components/calendar.md) — 3 variants: Month grid picker, Horizontal date strip, Range status mini-calendar
- [components/card.md](components/card.md) — 10 variants: Dashboard tile card, Entity / project card, Operational module card, KPI metric card, Banner / media card, Callout / action card, Row card, Catalog media card, Status skeleton tile, Toolbar card
- [components/chart.md](components/chart.md) — 11 variants: Axis-less sparkline trend, Interactive crosshair trend chart, Categorical bar chart, Donut share chart, KPI-led trend card, Multi-series trend chart, Bubble value cluster, Leader-line hero annotation, Multi-chart panel, Stacked area band, Waveform status chart
- [components/checkbox.md](components/checkbox.md) — 3 variants: Row selection checkbox, Square checkbox, Filter checkbox with count
- [components/code-block.md](components/code-block.md) — 1 variants: Read-only numbered snippet
- [components/collapsible.md](components/collapsible.md) — 1 variants: Icon-label disclosure section
- [components/data-table.md](components/data-table.md) — 5 variants: Status cell table, Card managed table, File list table, Numeric variance table, Stateful row list
- [components/device-control.md](components/device-control.md) — 6 variants: Dial cluster control panel, Fader slider, Dual-thumb range slider, Rotary knob, Value stepper panel, Vertical position track
- [components/dropdown-menu.md](components/dropdown-menu.md) — 2 variants: Option list dropdown, Caret trigger menu
- [components/empty-state.md](components/empty-state.md) — 1 variants: Inset icon empty tile
- [components/filter-bar.md](components/filter-bar.md) — 2 variants: Read-only summary bar, Inline filter select bar
- [components/form.md](components/form.md) — 2 variants: Stacked label-above form, Settings control rows
- [components/gauge.md](components/gauge.md) — 9 variants: Single-arc KPI gauge, Embedded status gauge, Analog needle meter, Composite progress card, Hero ring KPI, Metric band row, Radial KPI tile, Segmented ring KPI, Side-readout dial
- [components/icon-button.md](components/icon-button.md) — 8 variants: Ghost icon button, Tinted icon button, Badge icon button, Floating icon button, Disclosure icon button, Labeled icon button, Micro icon button, Selected icon button
- [components/input.md](components/input.md) — 5 variants: Inset icon input, Pill input, Composer with control row, Oversized ghost amount, Stepper amount field
- [components/kpi-tile.md](components/kpi-tile.md) — 11 variants: Icon KPI tile, Multi-cell stat card, Number-first KPI tile, Progress target KPI tile, Gauge utilization KPI tile, Hero emphasis KPI tile, Trend chart KPI tile, Category accent KPI tile, Headline microstats tile, Inline meta stat strip, Threshold inline metric
- [components/list.md](components/list.md) — 9 variants: Data row list, Selection option list, Event task feed list, Metric status row list, Checklist control list, Grouped sectioned list, Metadata key-value list, Result card list, Metric matrix grid
- [components/map.md](components/map.md) — 2 variants: Inline map thumbnail, Route metric map
- [components/media-tile.md](components/media-tile.md) — 7 variants: Brand glyph tile, Virtual card face tile, Full-bleed image tile, Media control tile, Overlay CTA banner tile, Photo status tile, Thumbnail + caption tile
- [components/modal.md](components/modal.md) — 2 variants: Form modal with side date picker, Header-footer dialog
- [components/nav-rail.md](components/nav-rail.md) — 3 variants: Icon-only vertical rail, Floating icon pill rail, Horizontal topbar glyph rail
- [components/nav-sidebar.md](components/nav-sidebar.md) — 7 variants: Docked bottom-utility rail, Profile-header rail, Data-row metric rail, Grouped icon-label rail, Hierarchical tree-resource rail, Compact icon-profile rail, Searchable session-list rail
- [components/nav-top.md](components/nav-top.md) — 1 variants: Brand + text-link top nav
- [components/notification-toast.md](components/notification-toast.md) — 2 variants: Stacked panel status toast, Ephemeral status pill
- [components/pagination.md](components/pagination.md) — 1 variants: Prev/next chevron pair
- [components/popover.md](components/popover.md) — 2 variants: Chart detail list popover, Point annotation popover
- [components/process-flow.md](components/process-flow.md) — 1 variants: Node graph canvas
- [components/progress.md](components/progress.md) — 9 variants: Labeled linear progress, Segmented distribution bar, Range slider, Unlabeled visual progress, Goal percent tile, Groove scrollbar, Multi-metric slider band, Progress with breakdown list, Quota usage progress
- [components/radio-button.md](components/radio-button.md) — 1 variants: Circular radio button
- [components/search.md](components/search.md) — 7 variants: Rail list filter search, Leading-icon inline search, Trailing-icon search pill, Dual-icon search field, Inset no-icon search field, Search field with clear affordance, Search field with kbd hint
- [components/section-header.md](components/section-header.md) — 3 variants: Title with right-side action, Icon label underline header, Plain text section label
- [components/segmented-control.md](components/segmented-control.md) — 6 variants: Text track with active pill, Icon-left label segment, Borderless text tabs, Full-width category pill row, Icon-only joined button group, Icon-over-label segment
- [components/select.md](components/select.md) — 5 variants: Pill scoped filter select, Inspector grid select, Icon-leading toolbar select, Labelled field select, Ghost filter bar select
- [components/side-panel.md](components/side-panel.md) — 1 variants: Inspector rail
- [components/sparkline.md](components/sparkline.md) — 3 variants: Annotated line sparkline, Bar sparkline, Semantic delta line chip
- [components/status-bar.md](components/status-bar.md) — 1 variants: Right-packed system status strip
- [components/tabs.md](components/tabs.md) — 5 variants: Underline text tabs, Closable document tabs, Minimal text tabs, Pill tabs, Raised badge tabs
- [components/tag-chip.md](components/tag-chip.md) — 7 variants: Short-label tag chip, Metric pill, Filter/action chip strip, Text delta badge, Card footer meta row, Inline mono chip, Monogram tile
- [components/timeline.md](components/timeline.md) — 2 variants: Activity feed timeline, Gantt lane timeline
- [components/toggle.md](components/toggle.md) — 5 variants: Settings row switch, Pill switch, Boolean control group, Icon segmented toggle, Segmented text toggle
- [components/toolbar.md](components/toolbar.md) — 3 variants: Icon button strip, Bottom tab bar with FAB, Section selector header
- [components/tooltip.md](components/tooltip.md) — 1 variants: Chart hover tooltip
- [components/topbar.md](components/topbar.md) — 10 variants: Global app topbar, Workbench command topbar, Page title header, Screen title header, Search-led topbar, Breadcrumb topbar, Browser-style topbar, KPI header, Minimal status app chrome, Ops console topbar
- [components/tree.md](components/tree.md) — 2 variants: Asset Tree, Version File Tree

**Styles**
- [styles/axes.md](styles/axes.md) — 7 variants: Charts, Colour usage, Density, Depth, Iconography, Radius, Typography
