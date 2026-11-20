# Component: avatar

## circular-user-avatar — Circular user avatar
- Looks: Round clipped user photo or initial, 16-100px; optional 1-2px ring, grayscale for offline, centered in topbar, nav, list, table, card header.
- Use when: Identify a person, account, org, or contributor in dense business UIs where a single owner is needed.
- Avoid when: Showing multiple owners as a stack, brand/service logos, or large profile card with name/role as the primary content.
- Build notes: Provide fallback initials/silhouette, sizes 16/24/28/32/36/40/80/100, ring for contrast on dark/light, alt text, crop center.
- Seen in: 11 refs; style:glassmorphism ×5, style:flat ×4, domain:analytics ×1, domain:asset-management ×1, domain:business-dashboard ×1, domain:code-repository ×1

## avatar-name-row — Avatar name row
- Looks: 24-56px circular avatar left of one or two lines of text: name, role, email, or username; compact left-aligned block.
- Use when: Directory rows, topbar user chip, profile card header, sidebar user header, and feed byline where identity plus label is needed.
- Avoid when: Icon-only list rows, stacks of many users, or when name is already in an adjacent column.
- Build notes: Align avatar center to first text line, truncate name/role with ellipsis, keep line height 16-20px, no chevron unless menu.
- Seen in: 4 refs; domain:analytics ×1, domain:component-library ×1, domain:home-automation ×1, domain:operations-dashboard ×1, domain:smart-home ×1, domain:system-monitoring ×1

## avatar-stack-overflow — Avatar stack with overflow
- Looks: Overlapping 20-28px circular photos, 2-4 visible, 2px ring separators, trailing '+N more' outlined pill.
- Use when: Show multiple members, assignees, reviewers, or participants in cards, headers, and list rows without expanding.
- Avoid when: Single owner identity, very narrow rows under 80px, or when all names must be readable.
- Build notes: Limit visible avatars to 3-4, negative margin 8-12px, tooltip per avatar, pill opens list, z-index left-to-right.
- Seen in: 3 refs; domain:dashboard ×2, domain:design-tool ×2, style:flat ×2, domain:design-system ×1, style:fluent ×1

## avatar-menu-trigger — Avatar menu trigger
- Looks: 32-40px circular avatar, optional name and down chevron; button in topbar, side rail, or user card that opens a popover/menu.
- Use when: Account controls, profile actions, user settings, notifications, and logout entry point.
- Avoid when: Static identity display, table owner columns, stacks, or non-interactive list rows.
- Build notes: Make entire avatar+name+chevron clickable, focus ring, chevron 12-16px, popover anchored right/bottom, close on outside click.
- Seen in: 2 refs; domain:healthcare-dashboard ×1, domain:hr-management ×1, style:flat ×1, style:glassmorphism ×1

## brand-logo-avatar — Brand logo avatar
- Looks: 28-40px circular or small rounded-square full-bleed logo/image; leading element in transaction rows, card headers, and merchant/venue identity.
- Use when: Identify companies, issuers, services, venues, or assets by brand mark in financial, commerce, or directory rows.
- Avoid when: Personal user identity, small overflow stacks, or contexts needing initials.
- Build notes: Crop logo to square, preserve safe area, add subtle 1px ring on low-contrast backgrounds, do not stretch.
- Seen in: 2 refs; style:flat ×2, domain:finance ×1, domain:prediction-markets ×1

## square-avatar-slot — Square avatar slot
- Looks: 24-40px square or rounded-square tile with 4-8px radius; can contain user image, icon, logo, or be an empty placeholder at the end of a nav strip.
- Use when: Non-circular identity/icon slots in topbars, activity feeds, tab strips, or compact toolbars where circular avatars feel oversized.
- Avoid when: User profile headers, member stacks, brand logos needing full-bleed circular crop, or formal directory rows.
- Build notes: Use same crop as circular avatars with square mask, 1px ring if empty, radius consistent with buttons, do not mix with circular in the same row.
- Seen in: 2 refs; domain:ai-ops ×1, domain:general ×1, style:enterprise-classic ×1, style:flat ×1, style:skeuomorphic ×1

## circular-icon-avatar — Circular icon avatar
- Looks: 28-32px solid-background circle with centered line or duotone icon; no photo; used as leading glyph in nav rows, list rows, and pinned items.
- Use when: Entity, service, action, or category identity where no user photo exists and a uniform glyph is needed.
- Avoid when: User profile identity, brand logos, or rows where a photo improves recognition.
- Build notes: Keep icon stroke 1.5-2px, use one accent tint, match adjacent text baseline, do not replace photo avatars in member lists.
- Seen in: 1 refs; domain:analytics-dashboard ×1, style:enterprise-classic ×1, style:glassmorphism ×1
