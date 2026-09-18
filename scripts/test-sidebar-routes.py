"""Dashboard control matrix with synthetic API fixtures; never sends real account mutations."""
import base64,json,os,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.environ.get('TEST_BASE_URL','http://127.0.0.1:4175')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 page=browser.new_page(service_workers='block',viewport={'width':1440,'height':1000})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 token='e30.'+base64.urlsafe_b64encode(json.dumps({'exp':int(time.time())+7200}).encode()).decode().rstrip('=')+'.test'
 state={'state':{'token':token,'isAuthenticated':True,'user':{'id':'dashboard-audit','email':'test@example.invalid','name':'Audit Trader','plan':'pro'}},'version':0}
 page.add_init_script('localStorage.setItem("edgerelay-auth",'+json.dumps(json.dumps(state))+');')
 controls={'mixed':True,'stats_fail':False,'health_fail':False,'link_fail':True,'connected':False,'empty':False,'signals':2,'news_fail':False}
 calls=[]
 now=int(time.time())
 accounts=[{'id':'master','alias':'Audit Master','role':'master','last_heartbeat':str(now),'signals_today':2,'broker_name':'Test Broker','last_signal_at':None},{'id':'follower','alias':'Audit Follower','role':'follower','last_heartbeat':None,'signals_today':0,'broker_name':'Test Broker','follower_config':{'lot_mode':'mirror','max_total_drawdown_percent':10}}]
 trades=[{'deal_ticket':n+1,'symbol':'USDJPY.s','direction':'sell','deal_entry':'out','volume':.05,'price':156.1,'time':now-n*3600,'profit':-10,'commission':0,'swap':0,'session_tag':'london','duration_seconds':None,'risk_reward_ratio':None} for n in range(12)]
 def respond(route):
  url=route.request.url; path=url.split('/v1/')[-1].split('?')[0];calls.append(path)
  if url.endswith('/health') and '/v1/' not in url:
   if controls['health_fail']:route.abort('failed')
   else:route.fulfill(json={'data':{'status':'ok'},'error':None})
   return
  if controls['news_fail'] and path in ('market-news/headlines','news/calendar'):
   route.abort('failed');return
  data=None
  if path=='accounts':data=[] if controls['empty'] else accounts
  elif path=='command/health':data={'accounts':[{'account_id':'follower','health':{'drawdown':{'current_percent':2,'used_percent':20},'daily_loss':{'current_percent':1.25}}}]}
  elif path=='signals':data=[] if controls['empty'] else [{'id':'s1','action':'open','order_type':'buy','symbol':'AUDITBUY','price':None,'volume':None,'received_at':'2026-09-18T10:00:00Z'},{'id':'s2','action':'modify','order_type':None,'symbol':'AUDITMOD','price':None,'volume':None,'received_at':'2026-09-18T10:00:00Z'}]
  elif path.startswith('journal/stats/'):
   if controls['stats_fail']:route.fulfill(status=503,json={'data':None,'error':{'message':'Unavailable','code':'TEST'}});return
   data={'net_profit':-120 if path.endswith('master') else 20,'total_trades':12,'winning_trades':4,'currency':'EUR' if controls['mixed'] and path.endswith('follower') else 'USD'}
  elif path.startswith('journal/trades/'):data={'trades':trades if path.endswith('master') else []}
  elif path.startswith('journal/positions/'):data={'snapshot':None,'received_at':None,'stale':True}
  elif path=='market-news/headlines':data={'headlines':[{'id':'cpi','headline':'US CPI Actual 3.2%','source':'FinancialJuice','url':'https://example.invalid/cpi','published_at':'2026-09-18T10:00:00Z','importance':{'category':'Major economic release','reason':'CPI'}}]}
  elif path=='news/calendar':data={'events':[{'id':'nfp','event_name':'Nonfarm Payrolls','currency':'USD','impact':'high','event_time':'2026-10-02T12:30:00Z'}]}
  elif path=='analytics/ai-insights':data={'insights':[{'id':'i1','severity':'warning','title':'Audit insight','detail':'Synthetic account insight. Test details.'}]}
  elif path=='community-pulse':data={'enabled':False,'symbols':[]}
  elif path=='notifications/telegram/status':data={'connected':controls['connected'],'linked_at':None}
  elif path=='notifications/telegram/link':
   if controls['link_fail']:route.abort('failed');return
   data={'deepLink':'https://t.me/edgerelay_bot?start=SYNTHETIC'}
  route.fulfill(json={'data':data,'error':None})


 def unavailable(route):
  route.fulfill(status=503,json={'data':None,'error':{'code':'UNAVAILABLE','message':'Temporary test outage'}})
 page.route('**/v1/**',unavailable)
 routes=['/command-center','/risk','/accounts','/signals','/journal','/analytics','/discipline','/usage','/settings','/billing','/downloads','/propguard/setup','/app/prop-firms','/counselor','/community','/academy','/academy/practice','/simulator','/provider/setup','/app/marketplace','/app/strategy-hub','/referrals','/admin','/founder','/tools/pip-calculator','/tools/position-size-calculator','/tools/risk-reward-calculator']
 failed=[]
 for path in routes:
  errors.clear()
  page.goto(BASE+path,wait_until='networkidle');page.wait_for_timeout(250)
  body=page.inner_text('body')
  if errors or not body.strip():failed.append((path,list(errors),body[:100]))
  print('PASS' if not errors and body.strip() else 'FAIL',path,'outage render')
 browser.close()
 assert not failed,failed
