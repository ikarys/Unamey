# Component: tag-chip

## short-label-tag-chip — Short-label tag chip
- Looks: Rounded-rect or pill chip with a short 1–3 word label, 10–12px text. Solid tinted fill or neutral 1px border; optional '+N' overflow chip. No icons required.
- Use when: Categorizing entities, marking status, or enumerating model/feature tags on cards and list rows.
- Avoid when: Labels exceed one short phrase, the chip is a selectable control, or the value is numeric/metric.
- Build notes: Cap visible tags with +N overflow, keep color non-sole meaning, and add accessible label text.
- Seen in: 4 refs; style:flat ×3, domain:ai-ops ×1, domain:calendar-planner ×1, domain:calendar-productivity ×1, domain:dashboard ×1, domain:design-tool ×1

## metric-pill — Metric pill
- Looks: Small pill, 10–12px text, tinted fill, leading icon or arrow plus a short value, signed amount, temperature, or count.
- Use when: Inline secondary metrics in KPI tiles, table status markers, telemetry rows, or compact delta display next to a value.
- Avoid when: Space is extremely tight and a background-free delta is clearer, or the chip needs to carry a long sentence.
- Build notes: Use semantic green/red for positive/negative, keep one value per pill, and align with adjacent numeric value.
- Seen in: 3 refs; style:glassmorphism ×2, domain:analytics-dashboard ×1, domain:fintech-wallet ×1, domain:home-automation ×1, domain:smart-home ×1, style:enterprise-classic ×1

## filter-action-chip-strip — Filter/action chip strip
- Looks: Horizontal single row of equal pill chips, 11–12px text, even gaps; text-only or with a small leading icon. Full radius with border or tinted fill.
- Use when: Quick category filtering, view switching, or quick actions directly under a topbar or inside a toolbar.
- Avoid when: The list is long enough to wrap, the chips are passive labels, or each option needs a complex state.
- Build notes: Treat as selectable controls, show one selected state, and prevent wrapping on narrow widths by scrolling or reducing options.
- Seen in: 2 refs; style:glassmorphism ×2, domain:component-library ×1, domain:operations-dashboard ×1, domain:ui-kit ×1, style:bento ×1

## text-delta-badge — Text delta badge
- Looks: Background-free colored text token, 8–12px, containing a signed number, parenthetical amount, and optional up/down arrow.
- Use when: Appending balance, delta, or change to list rows and table cells where a pill would add visual noise.
- Avoid when: The value needs strong emphasis, is the primary content, or must be visually separated from the label.
- Build notes: Right-align in row, use green/red semantics, and ensure contrast in light and dark themes.
- Seen in: 2 refs; domain:cryptocurrency ×1, domain:dashboard ×1, domain:finance ×1, style:bento ×1, style:flat ×1

## card-footer-meta-row — Card footer meta row
- Looks: Low-emphasis card footer row with a hairline separator, an icon+label meta chip, a semantic status text, and a chevron expand link on the right.
- Use when: Card footers that show secondary attributes, availability/warning state, and a single 'details' action.
- Avoid when: The footer contains multiple primary actions, a form field, or the meta content is the main data.
- Build notes: Keep chip and text gray/low contrast, reserve red/green for alerts, and make the chevron an accessible expand button.
- Seen in: 1 refs; domain:travel-booking ×1, style:flat ×1

## inline-mono-chip — Inline mono chip
- Looks: Small rounded dark or tinted pill with monospace text, used inline within a sentence to highlight a code token.
- Use when: Marking identifiers, paths, variables, or commands inside prose, docs, or configuration descriptions.
- Avoid when: The content is a normal UI label, a status, or a user-entered free-text value.
- Build notes: Use a mono font at slightly smaller size than body text and keep the surface subtle so prose stays readable.
- Seen in: 1 refs; domain:ai-agent-console ×1, style:flat ×1

## monogram-tile — Monogram tile
- Looks: Square tinted tile, about 36px, sharp corners, no border, containing a 2-character monogram in dark text.
- Use when: Compact entity identity marker beside a card title, team name, model name, or account row.
- Avoid when: A photo avatar, long name, or icon is required, or the identity needs to be a primary interactive target.
- Build notes: Generate initials from the entity name, keep fixed square size, and provide an accessible label.
- Seen in: 1 refs; domain:ml-operations ×1, style:terminal ×1
