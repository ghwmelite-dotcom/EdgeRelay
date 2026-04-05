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

// ── GET /academy/homework — Check homework completion ─────────

academy.get('/homework', async (c) => {
  const userId = c.get('userId');

  // 1. Total closed trades (for hw-1, hw-4)
  const tradeCount = await c.env.DB.prepare(
    `SELECT COUNT(*) as c FROM journal_trades jt
     JOIN accounts a ON jt.account_id = a.id
     WHERE a.user_id = ? AND jt.deal_entry = 'out'`,
  ).bind(userId).first<{ c: number }>();

  // 2. Trades with risk under 2% (for hw-2)
  const riskControlled = await c.env.DB.prepare(
    `SELECT COUNT(*) as c FROM journal_trades jt
     JOIN accounts a ON jt.account_id = a.id
     WHERE a.user_id = ? AND jt.deal_entry = 'out'
       AND jt.balance_at_trade > 0
       AND (ABS(jt.profit) / jt.balance_at_trade) <= 0.02`,
  ).bind(userId).first<{ c: number }>();

  // 3. London session trades (for hw-3)
  const londonTrades = await c.env.DB.prepare(
    `SELECT COUNT(*) as c FROM journal_trades jt
     JOIN accounts a ON jt.account_id = a.id
     WHERE a.user_id = ? AND jt.deal_entry = 'out' AND jt.session_tag = 'london'`,
  ).bind(userId).first<{ c: number }>();

  // 4. Counselor sessions (for hw-5)
  const counselorSessions = await c.env.DB.prepare(
    `SELECT COUNT(*) as c FROM counselor_sessions WHERE user_id = ?`,
  ).bind(userId).first<{ c: number }>();

  // 5. Simulator completions — check if any scenario had positive P&L
  // Since simulator is client-side only for now, we track via a simple flag
  // For v1, we'll check if the user has accessed the practice page (optimistic)
  // TODO: Add proper simulator result persistence

  const homework: Record<string, { current: number; required: number; completed: boolean }> = {
    'hw-1': {
      current: Math.min(tradeCount?.c || 0, 5),
      required: 5,
      completed: (tradeCount?.c || 0) >= 5,
    },
    'hw-2': {
      current: Math.min(riskControlled?.c || 0, 5),
      required: 5,
      completed: (riskControlled?.c || 0) >= 5,
    },
    'hw-3': {
      current: Math.min(londonTrades?.c || 0, 10),
      required: 10,
      completed: (londonTrades?.c || 0) >= 10,
    },
    'hw-4': {
      current: Math.min(tradeCount?.c || 0, 20),
      required: 20,
      completed: (tradeCount?.c || 0) >= 20,
    },
    'hw-5': {
      current: Math.min(counselorSessions?.c || 0, 3),
      required: 3,
      completed: (counselorSessions?.c || 0) >= 3,
    },
    'hw-6': {
      current: 0, // Client-side tracked for now
      required: 1,
      completed: false,
    },
  };

  return c.json<ApiResponse>({ data: { homework }, error: null });
});

// ── GET /academy/streak — User streak & XP data ───────────────

academy.get('/streak', async (c) => {
  const userId = c.get('userId');

  let streak = await c.env.DB.prepare(
    'SELECT * FROM academy_streaks WHERE user_id = ?',
  ).bind(userId).first<{
    current_streak: number; longest_streak: number; last_activity_date: string | null;
    total_xp: number; badges_json: string;
  }>();

  if (!streak) {
    await c.env.DB.prepare(
      `INSERT INTO academy_streaks (id, user_id) VALUES (lower(hex(randomblob(16))), ?)`,
    ).bind(userId).run();
    streak = { current_streak: 0, longest_streak: 0, last_activity_date: null, total_xp: 0, badges_json: '[]' };
  }

  return c.json<ApiResponse>({
    data: {
      currentStreak: streak.current_streak,
      longestStreak: streak.longest_streak,
      lastActivityDate: streak.last_activity_date,
      totalXp: streak.total_xp,
      badges: JSON.parse(streak.badges_json || '[]'),
    },
    error: null,
  });
});

// ── POST /academy/streak/check-in — Record daily activity ─────

