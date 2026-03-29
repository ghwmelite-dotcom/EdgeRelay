import { Hono } from 'hono';
import type { ApiResponse } from '@edgerelay/shared';
import type { Env } from '../types.js';

export const referral = new Hono<{ Bindings: Env }>();

// ── Helpers ──────────────────────────────────────────────────────

/** Generate a 6-char referral code using unambiguous chars (no I, O, 0, 1). */
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) code += chars[b % chars.length];
  return code;
}

// ── GET /referral/me — Get user's referral info ──────────────────
referral.get('/me', async (c) => {
  const userId = c.get('userId');

  let user = await c.env.DB.prepare(
    'SELECT id, referral_code FROM users WHERE id = ?',
  )
    .bind(userId)
    .first<{ id: string; referral_code: string | null }>();

  if (!user) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'User not found' } },
      404,
    );
  }

  // Auto-generate referral code if missing
  if (!user.referral_code) {
    const code = generateReferralCode();
    await c.env.DB.prepare('UPDATE users SET referral_code = ? WHERE id = ?')
      .bind(code, userId)
      .run();
    user = { ...user, referral_code: code };
  }

  // Stats
  const [referralCount, totalEarned, pendingAmount] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as cnt FROM users WHERE referred_by = ?')
      .bind(userId)
      .first<{ cnt: number }>(),
    c.env.DB.prepare(
      "SELECT COALESCE(SUM(commission_cents), 0) as total FROM referral_commissions WHERE referrer_user_id = ? AND status = 'paid'",
    )
      .bind(userId)
      .first<{ total: number }>(),
    c.env.DB.prepare(
      "SELECT COALESCE(SUM(commission_cents), 0) as total FROM referral_commissions WHERE referrer_user_id = ? AND status = 'pending'",
    )
      .bind(userId)
      .first<{ total: number }>(),
  ]);

  return c.json<ApiResponse>({
    data: {
      referral_code: user.referral_code,
      referral_link: `https://trademetricspro.com/?ref=${user.referral_code}`,
      total_referrals: referralCount?.cnt ?? 0,
      total_earned_cents: totalEarned?.total ?? 0,
      pending_cents: pendingAmount?.total ?? 0,
    },
    error: null,
  });
});

// ── GET /referral/history — Commission history ───────────────────
referral.get('/history', async (c) => {
  const userId = c.get('userId');

  const { results } = await c.env.DB.prepare(
    `SELECT rc.id, rc.event_type, rc.source_amount_cents, rc.commission_cents, rc.status, rc.created_at,
            u.email as referred_email
     FROM referral_commissions rc
     JOIN users u ON u.id = rc.referred_user_id
     WHERE rc.referrer_user_id = ?
     ORDER BY rc.created_at DESC
     LIMIT 50`,
  )
    .bind(userId)
    .all();

  return c.json<ApiResponse>({ data: results ?? [], error: null });
});
