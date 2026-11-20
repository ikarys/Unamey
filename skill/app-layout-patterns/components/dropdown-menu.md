# Component: dropdown-menu

## option-list-dropdown — Option list dropdown
- Looks: Floating rounded panel anchored below a trigger; left-aligned short text rows, 32–40px high; selected/active row uses a full-row tint; observed panels contain 4–5 options.
- Use when: Single-choice selects or menus with short labels, such as form fields, account settings, filters, and quick navigation menus.
- Avoid when: Options need icons, checkboxes, search, submenus, multi-line descriptions, or many rows that require scrolling and filtering.
- Build notes: Close on select, outside click, and Esc; support arrow keys, Enter, Home, End; cap visible height around 240px then scroll; keep disabled rows gray and non-selectable.
- Seen in: 2 refs; domain:design-system ×2, style:glassmorphism ×1, style:liquid-glass ×1, style:neumorphism ×1

## caret-trigger-menu — Caret trigger menu
- Looks: Open menu panel includes a visible top trigger row with label and right-aligned down-caret; below it are same-width option rows, e.g. about 120px wide, reusing the surrounding list row style.
- Use when: Menu buttons that must keep their label visible while open, compact action menus, disclosure menus in sidebars, toolbars, or table rows.
- Avoid when: The trigger should disappear after opening, options are long/searchable, or the control should behave like a standard form select.
- Build notes: Treat the trigger row as a control, not an option; rotate the caret when open; keep panel width at least trigger width; close on select and outside click.
- Seen in: 1 refs; domain:general ×1, style:enterprise-classic ×1, style:skeuomorphic ×1
