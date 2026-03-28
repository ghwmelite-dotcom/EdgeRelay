import { Hono } from 'hono';
import type { ApiResponse } from '@edgerelay/shared';
import type { Env } from '../types.js';

export const strategyHub = new Hono<{ Bindings: Env }>();
export const strategyHubPublic = new Hono<{ Bindings: Env }>();

// ── Helpers ─────────────────────────────────────────────────────

/** Deterministic magic number from a slug string */
function magicFromSlug(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = ((hash << 5) - hash + slug.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 900000 + 100000; // 6-digit number
}

interface ParamSchema {
  key: string;
  label: string;
  type: 'int' | 'double' | 'bool' | 'enum';
  default: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  labels?: string[];
  tooltip?: string;
}

function validateParam(schema: ParamSchema, value: unknown): { valid: boolean; coerced: unknown; error?: string } {
  switch (schema.type) {
    case 'int': {
      const n = Number(value);
      if (!Number.isInteger(n)) return { valid: false, coerced: null, error: `${schema.key} must be an integer` };
      if (schema.min !== undefined && n < schema.min) return { valid: false, coerced: null, error: `${schema.key} must be >= ${schema.min}` };
      if (schema.max !== undefined && n > schema.max) return { valid: false, coerced: null, error: `${schema.key} must be <= ${schema.max}` };
      return { valid: true, coerced: n };
    }
    case 'double': {
      const n = Number(value);
      if (isNaN(n)) return { valid: false, coerced: null, error: `${schema.key} must be a number` };
      if (schema.min !== undefined && n < schema.min) return { valid: false, coerced: null, error: `${schema.key} must be >= ${schema.min}` };
      if (schema.max !== undefined && n > schema.max) return { valid: false, coerced: null, error: `${schema.key} must be <= ${schema.max}` };
      return { valid: true, coerced: n };
    }
    case 'bool': {
      if (typeof value === 'boolean') return { valid: true, coerced: value };
      if (value === 'true' || value === 1) return { valid: true, coerced: true };
      if (value === 'false' || value === 0) return { valid: true, coerced: false };
      return { valid: false, coerced: null, error: `${schema.key} must be a boolean` };
    }
    case 'enum': {
      if (!schema.options?.includes(String(value))) {
        return { valid: false, coerced: null, error: `${schema.key} must be one of: ${schema.options?.join(', ')}` };
      }
      return { valid: true, coerced: String(value) };
    }
    default:
      return { valid: true, coerced: value };
  }
}

// ══════════════════════════════════════════════════════════════════
// PUBLIC ROUTES (no auth required)
// ══════════════════════════════════════════════════════════════════

// ── GET /strategy-hub/strategies — List all published strategies ─
strategyHubPublic.get('/strategies', async (c) => {
  const category = c.req.query('category');
  const difficulty = c.req.query('difficulty');

  let whereClause = 'WHERE is_published = true';
  const binds: unknown[] = [];

  if (category && ['trend', 'reversal', 'breakout', 'scalp', 'swing'].includes(category)) {
    whereClause += ' AND category = ?';
    binds.push(category);
  }
  if (difficulty && ['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
    whereClause += ' AND difficulty = ?';
    binds.push(difficulty);
  }

  const { results } = await c.env.DB.prepare(
    `SELECT id, name, slug, description, category, difficulty,
            recommended_pairs, recommended_timeframe, parameters_json,
            backtest_results_json, is_published, created_at
     FROM strategy_templates
     ${whereClause}
     ORDER BY
       CASE difficulty WHEN 'beginner' THEN 1 WHEN 'intermediate' THEN 2 WHEN 'advanced' THEN 3 END,
       name ASC`,
  )
    .bind(...binds)
    .all();

  return c.json<ApiResponse>({ data: results ?? [], error: null });
});

// ── GET /strategy-hub/strategies/:slug — Single strategy detail ──
strategyHubPublic.get('/strategies/:slug', async (c) => {
  const slug = c.req.param('slug');

  const strategy = await c.env.DB.prepare(
    `SELECT id, name, slug, description, category, difficulty,
            recommended_pairs, recommended_timeframe, parameters_json,
            backtest_results_json, is_published, created_at
     FROM strategy_templates
     WHERE slug = ? AND is_published = true`,
  )
    .bind(slug)
    .first();

  if (!strategy) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'Strategy not found' } },
      404,
    );
  }

  return c.json<ApiResponse>({ data: strategy, error: null });
});

