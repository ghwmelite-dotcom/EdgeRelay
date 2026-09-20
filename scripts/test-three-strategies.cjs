const assert = require("node:assert/strict"),
  { DatabaseSync } = require("node:sqlite"),
  fs = require("node:fs");
const s = require("./strategy-test-loader.cjs");
const at = (a, n) => s.evaluateReplay({ ...a, asOf: a.session.open + n * 60 });
for (const id of ["opening-range", "previous-day", "pre-window"])
  for (const symbol of ["XAUUSD", "USDJPY"]) {
    const a = s.teachingReplay(id, symbol);
    const ready = id === "opening-range" ? 11 : 6;
    assert.equal(
      at(a, 0).phase,
      id === "opening-range" ? "waiting-range" : "waiting-breakout",
    );
    assert.equal(at(a, ready - 1).phase, "waiting-retest");
    assert.equal(at(a, ready).phase, "ready");
    assert.equal(at(a, 20).exit.reason, "target");
    assert.ok(at(a, ready).plan.plannedLoss <= 50);
    assert.equal(
      at(a, ready).plan.quantity % 0.01 < 0.000001 ||
        Math.abs((at(a, ready).plan.quantity % 0.01) - 0.01) < 0.000001,
      true,
    );
    assert.equal(
      at(s.teachingReplay(id, symbol, "cancel"), ready).phase,
      "cancelled",
    );
    assert.equal(
      at(s.teachingReplay(id, symbol, "expire"), ready + 5).phase,
      "expired",
    );
    assert.equal(
      at(s.teachingReplay(id, symbol, "news"), ready).phase,
      "skipped",
    );
    assert.equal(
      at(s.teachingReplay(id, symbol, "obstacle"), ready).phase,
      "skipped",
    );
    assert.equal(
      at(s.teachingReplay(id, symbol, "wick"), ready - 1).phase,
      "waiting-breakout",
    );
    const missing = structuredClone(a);
    missing.m1 = missing.m1.filter((c) => c.time !== a.session.open + 60);
    assert.equal(at(missing, ready).phase, "blocked");
    const future = structuredClone(a);
    future.m1
      .filter((c) => c.time > a.session.open + ready * 60)
      .forEach((c) => {
        c.high += 100;
      });
    assert.deepEqual(at(future, ready), at(a, ready));
    const boundary = structuredClone(a);
    boundary.relevantNews = [a.session.open + ready * 60 + 600];
    assert.equal(at(boundary, ready).phase, "skipped");
    boundary.relevantNews[0]++;
    assert.equal(at(boundary, ready).phase, "ready");
  }
const base = s.teachingReplay("opening-range");
for (const patch of [
  { calendarVerified: false },
  { normalSession: false },
  { newsVerified: false },
  { entriesToday: 1 },
  { dailyLossPercent: 1 },
  { openPositions: 1 },
  { session: { ...base.session, verified: false } },
  { session: { ...base.session, cutoff: base.session.close + 60 } },
])
  assert.equal(at({ ...base, ...patch }, 11).phase, "blocked");
const weekend = structuredClone(base);
const delta = 5 * 86400;
weekend.date = "2026-09-26";
for (const key of ["open", "close", "cutoff", "preStart"])
  weekend.session[key] += delta;
weekend.m1.forEach((c) => (c.time += delta));
weekend.m15.forEach((c) => (c.time += delta));
assert.equal(
  at(weekend, 11).phase,
  "ready",
  "verified venue calendar governs weekends, not US-stock assumptions",
);
const noPre = s.teachingReplay("pre-window");
delete noPre.session.preStart;
assert.equal(at(noPre, 6).phase, "blocked");
const eq = s.teachingReplay("previous-day");
eq.m1.find((c) => c.time === eq.session.open).open = eq.previousDay.high;
assert.equal(at(eq, 6).phase, "skipped");
const equal = s.teachingReplay("opening-range");
const bar = equal.m1.find((c) => c.time === equal.session.open + 600);
bar.close = 2510;
bar.low = 2509;
assert.equal(at(equal, 11).phase, "waiting-retest");
const gap = s.teachingReplay("opening-range");
gap.m1.find((c) => c.time === gap.session.open + 660).open = 2510;
gap.m1.find((c) => c.time === gap.session.open + 660).low = 2510;
assert.equal(at(gap, 11).phase, "skipped");
const both = s.teachingReplay("opening-range");
const b = both.m1.find((c) => c.time === both.session.open + 660);
b.low = 2500;
b.high = 2600;
const result = at(both, 12);
assert.equal(result.exit.reason, "stop");
assert.equal(result.exit.ambiguous, true);
const short = structuredClone(base),
  mirror = (c) => ({
    ...c,
    open: 5000 - c.open,
    close: 5000 - c.close,
    high: 5000 - c.low,
    low: 5000 - c.high,
  });
