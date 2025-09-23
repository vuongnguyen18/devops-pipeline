#!/usr/bin/env bash
set -euo pipefail
URL="${1:-http://localhost:8080/health}"
TIMEOUT="${2:-30}"
for i in $(seq $TIMEOUT); do
  if curl -fsS "$URL" >/dev/null; then
    echo "Smoke test OK: $URL"
    exit 0
  fi
  sleep 1
done
echo "Smoke test FAILED: $URL"
exit 1
