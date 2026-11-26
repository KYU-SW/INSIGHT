#!/bin/sh
# Start the inference API with the same INSIGHT_BACKEND_TOKEN that Next.js reads from .env.local.
# Only that one variable is taken from .env.local; other secrets stay out of the Python process.
#   sh scripts/run_backend.sh            # or: npm run backend
# Override the interpreter with PYTHON=python3.11 (default: .venv/bin/python if present). HF_HOME is passed through
# unchanged (README uses HF_HOME=./hf-cache).
set -eu
cd "$(dirname "$0")/.."
if [ -z "${INSIGHT_BACKEND_TOKEN:-}" ] && [ -f .env.local ]; then
  INSIGHT_BACKEND_TOKEN=$(sed -n 's/^INSIGHT_BACKEND_TOKEN=//p' .env.local | tail -n 1)
  export INSIGHT_BACKEND_TOKEN
fi
if [ -z "${INSIGHT_BACKEND_TOKEN:-}" ] && [ "${INSIGHT_ALLOW_UNAUTHENTICATED:-}" != "1" ]; then
  echo "INSIGHT_BACKEND_TOKEN is empty: set it in .env.local (see .env.example) or export INSIGHT_ALLOW_UNAUTHENTICATED=1 for local-only dev" >&2
  exit 1
fi
PYTHON=${PYTHON:-$([ -x .venv/bin/python ] && echo .venv/bin/python || echo python3.11)}
exec "$PYTHON" -m uvicorn src.backend.app:app --host 127.0.0.1 --port 8001
