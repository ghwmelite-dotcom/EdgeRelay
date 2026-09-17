const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { DatabaseSync } = require('node:sqlite');
const { createHmac } = require('node:crypto');
const fromWeb = Module.createRequire(path.resolve('apps/web/package.json'));
const fromVite = Module.createRequire(fromWeb.resolve('vite'));
const esbuild = fromVite('esbuild');
const result = esbuild.buildSync({ stdin: { contents: `
export { Hono } from 'hono';
export * from './packages/shared/src/marketNewsPolicy.ts';
export { positions } from './workers/journal-sync/src/positions.ts';
export { journal } from './workers/api-gateway/src/routes/journal.ts';
export { marketNews } from './workers/api-gateway/src/routes/marketNews.ts';
export { news } from './workers/api-gateway/src/routes/news.ts';
export { default as digest } from './workers/notification-digest/src/index.ts';
`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', write: false,
  nodePaths: [path.resolve('workers/api-gateway/node_modules')] });
const compiled = new Module(path.resolve('scripts/test-news-positions.bundle.cjs'), module);
compiled.filename = path.resolve('scripts/test-news-positions.bundle.cjs');
compiled.paths = module.paths;
compiled._compile(result.outputFiles[0].text, compiled.filename);
const { Hono, classifyMajorNews, selectMajorNews, positions, journal, marketNews, news, digest } = compiled.exports;
const positives = ['US CPI Actual 3.2% (Forecast 3.1%, Previous 3.0%)', 'Fed cuts interest rates by 25 basis points', 'BOJ keeps policy rate unchanged at 0.5%', 'US Nonfarm Payrolls Actual 210K', 'NFP Actual 210K (Forecast 180K)', 'FOMC releases policy statement and economic projections'];
const negatives = ['OPEC announces output cuts', 'UKMTO reports security incident in Strait of Hormuz', 'US imposes new tariffs on China', 'Major bank collapses after deposit run', 'FOMC minutes preview', 'AUDUSD rebounds at 100-day moving average', 'New Zealand Food Price Index Actual 0.3%', 'New Zealand Imports Actual 8.00B', 'Qualcomm CEO will attend state dinner', 'A view on inflation is increasingly important', 'Friday FX Option Expiries', 'US CPI forecast 3.0%', 'US CPI preview: expected 3.2%', 'Fed could cut interest rates by 25 basis points', 'There are no confirmed reports of an explosion near oil refinery'];
for (const item of positives) assert.ok(classifyMajorNews(item), item);
for (const item of negatives) assert.equal(classifyMajorNews(item), null, item);
assert.equal(selectMajorNews([{headline: positives[0]}, {headline: 'FinancialJuice: ' + positives[0]}]).length, 1);
console.log('PASS news positives, noise/speculation rejection, cross-prefix dedup');
const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE accounts (id TEXT PRIMARY KEY, user_id TEXT, api_secret TEXT, api_key TEXT, is_active INTEGER);
INSERT INTO accounts VALUES ('owned', 'owner', 'test-secret', 'test-key', 1);
CREATE TABLE market_news (id TEXT, headline_hash TEXT, headline TEXT, summary TEXT, source TEXT, url TEXT, sentiment TEXT, related_currencies TEXT, published_at TEXT);
CREATE TABLE news_events (id TEXT, event_name TEXT, currency TEXT, impact TEXT, event_time TEXT, forecast TEXT, previous TEXT, actual TEXT);
CREATE TABLE notification_preferences (user_id TEXT, news_alerts INTEGER, session_alerts INTEGER);
INSERT INTO notification_preferences VALUES ('owner', 1, 0);`);
db.exec(fs.readFileSync('migrations/0024_live_positions.sql', 'utf8'));
const DB = { prepare(sql) { const statement = db.prepare(sql); let bindings = []; return {
 bind(...values) { bindings = values; return this; },
 async first() { return statement.get(...bindings) ?? null; },
 async all() { return {results: statement.all(...bindings)}; },
 async run() { const result = statement.run(...bindings); return {meta: {changes: Number(result.changes)}}; },
}; }};
const values = new Map();
const kv = {async get(key) {return values.get(key) ?? null;}, async put(key, value) {values.set(key, value);}};
const env = {DB, RATE_LIMIT: kv, BOT_STATE: kv, TELEGRAM_BOT_TOKEN: 'test-token', TELEGRAM_CHANNEL_ID: 'test-channel'};
const app = new Hono();
app.use('*', async (c, next) => { c.set('userId', c.req.header('X-Test-User') ?? 'owner'); await next(); });
app.route('/', positions); app.route('/journal', journal); app.route('/market-news', marketNews); app.route('/news', news);
let captured = Math.floor(Date.now()/1000);
let snapshot = {version: 1, account_id: 'owned', captured_at: captured, currency: 'GHS', balance: 500, equity: 512, floating_profit: 12,
 positions: [{ticket:'9999999999999999',position_id:'7',symbol:'USDJPY.s',direction:'buy',volume:0.05,price_open:156.011,price_current:156.3,sl:155,tp:158,profit:13,swap:-1}]};
async function send(body, signingBody = body, headers = {}) { return app.request('/v1/journal/positions', {method:'POST', body, headers: {'Content-Type':'application/json', 'X-API-Key':'test-key','X-Snapshot-Signature':createHmac('sha256','test-secret').update(signingBody).digest('hex'), ...headers}}, env); }
(async () => {
 assert.equal((await send(JSON.stringify(snapshot))).status, 200);
 const original = JSON.stringify(snapshot);
 assert.equal((await send(original)).status, 409);
 assert.equal((await send(original.replace('"floating_profit":12','"floating_profit":999'), original)).status, 401);
 assert.equal((await send(JSON.stringify({...snapshot, captured_at: captured - 300}))).status, 400);
 assert.equal((await send(JSON.stringify({...snapshot, currency:'<bad>'}))).status, 400);
 assert.equal((await send(JSON.stringify({...snapshot, positions:[snapshot.positions[0],snapshot.positions[0]]}))).status, 400);
 assert.equal((await app.request('/journal/positions/owned', {headers:{'X-Test-User':'other'}}, env)).status, 403);
 let response = await app.request('/journal/positions/owned', {}, env);
 assert.equal(response.headers.get('cache-control'), 'no-store');
 let body = await response.json(); assert.equal(body.data.snapshot.currency, 'GHS'); assert.equal(body.data.snapshot.floating_profit, 12); assert.equal(body.data.stale, false);
 db.prepare('UPDATE live_position_snapshots SET received_at = ?').run(Date.now()-60_000);
 assert.equal((await (await app.request('/journal/positions/owned', {}, env)).json()).data.stale, true);
 assert.equal((await send(JSON.stringify({...snapshot,captured_at:captured+1,positions:[],floating_profit:0,equity:500}))).status, 200);
 body = await (await app.request('/journal/positions/owned', {}, env)).json(); assert.deepEqual(body.data.snapshot.positions, []); assert.equal(body.data.snapshot.floating_profit,0);
 db.prepare('DELETE FROM live_position_snapshots').run();
 assert.equal((await (await app.request('/journal/positions/owned', {}, env)).json()).data.snapshot, null);
 values.set(`positions:owned:${Math.floor(Date.now()/60_000)}`, '12');
 assert.equal((await send(JSON.stringify({...snapshot,captured_at:captured+2}))).status,429);
 console.log('PASS signed telemetry, tamper/replay/clock/schema rejection, owner isolation, stale state, closed-position clearing, missing versus zero, rate limit');
 const insert = db.prepare("INSERT INTO market_news VALUES (?, ?, ?, '', 'FinancialJuice', 'https://example.invalid', NULL, 'USD', datetime('now'))");
 positives.slice(0,2).forEach((headline,i)=>insert.run('major'+i,'major'+i,headline)); negatives.forEach((headline,i)=>insert.run('noise'+i,'noise'+i,headline));
 const headlineResponse = await (await app.request('/market-news/headlines?limit=10',{},env)).json();
 assert.equal(headlineResponse.data.headlines.length,2);
 db.prepare("INSERT INTO news_events VALUES ('high','BOJ rate decision','JPY','high',datetime('now','+1 day'),NULL,NULL,NULL)").run();
 db.prepare("INSERT INTO news_events VALUES ('medium','Minor release','JPY','medium',datetime('now','+1 day'),NULL,NULL,NULL)").run();
 const calendar = await (await app.request('/news/calendar',{},env)).json(); assert.equal(calendar.data.events.length,1); assert.equal(calendar.data.events[0].currency,'JPY');
 const RealDate = Date; const fixed = new RealDate(); fixed.setUTCMinutes(23,0,0);
 global.Date = class extends RealDate { constructor(...args) {super(...(args.length ? args : [fixed.getTime()]));} static now() {return fixed.getTime();} };
 values.set('user:owner:tg', JSON.stringify({chatId:'test-dm'}));
 const messages = []; let delivered = false;
 global.fetch = async (url, init) => {assert.ok(String(url).startsWith('https://api.telegram.org/')); messages.push(JSON.parse(init.body));return new Response(JSON.stringify({ok:delivered}));};
 const ctx = { waitUntil(promise) {throw new Error('Unexpected background send in test');} };
 await digest.scheduled({},env,ctx); assert.equal(values.has('news-push:owner:major0'),false); assert.equal(values.has('news-channel:major0'),false);
 delivered = true; await digest.scheduled({},env,ctx);
 assert.equal(values.get('news-push:owner:major0'),'1'); assert.equal(values.get('news-channel:major0'),'1');
 for (const message of messages) {assert.ok(message.text.includes('US CPI')); assert.ok(!message.text.includes('Food Price'));}
 const count = messages.length; await digest.scheduled({},env,ctx); assert.equal(messages.length,count);
 global.Date = RealDate;
 console.log('PASS dashboard/calendar filtering; Telegram channel+DM major-only, retry after failure, and dedup (no real messages sent)');
 db.close();
})().catch(error => {console.error(error); process.exitCode=1;});
