import { Hono } from 'hono';
import type { ApiResponse } from '@edgerelay/shared';
import type { Env } from '../types.js';
import { authMiddleware } from '../middleware/auth.js';

const PAYSTACK_API = 'https://api.paystack.co';

const billing = new Hono<{ Bindings: Env }>();

// ── Helpers ──────────────────────────────────────────────────────

/** Build Authorization header for Paystack API calls. */
function paystackHeaders(secretKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${secretKey}`,
    'Content-Type': 'application/json',
  };
}

/** Hex-encode an ArrayBuffer. */
function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Verify Paystack webhook signature (HMAC-SHA512). */
async function verifyPaystackSignature(
  body: string,
  signature: string,
  secretKey: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  );
  const expected = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  return toHex(expected) === signature;
}

// ── POST /billing/webhook (public) ──────────────────────────────
billing.post('/webhook', async (c) => {
  const signature = c.req.header('x-paystack-signature');
  if (!signature) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Missing Paystack signature header' } },
      400,
    );
  }

  const secretKey = c.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Paystack secret key not configured' } },
      500,
    );
  }

  const body = await c.req.text();

  const valid = await verifyPaystackSignature(body, signature, secretKey);
  if (!valid) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid webhook signature' } },
      401,
    );
  }

  const event = JSON.parse(body) as {
    event: string;
    data: Record<string, unknown>;
  };

  switch (event.event) {
    case 'charge.success': {
      const metadata = event.data.metadata as Record<string, string> | undefined;
      const userId = metadata?.user_id;
      const planTier = metadata?.plan_tier;
      const customerCode = event.data.customer as Record<string, unknown> | undefined;

      // Handle subscription plan upgrade
      if (userId && planTier) {
        await c.env.DB.prepare(
          'UPDATE users SET plan = ?, paystack_customer_code = ?, updated_at = datetime(\'now\') WHERE id = ?',
        )
          .bind(planTier, customerCode?.customer_code ?? null, userId)
          .run();
      }

      // Handle EA generation one-time purchase
      const purchaseType = metadata?.type;
      if (purchaseType === 'ea_generation' && userId) {
        const reference = event.data.reference as string;
        await c.env.DB.prepare(
          'INSERT OR IGNORE INTO ea_generation_credits (user_id, reference, amount_cents) VALUES (?, ?, 199)',
        )
          .bind(userId, reference)
          .run();
        console.log('EA generation credit purchased:', userId, reference);
      }

      console.log('Charge success:', event.data.reference);
      break;
    }

    case 'subscription.create': {
      const subscriptionCode = event.data.subscription_code as string | undefined;
      const customer = event.data.customer as Record<string, unknown> | undefined;
      const customerCode = customer?.customer_code as string | undefined;

      if (customerCode && subscriptionCode) {
        await c.env.DB.prepare(
          'UPDATE users SET paystack_subscription_code = ?, updated_at = datetime(\'now\') WHERE paystack_customer_code = ?',
        )
          .bind(subscriptionCode, customerCode)
          .run();
      }
      console.log('Subscription created:', subscriptionCode);
      break;
    }

    case 'subscription.disable': {
      const customer = event.data.customer as Record<string, unknown> | undefined;
      const customerCode = customer?.customer_code as string | undefined;

      if (customerCode) {
        await c.env.DB.prepare(
          'UPDATE users SET plan = \'free\', paystack_subscription_code = NULL, updated_at = datetime(\'now\') WHERE paystack_customer_code = ?',
        )
          .bind(customerCode)
          .run();
      }
      console.log('Subscription disabled for customer:', customerCode);
      break;
    }

    case 'invoice.payment_failed': {
      console.warn('Invoice payment failed:', event.data.reference);
      break;
    }

    case 'subscription.not_renew': {
      console.warn('Subscription will not renew:', event.data.subscription_code);
      break;
    }

    default:
      console.log('Unhandled Paystack event:', event.event);
  }

  return c.json<ApiResponse>({ data: { received: true }, error: null });
});

// ── GET /billing/plans (public) ─────────────────────────────────
billing.get('/plans', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT tier, plan_name, amount_cents, currency, interval FROM paystack_plans ORDER BY amount_cents ASC',
  ).all();

  return c.json<ApiResponse>({ data: { plans: results }, error: null });
});

// ── All routes below require auth ───────────────────────────────
billing.use('/*', async (c, next) => {
  // Skip auth for webhook and plans (already handled above)
  const path = new URL(c.req.url).pathname;
  if (path.endsWith('/webhook') || path.endsWith('/plans')) {
    return next();
  }
  return authMiddleware(c, next);
});

// ── POST /billing/initialize (auth required) ────────────────────
billing.post('/initialize', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{ plan_tier: string }>();

  const validTiers = ['starter', 'pro', 'unlimited', 'provider'];
  if (!body.plan_tier || !validTiers.includes(body.plan_tier)) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid plan_tier. Must be one of: starter, pro, unlimited, provider' } },
      400,
    );
  }

  // Look up plan from D1
  const plan = await c.env.DB.prepare(
    'SELECT plan_code, amount_cents, currency FROM paystack_plans WHERE tier = ?',
  )
    .bind(body.plan_tier)
    .first<{ plan_code: string; amount_cents: number; currency: string }>();

  if (!plan) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'Plan not found' } },
      404,
    );
  }

  // Look up user email
  const user = await c.env.DB.prepare('SELECT email FROM users WHERE id = ?')
    .bind(userId)
    .first<{ email: string }>();

  if (!user) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'User not found' } },
      404,
    );
  }

  const origin = new URL(c.req.url).origin;

  // Initialize transaction with Paystack
  const res = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: 'POST',
    headers: paystackHeaders(c.env.PAYSTACK_SECRET_KEY),
    body: JSON.stringify({
      email: user.email,
      plan: plan.plan_code,
      amount: plan.amount_cents,
      currency: plan.currency,
      callback_url: `${origin}/billing/callback`,
      metadata: {
        user_id: userId,
        plan_tier: body.plan_tier,
      },
    }),
  });

  const result = (await res.json()) as {
    status: boolean;
    message: string;
    data?: { authorization_url: string; access_code: string; reference: string };
  };

  if (!result.status || !result.data) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'PAYMENT_ERROR', message: result.message || 'Failed to initialize transaction' } },
      502,
    );
  }

  return c.json<ApiResponse>({
    data: {
      authorization_url: result.data.authorization_url,
      access_code: result.data.access_code,
      reference: result.data.reference,
    },
    error: null,
  });
});

// ── GET /billing/verify/:reference (auth required) ──────────────
billing.get('/verify/:reference', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const reference = c.req.param('reference');

  const res = await fetch(`${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`, {
    method: 'GET',
    headers: paystackHeaders(c.env.PAYSTACK_SECRET_KEY),
  });

  const result = (await res.json()) as {
    status: boolean;
    message: string;
    data?: {
      status: string;
      reference: string;
      amount: number;
      currency: string;
      customer: { customer_code: string };
      metadata: { user_id: string; plan_tier: string };
    };
  };

  if (!result.status || !result.data) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'PAYMENT_ERROR', message: result.message || 'Verification failed' } },
      502,
    );
  }

  const txn = result.data;

  // Only activate if transaction was successful and belongs to this user
  if (txn.status === 'success' && txn.metadata?.user_id === userId) {
    await c.env.DB.prepare(
      'UPDATE users SET plan = ?, paystack_customer_code = ?, updated_at = datetime(\'now\') WHERE id = ?',
    )
      .bind(txn.metadata.plan_tier, txn.customer.customer_code, userId)
      .run();
  }

  return c.json<ApiResponse>({
    data: {
      status: txn.status,
      reference: txn.reference,
      amount: txn.amount,
      currency: txn.currency,
    },
    error: null,
  });
});

// ── GET /billing/subscription (auth required) ───────────────────
billing.get('/subscription', authMiddleware, async (c) => {
  const userId = c.get('userId');

  const user = await c.env.DB.prepare(
    'SELECT plan, paystack_subscription_code FROM users WHERE id = ?',
  )
    .bind(userId)
    .first<{ plan: string; paystack_subscription_code: string | null }>();

  if (!user) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'User not found' } },
      404,
    );
  }

  if (!user.paystack_subscription_code) {
    return c.json<ApiResponse>({
      data: { plan: user.plan, subscription: null },
      error: null,
    });
  }

  // Fetch subscription details from Paystack
  const res = await fetch(
    `${PAYSTACK_API}/subscription/${encodeURIComponent(user.paystack_subscription_code)}`,
    {
      method: 'GET',
      headers: paystackHeaders(c.env.PAYSTACK_SECRET_KEY),
    },
  );

  const result = (await res.json()) as {
    status: boolean;
    data?: {
      status: string;
      next_payment_date: string;
      plan: { name: string; amount: number; interval: string };
      email_token: string;
    };
  };

  if (!result.status || !result.data) {
    return c.json<ApiResponse>({
      data: { plan: user.plan, subscription: null },
      error: null,
    });
  }

  return c.json<ApiResponse>({
    data: {
      plan: user.plan,
      subscription: {
        status: result.data.status,
        next_payment_date: result.data.next_payment_date,
        plan_name: result.data.plan.name,
        amount: result.data.plan.amount,
        interval: result.data.plan.interval,
      },
    },
    error: null,
  });
});

// ── POST /billing/cancel (auth required) ────────────────────────
billing.post('/cancel', authMiddleware, async (c) => {
  const userId = c.get('userId');

  const user = await c.env.DB.prepare(
    'SELECT paystack_subscription_code FROM users WHERE id = ?',
  )
    .bind(userId)
    .first<{ paystack_subscription_code: string | null }>();

  if (!user?.paystack_subscription_code) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'No active subscription found' } },
      404,
    );
  }

  const code = user.paystack_subscription_code;

  // Fetch subscription to get email_token for disabling
  const subRes = await fetch(
    `${PAYSTACK_API}/subscription/${encodeURIComponent(code)}`,
    {
      method: 'GET',
      headers: paystackHeaders(c.env.PAYSTACK_SECRET_KEY),
    },
  );

  const subResult = (await subRes.json()) as {
    status: boolean;
    data?: { email_token: string };
  };

  if (!subResult.status || !subResult.data?.email_token) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'PAYMENT_ERROR', message: 'Could not retrieve subscription details for cancellation' } },
      502,
    );
  }

  // Disable the subscription
  const disableRes = await fetch(`${PAYSTACK_API}/subscription/disable`, {
    method: 'POST',
    headers: paystackHeaders(c.env.PAYSTACK_SECRET_KEY),
    body: JSON.stringify({
      code,
      token: subResult.data.email_token,
    }),
  });

  const disableResult = (await disableRes.json()) as { status: boolean; message: string };

  if (!disableResult.status) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'PAYMENT_ERROR', message: disableResult.message || 'Failed to cancel subscription' } },
      502,
    );
  }

  // Downgrade user to free plan
  await c.env.DB.prepare(
    'UPDATE users SET plan = \'free\', paystack_subscription_code = NULL, updated_at = datetime(\'now\') WHERE id = ?',
  )
    .bind(userId)
    .run();

  return c.json<ApiResponse>({ data: { cancelled: true }, error: null });
});

export { billing };
