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
  elif path=='community-pulse':data={'enabled':controls.get('sharing',False),'symbols':[]}
  elif path=='community-pulse/consent':
   controls['sharing']=json.loads(route.request.post_data)['enabled'];data={'enabled':controls['sharing']}
  elif path=='notifications/telegram/test':data={'accepted':True}
  elif path=='notifications/preferences':data={'preferences':{'news_alerts':True,'timezone':'UTC','summary_hour':22}}
  elif path=='accounts/profile':data={'name':'Updated Trader'}
  elif path=='notifications/telegram/status':data={'connected':controls['connected'],'linked_at':None}
  elif path=='notifications/telegram/link':
   if controls['link_fail']:route.abort('failed');return
   data={'deepLink':'https://t.me/edgerelay_bot?start=SYNTHETIC'}
  route.fulfill(json={'data':data,'error':None})
 page.route('**/v1/**',respond);page.route('**/health',respond)

 controls['connected']=True
 page.goto(BASE+'/dashboard',wait_until='networkidle')
 page.get_by_role('button',name='Opt in to share position directions',exact=True).click()
 page.get_by_role('button',name='Stop sharing position directions',exact=True).wait_for()
 page.get_by_role('button',name='Stop sharing position directions',exact=True).click()
 page.get_by_role('button',name='Opt in to share position directions',exact=True).wait_for()
 print('PASS community explicit opt-in and withdrawal controls')
 page.goto(BASE+'/settings',wait_until='networkidle')
 page.get_by_role('button',name='Send test Telegram message',exact=True).click()
 page.get_by_role('status').filter(has_text='Telegram accepted').wait_for()
 page.get_by_label('Name',exact=True).fill('Updated Trader')
 page.get_by_role('button',name='Save Changes',exact=False).click()
 page.get_by_text('Profile updated successfully.',exact=True).wait_for()
 print('PASS Telegram test action and profile save (mocked requests only)')
 page.goto(BASE+'/tools/position-size-calculator',wait_until='networkidle')
 page.get_by_text('0.20',exact=True).wait_for()
 page.get_by_label('Stop loss in pips',exact=True).fill('0')
 page.get_by_role('alert').filter(has_text='Enter positive values').wait_for()
 assert page.get_by_text('0.20',exact=True).count()==0
 page.get_by_label('Stop loss in pips',exact=True).fill('30')
 page.get_by_text('0.16',exact=True).wait_for()
 page.get_by_label('Risk per trade',exact=True).fill('-1')
 page.get_by_role('alert').filter(has_text='Enter positive values').wait_for()
 print('PASS calculator known result, zero/negative input rejection and conservative rounding')
 assert not errors,errors
 browser.close()
