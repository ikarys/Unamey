# Component: form

## stacked-label-above-input — Stacked label-above form
- Looks: Single-column form in a panel, modal, or side sheet. Each field has a small label above the input; 11px labels are observed. Text inputs and selects with chevrons, helper captions under fields. When calculating amounts, add a summary row such as Commission | Total directly above a full-width primary button.
- Use when: Quick data entry in modals, side panels, payment/commission setup, or any compact form where fields are mostly text/selects and one CTA submits.
- Avoid when: Settings pages dominated by toggles/segments, dense side-by-side grids, long multi-section documents, or when calculated totals belong in a separate live summary panel.
- Build notes: Keep one column, use helper text only for constraints/examples, place the summary row after the last field and before the CTA, and use a full-width button in compact panels.
- Seen in: 2 refs; domain:fintech-wallet ×1, domain:industrial-planning ×1, style:flat ×1, style:glassmorphism ×1

## settings-control-rows — Settings control rows
- Looks: Card-wrapped form with heading and helper subtitle. Stacked rows with label on the left and control on the right: toggle, segmented control, short text input, or select. Row/section spacing about 16px. Labels have no visible field borders; inputs are inset. Ends with a CTA button.
- Use when: Preferences, permissions, workspace or account settings where most controls are toggles, segments, short text, or selects and changes are saved together.
- Avoid when: Long descriptions, multi-line notes, complex calculated data entry, or forms with many required fields where label-above is clearer.
- Build notes: Group related controls, keep control edges aligned, use immediate save or an explicit CTA, and disable the CTA until dirty if needed.
- Seen in: 1 refs; domain:component-library ×1, domain:ui-kit ×1, style:glassmorphism ×1
