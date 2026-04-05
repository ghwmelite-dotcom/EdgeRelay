import { Hono } from 'hono';
import type { ApiResponse } from '@edgerelay/shared';
import type { Env } from '../types.js';
import { QUIZ_ANSWERS } from '../lib/academy-answers.js';

export const academy = new Hono<{ Bindings: Env }>();

// ── GET /academy/progress — All lesson progress for user ──────

academy.get('/progress', async (c) => {
  const userId = c.get('userId');

  const { results } = await c.env.DB.prepare(
    `SELECT lesson_id, level_id, status, quiz_score, quiz_passed, completed_at
     FROM academy_progress WHERE user_id = ?`,
  ).bind(userId).all();

  return c.json<ApiResponse>({ data: { progress: results || [] }, error: null });
});

// ── POST /academy/progress — Update lesson status ─────────────

academy.post('/progress', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{ lessonId: string; levelId: number; status: string }>();

  if (!body.lessonId || !body.status) {
    return c.json<ApiResponse>({ data: null, error: { code: 'BAD_REQUEST', message: 'lessonId and status required' } }, 400);
  }

  const completedAt = body.status === 'completed' ? new Date().toISOString() : null;

  await c.env.DB.prepare(
    `INSERT INTO academy_progress (id, user_id, level_id, lesson_id, status, completed_at, updated_at)
     VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, lesson_id)
     DO UPDATE SET status = excluded.status, completed_at = COALESCE(excluded.completed_at, completed_at), updated_at = datetime('now')`,
  ).bind(userId, body.levelId, body.lessonId, body.status, completedAt).run();

  return c.json<ApiResponse>({ data: { ok: true }, error: null });
});

// ── POST /academy/quiz — Submit quiz attempt ──────────────────

academy.post('/quiz', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{
    lessonId: string;
    levelId: number;
    answers: Array<{ questionId: string; selected: number }>;
  }>();

  if (!body.lessonId || !body.answers?.length) {
    return c.json<ApiResponse>({ data: null, error: { code: 'BAD_REQUEST', message: 'lessonId and answers required' } }, 400);
  }

  // Score against server answer key
  let correct = 0;
  const results: Array<{ questionId: string; selected: number; correctIndex: number; isCorrect: boolean }> = [];

  for (const ans of body.answers) {
    const correctIndex = QUIZ_ANSWERS[ans.questionId];
    const isCorrect = correctIndex !== undefined && ans.selected === correctIndex;
    if (isCorrect) correct++;
    results.push({ questionId: ans.questionId, selected: ans.selected, correctIndex: correctIndex ?? -1, isCorrect });
  }

  const score = Math.round((correct / body.answers.length) * 100);
  const passed = score >= 80;

  // Record attempt
  await c.env.DB.prepare(
    `INSERT INTO academy_quiz_attempts (id, user_id, lesson_id, score, answers_json, passed)
     VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?)`,
  ).bind(userId, body.lessonId, score, JSON.stringify(results), passed ? 1 : 0).run();

  // Update progress with best score
  const completedAt = passed ? new Date().toISOString() : null;
  await c.env.DB.prepare(
    `INSERT INTO academy_progress (id, user_id, level_id, lesson_id, status, quiz_score, quiz_passed, completed_at, updated_at)
     VALUES (lower(hex(randomblob(16))), ?, ?, ?, 'completed', ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, lesson_id)
     DO UPDATE SET
       quiz_score = CASE WHEN excluded.quiz_score > COALESCE(academy_progress.quiz_score, 0) THEN excluded.quiz_score ELSE academy_progress.quiz_score END,
       quiz_passed = CASE WHEN excluded.quiz_passed = 1 THEN 1 ELSE academy_progress.quiz_passed END,
       status = CASE WHEN excluded.quiz_passed = 1 THEN 'completed' ELSE academy_progress.status END,
       completed_at = CASE WHEN excluded.quiz_passed = 1 AND academy_progress.completed_at IS NULL THEN excluded.completed_at ELSE academy_progress.completed_at END,
       updated_at = datetime('now')`,
  ).bind(userId, body.levelId, body.lessonId, score, passed ? 1 : 0, completedAt).run();

  return c.json<ApiResponse>({
    data: { score, passed, correct, total: body.answers.length, results },
    error: null,
  });
});

// ── GET /academy/stats — Aggregate stats ──────────────────────

academy.get('/stats', async (c) => {
  const userId = c.get('userId');

  const stats = await c.env.DB.prepare(
    `SELECT
       COUNT(*) as total_lessons_started,
       SUM(CASE WHEN quiz_passed = 1 THEN 1 ELSE 0 END) as lessons_completed,
       MAX(level_id) as highest_level,
       ROUND(AVG(CASE WHEN quiz_score IS NOT NULL THEN quiz_score END), 0) as avg_quiz_score
     FROM academy_progress WHERE user_id = ?`,
  ).bind(userId).first();

  return c.json<ApiResponse>({ data: { stats: stats || {} }, error: null });
});
