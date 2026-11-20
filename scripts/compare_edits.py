"""A/B of scoped edits: the same edit applied to the same parents with `mode: patch` and `mode: full`.

Needs a running studio built from this code. In multi-user mode (`just saas`) pass the `studio_session` cookie value
in the STUDIO_SESSION environment variable (browser dev tools > Storage). Usage:
  python3 scripts/compare_edits.py cases.json [--api http://127.0.0.1:7700/api] [--out docs/reports/edit-patches.md]
cases.json: [{"id": "<generation uuid>", "edit": {"layout": "..."} or {"identity": {...}}, "refine": "bolder"}, ...]
(`edit` or `refine`, one per case). Results land in the studio history: compare each pair there.
"""

import argparse
import json
import os
import time
import urllib.request


def call(api, method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"}
    if os.environ.get("STUDIO_SESSION"):
        headers["Cookie"] = "studio_session=" + os.environ["STUDIO_SESSION"]
    req = urllib.request.Request(api + path, data, headers, method=method)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def run(api, case, mode):
    if "refine" in case:
        body = {"action": case["refine"], "count": 1, "mode": mode}
        job = call(api, "POST", f"/generations/{case['id']}/refine", body)["job_id"]
    else:
        job = call(api, "POST", f"/generations/{case['id']}/edit", {**case["edit"], "mode": mode})["job_id"]
    while True:
        j = call(api, "GET", f"/jobs/{job}")
        if j["status"] not in ("queued", "running"):
            break
        time.sleep(3)
    if j["error"] or not j["result"]:
        return {"mode": mode, "error": j["error"] or j["status"]}
    gid = j["result"]["generation_ids"][0]
    notes = call(api, "GET", f"/generations/{gid}")["notes"]
    record = notes.get("edit") or notes.get("refine") or {}
    return {"mode": mode, "id": gid, "applied": record.get("mode"), "llm": j["llm"]}


def main():
    p = argparse.ArgumentParser()
    p.add_argument("cases")
    p.add_argument("--api", default="http://127.0.0.1:7700/api")
    p.add_argument("--out", default="docs/reports/edit-patches.md")
    a = p.parse_args()
    rows = []
    for case in json.load(open(a.cases)):
        what = f"refine {case['refine']}" if "refine" in case else json.dumps(case["edit"], ensure_ascii=False)
        for mode in ("patch", "full"):
            r = run(a.api, case, mode)
            print(case["id"][:8], mode, r)
            llm = r.get("llm") or {}
            rows.append(f"| {case['id'][:8]} | {what} | {mode} | {r.get('applied') or r.get('error')} | {llm.get('prompt', '')} | {llm.get('out', '')} | {llm.get('seconds', '')} | {r.get('id', '')} |")
    with open(a.out, "w") as f:
        f.write(f"# Edit patches vs full rewrite ({time.strftime('%Y-%m-%d')})\n\n")
        f.write("| parent | edit | requested | applied | prompt | out | s | result |\n|---|---|---|---|---|---|---|---|\n")
        f.write("\n".join(rows) + "\n")
    print("report:", a.out)


if __name__ == "__main__":
    main()
