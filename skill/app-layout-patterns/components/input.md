# Component: input

## inset-icon-input — Inset icon input
- Looks: Rounded inset single-line field, 8px radius, ~38px tall, 1px border; placeholder 14px; optional leading icon 16-20px and optional trailing icon; focus can use a soft glow ring instead of a hard border swap.
- Use when: Standard email, name, message, or search fields in auth panels, forms, and chat sidebars.
- Avoid when: Multi-line composers, amount fields with steppers, oversized hero inputs, or compact pill filters.
- Build notes: Keep text 14-16px; add left padding when leading icon is present; use focus ring 2-4px and preserve disabled state.
- Seen in: 2 refs; domain:component-library ×1, domain:design-system ×1, domain:ui-kit ×1, style:glassmorphism ×1, style:neumorphism ×1

## pill-input — Pill input
- Looks: Fully rounded single-line field, ~30px tall, 1px soft border, filled slightly lighter than surface; available in full, half, and small widths; optional trailing circular icon-button 28-32px.
- Use when: Compact search, address, token, filter, or quick single-value inputs.
- Avoid when: Long multi-line text, amount entry with stepper, or fields that need a visible label hierarchy.
- Build notes: Inset icon buttons 4px from edge; placeholder 13px; keep one line only and avoid stacked labels.
- Seen in: 2 refs; domain:cryptocurrency ×1, domain:dashboard ×1, domain:ui-kit ×1, style:bento ×1, style:glassmorphism ×1

## composer-with-control-row — Composer with control row
- Looks: Multi-line rounded text area with placeholder; trailing Send text button and kebab menu icon; sits above a meta row containing select and toggle controls for model, mode, or options.
- Use when: Chat, prompt, ticket, or message composers where submit and mode settings are adjacent.
- Avoid when: Simple one-line inputs, form fields, amount entry, or dense table editing.
- Build notes: Textarea grows 1-3 lines; disable Send when empty; keep meta row controls 32px tall and aligned to field width.
- Seen in: 1 refs; domain:ai-agent-console ×1, style:flat ×1

## oversized-ghost-amount — Oversized ghost amount
- Looks: Small muted caps label above; very large numeric value line with caret; no visible box or underline; trailing circular send icon-button overlapping the right edge.
- Use when: Single-step payment, transfer, or allocation flows where amount is the primary input and submit is inline.
- Avoid when: Multi-field forms, compact back-office tables, or fields that need a visible boundary, label, or stepper.
- Build notes: Label 10-11px with tracking; circular button 36-40px; validate currency on blur and prevent negative values.
- Seen in: 1 refs; domain:cryptocurrency ×1, domain:dashboard ×1, style:bento ×1

## stepper-amount-field — Stepper amount field
- Looks: Label above a tinted rounded numeric field; trailing up/down stepper arrows; optional helper caption 12px muted under field; can sit in a two-column row with a reason or note field.
- Use when: Amount, quantity, budget, limit, or threshold entry where users adjust by discrete steps.
- Avoid when: Free-text fields, compact pill inputs, or oversized quick-send amount fields.
- Build notes: Stepper buttons 24-28px; enforce min/max/step; align baselines with adjacent fields; show helper only when validation needs it.
- Seen in: 1 refs; domain:fintech-wallet ×1, style:glassmorphism ×1
