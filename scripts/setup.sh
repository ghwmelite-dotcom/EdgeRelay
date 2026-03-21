#!/usr/bin/env bash
# EdgeRelay — First-time Cloudflare setup script
# Run this once to create all required resources
set -euo pipefail

echo "═══════════════════════════════════════════════"
echo "  EdgeRelay — Cloudflare Resource Setup"
echo "═══════════════════════════════════════════════"
echo ""

# ── D1 Database ──────────────────────────────────
echo "→ Creating D1 database..."
DB_OUTPUT=$(wrangler d1 create edgerelay-db 2>&1)
echo "$DB_OUTPUT"
DB_ID=$(echo "$DB_OUTPUT" | grep "database_id" | awk '{print $3}')
echo "  Database ID: $DB_ID"
echo ""

# ── KV Namespaces ────────────────────────────────
echo "→ Creating KV namespace for rate limiting..."
KV_RATE_OUTPUT=$(wrangler kv namespace create RATE_LIMIT 2>&1)
echo "$KV_RATE_OUTPUT"
KV_RATE_ID=$(echo "$KV_RATE_OUTPUT" | grep "id" | head -1 | awk -F'"' '{print $2}')
echo "  Rate Limit KV ID: $KV_RATE_ID"
echo ""

echo "→ Creating KV namespace for sessions..."
KV_SESSIONS_OUTPUT=$(wrangler kv namespace create SESSIONS 2>&1)
echo "$KV_SESSIONS_OUTPUT"
KV_SESSIONS_ID=$(echo "$KV_SESSIONS_OUTPUT" | grep "id" | head -1 | awk -F'"' '{print $2}')
echo "  Sessions KV ID: $KV_SESSIONS_ID"
echo ""

# ── R2 Bucket ────────────────────────────────────
echo "→ Creating R2 bucket..."
wrangler r2 bucket create edgerelay-storage 2>&1 || echo "  (bucket may already exist)"
echo ""

# ── Cloudflare Pages ─────────────────────────────
echo "→ Creating Pages project..."
wrangler pages project create edgerelay-web --production-branch=main 2>&1 || echo "  (project may already exist)"
echo ""

# ── Apply Migrations ─────────────────────────────
echo "→ Applying D1 migrations..."
for migration in migrations/*.sql; do
  echo "  Applying $migration..."
  wrangler d1 execute edgerelay-db --file="$migration" --remote
done
echo ""

# ── Secrets ──────────────────────────────────────
echo "═══════════════════════════════════════════════"
echo "  Resource IDs — Update your wrangler.toml files"
echo "═══════════════════════════════════════════════"
echo ""
echo "  D1 Database ID:      $DB_ID"
echo "  KV Rate Limit ID:    $KV_RATE_ID"
echo "  KV Sessions ID:      $KV_SESSIONS_ID"
echo ""
echo "═══════════════════════════════════════════════"
echo "  Secrets — Run these manually:"
echo "═══════════════════════════════════════════════"
echo ""
echo "  # API Gateway secrets:"
echo "  cd workers/api-gateway"
echo "  wrangler secret put JWT_SECRET"
echo "  wrangler secret put PAYSTACK_SECRET_KEY"
echo ""
echo "  # GitHub Actions secrets (add at repo Settings → Secrets):"
echo "  CLOUDFLARE_API_TOKEN    — Create at dash.cloudflare.com/profile/api-tokens"
echo "  CLOUDFLARE_ACCOUNT_ID   — Found on your Cloudflare dashboard overview"
echo ""
echo "═══════════════════════════════════════════════"
echo "  Next Steps:"
echo "═══════════════════════════════════════════════"
echo ""
echo "  1. Replace PLACEHOLDER_*_ID in all wrangler.toml files with IDs above"
echo "  2. Set secrets (see above)"
echo "  3. Deploy: git push origin main (CI/CD will handle it)"
echo "  4. Create Paystack plans at dashboard.paystack.com"
echo "  5. Update plan_code values in D1 paystack_plans table"
echo ""
echo "Done!"
