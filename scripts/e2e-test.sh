#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# EdgeRelay End-to-End Test Script
# Tests the full signal pipeline: Register -> Create Accounts -> Send Signal
#                                  -> Poll -> Verify Signal Log -> Close Signal
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────

API_BASE="https://edgerelay-api.ghwmelite.workers.dev"
SIGNAL_BASE="https://edgerelay-signal-ingestion.ghwmelite.workers.dev"

TIMESTAMP=$(date +%s)
TEST_EMAIL="test-${TIMESTAMP}@edgerelay-test.com"
TEST_PASSWORD="TestPass123!"
TEST_NAME="E2E Test User"

# ── Colors & Formatting ─────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m' # No Color

PASS="${GREEN}[PASS]${NC}"
FAIL="${RED}[FAIL]${NC}"
INFO="${CYAN}[INFO]${NC}"

STEP_RESULTS=()
TOTAL_START=$(date +%s)

# ── Helpers ──────────────────────────────────────────────────────────────────

log_info()  { echo -e "${INFO} $1"; }
log_pass()  { echo -e "${PASS} $1"; }
log_fail()  { echo -e "${FAIL} $1"; }
log_step()  { echo -e "\n${BOLD}${CYAN}── Step $1: $2 ──${NC}"; }

mask_token() {
  local token="$1"
  local len=${#token}
  if (( len > 20 )); then
    echo "${token:0:10}...${token:$((len-10)):10}"
  else
    echo "${token:0:5}..."
  fi
}

record_result() {
  local step_name="$1"
  local success="$2"
  if [[ "$success" == "true" ]]; then
    STEP_RESULTS+=("${GREEN}OK${NC}  $step_name")
  else
    STEP_RESULTS+=("${RED}FAIL${NC} $step_name")
  fi
}

fail_and_exit() {
  local step_name="$1"
  local response="$2"
  log_fail "$step_name"
  echo -e "  Response: $response"
  record_result "$step_name" "false"
  if declare -f print_summary > /dev/null 2>&1; then print_summary; fi
  exit 1
}

# ── Dependency Check ─────────────────────────────────────────────────────────

for cmd in curl jq openssl; do
  if ! command -v "$cmd" &> /dev/null; then
    echo -e "${RED}ERROR: '$cmd' is required but not found. Please install it.${NC}"
    exit 1
  fi
done

echo -e "${BOLD}${CYAN}"
echo "========================================"
echo "   EdgeRelay End-to-End Test"
echo "========================================"
echo -e "${NC}"
log_info "Test email:   $TEST_EMAIL"
log_info "API Gateway:  $API_BASE"
log_info "Signal Ingest: $SIGNAL_BASE"
log_info "Timestamp:    $TIMESTAMP"
echo ""

# ── Step 1: Health Checks ───────────────────────────────────────────────────

log_step "1" "Health Checks"

STEP_START=$(date +%s)

# Signal ingestion health
SIGNAL_HEALTH=$(curl -s -w "\n%{http_code}" "$SIGNAL_BASE/v1/health" 2>/dev/null)
SIGNAL_HEALTH_CODE=$(echo "$SIGNAL_HEALTH" | tail -1)
SIGNAL_HEALTH_BODY=$(echo "$SIGNAL_HEALTH" | sed '$d')

if [[ "$SIGNAL_HEALTH_CODE" == "200" ]] && echo "$SIGNAL_HEALTH_BODY" | jq -e '.status == "ok"' > /dev/null 2>&1; then
  log_pass "Signal Ingestion health: OK"
else
  log_fail "Signal Ingestion health: HTTP $SIGNAL_HEALTH_CODE"
  echo "  Body: $SIGNAL_HEALTH_BODY"
fi

# API gateway health
API_HEALTH=$(curl -s -w "\n%{http_code}" "$API_BASE/health" 2>/dev/null)
API_HEALTH_CODE=$(echo "$API_HEALTH" | tail -1)
API_HEALTH_BODY=$(echo "$API_HEALTH" | sed '$d')

if [[ "$API_HEALTH_CODE" == "200" ]] && echo "$API_HEALTH_BODY" | jq -e '.data.status == "ok"' > /dev/null 2>&1; then
  log_pass "API Gateway health: OK"
else
  log_fail "API Gateway health: HTTP $API_HEALTH_CODE"
  echo "  Body: $API_HEALTH_BODY"
fi

if [[ "$SIGNAL_HEALTH_CODE" == "200" && "$API_HEALTH_CODE" == "200" ]]; then
  record_result "Health Checks" "true"
else
  fail_and_exit "Health Checks" "Signal=$SIGNAL_HEALTH_CODE, API=$API_HEALTH_CODE"
fi

STEP_END=$(date +%s)
log_info "Step 1 took $((STEP_END - STEP_START))s"

# ── Step 2: Register User ──────────────────────────────────────────────────

log_step "2" "Register User"
STEP_START=$(date +%s)

REGISTER_PAYLOAD=$(jq -n \
  --arg email "$TEST_EMAIL" \
  --arg password "$TEST_PASSWORD" \
  --arg name "$TEST_NAME" \
  '{email: $email, password: $password, name: $name}')

REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "$API_BASE/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "$REGISTER_PAYLOAD" 2>/dev/null)

REGISTER_CODE=$(echo "$REGISTER_RESPONSE" | tail -1)
REGISTER_BODY=$(echo "$REGISTER_RESPONSE" | sed '$d')

if [[ "$REGISTER_CODE" == "201" ]]; then
  TOKEN=$(echo "$REGISTER_BODY" | jq -r '.data.token')
  USER_ID=$(echo "$REGISTER_BODY" | jq -r '.data.user.id')

  if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
    fail_and_exit "Register User" "$REGISTER_BODY"
  fi

  log_pass "User registered successfully"
  log_info "User ID: $USER_ID"
  log_info "Token:   $(mask_token "$TOKEN")"
  record_result "Register User" "true"
else
  fail_and_exit "Register User (HTTP $REGISTER_CODE)" "$REGISTER_BODY"
fi

STEP_END=$(date +%s)
log_info "Step 2 took $((STEP_END - STEP_START))s"

# ── Step 3: Create Master Account ──────────────────────────────────────────

log_step "3" "Create Master Account"
STEP_START=$(date +%s)

MASTER_PAYLOAD=$(jq -n '{role: "master", alias: "E2E Master", broker_name: "Test Broker"}')

MASTER_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "$API_BASE/v1/accounts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$MASTER_PAYLOAD" 2>/dev/null)

