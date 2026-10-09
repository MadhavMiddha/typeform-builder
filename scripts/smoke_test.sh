#!/usr/bin/env bash
set -u
BASE_URL="${1:-http://localhost:8000}"
BASE_URL="${BASE_URL%/}"
API="${BASE_URL}/api"
failures=0
pass() { printf 'PASS %s\n' "$1"; }
fail() { printf 'FAIL %s: %s\n' "$1" "$2"; failures=$((failures + 1)); }

curl -fsS "${API}/health" >/dev/null 2>&1 && pass "health" || fail "health" "request failed"
forms="$(curl -fsS "${API}/forms" 2>/dev/null)" && pass "list forms" || fail "list forms" "request failed"
slug="$(printf '%s' "${forms:-}" | sed -n 's/.*"public_id":"\([^"]*\)".*/\1/p' | head -n1)"
if [ -z "$slug" ]; then
  fail "public form" "no public_id returned"
else
  form="$(curl -fsS "${API}/public/forms/${slug}" 2>/dev/null)" &&
    pass "fetch public form" || fail "fetch public form" "request failed"
  answers="$(FORM_JSON="$form" node -e 'const f=JSON.parse(process.env.FORM_JSON); console.log(JSON.stringify(f.questions.map(q => ({question_id:q.id,value:q.type==="email"?"smoke@example.com":q.type==="number"?1:q.type==="yes_no"?true:q.type==="rating"?1:(q.type==="multiple_choice"||q.type==="dropdown")?[q.options[0].id]:"Smoke test"}))))')"
  curl -fsS -X POST "${API}/public/forms/${slug}/responses" -H 'Content-Type: application/json' --data "{\"answers\":${answers}}" >/dev/null 2>&1 &&
    pass "submit valid response" || fail "submit valid response" "request failed"
  invalid_status="$(curl -sS -o /dev/null -w '%{http_code}' -X POST "${API}/public/forms/${slug}/responses" -H 'Content-Type: application/json' --data '{"answers":[{"question_id":-1,"value":"invalid"}]}')"
  [ "$invalid_status" = "422" ] && pass "reject invalid response" || fail "reject invalid response" "expected 422, got ${invalid_status}"
  form_id="$(printf '%s' "${forms}" | sed -n 's/.*"id":\([0-9]*\).*"public_id":"'"${slug}"'".*/\1/p' | head -n1)"
  if [ -n "$form_id" ]; then
    curl -fsS "${API}/forms/${form_id}/summary" >/dev/null 2>&1 && pass "fetch summary" || fail "fetch summary" "request failed"
  else
    fail "fetch summary" "could not identify form id"
  fi
fi
[ "$failures" -eq 0 ]
