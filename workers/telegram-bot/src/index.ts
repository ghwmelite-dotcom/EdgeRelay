import { Hono } from 'hono';
import type { Env, TelegramUpdate } from './types';
import { TelegramApi } from './telegram';
import { routeCommand } from './commands';
import { notifySignal, notifyEquityGuard, notifyDisconnect } from './notifications';

const app = new Hono<{ Bindings: Env }>();

// ── POST /webhook — Telegram update handler ───────────────────────
app.post('/webhook', async (c) => {
  // Verify webhook secret
  const secret = c.req.header('X-Telegram-Bot-Api-Secret-Token');
  if (secret !== c.env.TELEGRAM_WEBHOOK_SECRET) {
    return c.text('Unauthorized', 401);
  }

  let update: TelegramUpdate;
  try {
    update = await c.req.json<TelegramUpdate>();
  } catch {
    return c.text('Bad Request', 400);
  }

  // Process asynchronously — respond 200 immediately
  c.executionCtx.waitUntil(handleUpdate(c.env, update));

  return c.text('OK', 200);
});

// ── POST /notify/signal — Internal signal notification ────────────
app.post('/notify/signal', async (c) => {
  try {
    const body = await c.req.json<{
      user_id: string;
      action: string;
      order_type?: string;
      symbol: string;
      volume?: number;
      price?: number;
      sl?: number;
      tp?: number;
      executed_count: number;
      total_followers: number;
      master_alias: string;
    }>();

    const sent = await notifySignal(c.env, body.user_id, {
      action: body.action,
      order_type: body.order_type,
      symbol: body.symbol,
      volume: body.volume,
      price: body.price,
      sl: body.sl,
      tp: body.tp,
      executed_count: body.executed_count,
      total_followers: body.total_followers,
      master_alias: body.master_alias,
    });

    return c.json({ sent });
  } catch (err) {
    console.error('Signal notification error:', err);
    return c.json({ error: 'Failed to send notification' }, 500);
  }
});

// ── POST /notify/equity-guard — Internal equity guard notification
app.post('/notify/equity-guard', async (c) => {
  try {
    const body = await c.req.json<{
      user_id: string;
      account_alias: string;
      reason: string;
    }>();

    const sent = await notifyEquityGuard(c.env, body.user_id, body.account_alias, body.reason);
    return c.json({ sent });
  } catch (err) {
    console.error('Equity guard notification error:', err);
    return c.json({ error: 'Failed to send notification' }, 500);
  }
});

// ── POST /notify/disconnect — Internal disconnect notification ────
app.post('/notify/disconnect', async (c) => {
  try {
    const body = await c.req.json<{
      user_id: string;
      account_alias: string;
    }>();

    const sent = await notifyDisconnect(c.env, body.user_id, body.account_alias);
    return c.json({ sent });
  } catch (err) {
    console.error('Disconnect notification error:', err);
    return c.json({ error: 'Failed to send notification' }, 500);
  }
});

// ── GET /health — Health check ────────────────────────────────────
app.get('/health', (c) => {
  return c.json({ status: 'ok', worker: 'edgerelay-telegram-bot' });
});

// ── Update handler (runs async via waitUntil) ─────────────────────
async function handleUpdate(env: Env, update: TelegramUpdate): Promise<void> {
  const api = new TelegramApi(env.TELEGRAM_BOT_TOKEN);

  try {
    // Handle callback queries
    if (update.callback_query) {
      await api.answerCallbackQuery(update.callback_query.id);
      return;
    }

    // Handle text messages
    const message = update.message;
    if (!message?.text || !message.from) return;

    // Only process commands (messages starting with /)
    if (!message.text.startsWith('/')) return;

    const result = await routeCommand(env, message.from, message.chat.id, message.text);

    await api.sendMessage(message.chat.id, result.text, 'HTML', result.replyMarkup);
  } catch (err) {
    console.error('Error handling update:', err);
  }
}

export default app;
