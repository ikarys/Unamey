# Component: device-control

## dial-cluster-panel — Dial cluster control panel
- Looks: Bordered panel with one large central dial and 4 smaller satellite knobs; tick marks, centre readout, and accent ring outlines; physical control-panel layout.
- Use when: A device has one dominant parameter plus a few secondary parameters, such as HVAC, lighting scenes, audio routing, or sensor calibration.
- Avoid when: Many parameters are needed, the layout is a compact table row, or exact numeric entry is required.
- Build notes: Treat the central dial as the primary control; label satellite dials clearly; update readouts immediately; use state colours only for active values or warnings.
- Seen in: 1 refs; domain:operations-dashboard ×1, style:bento ×1, style:glassmorphism ×1

## fader-slider — Fader slider
- Looks: Horizontal or vertical slider with a thin track, a filled segment from origin to handle, a rectangular or oval handle with grip notches, optional tick dots, and a label. Observed horizontal ~120px wide; vertical variants ~90px tall.
- Use when: Precise value control in panels, mixers, parameter tables, vertical control racks, or settings where value magnitude should be visible at a glance.
- Avoid when: Simple low-precision form inputs, dense data grids, or mobile-first layouts where compact range controls are more appropriate.
- Build notes: Support drag, click-to-set, keyboard arrows, optional tick snapping, and a visible value readout; keep tick marks non-interactive if decorative.
- Seen in: 1 refs; domain:audio ×1, domain:audio-mixing ×1, style:glassmorphism ×1, style:liquid-glass ×1

## range-slider-with-ticks — Dual-thumb range slider
- Looks: Horizontal track with a filled portion between two thumbs; numeric tick scale below the track, e.g. 0 / 25 / 50 / 75 / 100; standard density.
- Use when: Selecting a min/max range on a known numeric scale, such as filters, price bounds, temperature limits, or thresholds.
- Avoid when: Only one value is needed, the control must be very compact, or the data is not an ordered range.
- Build notes: Keep thumbs separated with a minimum gap; show current values near the control; support click, drag, and keyboard adjustment; ticks help precision but can be hidden in compact mode.
- Seen in: 1 refs; domain:design-system ×1, style:neumorphism ×1

## rotary-knob — Rotary knob
- Looks: Round knob, about 64px for mid size and 32px for small size; tick ring with 12-24 marks; indicator line or dot; coloured value ring; label beneath.
- Use when: One continuous setting where the current value should be readable at a glance, such as volume, brightness, threshold, or temperature.
- Avoid when: Multiple settings must fit tightly, exact typed input is required, or the parameter has many discrete named states.
- Build notes: Rotate by dragging; snap to tick marks when the parameter is stepped; show the value near the knob; support keyboard arrows and accessible labels.
- Seen in: 1 refs; domain:audio ×1, domain:audio-mixing ×1, style:glassmorphism ×1, style:liquid-glass ×1

## value-stepper-panel — Value stepper panel
- Looks: Bordered readout panel showing stacked numeric values, e.g. 25°C / 19°C; adjacent + and - icon buttons; uppercase label above.
- Use when: A setpoint has a current and secondary reading, and the user changes it in small steps, such as thermostat, target speed, or queue limit.
- Avoid when: Continuous fine adjustment is needed, many values must be edited at once, or the control area is too small for buttons.
- Build notes: Increment/decrement on click; repeat on long press; disable buttons at min/max; show units; make the readout the primary source of truth.
- Seen in: 1 refs; domain:iot ×1, domain:smart-home ×1, style:flat ×1

## vertical-position-track — Vertical position track
- Looks: Vertical pill track, about 28x90px; dark inset surface with rounded ends; single glowing dot as the position marker; label below.
- Use when: A narrow vertical area needs a compact indicator for one continuous value, such as wheel position, level, scroll offset, or simple intensity.
- Avoid when: Two values are needed, precise numeric input is required, or the touch target must be larger.
- Build notes: Map dot position to 0-100; allow drag and click; keep the dot large enough for touch, ideally with a wider invisible hit area; show the value beside the control.
- Seen in: 1 refs; domain:audio ×1, domain:audio-mixing ×1, style:glassmorphism ×1, style:liquid-glass ×1
