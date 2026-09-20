import { Hono } from 'hono';
import type { ApiResponse } from '@edgerelay/shared';
import type { Env } from '../types.js';
import { COURSE_LESSONS, ACADEMY_LESSONS, prerequisiteLessons } from '@edgerelay/shared';
async function unlocked(db: D1Database, userId:string, lessonId:string) {
 const required=prerequisiteLessons(lessonId);
 if(!required.length)return true;
 const rows=await db.prepare('SELECT lesson_id FROM academy_progress WHERE user_id = ? AND quiz_passed = 1').bind(userId).all<{lesson_id:string}>();
 const passed=new Set(rows.results.map(r=>r.lesson_id));return required.every(l=>passed.has(l.id));
}

export const academy = new Hono<{ Bindings: Env }>();

// ── GET /academy/progress — All lesson progress for user ──────

academy.get('/progress', async (c) => {
  const userId = c.get('userId');

  const { results } = await c.env.DB.prepare(
    `SELECT lesson_id, level_id, status, quiz_score, quiz_passed, completed_at
     FROM academy_progress WHERE user_id = ? AND lesson_id IN (${ACADEMY_LESSONS.map(() => '?').join(',')})`,
  ).bind(userId, ...ACADEMY_LESSONS.map(l => l.id)).all();

  return c.json<ApiResponse>({ data: { progress: results || [] }, error: null });
});

// ── POST /academy/progress — Update lesson status ─────────────

academy.post('/progress', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{ lessonId: string; levelId: number; status: string }>().catch(()=>null);
  if(!body)return c.json({data:null,error:{code:'BAD_REQUEST',message:'Valid JSON is required'}},400);

  const lesson=ACADEMY_LESSONS.find(l=>l.id===body.lessonId && l.levelId===body.levelId);
  if (!lesson || body.status !== 'in_progress') return c.json<ApiResponse>({data:null,error:{code:'BAD_REQUEST',message:'A current lesson and in_progress status are required. Completion is earned through its quiz.'}},400);
  if(!await unlocked(c.env.DB,userId,lesson.id))return c.json<ApiResponse>({data:null,error:{code:'LEVEL_LOCKED',message:'Complete the preceding levels first.'}},403);
  const completedAt = null;

  await c.env.DB.prepare(
    `INSERT INTO academy_progress (id, user_id, level_id, lesson_id, status, completed_at, updated_at)
     VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, lesson_id)
     DO UPDATE SET status = CASE WHEN academy_progress.quiz_passed = 1 THEN 'completed' ELSE 'in_progress' END, completed_at = academy_progress.completed_at, updated_at = datetime('now')`,
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
  }>().catch(()=>null);
  if(!body)return c.json({data:null,error:{code:'BAD_REQUEST',message:'Valid JSON is required'}},400);

  const lesson=ACADEMY_LESSONS.find(l=>l.id===body.lessonId && l.levelId===body.levelId);
  if(!lesson || !Array.isArray(body.answers) || body.answers.length!==lesson.quiz.length || new Set(body.answers.map(a=>a?.questionId)).size!==lesson.quiz.length || !body.answers.every(a=>a && lesson.quiz.some(q=>q.id===a.questionId && Number.isInteger(a.selected) && a.selected>=0 && a.selected<q.options.length))) return c.json<ApiResponse>({data:null,error:{code:'BAD_REQUEST',message:'Submit every question from this lesson exactly once with a valid option.'}},400);
  if(!await unlocked(c.env.DB,userId,lesson.id))return c.json<ApiResponse>({data:null,error:{code:'LEVEL_LOCKED',message:'Complete the preceding levels first.'}},403);
  const results=lesson.quiz.map(q=>{const selected=body.answers.find(a=>a.questionId===q.id)!.selected;return {questionId:q.id,selected,correctIndex:q.correctIndex,isCorrect:selected===q.correctIndex};});
  const correct=results.filter(r=>r.isCorrect).length;

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
     VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, lesson_id)
     DO UPDATE SET
       quiz_score = CASE WHEN excluded.quiz_score > COALESCE(academy_progress.quiz_score, 0) THEN excluded.quiz_score ELSE academy_progress.quiz_score END,
       quiz_passed = CASE WHEN excluded.quiz_passed = 1 THEN 1 ELSE academy_progress.quiz_passed END,
       status = CASE WHEN excluded.quiz_passed = 1 THEN 'completed' ELSE academy_progress.status END,
       completed_at = CASE WHEN excluded.quiz_passed = 1 AND academy_progress.completed_at IS NULL THEN excluded.completed_at ELSE academy_progress.completed_at END,
       updated_at = datetime('now')`,
  ).bind(userId, body.levelId, body.lessonId, passed ? 'completed' : 'in_progress', score, passed ? 1 : 0, completedAt).run();

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
     FROM academy_progress WHERE user_id = ? AND lesson_id IN (${ACADEMY_LESSONS.map(() => '?').join(',')})`,
  ).bind(userId, ...ACADEMY_LESSONS.map(l => l.id)).first();

  return c.json<ApiResponse>({ data: { stats: stats || {} }, error: null });
});

// ── GET /academy/homework — Check homework completion ─────────

academy.get('/homework', async (c) => {
 const rows=await c.env.DB.prepare('SELECT lesson_id FROM academy_progress WHERE user_id = ? AND quiz_passed = 1').bind(c.get('userId')).all<{lesson_id:string}>();
 const passed=new Set(rows.results.map(r=>r.lesson_id));
 const homework=Object.fromEntries([1,2,3,4,5,6].map(level=>{const lessons=COURSE_LESSONS.filter(l=>l.levelId===level);const current=lessons.filter(l=>passed.has(l.id)).length;return ['ts-hw-'+level,{current,required:lessons.length,completed:current===lessons.length}];}));
 return c.json<ApiResponse>({data:{homework},error:null});
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
