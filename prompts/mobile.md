Mobile page rules (override the desktop viewport rule).
Viewport: design for a 390px-wide phone (iPhone-class), portrait, 390x844; no horizontal scroll.
Include `<meta name="viewport" content="width=device-width, initial-scale=1">`; the body is the phone screen, not a desktop frame.
Use a single column; translate the desktop structure to a phone.
Sidebar or rail becomes a bottom tab bar (3-5 items, 56px tall, safe-area padding) or a top bar with a menu button.
Inspector or right panel becomes a sheet or a secondary screen link.
Wide tables become stacked rows: primary text, one meta line, status; keep sticky section headers.
Filters become a horizontal chip row.
Touch targets are at least 44x44px; body text is at least 16px; no hover-only affordances.
Put actions in the thumb zone (bottom) and keep one primary action per screen.
Keep the identity: same tokens, fonts, radius, accent, component anatomy and tone as the desktop reference.
Keep the same navigation items and content, reordered by priority; the current page is the active tab.
Output one standalone HTML document with Tailwind CDN and inline SVG icons.
Use the same notes format as the desktop generation prompt.
Prefer clarity and reachability over decorative detail.
