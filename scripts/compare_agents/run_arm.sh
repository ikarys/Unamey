#!/usr/bin/env bash
# Usage: run_arm.sh <arm-dir> <extra-instruction>   (measures one agent run, Opus, bare config)
set -euo pipefail
B=${UICMP_DIR:-/tmp/uicmp}; ARM=$1; EXTRA=${2:-}
PROMPT="$(cat "$B/task.txt")
$(cat "${BRIEF:-$B/brief.txt}")
${EXTRA}"
cd "$B/arms/$ARM"
START=$(date +%s)
CLAUDE_CONFIG_DIR=$B/cfg claude -p "$PROMPT" --model opus --output-format json --permission-mode acceptEdits > result.json 2> stderr.log || true
END=$(date +%s)
python3 - "$ARM" "$START" "$END" <<'PY'
import json,sys
d=json.load(open('result.json')); u=d['usage']
print(f"{sys.argv[1]}: turns={d['num_turns']} wall={int(sys.argv[3])-int(sys.argv[2])}s api={d['duration_api_ms']//1000}s cost=${d['total_cost_usd']:.2f} in={u['input_tokens']} cache_w={u['cache_creation_input_tokens']} cache_r={u['cache_read_input_tokens']} out={u['output_tokens']} error={d['is_error']}")
PY
[ -f screen.html ] && chromium --headless --disable-gpu --hide-scrollbars --window-size=1440,900 --screenshot=screen.png "file://$PWD/screen.html" >/dev/null 2>&1 && echo "screenshot ok" || echo "no screen.html"
