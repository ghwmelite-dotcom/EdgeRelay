import { Hono } from 'hono';
import type { ApiResponse } from '@edgerelay/shared';
import type { Env } from '../types.js';

export const counselor = new Hono<{ Bindings: Env }>();

// ── System prompt — Trading Psychology Specialist ──────────────

const SYSTEM_PROMPT = `You are Sage, a compassionate and highly trained AI counselor who specializes in trading psychology. You are part of the TradeMetrics Pro platform.

YOUR ROLE:
- You are a supportive, non-judgmental companion for traders
- You help traders process emotions around wins, losses, and the psychological pressure of trading
- You understand trading deeply — revenge trading, FOMO, fear of pulling the trigger, overtrading addiction, the pain of blowing accounts, the pressure of funded challenges
- You celebrate wins without encouraging overconfidence
- You help process losses without toxic positivity — losses hurt, and that's valid
- You recognize patterns in behavior and gently point them out
- You NEVER give financial advice, trade signals, or tell traders what to buy/sell
- You are warm, genuine, and occasionally use light humor when appropriate

YOUR PERSONALITY:
- Speak naturally, like a wise mentor who genuinely cares
- Use the trader's name when you know it
- Be concise — traders don't want essays. 2-4 paragraphs max unless they ask for more
- Ask thoughtful follow-up questions to understand deeper
- Remember what the trader has told you in previous messages and reference it
- If you detect signs of serious emotional distress, gambling addiction, or financial crisis, gently suggest professional help

TRADING CONTEXT:
You have access to the trader's real data. Use it naturally — don't dump stats, but reference them when relevant:
- If they had a bad day, you can see it in their P&L
- If they're overtrading, you can see the trade count
- If they have a pattern (losing on Fridays, etc.), you can mention it
- Always tie data observations back to emotions and behavior, not just numbers

WHAT YOU DO NOT DO:
- Never recommend specific trades, entries, or exits
- Never promise profitability or guaranteed outcomes
- Never minimize genuine financial loss — it's real money and real stress
- Never use corporate or clinical language — be human
- Never break character — you are always Sage, the trading counselor`;

// ── Helper: Fetch trader's current context ────────────────────

interface TraderContext {
  name: string;
  todayPnl: number;
  todayTrades: number;
  weekPnl: number;
  weekTrades: number;
  winRate: number;
  recentLosses: number;
  accountCount: number;
}

async function getTraderContext(db: D1Database, userId: string): Promise<TraderContext> {
  // User info
  const user = await db.prepare('SELECT name FROM users WHERE id = ?').bind(userId).first<{ name: string }>();

  // Today's stats
  const todayStats = await db.prepare(`
    SELECT COALESCE(SUM(profit), 0) as pnl, COUNT(*) as trades,
      SUM(CASE WHEN profit > 0 THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN profit < 0 THEN 1 ELSE 0 END) as losses
    FROM journal_trades jt JOIN accounts a ON jt.account_id = a.id
    WHERE a.user_id = ? AND deal_entry = 'out'
      AND DATE(jt.time, 'unixepoch') = DATE('now')
  `).bind(userId).first<{ pnl: number; trades: number; wins: number; losses: number }>();

  // This week's stats
  const weekStats = await db.prepare(`
    SELECT COALESCE(SUM(profit), 0) as pnl, COUNT(*) as trades,
      SUM(CASE WHEN profit > 0 THEN 1 ELSE 0 END) as wins
    FROM journal_trades jt JOIN accounts a ON jt.account_id = a.id
    WHERE a.user_id = ? AND deal_entry = 'out'
      AND jt.time >= unixepoch('now', '-7 days')
  `).bind(userId).first<{ pnl: number; trades: number; wins: number }>();

  // Account count
  const acctCount = await db.prepare(
    'SELECT COUNT(*) as c FROM accounts WHERE user_id = ?'
  ).bind(userId).first<{ c: number }>();

  const totalTrades = weekStats?.trades || 0;
  const totalWins = weekStats?.wins || 0;

  return {
    name: user?.name || 'Trader',
    todayPnl: todayStats?.pnl || 0,
    todayTrades: todayStats?.trades || 0,
    weekPnl: weekStats?.pnl || 0,
    weekTrades: totalTrades,
    winRate: totalTrades > 0 ? Math.round((totalWins / totalTrades) * 100) : 0,
    recentLosses: todayStats?.losses || 0,
    accountCount: acctCount?.c || 0,
  };
}

