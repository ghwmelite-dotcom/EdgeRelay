import { Hono } from 'hono';
import type { ApiResponse } from '@edgerelay/shared';
import type { Env } from '../types.js';
import { authMiddleware } from '../middleware/auth.js';

const billing = new Hono<{ Bindings: Env }>();

// ── POST /billing/webhook ───────────────────────────────────────
billing.post('/webhook', async (c) => {
  const signature = c.req.header('stripe-signature');
  if (!signature) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Missing Stripe signature header' } },
      400,
    );
  }

  const body = await c.req.text();

  // Verify Stripe webhook signature using Web Crypto
  const secret = c.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Webhook secret not configured' } },
      500,
    );
  }

  // Parse Stripe signature header: t=timestamp,v1=signature
  const sigParts = signature.split(',');
  const timestamp = sigParts.find((p) => p.startsWith('t='))?.slice(2);
  const sig = sigParts.find((p) => p.startsWith('v1='))?.slice(3);

  if (!timestamp || !sig) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid signature format' } },
      400,
    );
  }

  // Verify signature: HMAC-SHA256(secret, timestamp + "." + body)
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signedPayload = `${timestamp}.${body}`;
  const expectedSig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  const expectedHex = Array.from(new Uint8Array(expectedSig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (expectedHex !== sig) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid webhook signature' } },
      401,
    );
  }

  // Check timestamp freshness (within 5 minutes)
  const eventAge = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10));
  if (eventAge > 300) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Webhook timestamp too old' } },
      400,
    );
  }

  // Parse and handle event
  const event = JSON.parse(body) as { type: string; data: { object: Record<string, unknown> } };

  switch (event.type) {
    case 'checkout.session.completed': {
      // TODO: Provision subscription, update user plan
      console.log('Checkout completed:', event.data.object.id);
      break;
    }
    case 'customer.subscription.updated': {
      // TODO: Update user plan based on subscription
      console.log('Subscription updated:', event.data.object.id);
      break;
    }
    case 'customer.subscription.deleted': {
      // TODO: Downgrade user to free plan
      console.log('Subscription deleted:', event.data.object.id);
      break;
    }
    case 'invoice.payment_failed': {
      // TODO: Notify user of failed payment
      console.log('Payment failed:', event.data.object.id);
      break;
    }
    default:
      console.log('Unhandled Stripe event:', event.type);
  }

  return c.json<ApiResponse>({ data: { received: true }, error: null });
});

// ── GET /billing/portal (auth required) ─────────────────────────
billing.get('/portal', authMiddleware, async (c) => {
  const userId = c.get('userId');

  const user = await c.env.DB.prepare(
    'SELECT stripe_customer_id FROM users WHERE id = ?',
  )
    .bind(userId)
    .first<{ stripe_customer_id: string | null }>();

  if (!user?.stripe_customer_id) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'No billing account found. Please subscribe first.' } },
      404,
    );
  }

  // TODO: Call Stripe API to create billing portal session
  // For now, return a placeholder
  return c.json<ApiResponse>({
    data: {
      url: `https://billing.stripe.com/p/session/placeholder_${user.stripe_customer_id}`,
      message: 'Stripe billing portal integration pending',
    },
    error: null,
  });
});

export { billing };