// ══════════════════════════════════════════════════════════════════
// PROTECTED ROUTES (auth required)
// ══════════════════════════════════════════════════════════════════

// ── Constants ────────────────────────────────────────────────────
const FREE_GENERATIONS = 3;
const PRICE_PER_GENERATION = 1.99;

// Admin/exempt accounts — unlimited generations
const EXEMPT_EMAILS = ['oh84dev@gmail.com'];

/** Check if user email is in the exempt list. */
async function isExemptUser(db: D1Database, userId: string): Promise<boolean> {
  const user = await db.prepare('SELECT email FROM users WHERE id = ?').bind(userId).first<{ email: string }>();
  return user ? EXEMPT_EMAILS.includes(user.email) : false;
}

/** Get total generated count and purchased credits for a user. */
async function getGenerationCounts(db: D1Database, userId: string) {
  const [genRow, creditRow] = await Promise.all([
    db.prepare('SELECT COUNT(*) as cnt FROM ea_generations WHERE user_id = ?').bind(userId).first<{ cnt: number }>(),
    db.prepare('SELECT COUNT(*) as cnt FROM ea_generation_credits WHERE user_id = ?').bind(userId).first<{ cnt: number }>(),
  ]);
  const totalGenerated = genRow?.cnt ?? 0;
  const totalCredits = creditRow?.cnt ?? 0;
  const allowed = FREE_GENERATIONS + totalCredits;
  const freeRemaining = Math.max(0, allowed - totalGenerated);
  return { totalGenerated, totalCredits, allowed, freeRemaining };
}

// ── GET /strategy-hub/generation-status — Check free/paid status ─
strategyHub.get('/generation-status', async (c) => {
  const userId = c.get('userId');

  // Admin exemption — unlimited generations
  if (await isExemptUser(c.env.DB, userId)) {
    return c.json<ApiResponse>({
      data: {
        total_generated: 0,
        free_remaining: 999,
        free_limit: FREE_GENERATIONS,
        price_per_generation: PRICE_PER_GENERATION,
        requires_payment: false,
        exempt: true,
      },
      error: null,
    });
  }

  const { totalGenerated, freeRemaining } = await getGenerationCounts(c.env.DB, userId);

  return c.json<ApiResponse>({
    data: {
      total_generated: totalGenerated,
      free_remaining: freeRemaining,
      free_limit: FREE_GENERATIONS,
      price_per_generation: PRICE_PER_GENERATION,
      requires_payment: freeRemaining <= 0,
    },
    error: null,
  });
});

