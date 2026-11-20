# Component: map

## inline-map-thumbnail — Inline map thumbnail
- Looks: Rounded ~300x120px map crop with roads, labels, and pin markers, rendered low-contrast as inline media inside a list row.
- Use when: Location context in tables, lists, cards, or directory rows where a full map would be too large.
- Avoid when: Tasks requiring pan/zoom, precise navigation, dense marker editing, or multiple interactive map controls.
- Build notes: Use static thumbnails in rows and open a full map on tap/hover; avoid in-row gestures that conflict with list scrolling.
- Seen in: 1 refs; domain:calendar-planner ×1, domain:calendar-productivity ×1, domain:productivity ×1, style:glassmorphism ×1, style:liquid-glass ×1

## route-metric-map — Route metric map
- Looks: Map canvas with rendered basemap or terrain, a dashed trajectory path with start/end dots, and edge-aligned metric callouts; optional expander control.
- Use when: Single route, GPS track, or location analytics where path segments and associated metrics are the main content.
- Avoid when: General map browsing, multi-marker search, or high-density route planning where many layers compete for attention.
- Build notes: Support path/callout selection, expand or zoom, and loading skeletons; anchor labels to path segments instead of floating freely.
- Seen in: 1 refs; domain:golf-scorekeeping ×1, domain:golf-sports ×1, style:glassmorphism ×1