short.m1 = short.m1.map(mirror);
short.m15 = short.m15.map(mirror);
assert.equal(at(short, 11).side, "sell");
assert.equal(at(short, 20).exit.reason, "target");
const p = at(base, 11);
assert.equal(
  s.sizeTrade("buy", p.plan.entry, p.trigger, 10000, 0.51, base.contract, [])
    .plan,
  null,
);
assert.equal(
  s.sizeTrade(
    "buy",
    p.plan.entry,
    p.trigger,
    10000,
    0.5,
    { ...base.contract, minStopDistance: 100 },
    [],
  ).plan,
  null,
);
assert.equal(
  s.sizeTrade("buy", p.plan.entry, p.trigger, 1, 0.5, base.contract, []).plan,
  null,
);
assert.equal(
  s.sizeTrade(
    "buy",
    p.plan.entry,
    p.trigger,
    10000,
    0.5,
    { ...base.contract, linear: false },
    [],
  ).plan,
  null,
);
assert.throws(() => s.parseReplay({ ...base, m1: [...base.m1, base.m1[0]] }));
assert.equal(s.parseReplay(base).provider, base.provider);
assert.equal(
  s.nyTime("2026-01-12", 570),
  Date.parse("2026-01-12T14:30:00Z") / 1000,
);
assert.equal(
  s.nyTime("2026-07-13", 570),
  Date.parse("2026-07-13T13:30:00Z") / 1000,
);
console.log(
  "PASS replay: three setups/two markets, session-offset bars, confirmed pivots, no future leakage, limits, blackout boundaries, gaps/equality, conservative exits, sell symmetry and sizing",
);
const db = new DatabaseSync(":memory:");
db.exec(
  `CREATE TABLE academy_progress(id TEXT PRIMARY KEY,user_id TEXT,level_id INTEGER,lesson_id TEXT,status TEXT,quiz_score INTEGER,quiz_passed INTEGER DEFAULT 0,completed_at TEXT,updated_at TEXT,UNIQUE(user_id,lesson_id));CREATE TABLE academy_quiz_attempts(id TEXT PRIMARY KEY,user_id TEXT,lesson_id TEXT,score INTEGER,answers_json TEXT,passed INTEGER);CREATE TABLE accounts(id TEXT,user_id TEXT);CREATE TABLE journal_trades(account_id TEXT,deal_ticket INTEGER,symbol TEXT);INSERT INTO accounts VALUES ('own','owner'),('other','someone');INSERT INTO journal_trades VALUES ('own',1,'XAUUSD'),('other',2,'USDJPY');`,
);
db.exec(
  fs.readFileSync(
    "migrations/managed/0026_three_strategies_reviews.sql",
    "utf8",
  ),
);
const env = {
  DB: {
    prepare(sql) {
      const st = db.prepare(sql);
      let args = [];
      return {
        bind(...v) {
          args = v;
          return this;
        },
        async first() {
          return st.get(...args) ?? null;
        },
        async all() {
          return { results: st.all(...args) };
        },
        async run() {
          return { meta: st.run(...args) };
        },
      };
    },
  },
};
const app = new s.Hono();
app.use("*", async (c, next) => {
  c.set("userId", "owner");
  await next();
});
app.route("/academy", s.academy);
app.route("/reviews", s.strategyReviews);
app.route("/media", s.academyMedia);
app.route("/hub", s.strategyHub);
app.route("/hub", s.strategyHubPublic);
async function post(path, body) {
  return app.request(
    path,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    env,
  );
}
(async () => {
  const lesson = s.COURSE_LESSONS[0],
    body = {
      lessonId: lesson.id,
      levelId: lesson.levelId,
      answers: lesson.quiz.map((q) => ({
        questionId: q.id,
        selected: q.correctIndex,
      })),
    };
  for (const bad of [
    { ...body, answers: body.answers.slice(0, 1) },
    { ...body, answers: [body.answers[0], body.answers[0]] },
    { ...body, levelId: 6 },
    {
      ...body,
      answers: [{ questionId: "foreign", selected: 0 }, body.answers[1]],
    },
  ])
    assert.equal((await post("/academy/quiz", bad)).status, 400);
  assert.equal(
    (
      await post("/academy/progress", {
        lessonId: lesson.id,
        levelId: 1,
        status: "completed",
      })
    ).status,
    400,
  );
  let res = await post("/academy/quiz", {
    ...body,
    answers: body.answers.map((a) => ({
      ...a,
      selected: (a.selected + 1) % 3,
    })),
  });
  assert.equal((await res.json()).data.passed, false);
  assert.equal(
    db
      .prepare("SELECT status FROM academy_progress WHERE lesson_id=?")
      .get(lesson.id).status,
    "in_progress",
  );
  assert.equal((await post("/academy/quiz", body)).status, 200);
  await post("/academy/progress", {
    lessonId: lesson.id,
    levelId: 1,
    status: "in_progress",
  });
  assert.equal(
    db
      .prepare("SELECT status FROM academy_progress WHERE lesson_id=?")
      .get(lesson.id).status,
    "completed",
  );
  const locked = s.COURSE_LESSONS[2];
  assert.equal(
    (
      await post("/academy/quiz", {
        lessonId: locked.id,
        levelId: 2,
        answers: locked.quiz.map((q) => ({
          questionId: q.id,
          selected: q.correctIndex,
        })),
      })
    ).status,
    403,
  );
  for (const l of s.COURSE_LESSONS.slice(1)) {
    assert.equal(
      (
        await post("/academy/quiz", {
          lessonId: l.id,
          levelId: l.levelId,
          answers: l.quiz.map((q) => ({
            questionId: q.id,
            selected: q.correctIndex,
          })),
        })
      ).status,
      200,
    );
  }
  db.exec(
    "INSERT INTO academy_progress(id,user_id,level_id,lesson_id,status,quiz_passed) VALUES ('old','owner',6,'6-4','completed',1)",
  );
  const stats = (await (await app.request("/academy/stats", {}, env)).json())
    .data.stats;
  assert.equal(stats.lessons_completed, 12);
  const hw = (await (await app.request("/academy/homework", {}, env)).json())
    .data.homework;
  assert.equal(Object.keys(hw).length, 6);
  assert.ok(Object.values(hw).every((r) => r.completed));
  console.log(
    "PASS academy: complete quiz sets, duplicate/foreign rejection, server progression, failed-attempt status, legacy separation and no trade-count homework",
  );
  // Course isolation: completing Three Strategies must not unlock the second course.
  const goldBody = (lesson) => ({lessonId: lesson.id, levelId: lesson.levelId, answers: lesson.quiz.map(q => ({questionId:q.id,selected:q.correctIndex}))});
  assert.equal((await post('/academy/quiz', goldBody(s.GOLD_RANGE_LESSONS[2]))).status,403);
  // A new user can start this course without completing the first one.
  db.exec("DELETE FROM academy_progress WHERE user_id='owner' AND lesson_id LIKE 'ts-v1-%'");
  const firstGold = s.GOLD_RANGE_LESSONS[0];
  assert.equal((await post('/academy/quiz', {...goldBody(firstGold), levelId: 2})).status,400);
  assert.equal((await post('/academy/quiz', {...goldBody(firstGold), answers: goldBody(s.COURSE_LESSONS[0]).answers})).status,400);
  assert.equal((await post('/academy/quiz', {...goldBody(firstGold), answers: [goldBody(firstGold).answers[0],goldBody(firstGold).answers[0]]})).status,400);
  assert.equal((await post('/academy/progress', {lessonId:firstGold.id,levelId:1,status:'completed'})).status,400);
  for (const lesson of s.GOLD_RANGE_LESSONS) assert.equal((await post('/academy/quiz', goldBody(lesson))).status,200);
  assert.equal((await post('/academy/quiz', goldBody(s.COURSE_LESSONS[2]))).status,403);
  const goldProgress=(await (await app.request('/academy/progress',{},env)).json()).data.progress;
  assert.equal(goldProgress.length,6);
  assert.ok(goldProgress.every(p=>p.lesson_id.startsWith('gr-v1-') && p.quiz_passed===1));
  const goldStats=(await (await app.request('/academy/stats',{},env)).json()).data.stats;
  assert.equal(goldStats.lessons_completed,6);
  const oldHomework=(await (await app.request('/academy/homework',{},env)).json()).data.homework;
  assert.ok(Object.values(oldHomework).every(h=>!h.completed));
  db.exec("INSERT INTO academy_progress(id,user_id,level_id,lesson_id,status,quiz_passed) VALUES ('foreign-course','other',1,'gr-v1-01','completed',1)");
  assert.equal((await (await app.request('/academy/progress',{},env)).json()).data.progress.length,6);
  console.log('PASS independent course enrollment, both-way level isolation, exact quiz validation, stored progress/stats, user isolation and original homework separation');
  const review = {
    version: s.STRATEGY_VERSION,
    strategyId: "opening-range",
    sessionDate: base.date,
    session: base.session,
    symbol: "XAUUSD",
    provider: "Synthetic",
    outcome: "skip",
    checks: [],
    notes: "Skipped for missing confirmation",
  };
  assert.equal((await post("/reviews", review)).status, 201);
  assert.equal(
    (
      await post("/reviews", {
        ...review,
        accountId: "other",
        dealTicket: 2,
        symbol: "USDJPY",
      })
    ).status,
    404,
  );
  assert.equal(
    (await post("/reviews", { ...review, accountId: "own", dealTicket: 1 }))
      .status,
    201,
  );
  assert.equal(
    (
      await post("/reviews", {
        ...review,
        accountId: "own",
        dealTicket: 1,
        symbol: "USDJPY",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await post("/reviews", {
        ...review,
        session: { ...review.session, verified: false },
      })
    ).status,
    400,
  );
  assert.equal(
    (await post("/reviews", { ...review, sessionDate: "2026-02-30" })).status,
    400,
  );
  const other = new s.Hono();
  other.use("*", async (c, next) => {
    c.set("userId", "someone");
    await next();
  });
  other.route("/", s.strategyReviews);
  assert.equal(
    (await (await other.request("/", {}, env)).json()).data.reviews.length,
    0,
  );
  for (const path of ["generate", "generate-custom", "optimize", "purchase"])
    assert.equal((await post("/hub/" + path, {})).status, 410);
  console.log(
    "PASS owner isolation, linked-trade ownership/symbol, UTC schedule validation and retired generation/payment APIs",
  );
  env.STORAGE = {
    async head() {
      return { size: 100, httpEtag: '"test"' };
    },
    async get(key, opts) {
      return { body: new Uint8Array(opts.range.length) };
    },
  };
  for (const [range, status, len] of [
    ["bytes=0-9", 206, 10],
    ["bytes=90-", 206, 10],
    ["bytes=-10", 206, 10],
    ["bytes=100-", 416, null],
    ["bytes=9-0", 416, null],
    ["bytes=0-2,4-5", 416, null],
  ]) {
    const r = await app.request(
      "/media/course",
      { headers: { Range: range } },
      env,
    );
    assert.equal(r.status, status);
    if (len) assert.equal(r.headers.get("Content-Length"), String(len));
  }
  assert.equal(
    (await app.request("/media/course", { method: "HEAD" }, env)).headers.get(
      "Content-Length",
    ),
    "100",
  );
  assert.equal(
    (
      await app.request(
        "/media/course",
        { headers: { "If-None-Match": '"test"' } },
        env,
      )
    ).status,
    304,
  );
  console.log(
    "PASS media streaming: bounded/suffix/open ranges, invalid ranges, HEAD and ETag",
  );
  db.close();
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
