# Component: filter-bar

## compact-read-only-summary-bar — Read-only summary bar
- Looks: Single ~56px row with inline read-only values: origin, swap icon, destination, trip type, date range, passenger count, cabin class; thin vertical dividers; right-side green text+icon 'edit' action; light gray text on white.
- Use when: Show active search or booking parameters compactly above results when the user mostly reads the state and opens a full editor from one action.
- Avoid when: The user needs to change several filters directly in place, or there are many optional filters that would crowd one row.
- Build notes: Keep values non-editable; swap icon can toggle direction; Edit opens a modal or panel; use dividers instead of boxed inputs.
- Seen in: 1 refs; domain:travel-booking ×1, style:flat ×1

## inline-filter-select-bar — Inline filter select bar
- Looks: One compact horizontal row with a leading checkbox, multiple inline 'Label: value' selects, a trailing blue '+Add Filter' text button, and refresh/filter icon buttons; thin top/bottom hairline separators.
- Use when: Table or list view needs 3–6 quick direct filters and sorting visible at all times, with room to add one more inline control.
- Avoid when: The filter set is large, mobile-first, or requires grouped/cascading controls; use a drawer or side panel instead.
- Build notes: Each select updates results immediately; Add Filter reveals another select or opens a picker; keep the row compact and prevent wrapping.
- Seen in: 1 refs; domain:work-orders ×1, style:flat ×1