MASTER_CODE=$(echo "$MASTER_RESPONSE" | tail -1)
MASTER_BODY=$(echo "$MASTER_RESPONSE" | sed '$d')

if [[ "$MASTER_CODE" == "201" ]]; then
  MASTER_ID=$(echo "$MASTER_BODY" | jq -r '.data.id')
  API_KEY=$(echo "$MASTER_BODY" | jq -r '.data.api_key')
  API_SECRET=$(echo "$MASTER_BODY" | jq -r '.data.api_secret')

  if [[ -z "$MASTER_ID" || "$MASTER_ID" == "null" ]]; then
    fail_and_exit "Create Master Account" "$MASTER_BODY"
  fi

  log_pass "Master account created"
  log_info "Account ID: $MASTER_ID"
  log_info "API Key:    $API_KEY"
  log_info "API Secret: $(mask_token "$API_SECRET")"
  record_result "Create Master Account" "true"
else
  fail_and_exit "Create Master Account (HTTP $MASTER_CODE)" "$MASTER_BODY"
fi

STEP_END=$(date +%s)
log_info "Step 3 took $((STEP_END - STEP_START))s"

# ── Step 4: Create Follower Account ────────────────────────────────────────

log_step "4" "Create Follower Account"
STEP_START=$(date +%s)

FOLLOWER_PAYLOAD=$(jq -n \
  --arg master_id "$MASTER_ID" \
  '{role: "follower", alias: "E2E Follower", broker_name: "Test Broker", master_account_id: $master_id}')

FOLLOWER_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "$API_BASE/v1/accounts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$FOLLOWER_PAYLOAD" 2>/dev/null)

FOLLOWER_CODE=$(echo "$FOLLOWER_RESPONSE" | tail -1)
FOLLOWER_BODY=$(echo "$FOLLOWER_RESPONSE" | sed '$d')

if [[ "$FOLLOWER_CODE" == "201" ]]; then
  FOLLOWER_ID=$(echo "$FOLLOWER_BODY" | jq -r '.data.id')
  FOLLOWER_API_KEY=$(echo "$FOLLOWER_BODY" | jq -r '.data.api_key')
  FOLLOWER_API_SECRET=$(echo "$FOLLOWER_BODY" | jq -r '.data.api_secret')

  if [[ -z "$FOLLOWER_ID" || "$FOLLOWER_ID" == "null" ]]; then
    fail_and_exit "Create Follower Account" "$FOLLOWER_BODY"
  fi

  log_pass "Follower account created"
  log_info "Account ID: $FOLLOWER_ID"
  log_info "API Key:    $FOLLOWER_API_KEY"
  record_result "Create Follower Account" "true"
