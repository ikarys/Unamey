# Component: progress

## labeled-linear-progress — Labeled linear progress
- Looks: Single 3–6px rounded track with a filled portion and a text value (%, ratio, or count) placed above, left, or right. Can be as thin as a 2px underline inside cards.
- Use when: One scalar value needs to show completion, utilization, or quota in a card, list row, or KPI tile.
- Avoid when: The value is already large and readable and the bar would only duplicate it, or when a multi-part breakdown is needed.
- Build notes: Keep track low-contrast, fill high-contrast, and value adjacent; add aria-valuenow/aria-valuemin/aria-valuemax for accessibility.
- Seen in: 6 refs; style:flat ×4, domain:dashboard ×2, domain:design-tool ×2, domain:analytics ×1, domain:design-system ×1, domain:hr-management ×1

## segmented-distribution-bar — Segmented distribution bar
- Looks: One horizontal 6–12px pill bar split into contiguous proportional segments, with an optional dot/swatch legend below showing category names and percentages.
- Use when: A total must be broken into shares, such as storage by type, traffic by channel, VRAM by component, or yes/no outcome ratio.
- Avoid when: Only one value is changing, or the categories are too many to compare at a glance.
- Build notes: Segments must sum to 100%; use a legend for more than two segments; provide text labels for accessibility.
- Seen in: 3 refs; domain:code-repository ×1, domain:developer-tools ×1, domain:ml-operations ×1, domain:prediction-markets ×1, style:enterprise-classic ×1, style:flat ×1

## range-slider — Range slider
- Looks: Thin 4–6px horizontal track with a filled portion up to a 16px round thumb; may include min/max icon glyphs instead of numeric labels.
- Use when: The user must set a continuous value, such as brightness, threshold, volume, or level.
- Avoid when: The value is read-only, exact input is better served by a number field, or many precise values are needed.
- Build notes: Support keyboard arrows, drag, and screen-reader value announcement; show tooltip or value label when precision matters.
- Seen in: 2 refs; style:glassmorphism ×2, domain:quick-settings ×1, domain:ui-kit ×1, style:bento ×1, style:liquid-glass ×1

## unlabeled-visual-progress — Unlabeled visual progress
- Looks: Very thin 3–4px track with a filled portion and no numeric label; used as a secondary magnitude cue under a number or caption.
- Use when: The exact value is already shown elsewhere and the bar only adds a quick visual magnitude.
- Avoid when: The user needs to read the value from the bar itself, or precision matters.
- Build notes: Do not rely on color alone; pair with a visible numeric value nearby and keep the bar subordinate to the primary data.
- Seen in: 2 refs; domain:crypto-wallet ×1, domain:dashboard ×1, domain:design-system ×1, style:glassmorphism ×1, style:neumorphism ×1

## goal-percent-tile — Goal percent tile
- Looks: Card or tile with a large percentage number, a slim progress bar underneath, and a short caption label.
- Use when: KPI goal cards where the percent is the headline and the bar reinforces progress.
- Avoid when: Dense dashboards need many metrics, or the percent is not the primary value.
- Build notes: Use large type for the percent, small bar, and concise caption; avoid adding more than one secondary value per tile.
- Seen in: 1 refs; domain:banking ×1, domain:finance-dashboard ×1, style:glassmorphism ×1

## groove-scrollbar — Groove scrollbar
- Looks: Horizontal and/or vertical recessed groove with a raised beveled thumb; vertical variant may have arrow icon-buttons at ends; thumb length around 30% of track.
- Use when: Desktop-style scroll regions, canvas panes, tables, or content panes where scroll position should be visible and draggable.
- Avoid when: Showing task completion, progress state, or data magnitude; use a progress bar instead.
- Build notes: Do not reuse as a status indicator; keep thumb draggable, show arrows only when needed, and hide in overlay mode if the app supports it.
- Seen in: 1 refs; domain:general ×1, style:enterprise-classic ×1, style:skeuomorphic ×1

## multi-metric-slider-band — Multi-metric slider band
- Looks: One card containing 3–4 aligned columns; each column has a label, a value with optional delta, and a 4px track with a 16px knob.
- Use when: Several related metrics or settings need side-by-side comparison and adjustment in a compact panel.
- Avoid when: Only one metric is being edited, or the columns require long labels and detailed controls.
- Build notes: Align baselines strictly; use consistent knob size; keep delta text small and secondary; allow independent interaction per column.
- Seen in: 1 refs; domain:dashboard ×1, style:material ×1

## progress-with-breakdown-list — Progress with breakdown list
- Looks: Label row, progress bar with value, then a short list of 2–4 related items with leading icon, label, and value.
- Use when: Overall completion or health depends on several visible sub-items, such as onboarding, requirements, or checklist status.
- Avoid when: The sub-items are numerous, unrelated, or would be better shown in a table.
- Build notes: Keep the list to a few rows; each row should be actionable or diagnostic; the bar should reflect the aggregate state.
- Seen in: 1 refs; domain:analytics-dashboard ×1, style:enterprise-classic ×1, style:glassmorphism ×1

## quota-usage-progress — Quota usage progress
- Looks: Thin horizontal bar under an exact caption such as “39 044 / 240 000 (16%)”, often in mono, with an optional trailing kebab/overflow menu.
- Use when: Storage, API calls, seats, credits, or other limited resources where raw used/limit values matter.
- Avoid when: Only a percentage is meaningful and exact counts would clutter the interface.
- Build notes: Show used/limit, not just percent; include overflow actions for alerts, reset, or settings; warn near threshold.
- Seen in: 1 refs; domain:ai-agent-console ×1, style:flat ×1
