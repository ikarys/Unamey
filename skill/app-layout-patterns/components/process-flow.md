# Component: process-flow

## node-graph-canvas — Node graph canvas
- Looks: Free-form canvas of rectangular node boxes connected by directed lines/arrows. Each node shows a title plus 1-3 small metric lines; state is shown by tinting node background/border (e.g. orange/green). Small square terminals on node edges provide +/x add/remove connection affordances.
- Use when: Process has branching, looping, or non-linear steps and users need to inspect or adjust the graph while seeing per-node KPIs/status.
- Avoid when: The process is strictly linear, has few steps, or is better shown as a timeline, stepper, table, or status board.
- Build notes: Support node drag, edge routing, zoom/pan, empty state, hover/selection, and terminal hover; keep node content to title + compact metrics.
- Seen in: 1 refs; domain:industrial-planning ×1, style:flat ×1
