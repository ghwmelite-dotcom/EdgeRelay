import { shouldNotify, sendTelegramMessage } from '@edgerelay/shared';
import type { Env } from '../types.js';

export async function notifyLogin(env: Env, userId: string, timestamp: string): Promise<void> {
  const { shouldSend, chatId } = await shouldNotify(env.DB, env.BOT_STATE, userId, 'login_alerts');
  if (!shouldSend || !chatId) return;

  const message = [
    '🔐 <b>New Login Detected</b>',
    '',
    `⏰ Time: ${timestamp}`,
    '',
    "If this wasn't you, change your password immediately:",
    'https://trademetricspro.com/settings',
  ].join('\n');

  await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, message);
}
