import { Hono } from 'hono';
import type { Env } from '../types.js';
export const communityPulse = new Hono<{ Bindings: Env }>();
const MIN_PARTICIPANTS = 10;
communityPulse.put('/consent', async c => {
 const body: unknown = await c.req.json().catch(()=>null);
 if (!body || typeof body !== 'object' || typeof (body as {enabled?:unknown}).enabled !== 'boolean') return c.json({data:null,error:{code:'VALIDATION_ERROR',message:'enabled must be a boolean'}},400);
 const enabled=(body as {enabled:boolean}).enabled;
 await c.env.DB.prepare(`INSERT INTO community_consent(user_id,enabled) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET enabled=excluded.enabled,updated_at=datetime('now')`).bind(c.get('userId'),Number(enabled)).run();
 return c.json({data:{enabled},error:null});
});
communityPulse.get('/', async c => {
 c.header('Cache-Control','no-store');
 const consent=await c.env.DB.prepare('SELECT enabled FROM community_consent WHERE user_id=?').bind(c.get('userId')).first<{enabled:number}>();
 // One directional vote per consenting owner and exact broker symbol; no lots or P/L leave the database.
 const {results}=await c.env.DB.prepare(`WITH votes AS (
 SELECT a.user_id, json_extract(j.value,'$.symbol') AS symbol,
 SUM(CASE json_extract(j.value,'$.direction') WHEN 'buy' THEN 1 WHEN 'sell' THEN -1 ELSE 0 END) AS direction
 FROM live_position_snapshots p JOIN accounts a ON a.id=p.account_id
 JOIN community_consent c ON c.user_id=a.user_id AND c.enabled=1,
 json_each(p.snapshot_json,'$.positions') j
 WHERE a.is_active=1 AND p.received_at >= ? AND p.received_at <= ?
 GROUP BY a.user_id,symbol
 ), totals AS (SELECT symbol,COUNT(*) AS participants,SUM(CASE WHEN direction>0 THEN 1 ELSE 0 END) AS buyers
 FROM votes WHERE direction<>0 GROUP BY symbol)
 SELECT symbol,ROUND(buyers*10.0/participants)*10 AS buy_percent FROM totals
 WHERE participants >= ? AND buyers >= 5 AND participants-buyers >= 5 ORDER BY symbol LIMIT 12`).bind(Date.now()-45000,Date.now(),MIN_PARTICIPANTS).all<{symbol:string;buy_percent:number}>();
 return c.json({data:{enabled:!!consent?.enabled,minimum_participants:MIN_PARTICIPANTS,symbols:results??[],updated_at:new Date().toISOString()},error:null});
});
