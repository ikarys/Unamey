# UX: interactions

- No `<script>` tags or `onclick` attributes; all behavior comes from native HTML/CSS.
- Every interactive control is a real `<button>`, `<label>`, `<summary>`, checkbox, radio, or popover trigger, with a visible label or `aria-label`.
- Keyboard must work: add `focus-visible` rings or outlines to every trigger and control.
- The default rendered state must look complete: open the important panel, collapse the rest.
- Prefer 2-4 meaningful interactions per screen over decorative motion.
- `<dialog>` cannot open without JS, so use `popover` for menus, drawers, and overlays.

## collapsible-side-column — Collapsible side column
- Looks: A left sidebar or inspector can shrink to a narrow icon rail while the main canvas expands.
- Use when: The app has optional context, filters, properties, or navigation that can be hidden.
- Avoid when: The sidebar contains controls needed for every task.
- Build notes: Start expanded with the checkbox unchecked. Use a hidden `peer sr-only` checkbox, a visible `<label>` toggle, and a shell that changes grid columns when checked.
- Native: `<div class="group grid grid-cols-[260px_1fr] has-[#rail:checked]:grid-cols-[56px_1fr]"><input id="rail" type="checkbox" class="peer sr-only"><label for="rail" class="peer-focus-visible:ring-2">icon</label><aside><span class="group-has-[#rail:checked]:hidden">Label</span></aside></div>`

## accordion-sections — Accordion sections
- Looks: Stacked sections with clickable summary rows and a chevron that rotates when open.
- Use when: Settings, help, filters, or documentation has many related groups.
- Avoid when: All sections should be visible and scannable at once.
- Build notes: Use native `<details>` and `<summary>`. Keep the first section open and hide the default marker.
- Native: `<details class="group" open><summary class="list-none [&::-webkit-details-marker]:hidden focus-visible:ring-2">Label <span class="group-open:rotate-90">chevron</span></summary>content</details>`

## floating-canvas-actions — Floating canvas actions
- Looks: Round buttons float over a canvas, preview, or map, usually bottom-right with shadow and ring.
- Use when: The surface needs quick tools like add, zoom, inspect, or share.
- Avoid when: The actions belong in a persistent toolbar or command bar.
- Build notes: Use `absolute bottom-4 right-4 z-10`, one primary button in solid var(--accent), and at most three total. Make buttons semi-transparent at rest and opaque on hover/focus.
- Native: `<div class="absolute bottom-4 right-4 z-10 flex gap-2"><button aria-label="Add" class="rounded-full bg-accent/80 text-white shadow ring-1 ring-black/10 hover:bg-accent focus-visible:bg-accent focus-visible:ring-2">+</button></div>`

## expanding-pill-button — Expanding pill button
- Looks: An icon-only round button expands into a pill with a text label on hover or focus.
- Use when: Canvas tools need a compact rest state but clear labels for accessibility and clarity.
- Avoid when: The label is essential to understand the action before hovering.
- Build notes: Keep `aria-label` on the button at all times. Animate the label span from `max-w-0` to `max-w-[220px]` on hover and focus-visible.
- Native: `<button class="group flex items-center rounded-full focus-visible:ring-2" aria-label="Add shape"><span>icon</span><span class="max-w-0 overflow-hidden whitespace-nowrap transition-all group-hover:max-w-[220px] group-focus-visible:max-w-[220px]">Add shape</span></button>`

## popover-menu — Popover menu
- Looks: An overflow or actions menu opens anchored to its trigger button and closes on outside click or Esc.
- Use when: A row, toolbar, or card has several secondary actions that should not compete with primary actions.
- Avoid when: The actions are frequent, primary, or need to remain visible.
- Build notes: Use `popovertarget` on the button and a `popover` element. Anchor it with CSS anchor positioning and keep the trigger labeled.
- Native: `<button popovertarget="m1" aria-label="More actions" class="focus-visible:ring-2" style="anchor-name:--m1">…</button><div id="m1" popover style="position-anchor:--m1; top:anchor(bottom); right:anchor(right); margin:4px; inset:auto">…</div>`

## drawer-over-content — Drawer over content
- Looks: A right-side drawer opens over the page with a dimmed backdrop and a clear close control.
- Use when: Creating, editing, or inspecting an item should not replace the whole screen.
- Avoid when: The content is short enough to fit in an inline panel.
- Build notes: Use a `popover` element fixed to the right edge and style its `::backdrop` as a dim layer. Add a close button with `popovertargetaction="hide"`.
- Native: `<button popovertarget="d1" class="focus-visible:ring-2">Open</button><div id="d1" popover style="inset:0 0 0 auto; height:100vh; width:420px"><button popovertarget="d1" popovertargetaction="hide" class="focus-visible:ring-2">Close</button></div>`

## css-tabs — CSS tabs
- Looks: A tab bar switches panels without JavaScript, with the checked tab shown in a solid accent state.
- Use when: Two to five peer views of the same object need to be compared.
- Avoid when: There are many tabs, nested state, or complex persistence requirements.
- Build notes: Use radio inputs with the same `name`, `sr-only` inputs with labels as tabs, and `:has()` on a container to reveal the matching panel. Keep the first tab checked.
- Native: `<div class="group"><input id="tab-1" type="radio" name="tabs" class="peer sr-only" checked><label for="tab-1" class="peer-checked:bg-accent peer-checked:text-white peer-focus-visible:ring-2">A</label><section class="hidden group-has-[#tab-1:checked]:block">A</section></div>`

## toggle-switch — Toggle switch
- Looks: A real checkbox styled as a switch, with the knob moving and the track changing color.
- Use when: A binary setting can be changed immediately and independently.
- Avoid when: The control needs more than two states or a confirmation step.
- Build notes: Use `peer` on the checkbox and `peer-checked:` classes on the label. Dependent content can be revealed with `:has(:checked)` on a parent.
- Native: `<div class="group"><input id="s" type="checkbox" class="peer sr-only"><label for="s" class="relative h-6 w-11 rounded-full bg-border peer-checked:bg-accent peer-focus-visible:ring-2 after:absolute after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5"><span class="sr-only">Enable</span></label><div class="hidden group-has-[:checked]:block">Enabled</div></div>`

## hover-reveal-row-actions — Hover reveal row actions
- Looks: Secondary row actions fade in when a row is hovered or focused, while the primary action stays visible.
- Use when: List rows have one main action and several lower-priority utilities.
- Avoid when: The secondary actions are critical, discoverability matters, or the row is touch-only.
- Build notes: Make the row a `group` and reveal secondary actions with `group-hover` and `group-focus-within`. Keep the primary action always visible.
- Native: `<tr class="group"><td>Item</td><td class="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"><button class="focus-visible:ring-2">Copy</button></td><td><button class="focus-visible:ring-2">Open</button></td></tr>`