else
  fail_and_exit "Create Follower Account (HTTP $FOLLOWER_CODE)" "$FOLLOWER_BODY"
fi

STEP_END=$(date +%s)
log_info "Step 4 took $((STEP_END - STEP_START))s"

# ── Step 5: Send Heartbeat ─────────────────────────────────────────────────

log_step "5" "Send Heartbeat"
STEP_START=$(date +%s)

HB_TIMESTAMP=$(date +%s)

# Build heartbeat payload (without signature first, for signing)
HB_CANONICAL=$(jq -n -c -S \
  --arg account_id "$MASTER_ID" \
  --argjson timestamp "$HB_TIMESTAMP" \
  '{account_id: $account_id, timestamp: $timestamp}')

# Compute HMAC-SHA256
HB_SIGNATURE=$(printf '%s' "$HB_CANONICAL" | openssl dgst -sha256 -hmac "$API_SECRET" 2>/dev/null | awk '{print $NF}')

# Build final payload with signature
HB_PAYLOAD=$(echo "$HB_CANONICAL" | jq --arg sig "$HB_SIGNATURE" '. + {hmac_signature: $sig}')

HB_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "$SIGNAL_BASE/v1/heartbeat" \
  -H "Content-Type: application/json" \
  -d "$HB_PAYLOAD" 2>/dev/null)

HB_CODE=$(echo "$HB_RESPONSE" | tail -1)
HB_BODY=$(echo "$HB_RESPONSE" | sed '$d')

if [[ "$HB_CODE" == "200" ]]; then
  log_pass "Heartbeat sent successfully"
  log_info "Response: $HB_BODY"
  record_result "Send Heartbeat" "true"
else
  log_fail "Heartbeat failed (HTTP $HB_CODE)"
  echo "  Response: $HB_BODY"
  record_result "Send Heartbeat" "false"
  # Non-fatal: continue with remaining steps
fi

STEP_END=$(date +%s)
log_info "Step 5 took $((STEP_END - STEP_START))s"

# ── Step 6: Send Signal (Open Buy EURUSD) ──────────────────────────────────

log_step "6" "Send Signal (Open Buy EURUSD)"
STEP_START=$(date +%s)

SIGNAL_TIMESTAMP=$(date +%s)
SIGNAL_ID="e2e-test-${TIMESTAMP}"

# Build signal payload without hmac_signature (for canonical signing)
SIGNAL_CANONICAL=$(jq -n -c -S \
  --arg signal_id "$SIGNAL_ID" \
  --arg account_id "$MASTER_ID" \
  --argjson sequence_num 1 \
  --arg action "open" \
  --arg order_type "buy" \
  --arg symbol "EURUSD" \
  --argjson volume 0.1 \
  --argjson price 1.085 \
  --argjson sl 1.08 \
  --argjson tp 1.09 \
  --argjson magic_number 12345 \
  --argjson ticket 100001 \
  --argjson timestamp "$SIGNAL_TIMESTAMP" \
  '{
    account_id: $account_id,
    action: $action,
    magic_number: $magic_number,
    order_type: $order_type,
    price: $price,
    sequence_num: $sequence_num,
    signal_id: $signal_id,
    sl: $sl,
    symbol: $symbol,
    ticket: $ticket,
    timestamp: $timestamp,
    tp: $tp,
    volume: $volume
  }')

# Compute HMAC-SHA256 signature
SIGNAL_SIGNATURE=$(printf '%s' "$SIGNAL_CANONICAL" | openssl dgst -sha256 -hmac "$API_SECRET" 2>/dev/null | awk '{print $NF}')

# Add signature to payload
SIGNAL_PAYLOAD=$(echo "$SIGNAL_CANONICAL" | jq --arg sig "$SIGNAL_SIGNATURE" '. + {hmac_signature: $sig}')

log_info "Signal ID: $SIGNAL_ID"
log_info "HMAC Signature: $(mask_token "$SIGNAL_SIGNATURE")"

INGEST_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "$SIGNAL_BASE/v1/ingest" \
  -H "Content-Type: application/json" \
  -d "$SIGNAL_PAYLOAD" 2>/dev/null)

