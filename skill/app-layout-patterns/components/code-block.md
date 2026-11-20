# Component: code-block

## read-only-numbered-snippet — Read-only numbered snippet
- Looks: Rounded code panel with ~12px inner padding, left gutter with dim gray line numbers, monospace code, syntax tinting, and a small language badge pill in the bottom-right.
- Use when: Displaying short read-only JSON/API/config snippets in docs, settings, logs, or debug views; best for 5-30 lines where line references help.
- Avoid when: Interactive editing, multi-file browsing, very long logs, or plain-text copy blocks where line numbers add noise.
- Build notes: Keep gutter non-interactive, support horizontal scroll for long lines, add copy button if needed, keep badge unobtrusive.
- Seen in: 1 refs; domain:ai-agent-console ×1, style:flat ×1
