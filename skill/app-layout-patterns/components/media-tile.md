# Component: media-tile

## brand-glyph-tile — Brand glyph tile
- Looks: About 40px rounded square with a per-asset background and a centered monochrome logo/glyph; consistent radius across rows.
- Use when: Leading identifier in list rows for brands, assets, wallets, providers, or product types.
- Avoid when: When a full image, readable text, or larger visual context is needed.
- Build notes: Keep 1:1 ratio, centered glyph, sufficient contrast, and fixed size so row metrics stay stable.
- Seen in: 1 refs; domain:crypto-wallet ×1, domain:dashboard ×1, style:glassmorphism ×1

## card-face-tile — Virtual card face tile
- Looks: Stylized bank/payment card graphic with brand, cardholder, expiry, and balance on the face; layered shadow suggests a physical card.
- Use when: Finance or payments panel needing a focal card visual above a balance, ledger, or card list.
- Avoid when: Compact list rows; high-frequency live data where table readability matters more than a visual asset.
- Build notes: Render changing values as real text if selectable/searchable; use a solid fallback if the graphic fails.
- Seen in: 1 refs; domain:banking ×1, domain:finance-dashboard ×1, style:glassmorphism ×1

## full-bleed-image-tile — Full-bleed image tile
- Looks: Rounded container filled edge-to-edge with a photo/illustration; no required text overlay; corner radius matches parent card.
- Use when: Asset preview, decorative banner, or backdrop behind KPI cards when the image is the primary visual.
- Avoid when: Primary data tile requiring labels, status, or controls; small list-row identifier where a compact icon is clearer.
- Build notes: Use object-fit: cover, provide fallback/alt, and make it non-interactive if decorative.
- Seen in: 1 refs; domain:analytics-dashboard ×1, style:enterprise-classic ×1, style:glassmorphism ×1

## media-control-tile — Media control tile
- Looks: Rounded media card about 120x90px with a media surface and a bottom control strip for play/pause/skip; dot-grid can be used as empty or loading state.
- Use when: Small media previews where playback or transport controls are part of the task.
- Avoid when: Static image tiles; when media is represented by a thumbnail and text only.
- Build notes: Keep controls at least 24px target size, show disabled state, and separate playing/paused visuals.
- Seen in: 1 refs; domain:ui-kit ×1, style:glassmorphism ×1

## overlay-cta-banner-tile — Overlay CTA banner tile
- Looks: Wide tile about 300x140px spanning two columns, full-bleed background image/illustration, headline top-left, badge or button bottom-left.
- Use when: Surfacing a single onboarding, upgrade, install, or feature CTA inside a uniform card grid.
- Avoid when: Repeated data tiles; grids where every tile is data-driven and no promotional emphasis is needed.
- Build notes: Add a scrim under text, make the badge a real button, and keep it out of dense data tables.
- Seen in: 1 refs; domain:hr-management ×1, style:flat ×1

## photo-status-tile — Photo status tile
- Looks: Photo background with a bottom scrim, room/device name, one-line status readout, and optional small leading glyph.
- Use when: Device, room, location, or equipment status cards in operations dashboards.
- Avoid when: List rows needing compact identifiers; tiles with many status fields that need a table layout.
- Build notes: Limit status to one line, use semantic status color, and lazy-load images in large grids.
- Seen in: 1 refs; domain:home-automation ×1, domain:smart-home ×1, style:terminal ×1

## thumbnail-caption-tile — Thumbnail + caption tile
- Looks: Small rounded photo thumbnail about 96px beside a two-line caption: title plus one metadata line.
- Use when: Previewing the next item in a sequence, queue, schedule, route, or media list.
- Avoid when: Dense tables where a small icon plus text is enough; when multiple fields need equal visual weight.
- Build notes: Fix thumbnail size, truncate caption to two lines, and support hover/selected states.
- Seen in: 1 refs; domain:golf-scorekeeping ×1, domain:golf-sports ×1, style:glassmorphism ×1
