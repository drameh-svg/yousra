#!/usr/bin/env bash
# Deploy (or dry-run) the Modal T4 style-classifier pilot.
# Default: dry-run / checklist only. Live deploy requires --approve-live.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/services/style-classifier"

APPROVE=false
for arg in "$@"; do
  case "$arg" in
    --approve-live) APPROVE=true ;;
    --help|-h)
      echo "Usage: $0 [--approve-live]"
      echo "  (default) print checklist / modal app inspect; do not deploy"
      echo "  --approve-live  run: modal deploy modal_app.py  (only after user approval)"
      exit 0
      ;;
  esac
done

if ! command -v modal >/dev/null 2>&1; then
  echo "modal CLI not found. Install with: pip install modal && modal setup"
  echo "Then create secret + volume per services/style-classifier/README.md"
  exit 2
fi

echo "== Modal style classifier (T4 pilot) =="
echo "App file: $ROOT/services/style-classifier/modal_app.py"
python3 modal_app.py || true

if [[ "$APPROVE" != "true" ]]; then
  echo
  echo "Dry-run only. Refusing to deploy without --approve-live."
  echo "When approved: $0 --approve-live"
  exit 0
fi

echo
echo "Deploying with: modal deploy modal_app.py"
exec modal deploy modal_app.py
