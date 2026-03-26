import type { Env } from './types.js';

interface FirmToCheck {
  firm_name: string;
  rules_page_url: string;
  rules_page_selector: string | null;
}

// -- Helpers -----------------------------------------------

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function extractFullText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function computeDiff(prev: string, curr: string): {
  added: string[];
  removed: string[];
  summary: string;
  linesAdded: number;
  linesRemoved: number;
} {
  const prevLines = new Set(prev.split('\n').map((l) => l.trim()).filter(Boolean));
  const currLines = new Set(curr.split('\n').map((l) => l.trim()).filter(Boolean));

  const added: string[] = [];
  const removed: string[] = [];

  for (const line of currLines) {
    if (!prevLines.has(line)) added.push(line);
  }
  for (const line of prevLines) {
    if (!currLines.has(line)) removed.push(line);
  }

  const summaryParts: string[] = [];
  for (const line of removed.slice(0, 5)) summaryParts.push(`- ${line}`);
  for (const line of added.slice(0, 5)) summaryParts.push(`+ ${line}`);
  const summary = summaryParts.join('\n').slice(0, 500);

  return { added, removed, summary, linesAdded: added.length, linesRemoved: removed.length };
}

const MAJOR_KEYWORDS = ['drawdown', 'daily loss', 'profit target', '%', 'restricted', 'prohibited', 'banned', 'maximum', 'minimum', 'limit', 'breach'];
const MODERATE_KEYWORDS = ['trading', 'account', 'rule', 'requirement', 'period', 'days'];

function classifySeverity(added: string[], removed: string[]): string {
  const allChanged = [...added, ...removed].join(' ').toLowerCase();

  for (const kw of MAJOR_KEYWORDS) {
    if (allChanged.includes(kw)) return 'major';
  }
  for (const kw of MODERATE_KEYWORDS) {
    if (allChanged.includes(kw)) return 'moderate';
  }
  return 'minor';
}

// -- Content Extraction ------------------------------------

async function extractWithSelector(response: Response, selector: string): Promise<string> {
  let text = '';
  const rewriter = new HTMLRewriter()
    .on(selector, {
      text(chunk) {
        text += chunk.text;
      },
    });
  await rewriter.transform(response).text();
  return text.replace(/\s+/g, ' ').trim();
}

// -- Telegram Alert ----------------------------------------

async function sendTelegramAlert(env: Env, firmName: string, severity: string, diff: { linesAdded: number; linesRemoved: number; summary: string }, pageUrl: string): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHANNEL_ID) return;

  const severityEmoji = severity === 'major' ? '🔴' : severity === 'moderate' ? '🟡' : '🟢';
  const severityLabel = severity.toUpperCase();

  const message = [
    `${severityEmoji} <b>TOS Change Detected — ${firmName}</b>`,
    ``,
    `<b>Severity:</b> ${severityLabel}`,
    `<b>Lines added:</b> ${diff.linesAdded}`,
    `<b>Lines removed:</b> ${diff.linesRemoved}`,
    ``,
    `<b>Changes:</b>`,
    `<pre>${diff.summary.slice(0, 300)}</pre>`,
    ``,
    `🔗 <a href="${pageUrl}">View Rules Page</a>`,
    `📊 <a href="https://edgerelay-web.pages.dev/firms/${encodeURIComponent(firmName)}">View on EdgeRelay</a>`,
  ].join('\n');

  try {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHANNEL_ID,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
  } catch (err) {
    console.error('[TOS Monitor] Telegram alert failed:', err);
  }
}

// -- Main Check --------------------------------------------

async function checkFirm(env: Env, firm: FirmToCheck): Promise<string> {
  const slug = slugify(firm.firm_name);
  const latestKey = `tos/${slug}/latest.txt`;

  // Fetch the page
  const res = await fetch(firm.rules_page_url, {
    headers: {
      'User-Agent': 'EdgeRelay-TOS-Monitor/1.0 (https://edgerelay-web.pages.dev)',
      'Accept': 'text/html',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    return `FETCH_FAILED (HTTP ${res.status})`;
  }

  // Extract content
  let content: string;
  if (firm.rules_page_selector) {
    content = await extractWithSelector(res.clone(), firm.rules_page_selector);
    // Fallback if selector returned empty
    if (!content || content.length < 50) {
      const html = await res.text();
      content = extractFullText(html);
    }
  } else {
    const html = await res.text();
    content = extractFullText(html);
  }

  if (!content || content.length < 20) {
    return 'EXTRACTION_EMPTY';
  }

  // Get previous snapshot
  const prevObj = await env.STORAGE.get(latestKey);
  const prevContent = prevObj ? await prevObj.text() : null;

  if (!prevContent) {
    // First run -- store baseline, no diff
    await env.STORAGE.put(latestKey, content);
    return 'BASELINE_STORED';
  }

  // Compare
  if (prevContent.trim() === content.trim()) {
    return 'NO_CHANGE';
  }

  // Change detected!
  const diff = computeDiff(prevContent, content);
  const severity = classifySeverity(diff.added, diff.removed);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const snapshotKey = `tos/${slug}/${timestamp}.html`;

  // Store new snapshot
  const fullHtml = await res.clone().text().catch(() => content);
  await env.STORAGE.put(snapshotKey, fullHtml);
  await env.STORAGE.put(latestKey, content);

  // Insert change record
  await env.DB.prepare(
    `INSERT INTO tos_changes (
      firm_name, page_url, diff_summary,
      lines_added, lines_removed,
      snapshot_key, previous_snapshot_key, severity
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      firm.firm_name,
      firm.rules_page_url,
      diff.summary,
      diff.linesAdded,
      diff.linesRemoved,
      snapshotKey,
      latestKey,
      severity,
    )
    .run();

  // Send Telegram alert
  await sendTelegramAlert(env, firm.firm_name, severity, diff, firm.rules_page_url);

  // Adjust health score based on severity (TOS instability lowers trust)
  const penalty = severity === 'major' ? 5 : severity === 'moderate' ? 2 : 0;
  if (penalty > 0) {
    await env.DB.prepare(
      `UPDATE firm_templates SET health_score = MAX(0, health_score - ?) WHERE firm_name = ?`,
    )
      .bind(penalty, firm.firm_name)
      .run();
  }

  return `CHANGE_DETECTED (${severity}: +${diff.linesAdded}/-${diff.linesRemoved})`;
}

// -- Export ------------------------------------------------

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('[TOS Monitor] Cron triggered at', new Date().toISOString());

    // Get firms to check
    const firms = await env.DB.prepare(
      `SELECT DISTINCT firm_name, rules_page_url, rules_page_selector
       FROM firm_templates
       WHERE rules_page_url IS NOT NULL`,
    )
      .all<FirmToCheck>();

    const results: string[] = [];

    for (const firm of firms.results) {
      try {
        const result = await checkFirm(env, firm);
        results.push(`${firm.firm_name}: ${result}`);
        console.log(`[TOS Monitor] ${firm.firm_name}: ${result}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        results.push(`${firm.firm_name}: ERROR -- ${msg}`);
        console.error(`[TOS Monitor] ${firm.firm_name}: ERROR -- ${msg}`);
      }
    }

    console.log(`[TOS Monitor] Done. Checked ${firms.results.length} firms.`, results.join('; '));
  },
};
