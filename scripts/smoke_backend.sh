#!/bin/sh
# End-to-end smoke test of the inference API over real HTTP: start uvicorn with a throwaway bearer token, wait for
# GET /health, POST a synthetic example to /analyze, and check auth is enforced. Loads HuBERT (cached or downloaded).
#   sh scripts/smoke_backend.sh                      # local (.venv/bin/python if present)
#   PYTHON=python SMOKE_PORT=8799 sh scripts/smoke_backend.sh
# HF_HOME is passed through unchanged. Exit code is non-zero on any failed check.
set -eu
cd "$(dirname "$0")/.."
PYTHON=${PYTHON:-$([ -x .venv/bin/python ] && echo .venv/bin/python || echo python3)}
PORT=${SMOKE_PORT:-8765}
BASE="http://127.0.0.1:$PORT"
WAV=examples/synthetic_vowel_a_unstable.wav
TOKEN=$("$PYTHON" -c "import secrets; print(secrets.token_hex(24))")
WORK=$(mktemp -d)
LOG="$WORK/uvicorn.log"
PID=""

cleanup() {
  if [ -n "$PID" ]; then kill "$PID" 2>/dev/null || true; wait "$PID" 2>/dev/null || true; fi
  rm -rf "$WORK"
}
trap cleanup EXIT INT TERM

fail() {
  echo "SMOKE FAIL: $*" >&2
  echo "--- uvicorn log (tail) ---" >&2
  tail -n 40 "$LOG" >&2 || true
  exit 1
}

# Never inherit the dev opt-out: this test must exercise the real auth path.
env -u INSIGHT_ALLOW_UNAUTHENTICATED INSIGHT_BACKEND_TOKEN="$TOKEN" \
  "$PYTHON" -m uvicorn src.backend.app:app --host 127.0.0.1 --port "$PORT" >"$LOG" 2>&1 &
PID=$!

i=0
until curl -fsS --max-time 2 "$BASE/health" >"$WORK/health.json" 2>/dev/null; do
  i=$((i + 1))
  kill -0 "$PID" 2>/dev/null || fail "uvicorn exited before /health responded"
  [ "$i" -lt 60 ] || fail "/health did not respond within 60 s"
  sleep 1
done
"$PYTHON" -c '
import json, sys
body = json.load(open(sys.argv[1]))
assert body == {"status": "ok", "model_loaded": False, "ood_calibrated": True}, body
print("ok   GET /health (unauthenticated):", body)
' "$WORK/health.json" || fail "/health body"

code=$(curl -sS -o "$WORK/noauth.json" -w '%{http_code}' --max-time 30 \
  -F "file=@$WAV;type=audio/wav" --form-string user_id=SMOKE_001 --form-string task_code=vowel_a "$BASE/analyze")
[ "$code" = 401 ] || fail "POST /analyze without token returned $code, expected 401"
echo "ok   POST /analyze without token -> 401"

code=$(curl -sS -o "$WORK/badauth.json" -w '%{http_code}' --max-time 30 -H "Authorization: Bearer wrong-$TOKEN" \
  -F "file=@$WAV;type=audio/wav" --form-string user_id=SMOKE_001 --form-string task_code=vowel_a "$BASE/analyze")
[ "$code" = 401 ] || fail "POST /analyze with wrong token returned $code, expected 401"
echo "ok   POST /analyze with wrong token -> 401"

code=$(curl -sS -o "$WORK/analyze.json" -w '%{http_code}' --max-time 900 -H "Authorization: Bearer $TOKEN" \
  -F "file=@$WAV;type=audio/wav" --form-string user_id=SMOKE_001 --form-string task_code=vowel_a \
  --form-string recording_timestamp=2026-11-26T01:00:00+00:00 "$BASE/analyze")
[ "$code" = 200 ] || { cat "$WORK/analyze.json" >&2; fail "POST /analyze with token returned $code, expected 200"; }
"$PYTHON" -c '
import json, math, sys
body = json.load(open(sys.argv[1]))
model, acoustic = body["model"], body["acoustic"]
assert isinstance(model["score"], float) and 0.0 <= model["score"] <= 1.0, model
assert acoustic["jitter_percent"] is not None and math.isfinite(acoustic["jitter_percent"]), acoustic
ood = model.get("ood")
assert isinstance(ood, dict) and set(ood) == {"distance", "threshold", "in_distribution"}, ood
assert isinstance(ood["in_distribution"], bool) and ood["distance"] >= 0 and ood["threshold"] > 0, ood
assert ood["in_distribution"] == (ood["distance"] <= ood["threshold"]), ood
if not ood["in_distribution"]:
    assert model["status"] is None and "not interpretable" in model["status_reason"], model
assert body["user_id"] == "SMOKE_001" and body["task"]["code"] == "vowel_a", body
print("ok   POST /analyze with token -> 200: score=%.6f jitter=%.3f%% shimmer=%s hnr=%s ood=%s" % (
      model["score"], acoustic["jitter_percent"], acoustic["shimmer_percent"], acoustic["hnr_db"], ood))
' "$WORK/analyze.json" || fail "/analyze response body"

curl -fsS --max-time 5 "$BASE/health" >"$WORK/health2.json" || fail "/health after analyze"
"$PYTHON" -c '
import json, sys
body = json.load(open(sys.argv[1]))
assert body["model_loaded"] is True, body
print("ok   GET /health after analyze reports model_loaded=True")
' "$WORK/health2.json" || fail "/health model_loaded after analyze"

echo "SMOKE PASS"
