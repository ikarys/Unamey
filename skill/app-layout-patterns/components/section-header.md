# Component: section-header

## title-with-right-action — Title with right-side action
- Looks: One-row section header: left title 18-22px, optional metric/subtitle 12-14px under or beside title; right text action 12-14px with optional 12px icon; baseline aligned; optional thin accent underline.
- Use when: Group header that labels a list, card set, or data block and needs one navigation or create action, such as see all, add item, or open total.
- Avoid when: No action is needed, the header is only a divider, or multiple actions/filters are required; use a toolbar or toolbar-style header instead.
- Build notes: Keep title and action on one 40-48px row, right action hit target >=24px, metric value should not wrap, hide action when no items are available.
- Seen in: 2 refs; style:glassmorphism ×2, domain:community-app ×1, domain:crypto-wallet ×1, domain:dashboard ×1

## icon-label-underline — Icon label underline header
- Looks: Compact left-aligned micro-header: 12-16px icon, 12-13px label, short 2px accent underline beneath the label; no right-side action; used directly above dense dashboard blocks.
- Use when: Segmenting high-density panels where each block needs a small visual anchor but no per-section action, navigation, or large heading.
- Avoid when: Section needs a primary action, clear large hierarchy, or accessible grouping without decorative underlines; use a title-only header or title-with-right-action.
- Build notes: Treat underline as style, limit its width to the label, keep label at least 12px for legibility, and do not rely on it for keyboard-focusable navigation.
- Seen in: 1 refs; domain:home-automation ×1, domain:smart-home ×1, style:terminal ×1

## plain-text-section-label — Plain text section label
- Looks: Left-aligned text label, 13–14px medium weight, no icon; optionally a 1px hairline rule under the label or group row to separate it from adjacent content.
- Use when: Segmenting dense tile grids, list clusters, or dashboard panels into named low-emphasis groups.
- Avoid when: The section needs stronger hierarchy, filtering, actions, collapse/expand behavior, or clear grouping boundaries around the whole block.
- Build notes: Keep it static text, align to the content's left edge, and provide enough vertical spacing; use a hairline only to separate from neighboring content, not as a full divider system.
- Seen in: 1 refs; domain:quick-settings ×1, style:bento ×1, style:glassmorphism ×1, style:liquid-glass ×1
