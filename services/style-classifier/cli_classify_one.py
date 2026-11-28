#!/usr/bin/env python3
"""Classify one local image with the trusted joblib + SigLIP2 pipeline.

Usage:
  export STYLE_CLASSIFIER_PATH=/absolute/path/style_classifier_and_config.joblib
  python cli_classify_one.py /path/to/image.jpg
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from infer import classify_bytes, load_bundle


def main() -> int:
    parser = argparse.ArgumentParser(description="Classify one local fashion image")
    parser.add_argument("image", type=Path, help="Path to a local image file")
    parser.add_argument("--top-k", type=int, default=3)
    parser.add_argument("--classifier", default=None, help="Override STYLE_CLASSIFIER_PATH")
    args = parser.parse_args()
    if args.classifier:
        import os

        os.environ["STYLE_CLASSIFIER_PATH"] = args.classifier
    if not args.image.is_file():
        print(f"Not a file: {args.image}", file=sys.stderr)
        return 2
    try:
        load_bundle()
        result = classify_bytes(args.image.read_bytes(), top_k=args.top_k)
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"status": "error", "error": str(exc)}), file=sys.stderr)
        return 1
    result["classifiedAt"] = datetime.now(timezone.utc).isoformat()
    result["sourcePath"] = str(args.image.resolve())
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
