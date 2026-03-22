#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# EdgeRelay E2E Cleanup Script
# Deactivates test accounts created during an E2E test run.
#
# Usage: ./scripts/e2e-cleanup.sh <JWT_TOKEN>
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

API_BASE="https://edgerelay-api.ghwmelite.workers.dev"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

if [[ $# -lt 1 ]]; then
  echo -e "${RED}Usage: $0 <JWT_TOKEN>${NC}"
  echo ""
  echo "The JWT token is printed at the end of e2e-test.sh output."
  exit 1
fi

TOKEN="$1"

for cmd in curl jq; do
  if ! command -v "$cmd" &> /dev/null; then
    echo -e "${RED}ERROR: '$cmd' is required but not found.${NC}"
    exit 1
  fi
done

echo -e "${BOLD}${CYAN}EdgeRelay E2E Cleanup${NC}"
echo ""

# ── Fetch all accounts for this user ────────────────────────────────────────

echo -e "${CYAN}[INFO]${NC} Fetching accounts..."

ACCOUNTS_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X GET "$API_BASE/v1/accounts" \
  -H "Authorization: Bearer $TOKEN" 2>/dev/null)

ACCOUNTS_CODE=$(echo "$ACCOUNTS_RESPONSE" | tail -1)
ACCOUNTS_BODY=$(echo "$ACCOUNTS_RESPONSE" | sed '$d')

if [[ "$ACCOUNTS_CODE" != "200" ]]; then
  echo -e "${RED}[FAIL]${NC} Failed to fetch accounts (HTTP $ACCOUNTS_CODE)"
  echo "  Response: $ACCOUNTS_BODY"
  exit 1
fi

ACCOUNT_IDS=$(echo "$ACCOUNTS_BODY" | jq -r '.data[] | select(.is_active == true or .is_active == 1) | .id' 2>/dev/null)

if [[ -z "$ACCOUNT_IDS" ]]; then
  echo -e "${GREEN}[PASS]${NC} No active accounts found. Nothing to clean up."
  exit 0
fi

ACCOUNT_COUNT=$(echo "$ACCOUNT_IDS" | wc -l | tr -d ' ')
echo -e "${CYAN}[INFO]${NC} Found $ACCOUNT_COUNT active account(s) to deactivate."
echo ""

# ── Deactivate each account ────────────────────────────────────────────────

DELETED=0
FAILED=0

while IFS= read -r ACCOUNT_ID; do
  [[ -z "$ACCOUNT_ID" ]] && continue

  DEL_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X DELETE "$API_BASE/v1/accounts/$ACCOUNT_ID" \
    -H "Authorization: Bearer $TOKEN" 2>/dev/null)

  DEL_CODE=$(echo "$DEL_RESPONSE" | tail -1)
  DEL_BODY=$(echo "$DEL_RESPONSE" | sed '$d')

  if [[ "$DEL_CODE" == "200" ]]; then
    echo -e "  ${GREEN}[OK]${NC}   Deactivated: $ACCOUNT_ID"
    ((DELETED++))
  else
    echo -e "  ${RED}[FAIL]${NC} Failed to deactivate $ACCOUNT_ID (HTTP $DEL_CODE)"
    echo "         $DEL_BODY"
    ((FAILED++))
  fi
done <<< "$ACCOUNT_IDS"

# ── Logout ──────────────────────────────────────────────────────────────────

echo ""
echo -e "${CYAN}[INFO]${NC} Logging out session..."

LOGOUT_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "$API_BASE/v1/auth/logout" \
  -H "Authorization: Bearer $TOKEN" 2>/dev/null)

LOGOUT_CODE=$(echo "$LOGOUT_RESPONSE" | tail -1)

if [[ "$LOGOUT_CODE" == "200" ]]; then
  echo -e "${GREEN}[PASS]${NC} Session logged out"
else
  echo -e "${RED}[FAIL]${NC} Logout failed (HTTP $LOGOUT_CODE)"
fi

# ── Summary ─────────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}Cleanup Summary:${NC}"
echo -e "  Deactivated: $DELETED"
echo -e "  Failed:      $FAILED"
echo ""

if [[ "$FAILED" -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}Cleanup complete.${NC}"
else
  echo -e "${RED}${BOLD}Cleanup completed with $FAILED failure(s).${NC}"
  exit 1
fi
