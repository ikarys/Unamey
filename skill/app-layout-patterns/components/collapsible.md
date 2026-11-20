# Component: collapsible

## icon-label-disclosure-section — Icon-label disclosure section
- Looks: Compact toggle header row with leading status icon, mono or short label, and trailing chevron; thin hairline above/below header; expanded body contains code-block logs, terminal output, or key:value state lines.
- Use when: Back-office or operations UI needs to expose command output, logs, service state, or debug details under a short status label.
- Avoid when: Content is long-form, heavily scanned, or users need persistent visibility without repeated expansion.
- Build notes: Make header a button with aria-expanded, rotate chevron on open, keep body compact and monospaced, use status icon colour for success/error states.
- Seen in: 1 refs; domain:ai-agent-console ×1, style:flat ×1