// ── POST /strategy-hub/generate — Generate an EA .mq5 file ──────
strategyHub.post('/generate', async (c) => {
  const userId = c.get('userId');

  // Admin exemption — skip limit check entirely
  const exempt = await isExemptUser(c.env.DB, userId);

  if (!exempt) {
    // Check generation limit (free + purchased credits)
    const { totalGenerated, freeRemaining } = await getGenerationCounts(c.env.DB, userId);

    if (freeRemaining <= 0) {
      return c.json<ApiResponse>(
        {
          data: {
            requires_payment: true,
            price: PRICE_PER_GENERATION,
            total_generated: totalGenerated,
            free_limit: FREE_GENERATIONS,
          },
          error: {
            code: 'GENERATION_LIMIT',
            message: `You've used all ${FREE_GENERATIONS} free EA generations. Each additional generation costs $${PRICE_PER_GENERATION.toFixed(2)}.`,
          },
        },
        402,
      );
    }
  }

  const body = await c.req.json<{
    strategy_id: string;
    parameters: Record<string, unknown>;
  }>();

  if (!body.strategy_id || !body.parameters) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'strategy_id and parameters are required' } },
      400,
    );
  }

  // Fetch strategy template (including template_body + integration_block)
  const strategy = await c.env.DB.prepare(
    `SELECT id, name, slug, parameters_json, template_body, integration_block
     FROM strategy_templates
     WHERE id = ? AND is_published = true`,
  )
    .bind(body.strategy_id)
    .first<{
      id: string;
      name: string;
      slug: string;
      parameters_json: string;
      template_body: string;
      integration_block: string;
    }>();

  if (!strategy) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'Strategy not found' } },
      404,
    );
  }

  // Parse parameter schema and validate each submitted param
  const schema: ParamSchema[] = JSON.parse(strategy.parameters_json);
  const validated: Record<string, unknown> = {};
  const errors: string[] = [];

  for (const param of schema) {
    const value = body.parameters[param.key] ?? param.default;
    const result = validateParam(param, value);
    if (!result.valid) {
      errors.push(result.error!);
    } else {
      validated[param.key] = result.coerced;
    }
  }

  if (errors.length > 0) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'VALIDATION_ERROR', message: errors.join('; ') } },
      400,
    );
  }

  // Get user's master account for ACCOUNT_ID and API_KEY
  const masterAccount = await c.env.DB.prepare(
    "SELECT id, api_key FROM accounts WHERE user_id = ? AND role = 'master' AND is_active = true ORDER BY created_at ASC LIMIT 1",
  )
    .bind(userId)
    .first<{ id: string; api_key: string }>();

  if (!masterAccount) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'No active master account found. Set up an account first.' } },
      404,
    );
  }

  // Build the .mq5 file via string substitution
  let output = strategy.template_body;

  // 1. Inject integration block
  output = output.replace('{{TRADEMETRICS_BLOCK}}', strategy.integration_block);

  // 2. Replace strategy name
  output = output.replace(/\{\{STRATEGY_NAME\}\}/g, strategy.name);

  // 3. Generate deterministic magic number
  const magicNumber = magicFromSlug(strategy.slug);
  output = output.replace(/\{\{MAGIC_NUMBER\}\}/g, String(magicNumber));

  // 4. Auto-fill account credentials
  output = output.replace(/\{\{ACCOUNT_ID\}\}/g, masterAccount.id);
  output = output.replace(/\{\{API_KEY\}\}/g, masterAccount.api_key);

  // 5. Replace all parameter placeholders
  for (const [key, value] of Object.entries(validated)) {
    const placeholder = `{{${key}}}`;
    output = output.split(placeholder).join(String(value));
  }

  // Record generation in ea_generations
  await c.env.DB.prepare(
    'INSERT INTO ea_generations (user_id, strategy_id, parameters_json) VALUES (?, ?, ?)',
  )
    .bind(userId, strategy.id, JSON.stringify(validated))
    .run();

  // Return .mq5 as file download
  const filename = `${strategy.slug}-${Date.now()}.mq5`;

  return new Response(output, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});

// ── GET /strategy-hub/my-generations — User's generation history ─
strategyHub.get('/my-generations', async (c) => {
  const userId = c.get('userId');

  const { results } = await c.env.DB.prepare(
    `SELECT eg.id, eg.strategy_id, eg.parameters_json, eg.generated_at,
            st.name as strategy_name, st.slug as strategy_slug, st.category
     FROM ea_generations eg
     JOIN strategy_templates st ON st.id = eg.strategy_id
     WHERE eg.user_id = ?
     ORDER BY eg.generated_at DESC
     LIMIT 50`,
  )
    .bind(userId)
    .all();

  return c.json<ApiResponse>({ data: results ?? [], error: null });
});

// ── POST /strategy-hub/purchase — Initialize a $1.99 Paystack payment for one EA generation ─
strategyHub.post('/purchase', async (c) => {
  const userId = c.get('userId');

  const user = await c.env.DB.prepare('SELECT email FROM users WHERE id = ?')
    .bind(userId)
    .first<{ email: string }>();

  if (!user) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'User not found' } },
      404,
    );
  }

  // Initialize Paystack one-time transaction for $1.99 (199 cents USD)
  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${c.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: user.email,
      amount: 199,
      currency: 'USD',
      callback_url: 'https://trademetricspro.com/app/strategy-hub',
      metadata: {
        user_id: userId,
        type: 'ea_generation',
        credits: '1',
      },
    }),
  });

  const result = await res.json() as {
    status: boolean;
    message: string;
    data?: { authorization_url: string; reference: string };
  };

  if (!result.status || !result.data) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'PAYMENT_ERROR', message: result.message || 'Failed to initialize payment' } },
      502,
    );
  }

  return c.json<ApiResponse>({
    data: {
      authorization_url: result.data.authorization_url,
      reference: result.data.reference,
    },
    error: null,
  });
});