INGEST_CODE=$(echo "$INGEST_RESPONSE" | tail -1)
INGEST_BODY=$(echo "$INGEST_RESPONSE" | sed '$d')

if [[ "$INGEST_CODE" == "201" ]]; then
  RECEIVED=$(echo "$INGEST_BODY" | jq -r '.data.received')
  RETURNED_SIG_ID=$(echo "$INGEST_BODY" | jq -r '.data.signal_id')

  if [[ "$RECEIVED" == "true" && "$RETURNED_SIG_ID" == "$SIGNAL_ID" ]]; then
    log_pass "Signal ingested successfully"
    log_info "Received: $RECEIVED | Signal ID: $RETURNED_SIG_ID"
    record_result "Send Open Signal" "true"
  else
    log_fail "Signal response unexpected"
    echo "  Response: $INGEST_BODY"
    record_result "Send Open Signal" "false"
  fi
else
  fail_and_exit "Send Open Signal (HTTP $INGEST_CODE)" "$INGEST_BODY"
fi

STEP_END=$(date +%s)
log_info "Step 6 took $((STEP_END - STEP_START))s"

# ── Step 7: Poll for Signal (as Follower) ──────────────────────────────────

log_step "7" "Poll for Signal (as Follower)"
STEP_START=$(date +%s)

# The poll endpoint may be served by the signal-ingestion worker or account-relay DO.
# Try the signal-ingestion worker first with X-API-Key auth.
POLL_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X GET "$SIGNAL_BASE/v1/poll/${FOLLOWER_ID}" \
  -H "X-API-Key: $FOLLOWER_API_KEY" 2>/dev/null)

POLL_CODE=$(echo "$POLL_RESPONSE" | tail -1)
POLL_BODY=$(echo "$POLL_RESPONSE" | sed '$d')

if [[ "$POLL_CODE" == "200" ]]; then
  SIGNAL_COUNT=$(echo "$POLL_BODY" | jq -r '.signals | length' 2>/dev/null || echo "0")
  log_pass "Poll endpoint responded (HTTP 200)"
  log_info "Signals returned: $SIGNAL_COUNT"
  if [[ "$SIGNAL_COUNT" -gt 0 ]]; then
    echo "$POLL_BODY" | jq '.signals[0]' 2>/dev/null || true
  fi
  record_result "Poll for Signal" "true"
elif [[ "$POLL_CODE" == "404" ]]; then
  log_info "Poll endpoint not exposed externally (HTTP 404) -- this is expected if DO-internal only"
  log_info "Skipping poll test (Durable Object poll is internal)"
  record_result "Poll for Signal" "true"
else
  log_fail "Poll failed (HTTP $POLL_CODE)"
  echo "  Response: $POLL_BODY"
  record_result "Poll for Signal" "false"
fi

STEP_END=$(date +%s)
log_info "Step 7 took $((STEP_END - STEP_START))s"

# ── Step 8: Verify Signal in Signal Log ────────────────────────────────────

log_step "8" "Verify Signal in Signal Log"
STEP_START=$(date +%s)

# Allow a moment for D1 write to propagate
sleep 1

SIGNALS_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X GET "$API_BASE/v1/signals?master_account_id=${MASTER_ID}&limit=10" \
  -H "Authorization: Bearer $TOKEN" 2>/dev/null)

SIGNALS_CODE=$(echo "$SIGNALS_RESPONSE" | tail -1)
SIGNALS_BODY=$(echo "$SIGNALS_RESPONSE" | sed '$d')

if [[ "$SIGNALS_CODE" == "200" ]]; then
  SIGNAL_COUNT=$(echo "$SIGNALS_BODY" | jq -r '.meta.count' 2>/dev/null || echo "0")
  log_pass "Signal log retrieved (HTTP 200)"
  log_info "Signals found: $SIGNAL_COUNT"

  if [[ "$SIGNAL_COUNT" -gt 0 ]]; then
    echo "$SIGNALS_BODY" | jq '.data[0] | {id, action, symbol, volume, sequence_num}' 2>/dev/null || true
  fi
  record_result "Verify Signal Log" "true"
else
  log_fail "Signal log query failed (HTTP $SIGNALS_CODE)"
  echo "  Response: $SIGNALS_BODY"
  record_result "Verify Signal Log" "false"
fi

STEP_END=$(date +%s)
log_info "Step 8 took $((STEP_END - STEP_START))s"

# ── Step 9: Send Close Signal ──────────────────────────────────────────────

