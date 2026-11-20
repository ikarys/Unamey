# Component: nav-rail

## icon-only-vertical-rail — Icon-only vertical rail
- Looks: Fixed left column 56–72px wide with 36–48px square icon buttons, no text labels; optional top utility button or logo row; active item marked by a 2px left tick or ring around the tile and a brighter icon.
- Use when: 3–10 top-level app sections in desktop/web back-office tools, when horizontal space is constrained and users already recognize the icons.
- Avoid when: First-use apps with unknown icon meanings, more than 10 sections, strong accessibility needs for visible labels, or small screens where 36px targets are too small.
- Build notes: Use 44px minimum touch targets, tooltips on hover, aria-labels, and a persistent active section; optionally support collapse/expand to a labeled sidebar.
- Seen in: 2 refs; domain:community-app ×1, domain:cryptocurrency ×1, domain:dashboard ×1, style:bento ×1, style:glassmorphism ×1

## floating-icon-pill-rail — Floating icon pill rail
- Looks: Detached vertical rounded container with 4–6 circular 40–48px icon slots, one accent-filled active icon, and an optional bottom circular add button; overlays the content edge instead of pushing layout.
- Use when: Quick context actions over a canvas, dashboard, or editor, with a small set of modes/tools where permanent navigation would compete with the data view.
- Avoid when: Primary app navigation with many destinations, dense back-office screens needing stable layout, or contexts where the overlay blocks important content.
- Build notes: Anchor to an edge with 8–12px margin, keep it above canvas layers, ensure 44px hit areas, add tooltips, and close on outside click if it is temporary.
- Seen in: 1 refs; domain:banking ×1, domain:finance-dashboard ×1, style:glassmorphism ×1

## horizontal-topbar-glyph-rail — Horizontal topbar glyph rail
- Looks: Horizontal row of 3–6 category glyph cells in the topbar, about 48px per cell, monochrome outline icons, active item marked by a 2px underline.
- Use when: Few top-level sections or tabs in a wide business app, category switching at the top of the page, and layouts where a vertical rail is unnecessary.
- Avoid when: Many sections, deep navigation hierarchies, mobile widths with limited horizontal room, or screens where the topbar is already crowded with filters and actions.
- Build notes: Place in the topbar left/center, align the active underline with the icon, keep 44px tap areas, add tooltips, and hide or scroll the rail on narrow screens.
- Seen in: 1 refs; domain:home-automation ×1, domain:smart-home ×1, style:terminal ×1