academy.post('/streak/check-in', async (c) => {
  const userId = c.get('userId');
  const today = new Date().toISOString().slice(0, 10);

  const streak = await c.env.DB.prepare(
    'SELECT current_streak, longest_streak, last_activity_date, total_xp, badges_json FROM academy_streaks WHERE user_id = ?',
  ).bind(userId).first<{
    current_streak: number; longest_streak: number; last_activity_date: string | null;
    total_xp: number; badges_json: string;
  }>();

  if (!streak) {
    await c.env.DB.prepare(
      `INSERT INTO academy_streaks (id, user_id, current_streak, longest_streak, last_activity_date, total_xp)
       VALUES (lower(hex(randomblob(16))), ?, 1, 1, ?, 10)`,
    ).bind(userId, today).run();
    return c.json<ApiResponse>({ data: { streak: 1, xpEarned: 10 }, error: null });
  }

  if (streak.last_activity_date === today) {
    return c.json<ApiResponse>({ data: { streak: streak.current_streak, xpEarned: 0, alreadyCheckedIn: true }, error: null });
  }

  // Check if yesterday was the last activity (streak continues) or not (streak resets)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const isConsecutive = streak.last_activity_date === yesterday;
  const newStreak = isConsecutive ? streak.current_streak + 1 : 1;
  const newLongest = Math.max(newStreak, streak.longest_streak);

  // XP: 10 base + 5 per streak day (bonus for consistency)
  const xpEarned = 10 + (newStreak > 1 ? newStreak * 5 : 0);
  const newXp = streak.total_xp + xpEarned;

  // Badge checks
  const badges: string[] = JSON.parse(streak.badges_json || '[]');
  const newBadges: string[] = [];
  if (newStreak >= 3 && !badges.includes('streak-3')) { badges.push('streak-3'); newBadges.push('streak-3'); }
  if (newStreak >= 7 && !badges.includes('streak-7')) { badges.push('streak-7'); newBadges.push('streak-7'); }
  if (newStreak >= 14 && !badges.includes('streak-14')) { badges.push('streak-14'); newBadges.push('streak-14'); }
  if (newStreak >= 30 && !badges.includes('streak-30')) { badges.push('streak-30'); newBadges.push('streak-30'); }
  if (newXp >= 100 && !badges.includes('xp-100')) { badges.push('xp-100'); newBadges.push('xp-100'); }
  if (newXp >= 500 && !badges.includes('xp-500')) { badges.push('xp-500'); newBadges.push('xp-500'); }
  if (newXp >= 1000 && !badges.includes('xp-1000')) { badges.push('xp-1000'); newBadges.push('xp-1000'); }

  await c.env.DB.prepare(
    `UPDATE academy_streaks SET current_streak = ?, longest_streak = ?, last_activity_date = ?, total_xp = ?, badges_json = ?, updated_at = datetime('now') WHERE user_id = ?`,
  ).bind(newStreak, newLongest, today, newXp, JSON.stringify(badges), userId).run();

  // Update leaderboard
  const weekKey = getWeekKey();
  const user = await c.env.DB.prepare('SELECT name FROM users WHERE id = ?').bind(userId).first<{ name: string }>();
  await c.env.DB.prepare(
    `INSERT INTO academy_leaderboard (id, user_id, user_name, week_key, streak_days, xp)
     VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, week_key)
     DO UPDATE SET streak_days = MAX(academy_leaderboard.streak_days, excluded.streak_days), xp = excluded.xp`,
  ).bind(userId, user?.name || 'Trader', weekKey, newStreak, newXp).run();

  return c.json<ApiResponse>({
    data: { streak: newStreak, xpEarned, newBadges, totalXp: newXp },
    error: null,
  });
});

// ── GET /academy/leaderboard — Weekly leaderboard ─────────────

academy.get('/leaderboard', async (c) => {
  const weekKey = getWeekKey();

  const { results } = await c.env.DB.prepare(
    `SELECT user_name, xp, streak_days, quizzes_passed
     FROM academy_leaderboard WHERE week_key = ?
     ORDER BY xp DESC LIMIT 20`,
  ).bind(weekKey).all<{
    user_name: string; xp: number; streak_days: number; quizzes_passed: number;
  }>();

  return c.json<ApiResponse>({ data: { weekKey, leaderboard: results || [] }, error: null });
});

function getWeekKey(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}
