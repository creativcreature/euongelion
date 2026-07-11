#!/usr/bin/env python3
"""LOCKED measuring stick for the optimization loop. READ to score. NEVER edit.

Usage:
    python3 docs/run/loop/score.py [base_url]

base_url defaults to http://localhost:8787 (the `npm run preview` Workers
runtime). Runs Lighthouse (headless Chrome, default mobile emulation,
simulated throttling — the Web-Vitals-comparable configuration) 3 times per
page on the homepage and the reader, takes the median LCP per page, and
prints the score: max(median_home, median_reader) in milliseconds.

Exit code 0 with a final line `SCORE_MS=<int>` on success; exit 1 on any
measurement failure (a failed run is a failed score — never silently retried
into a better number).
"""

import json
import statistics
import subprocess
import sys

PAGES = {
    "home": "/",
    "reader": "/devotional/too-busy-for-god-day-6",
}
RUNS_PER_PAGE = 3

TIERS = [(1200, 4), (1800, 3), (2500, 2), (4000, 1)]


def lcp_ms(url: str) -> float:
    cmd = [
        "npx",
        "--yes",
        "lighthouse",
        url,
        "--only-categories=performance",
        "--output=json",
        "--output-path=stdout",
        "--quiet",
        '--chrome-flags=--headless=new',
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if proc.returncode != 0:
        raise RuntimeError(f"lighthouse failed for {url}: {proc.stderr[-500:]}")
    report = json.loads(proc.stdout)
    audit = report["audits"]["largest-contentful-paint"]
    value = audit.get("numericValue")
    if value is None:
        raise RuntimeError(f"no LCP numericValue for {url}: {audit.get('errorMessage')}")
    return float(value)


def main() -> int:
    base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8787"
    medians = {}
    for name, path in PAGES.items():
        url = base.rstrip("/") + path
        samples = []
        for i in range(RUNS_PER_PAGE):
            value = lcp_ms(url)
            samples.append(value)
            print(f"{name} run {i + 1}/{RUNS_PER_PAGE}: {value:.0f} ms", flush=True)
        medians[name] = statistics.median(samples)
        print(f"{name} median: {medians[name]:.0f} ms", flush=True)

    score = max(medians.values())
    tier = 0
    for threshold, t in TIERS:
        if score < threshold:
            tier = t
            break
    print(json.dumps({"medians_ms": {k: round(v) for k, v in medians.items()},
                      "score_ms": round(score), "tier": tier}))
    print(f"SCORE_MS={round(score)}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:  # a failed measurement is a failed score
        print(f"SCORE_FAILED: {exc}", file=sys.stderr)
        sys.exit(1)