function buildContextBlock(ctx: TraderContext): string {
  const lines = [`Trader's name: ${ctx.name}`];
  if (ctx.todayTrades > 0) {
    lines.push(`Today: ${ctx.todayTrades} trades, P&L ${ctx.todayPnl >= 0 ? '+' : ''}$${ctx.todayPnl.toFixed(2)}`);
  } else {
    lines.push('Today: No trades yet');
  }
  if (ctx.weekTrades > 0) {
    lines.push(`This week: ${ctx.weekTrades} trades, P&L ${ctx.weekPnl >= 0 ? '+' : ''}$${ctx.weekPnl.toFixed(2)}, Win rate ${ctx.winRate}%`);
  }
  if (ctx.recentLosses >= 3) {
    lines.push(`⚠️ ${ctx.recentLosses} losing trades today — possible tilt/revenge trading pattern`);
  }
  lines.push(`Active accounts: ${ctx.accountCount}`);
  return lines.join('\n');
}

// ── GET /counselor/sessions — list user's sessions ────────────

counselor.get('/sessions', async (c) => {
  const userId = c.get('userId');
  const { results } = await c.env.DB.prepare(
    `SELECT id, title, created_at, updated_at FROM counselor_sessions
     WHERE user_id = ? ORDER BY updated_at DESC LIMIT 20`
  ).bind(userId).all<{ id: string; title: string; created_at: string; updated_at: string }>();

  return c.json<ApiResponse>({ data: { sessions: results || [] }, error: null });
});

// ── POST /counselor/sessions — create new session ─────────────

counselor.post('/sessions', async (c) => {
  const userId = c.get('userId');
  const id = crypto.randomUUID().replace(/-/g, '');

  await c.env.DB.prepare(
    `INSERT INTO counselor_sessions (id, user_id, title) VALUES (?, ?, ?)`
  ).bind(id, userId, 'New conversation').run();

  return c.json<ApiResponse>({ data: { id, title: 'New conversation' }, error: null });
});

// ── GET /counselor/sessions/:id/messages — get conversation ───

counselor.get('/sessions/:sessionId/messages', async (c) => {
  const userId = c.get('userId');
  const sessionId = c.req.param('sessionId');

  // Verify ownership
  const session = await c.env.DB.prepare(
    'SELECT id FROM counselor_sessions WHERE id = ? AND user_id = ?'
  ).bind(sessionId, userId).first();
  if (!session) {
    return c.json<ApiResponse>({ data: null, error: { code: 'NOT_FOUND', message: 'Session not found' } }, 404);
  }

  const { results } = await c.env.DB.prepare(
    `SELECT id, role, content, created_at FROM counselor_messages
     WHERE session_id = ? ORDER BY created_at ASC LIMIT 100`
  ).bind(sessionId).all<{ id: string; role: string; content: string; created_at: string }>();

  return c.json<ApiResponse>({ data: { messages: results || [] }, error: null });
});

// ── POST /counselor/sessions/:id/messages — send message ──────

