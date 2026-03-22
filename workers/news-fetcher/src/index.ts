/**
 * News Calendar Cron Worker
 *
 * Fetches upcoming economic events twice daily (00:00 and 12:00 UTC).
 * Stores high-impact events in D1 news_events table.
 */

interface Env {
  DB: D1Database;
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

async function fetchCalendar(): Promise<CalendarEvent[]> {
  try {
    const response = await fetch(
      'https://nfs.faireconomy.media/ff_calendar_thisweek.json',
      { headers: { 'User-Agent': 'EdgeRelay/1.0' } },
    );

    if (!response.ok) {
      console.log(`Calendar fetch failed: ${response.status}`);
      return [];
    }

    const data = (await response.json()) as CalendarEvent[];
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Calendar fetch error:', err);
    return [];
  }
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('News fetcher cron triggered:', new Date().toISOString());

    const events = await fetchCalendar();
    if (events.length === 0) {
      console.log('No calendar events fetched');
      return;
    }

    const highImpact = events.filter((e) => e.impact === 'High' || e.impact === 'high');

    console.log(`Fetched ${events.length} events, ${highImpact.length} high-impact`);

    // Clear old events
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await env.DB.prepare('DELETE FROM news_events WHERE event_time < ?').bind(yesterday).run();

    // Insert new events
    for (const event of highImpact) {
      const currency = currencyFromCountry(event.country);

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
            'high',
            eventTime,
            event.actual || null,
            event.forecast || null,
            event.previous || null,
          )
          .run();
      } catch (err) {
        console.error(`Failed to insert event: ${event.title}`, err);
      }
    }

    console.log(`News calendar updated: ${highImpact.length} high-impact events stored`);
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    return new Response(JSON.stringify({ status: 'ok', service: 'news-fetcher' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
