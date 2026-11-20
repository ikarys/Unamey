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
4. **Choose the flow.** Use `ux/flows.md` for how the task unfolds: multi-step input → stepper, triage → master list + detail, quick edit → inline or drawer, rare details → progressive disclosure, destructive action → confirmation.
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
