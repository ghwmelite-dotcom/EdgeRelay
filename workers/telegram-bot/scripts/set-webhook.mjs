// Usage: TELEGRAM_BOT_TOKEN=xxx WEBHOOK_URL=xxx WEBHOOK_SECRET=xxx node scripts/set-webhook.mjs

const token = process.env.TELEGRAM_BOT_TOKEN;
const url = process.env.WEBHOOK_URL || 'https://edgerelay-telegram-bot.ghwmelite.workers.dev/webhook';
const secret = process.env.WEBHOOK_SECRET;

if (!token) {
  console.error('Error: TELEGRAM_BOT_TOKEN is required');
  process.exit(1);
}

if (!secret) {
  console.error('Error: WEBHOOK_SECRET is required');
  process.exit(1);
}

console.log(`Setting webhook to: ${url}`);

const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url, secret_token: secret }),
});

const data = await res.json();
console.log(JSON.stringify(data, null, 2));

if (!data.ok) {
  process.exit(1);
}
