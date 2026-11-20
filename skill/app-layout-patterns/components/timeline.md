# Component: timeline

## activity-feed-timeline — Activity feed timeline
- Looks: Vertical rail with icon nodes per entry; left relative time labels, center icon, right heading and subtext; optional 1px separators and a trailing user/profile entry.
- Use when: Audit trails, notifications, latest updates, user activity, and event logs where each item is a discrete timestamped event.
- Avoid when: Data requires showing duration, parallel tracks, dependencies, or dense schedule comparisons.
- Build notes: Use load more/pagination, relative time refresh, hover actions or overflow menus, empty state, and day grouping when spans are long.
- Seen in: 1 refs; domain:analytics ×1, domain:business-dashboard ×1, style:flat ×1

## gantt-lane-timeline — Gantt lane timeline
- Looks: Horizontal row lanes with a top time axis, vertical dotted gridlines, small left labels, and filled horizontal duration blocks; compact rows with lane dividers.
- Use when: Operations scheduling, task duration tracking, maintenance windows, production schedules, and plans where start/end time and overlap are the key data.
- Avoid when: Entries are unordered events without start/end durations, or the view needs a simple chronological list.
- Build notes: Support hover tooltips, selection, drag/resize handles if editing, snapping to time units, horizontal overflow scroll, and separate planned vs actual segments.
- Seen in: 1 refs; domain:industrial-planning ×1, style:flat ×1
