"""Replay past starts (same brief, same seed) on a running studio and compare LLM calls, tokens and skill-file reads.

Reads the originals from the dev database (docker container devpg), posts each brief to /api/generate with its seed, waits,
then prints before / after. Replays go to /api/generate without a concept (no project is created) and skip the brief step,
which the original start counted (one call, ~2.6k prompt tokens). Usage:
  STUDIO_SESSION=<cookie> python3 scripts/replay_starts.py <concept uuid>... [--api http://127.0.0.1:7701/api]
"""

import argparse
import json
import os
import subprocess
import time
import urllib.request


def sql(q):
    out = subprocess.run(["docker", "exec", "-i", "devpg", "psql", "-U", "dev", "-d", "studio", "-At", "-c", q],
                         capture_output=True, text=True, check=True).stdout
    return [line.split("\x1f") for line in out.strip().split("\n") if line]


def call(api, method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json", "Cookie": "studio_session=" + os.environ.get("STUDIO_SESSION", "")}
    with urllib.request.urlopen(urllib.request.Request(api + path, data, headers, method=method), timeout=60) as r:
        return json.load(r)


def job_stats(job_id):
    (row,) = sql(f"select llm_calls, prompt_tokens, cached_tokens, out_tokens, status, "
                 f"(length(log) - length(replace(log, 'read_skill_file ', ''))) / 16 from jobs where id = '{job_id}'")
    calls, prompt, cached, out, status, reads = row[0].split("|")
    return {"status": status, "calls": int(calls), "prompt": int(prompt), "cached": int(cached), "out": int(out),
            "reads": int(reads)}


def main():
    p = argparse.ArgumentParser()
    p.add_argument("concepts", nargs="+")
    p.add_argument("--api", default="http://127.0.0.1:7701/api")
    a = p.parse_args()
    for concept in a.concepts:
        brief, seed = sql(f"select brief_json::text || '\x1f' || coalesce(notes_json->>'seed', '') from generations "
                          f"where concept_id = '{concept}' and page is null order by created_at limit 1")[0]
        (old,) = sql(f"select id from jobs where kind = 'start' and target_json->>'concept' = '{concept}' "
                     f"and status = 'done' order by created_at limit 1")
        req = json.loads(brief)
        for k in ("concept", "project"):
            req.pop(k, None)
        if seed:
            req["seed"] = int(seed)
        job = call(a.api, "POST", "/generate", req)["job_id"]
        while call(a.api, "GET", f"/jobs/{job}")["status"] in ("queued", "running"):
            time.sleep(5)
        print(concept[:8], "before", job_stats(old[0]))
        print(concept[:8], "after ", job_stats(job))


if __name__ == "__main__":
    main()
