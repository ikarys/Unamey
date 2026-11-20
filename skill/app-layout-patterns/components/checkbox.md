# Component: checkbox

## row-select-checkbox — Row selection checkbox
- Looks: 16 px checkbox in the first column of a list/table; master checkbox in the header plus one checkbox per row; compact spacing
- Use when: Bulk selection of table/list rows for actions such as export, delete, assign, or review
- Avoid when: Single-record selection, mutually exclusive choices, or read-only lists
- Build notes: Master checkbox checks all visible rows and shows indeterminate when partial; sync selection with the action bar
- Seen in: 2 refs; style:flat ×2, domain:analytics ×1, domain:business-dashboard ×1, domain:work-orders ×1

## square-checkbox — Square checkbox
- Looks: 16-18 px square input; adjacent text label to the right when used as an option; checked state shows a check glyph; label can be omitted in compact control rows
- Use when: Single binary choice in forms, sign-in options, or compact toolbar toggles
- Avoid when: Selecting multiple items, filter lists, or table bulk actions
- Build notes: Label click toggles; support checked, unchecked, disabled, and keyboard focus
- Seen in: 2 refs; domain:component-library ×1, domain:general ×1, domain:ui-kit ×1, style:enterprise-classic ×1, style:glassmorphism ×1, style:skeuomorphic ×1

## filter-count-checkbox — Filter checkbox with count
- Looks: 16 px checkbox, label, and trailing result count in parentheses; grouped under section headers with helper text; ~12 px row spacing
- Use when: Faceted filters or rule builders where each option shows how many items match
- Avoid when: Options have no stable count or the user only needs a plain toggle
- Build notes: Count updates as other filters change; disable options with no matches; no indeterminate state unless multi-select semantics apply
- Seen in: 1 refs; domain:travel-booking ×1, style:flat ×1
