# Component: modal

## form-modal-with-side-datepicker — Form modal with side date picker
- Looks: Centered create-record modal; header with title and close control, stacked form fields in the main body, right-side inline date-picker panel, footer with cancel/save buttons; drop shadow over backdrop.
- Use when: Creating or editing a record where a short form needs immediate selection of a date, range, or period alongside a few other fields.
- Avoid when: The form has many fields, the picker needs full width, the task is read-only, or the data entry is too complex for a modal; use a full page form or drawer.
- Build notes: Keep the picker panel narrow, around 200-260px, validate required fields, disable save until valid, and close the picker on save or cancel.
- Seen in: 1 refs; domain:industrial-planning ×1, style:flat ×1

## header-footer-dialog — Header-footer dialog
- Looks: Centered rounded dialog over a dimmed backdrop; separate title header bar, body content area, footer row with two buttons (secondary left, primary right); drop shadow separates it from the page.
- Use when: Short confirmations, detail views, prompts, and simple actions where content is brief and no complex input layout is needed.
- Avoid when: Multi-field forms, multi-pane content, or long scrollable content; use a form modal, drawer, or full page instead.
- Build notes: Trap focus, close on ESC/backdrop when safe, keep primary action visible, and preserve submitted state during async actions.
- Seen in: 1 refs; domain:design-system ×1, style:neumorphism ×1