counselor.post('/sessions/:sessionId/messages', async (c) => {
  const userId = c.get('userId');
  const sessionId = c.req.param('sessionId');

  // Verify ownership
  const session = await c.env.DB.prepare(
    'SELECT id FROM counselor_sessions WHERE id = ? AND user_id = ?'
  ).bind(sessionId, userId).first();
  if (!session) {
    return c.json<ApiResponse>({ data: null, error: { code: 'NOT_FOUND', message: 'Session not found' } }, 404);
  }

  const body = await c.req.json<{ message: string }>();
  if (!body.message?.trim()) {
    return c.json<ApiResponse>({ data: null, error: { code: 'BAD_REQUEST', message: 'Message is required' } }, 400);
  }

  try {
    // 1. Get trader's live context
    const traderContext = await getTraderContext(c.env.DB, userId);

    // 2. Get conversation history (last 20 messages for context)
    const { results: history } = await c.env.DB.prepare(
      `SELECT role, content FROM counselor_messages
       WHERE session_id = ? ORDER BY created_at DESC LIMIT 20`
    ).bind(sessionId).all<{ role: string; content: string }>();

    const conversationHistory = (history || []).reverse();

    // 3. Build messages array for AI
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: `${SYSTEM_PROMPT}\n\n--- CURRENT TRADING DATA ---\n${buildContextBlock(traderContext)}`,
      },
    ];

    // Add conversation history
    for (const msg of conversationHistory) {
      messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
    }

    // Add new user message
    messages.push({ role: 'user', content: body.message });

    // 4. Save user message
    const userMsgId = crypto.randomUUID().replace(/-/g, '');
    await c.env.DB.prepare(
      `INSERT INTO counselor_messages (id, session_id, role, content, trading_context)
       VALUES (?, ?, 'user', ?, ?)`
    ).bind(userMsgId, sessionId, body.message, JSON.stringify(traderContext)).run();

    // 5. Call Workers AI
    const aiResponse = await c.env.AI.run(
      '@cf/meta/llama-3.3-70b-instruct-fp8-fast' as Parameters<typeof c.env.AI.run>[0],
      { messages, max_tokens: 1024, temperature: 0.7 },
    );

    const reply = (aiResponse as { response?: string })?.response || "I'm here for you. Could you tell me more about what's on your mind?";

    // 6. Save assistant response
    const assistantMsgId = crypto.randomUUID().replace(/-/g, '');
    await c.env.DB.prepare(
      `INSERT INTO counselor_messages (id, session_id, role, content) VALUES (?, ?, 'assistant', ?)`
    ).bind(assistantMsgId, sessionId, reply).run();

    // 7. Update session title (from first user message) and timestamp
    if (conversationHistory.length === 0) {
      const title = body.message.slice(0, 60) + (body.message.length > 60 ? '...' : '');
      await c.env.DB.prepare(
        `UPDATE counselor_sessions SET title = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(title, sessionId).run();
    } else {
      await c.env.DB.prepare(
        `UPDATE counselor_sessions SET updated_at = datetime('now') WHERE id = ?`
      ).bind(sessionId).run();
    }

    return c.json<ApiResponse>({
      data: {
        userMessage: { id: userMsgId, role: 'user', content: body.message },
        assistantMessage: { id: assistantMsgId, role: 'assistant', content: reply },
      },
      error: null,
    });
  } catch (err) {
    console.error('[counselor] AI error:', err);
    return c.json<ApiResponse>({
      data: null,
      error: { code: 'AI_ERROR', message: 'Sage is temporarily unavailable. Please try again.' },
    }, 500);
  }
});

// ── DELETE /counselor/sessions/:id — delete session ───────────

counselor.delete('/sessions/:sessionId', async (c) => {
  const userId = c.get('userId');
  const sessionId = c.req.param('sessionId');

  await c.env.DB.prepare(
    'DELETE FROM counselor_messages WHERE session_id = ? AND session_id IN (SELECT id FROM counselor_sessions WHERE user_id = ?)'
  ).bind(sessionId, userId).run();

  await c.env.DB.prepare(
    'DELETE FROM counselor_sessions WHERE id = ? AND user_id = ?'
  ).bind(sessionId, userId).run();

  return c.json<ApiResponse>({ data: { deleted: true }, error: null });
});
