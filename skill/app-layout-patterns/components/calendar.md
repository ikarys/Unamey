# Component: calendar

## month-grid-picker — Month grid picker
- Looks: Weekday header row plus 6x7 day grid; day cells about 28px; out-of-month days dimmed; optional header with month label and left/right chevrons; selected day shown by dot, fill, or ring; event markers shown as small corner dots.
- Use when: Choosing a single date, stepping through months, or showing a compact month overview in forms, schedulers, and back-office filters.
- Avoid when: When users need per-day event details, many visible events per day, or a large range editor.
- Build notes: Support single-date selection, range selection, disabled dates, current-day indicator, and month stepping; keep mobile cells at least 40px.
- Seen in: 2 refs; domain:design-system ×1, domain:finance ×1, style:flat ×1, style:glassmorphism ×1, style:liquid-glass ×1

## horizontal-date-strip — Horizontal date strip
- Looks: Single-row horizontal date list showing a limited number of day numbers; selected day is a rounded pill; header shows year and month; optional detail card below shows month label, large day number, and one-line description.
- Use when: Mobile or narrow layouts where users choose one day and then view that day's summary, appointment, or status.
- Avoid when: When users need to scan a full month, compare many dates, or select a range without horizontal navigation.
- Build notes: Keep the selected pill visually distinct, allow horizontal scrolling if needed, and bind the detail card to the selected date.
- Seen in: 1 refs; domain:calendar-planner ×1, domain:calendar-productivity ×1, domain:productivity ×1, style:glassmorphism ×1, style:liquid-glass ×1

## range-status-mini-calendar — Range status mini-calendar
- Looks: Inline month grid about 140px wide; weekday header; small day cells; selected or status days use filled colors; current day uses an outline; no text labels inside day cells.
- Use when: Sidebars, dashboards, or compact pickers where the main task is selecting a date range or seeing status by day.
- Avoid when: When users need readable event names, day-level details, or precise date text inside the grid.
- Build notes: Render contiguous range fills, distinguish selected state from today state, and provide accessible non-color state via labels or tooltips.
- Seen in: 1 refs; domain:industrial-planning ×1, style:flat ×1