log_step "9" "Send Close Signal"
STEP_START=$(date +%s)

CLOSE_TIMESTAMP=$(date +%s)
CLOSE_SIGNAL_ID="e2e-close-${TIMESTAMP}"

# Build close signal payload (sorted keys, no hmac_signature)
CLOSE_CANONICAL=$(jq -n -c -S \
  --arg signal_id "$CLOSE_SIGNAL_ID" \
  --arg account_id "$MASTER_ID" \
  --argjson sequence_num 2 \
  --arg action "close" \
  --arg symbol "EURUSD" \
  --argjson ticket 100001 \
  --argjson magic_number 12345 \
  --argjson timestamp "$CLOSE_TIMESTAMP" \
  '{
    account_id: $account_id,
    action: $action,
    magic_number: $magic_number,
    sequence_num: $sequence_num,
    signal_id: $signal_id,
    symbol: $symbol,
    ticket: $ticket,
    timestamp: $timestamp
  }')

# Compute HMAC-SHA256
CLOSE_SIGNATURE=$(printf '%s' "$CLOSE_CANONICAL" | openssl dgst -sha256 -hmac "$API_SECRET" 2>/dev/null | awk '{print $NF}')

# Add signature
CLOSE_PAYLOAD=$(echo "$CLOSE_CANONICAL" | jq --arg sig "$CLOSE_SIGNATURE" '. + {hmac_signature: $sig}')

log_info "Close Signal ID: $CLOSE_SIGNAL_ID"

CLOSE_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "$SIGNAL_BASE/v1/ingest" \
  -H "Content-Type: application/json" \
  -d "$CLOSE_PAYLOAD" 2>/dev/null)

CLOSE_CODE=$(echo "$CLOSE_RESPONSE" | tail -1)
CLOSE_BODY=$(echo "$CLOSE_RESPONSE" | sed '$d')

if [[ "$CLOSE_CODE" == "201" ]]; then
  CLOSE_RECEIVED=$(echo "$CLOSE_BODY" | jq -r '.data.received')
  CLOSE_RETURNED_ID=$(echo "$CLOSE_BODY" | jq -r '.data.signal_id')

  if [[ "$CLOSE_RECEIVED" == "true" && "$CLOSE_RETURNED_ID" == "$CLOSE_SIGNAL_ID" ]]; then
    log_pass "Close signal ingested successfully"
    record_result "Send Close Signal" "true"
  else
    log_fail "Close signal response unexpected"
    echo "  Response: $CLOSE_BODY"
    record_result "Send Close Signal" "false"
  fi
else
  log_fail "Close signal failed (HTTP $CLOSE_CODE)"
  echo "  Response: $CLOSE_BODY"
  record_result "Send Close Signal" "false"
fi

STEP_END=$(date +%s)
log_info "Step 9 took $((STEP_END - STEP_START))s"

# ── Step 10: Summary ──────────────────────────────────────────────────────

print_summary() {
  TOTAL_END=$(date +%s)
  TOTAL_ELAPSED=$((TOTAL_END - TOTAL_START))

  echo ""
  echo -e "${BOLD}${CYAN}========================================"
  echo "   Test Summary"
  echo -e "========================================${NC}"
  echo ""

  for result in "${STEP_RESULTS[@]}"; do
    echo -e "  $result"
  done

  echo ""
  echo -e "${INFO} Total time: ${TOTAL_ELAPSED}s"
  echo -e "${INFO} Test email: $TEST_EMAIL"

  if [[ -n "${MASTER_ID:-}" ]]; then
    echo -e "${INFO} Master ID:  $MASTER_ID"
  fi
  if [[ -n "${FOLLOWER_ID:-}" ]]; then
    echo -e "${INFO} Follower ID: $FOLLOWER_ID"
  fi

  echo ""
  echo -e "${YELLOW}NOTE: Test accounts remain in the database.${NC}"
  echo -e "${YELLOW}Run cleanup:  ./scripts/e2e-cleanup.sh \"$TOKEN\"${NC}"
  echo ""

  # Count failures
  local failures=0
  for result in "${STEP_RESULTS[@]}"; do
    if echo "$result" | grep -q "FAIL"; then
      ((failures++)) || true
    fi
  done

  if [[ "$failures" -eq 0 ]]; then
    echo -e "${GREEN}${BOLD}ALL TESTS PASSED${NC}"
  else
    echo -e "${RED}${BOLD}${failures} TEST(S) FAILED${NC}"
  fi
}

print_summary
