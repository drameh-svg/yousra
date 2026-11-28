#!/usr/bin/env python3
"""Backfill / retry aesthetic classification via the HTTP worker or local infer.

Local mode (trusted path + image files listed in a JSONL of {id,image_path}):
  python cli_backfill.py --manifest products.jsonl --out results.jsonl

HTTP mode (Node-exported queue of image URLs):
  python cli_backfill.py --manifest urls.jsonl --worker-url http://127.0.0.1:8091 \\
    --secret "$STYLE_WORKER_SECRET" --out results.jsonl

Manifest lines: {"id":"...", "image_path":"..."} or {"id":"...", "image_url":"..."}
Use --force to reclassify even when hashes would match on the Node side.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import httpx


def classify_local(image_path: Path, top_k: int) -> dict:
    from infer import classify_bytes, load_bundle

    load_bundle()
    result = classify_bytes(image_path.read_bytes(), top_k=top_k)
    result["classifiedAt"] = datetime.now(timezone.utc).isoformat()
    return result


def classify_http(url: str, worker: str, secret: str, top_k: int) -> dict:
    resp = httpx.post(
        f"{worker.rstrip('/')}/v1/classify",
        headers={"authorization": f"Bearer {secret}", "content-type": "application/json"},
        json={"image_url": url, "top_k": top_k},
        timeout=60.0,
    )
    if resp.status_code >= 400:
        return {"status": "error", "error": f"HTTP {resp.status_code}: {resp.text[:300]}"}
    return resp.json()


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--manifest", type=Path, required=True)
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--top-k", type=int, default=3)
    p.add_argument("--worker-url", default=os.environ.get("STYLE_WORKER_URL", ""))
    p.add_argument("--secret", default=os.environ.get("STYLE_WORKER_SECRET", ""))
    p.add_argument("--sleep", type=float, default=0.0, help="Pause between items (seconds)")
    p.add_argument("--limit", type=int, default=0)
    p.add_argument("--force", action="store_true", help="Documented for Node callers; local always runs")
    args = p.parse_args()

    lines = [ln for ln in args.manifest.read_text().splitlines() if ln.strip()]
    if args.limit:
        lines = lines[: args.limit]

    written = 0
    with args.out.open("w") as out:
        for ln in lines:
            row = json.loads(ln)
            pid = row.get("id")
            try:
                if row.get("image_path"):
                    result = classify_local(Path(row["image_path"]), args.top_k)
                elif row.get("image_url"):
                    if not args.worker_url or not args.secret:
                        raise RuntimeError("image_url rows need --worker-url and --secret")
                    result = classify_http(row["image_url"], args.worker_url, args.secret, args.top_k)
                else:
                    result = {"status": "missing_image", "error": "No image_path or image_url"}
            except Exception as exc:  # noqa: BLE001
                result = {"status": "error", "error": str(exc)}
            out.write(json.dumps({"id": pid, "force": args.force, **result}) + "\n")
            written += 1
            if args.sleep:
                time.sleep(args.sleep)
    print(json.dumps({"written": written, "out": str(args.out)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
