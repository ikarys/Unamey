#!/usr/bin/env python3
"""Example screens for the Styles page: one generation per archetype on the same product, screenshotted
to web/public/styles/<id>.jpg. Needs a single-user server (see `just style-examples`). Existing images
are kept unless --force; pass archetype ids to redo only those."""
import json, subprocess, sys, tempfile, time, urllib.request
from pathlib import Path

BASE = "http://127.0.0.1:7798"
OUT = Path(__file__).resolve().parent.parent / "web/public/styles"
# The same product per kind, so the examples differ only by style.
BRIEFS = {
    "business": {"brief": "Project tracker for a 12-person design agency: active projects, deadlines, team workload, invoices due.",
                 "users": "Agency producers and the studio owner", "data_objects": ["Project", "Client", "Task", "Invoice"]},
    "consumer": {"brief": "Habit tracker for teenagers: daily streaks, small challenges with friends, badges to unlock.",
                 "users": "Teenagers, 13 to 17", "data_objects": ["Habit", "Streak", "Challenge", "Badge"]},
}

def call(path, body=None):
    req = urllib.request.Request(BASE + path, json.dumps(body).encode() if body is not None else None, {"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=60))

def generate(arch):
    job = call("/api/generate", {**BRIEFS[arch["kind"]], "style_tags": [], "density": "comfortable", "variants": 1,
                                 "archetype": arch["id"], "target": "desktop"})["job_id"]
    while (j := call(f"/api/jobs/{job}"))["status"] in ("queued", "running"):
        time.sleep(3)
    ids = (j.get("result") or {}).get("generation_ids") or []
    if j["status"] != "done" or not ids:
        raise RuntimeError(f"job {job} {j['status']}")
    return call(f"/api/generations/{ids[0]}")["html"]

def shoot(html, out):
    with tempfile.TemporaryDirectory() as d:
        page = Path(d, "page.html")
        page.write_text(html)
        subprocess.run(["chromium", "--headless", f"--user-data-dir={d}/profile", f"--screenshot={out}", "--window-size=1440,900",
                        "--force-device-scale-factor=1.5", "--hide-scrollbars", "--disable-gpu", "--no-first-run",
                        "--virtual-time-budget=8000", page.as_uri()], capture_output=True, timeout=90, check=True)

def main():
    args = [a for a in sys.argv[1:] if a != "--force"]
    force = "--force" in sys.argv
    OUT.mkdir(parents=True, exist_ok=True)
    for arch in call("/api/archetypes"):
        out = OUT / f"{arch['id']}.jpg"
        if (args and arch["id"] not in args) or (out.exists() and not force and not args):
            continue
        print(f"{arch['id']}…", flush=True)
        try:
            html = generate(arch)
            shoot(html, out)
            print(f"  {out.name} {out.stat().st_size // 1024} kB", flush=True)
        except Exception as e:  # one failed look must not stop the others
            print(f"  failed: {e}", flush=True)

if __name__ == "__main__":
    main()
