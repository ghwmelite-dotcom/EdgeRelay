import { Hono } from 'hono';
import type { ApiResponse } from '@edgerelay/shared';
import type { Env } from '../types.js';

export const tos = new Hono<{ Bindings: Env }>();

// ── GET /changes — List recent TOS changes across all firms ──

tos.get('/changes', async (c) => {
  const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '20', 10), 1), 100);
  const firmName = c.req.query('firm_name');
  const severity = c.req.query('severity');
  const cursor = c.req.query('cursor'); // detected_at ISO string for pagination

  const conditions: string[] = [];
  const bindings: unknown[] = [];

  if (firmName) {
    conditions.push('firm_name = ?');
    bindings.push(firmName);
  }

  if (severity) {
    conditions.push('severity = ?');
    bindings.push(severity);
  }

  if (cursor) {
    conditions.push('detected_at < ?');
    bindings.push(cursor);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  bindings.push(limit + 1);

  const result = await c.env.DB.prepare(
    `SELECT id, firm_name, detected_at, page_url, diff_summary, lines_added, lines_removed, severity
     FROM tos_changes
     ${whereClause}
     ORDER BY detected_at DESC
     LIMIT ?`,
  )
    .bind(...bindings)
    .all();

  const hasMore = result.results.length > limit;
  const changes = hasMore ? result.results.slice(0, limit) : result.results;

  let nextCursor: string | null = null;
  if (hasMore && changes.length > 0) {
    const last = changes[changes.length - 1] as Record<string, unknown>;
    nextCursor = last.detected_at as string;
  }

  return c.json<ApiResponse>({
    data: {
      changes,
      has_more: hasMore,
      next_cursor: nextCursor,
    },
    error: null,
  });
});

// ── GET /changes/:firmName — TOS changes for a specific firm ──

tos.get('/changes/:firmName', async (c) => {
  const firmName = decodeURIComponent(c.req.param('firmName'));
  const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '20', 10), 1), 100);
  const severity = c.req.query('severity');
  const cursor = c.req.query('cursor'); // detected_at ISO string for pagination

  const conditions: string[] = ['firm_name = ?'];
  const bindings: unknown[] = [firmName];

  if (severity) {
    conditions.push('severity = ?');
    bindings.push(severity);
  }

  if (cursor) {
    conditions.push('detected_at < ?');
    bindings.push(cursor);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  bindings.push(limit + 1);

  const result = await c.env.DB.prepare(
    `SELECT id, firm_name, detected_at, page_url, diff_summary, lines_added, lines_removed, severity
     FROM tos_changes
     ${whereClause}
     ORDER BY detected_at DESC
     LIMIT ?`,
  )
    .bind(...bindings)
    .all();

  const hasMore = result.results.length > limit;
  const changes = hasMore ? result.results.slice(0, limit) : result.results;

  let nextCursor: string | null = null;
  if (hasMore && changes.length > 0) {
    const last = changes[changes.length - 1] as Record<string, unknown>;
    nextCursor = last.detected_at as string;
  }

  return c.json<ApiResponse>({
    data: {
      changes,
      has_more: hasMore,
      next_cursor: nextCursor,
    },
    error: null,
  });
});
