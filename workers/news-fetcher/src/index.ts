/**
 * News Calendar Cron Worker
 *
 * Runs every 15 minutes.
 * 1. Fetches upcoming economic calendar events (high + medium impact) from FairEconomy.
 * 2. Fetches live Forex news from Finnhub and stores/deduplicates in market_news table.
 */

interface Env {
  DB: D1Database;
  FINNHUB_API_KEY: string;
}

interface CalendarEvent {
  title: string;
  country: string;
  date: string;
  time: string;
  impact: string;
  forecast: string;
  previous: string;
  actual: string;
}

function generateId(): string {
  const buf = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function currencyFromCountry(country: string): string {
  const map: Record<string, string> = {
    US: 'USD',
    'United States': 'USD',
    EU: 'EUR',
    Eurozone: 'EUR',
    EMU: 'EUR',
    UK: 'GBP',
    'United Kingdom': 'GBP',
    JP: 'JPY',
    Japan: 'JPY',
    CH: 'CHF',
    Switzerland: 'CHF',
    AU: 'AUD',
    Australia: 'AUD',
    NZ: 'NZD',
    'New Zealand': 'NZD',
    CA: 'CAD',
    Canada: 'CAD',
    CN: 'CNY',
    China: 'CNY',
  };
  return map[country] ?? country;
}

async function fetchCalendar(env: Env): Promise<number> {
  let events: CalendarEvent[] = [];
  try {
    const response = await fetch(
      'https://nfs.faireconomy.media/ff_calendar_thisweek.json',
      { headers: { 'User-Agent': 'EdgeRelay/1.0' } },
    );

    if (!response.ok) {
      console.log(`Calendar fetch failed: ${response.status}`);
      return 0;
    }

    const data = (await response.json()) as CalendarEvent[];
    events = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Calendar fetch error:', err);
    return 0;
  }

  if (events.length === 0) {
    console.log('No calendar events fetched');
    return 0;
  }

  // Include both high and medium impact events
  const filtered = events.filter((e) => {
    const impactLower = (e.impact || '').toLowerCase();
    return impactLower === 'high' || impactLower === 'medium';
  });

  console.log(`Fetched ${events.length} events, ${filtered.length} high/medium-impact`);

  // Clear old events
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare('DELETE FROM news_events WHERE event_time < ?').bind(yesterday).run();

  // Insert new events
  let stored = 0;
  for (const event of filtered) {
    const currency = currencyFromCountry(event.country);
    const impactLower = (event.impact || '').toLowerCase();

    let eventTime = event.date;
    if (event.time && event.time !== 'All Day' && event.time !== 'Tentative') {
      eventTime = `${event.date}T${event.time}:00Z`;
    }

    try {
      await env.DB.prepare(
        `INSERT OR REPLACE INTO news_events (
          id, event_name, currency, impact, event_time,
          actual, forecast, previous
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          generateId(),
          event.title,
          currency,
          impactLower,
          eventTime,
          event.actual || null,
          event.forecast || null,
          event.previous || null,
        )
        .run();
      stored++;
    } catch (err) {
      console.error(`Failed to insert event: ${event.title}`, err);
    }
  }

  return stored;
}

async function fetchFinnhubNews(env: Env): Promise<number> {
  const res = await fetch(
    `https://finnhub.io/api/v1/news?category=forex&token=${env.FINNHUB_API_KEY}`,
  );
  if (!res.ok) {
    console.error('Finnhub fetch failed:', res.status);
    return 0;
  }

  const items = (await res.json()) as Array<{
    headline: string;
    summary: string;
    source: string;
    url: string;
    datetime: number;
    category: string;
    related: string;
  }>;

  let inserted = 0;
  for (const item of items) {
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(item.headline),
    );
    const headlineHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const publishedAt = new Date(item.datetime * 1000).toISOString();

    const result = await env.DB.prepare(
      `INSERT OR IGNORE INTO market_news (id, headline_hash, headline, summary, source, url, category, sentiment, related_currencies, published_at)
       VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
    )
      .bind(
        headlineHash,
        item.headline,
        item.summary || null,
        item.source,
        item.url || null,
        item.category || null,
        item.related || null,
        publishedAt,
      )
      .run();

    if (result.meta.changes > 0) inserted++;
  }

  await env.DB.prepare(`DELETE FROM market_news WHERE published_at < datetime('now', '-48 hours')`).run();
  return inserted;
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    console.log('News fetcher cron triggered:', new Date().toISOString());

    const calendarCount = await fetchCalendar(env);
    console.log(`Calendar: ${calendarCount} events stored`);

    const newsCount = await fetchFinnhubNews(env);
    console.log(`Finnhub: ${newsCount} new articles`);
  },

  async fetch(_request: Request, _env: Env): Promise<Response> {
    return new Response(JSON.stringify({ status: 'ok', service: 'news-fetcher' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
