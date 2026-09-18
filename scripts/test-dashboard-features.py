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
 page.route('**/v1/**',respond);page.route('**/health',respond)
 page.clock.install()
 try:
  page.goto(BASE+'/dashboard',wait_until='networkidle')
  print('CONTROLS',page.get_by_role('button').all_text_contents())
  print('HEADINGS',page.locator('h1,h2,h3').all_text_contents())
  page.get_by_text('API connection: Reachable',exact=False).wait_for()
  assert 'All Operational' not in page.inner_text('body') and '99.99%' not in page.inner_text('body')
  page.get_by_text('Multiple currencies',exact=True).wait_for()
  assert page.get_by_text('1/2',exact=True).count()==1
  assert 'BUY' in page.locator('tr').filter(has_text='AUDITBUY').inner_text()
  assert 'MODIFY' in page.locator('tr').filter(has_text='AUDITMOD').inner_text()
  page.get_by_text('Daily loss used',exact=True).wait_for()
  print('PASS status, mixed-currency safeguard, active count, follower metric and signal actions')
  page.get_by_role('button',name='High-impact Calendar',exact=True).click();page.get_by_text('Nonfarm Payrolls',exact=True).wait_for()
  page.get_by_role('button',name='Major News',exact=True).click();expect(page.get_by_role('link',name='US CPI Actual',exact=False)).to_have_attribute('href','https://example.invalid/cpi')
  print('PASS news/calendar tabs and headline source link')
  page.get_by_role('button',name='Connect Telegram',exact=True).click();page.get_by_role('alert').filter(has_text='Unable to create Telegram link').wait_for()
  controls['link_fail']=False;page.get_by_role('button',name='Connect Telegram',exact=True).click();expect(page.get_by_role('link',name='Open Telegram',exact=False)).to_have_attribute('href','https://t.me/edgerelay_bot?start=SYNTHETIC')
  controls['connected']=True;page.evaluate('window.dispatchEvent(new Event("focus"))');expect(page.get_by_text('Get instant trade alerts on Telegram',exact=True)).to_have_count(0)
  print('PASS Telegram error, retry, deep link and returned-tab connection state (mocked)')
  assert page.get_by_text('Unavailable',exact=True).count()>=2
  page.get_by_text('Insufficient opted-in activity.',exact=False).wait_for()
  journal=page.get_by_role('region',name='Journal activity',exact=True)
  page.get_by_label('Journal account',exact=True).select_option('follower');journal.get_by_text('No synced trades for this account.',exact=False).wait_for()
  page.get_by_label('Journal account',exact=True).select_option('master');journal.get_by_text('Showing the latest 10 synced deals.',exact=True).wait_for()
  before=calls.count('journal/trades/master');page.get_by_role('button',name='Refresh journal',exact=True).click();journal.get_by_text('Showing the latest 10 synced deals.',exact=True).wait_for();assert calls.count('journal/trades/master')>before
  print('PASS journal account selection/manual refresh, analytics threshold and missing measurements')
  toggle=page.get_by_role('button',name='Switch to light mode',exact=True);toggle.click();assert page.evaluate('document.documentElement.classList.contains("light")');page.get_by_role('button',name='Switch to dark mode',exact=True).click()
  page.get_by_text('Audit insight',exact=True).wait_for()
  page.get_by_role('button',name='Dismiss',exact=True).click();expect(page.get_by_role('link',name='Configure Alerts',exact=True)).to_have_count(0)
  clock_box=page.get_by_text('Local Time',exact=True).locator('..');before_clock=clock_box.inner_text();page.clock.fast_forward(1100);assert clock_box.inner_text()!=before_clock
  print('PASS theme switching, insight rendering, alert nudge dismissal and clock')
  controls['mixed']=False;page.clock.fast_forward(30_100);page.get_by_text('-100.00 USD',exact=True).wait_for()
  controls['stats_fail']=True;controls['health_fail']=True;page.clock.fast_forward(30_100);page.get_by_text('API connection: Unavailable',exact=False).wait_for();expect(page.get_by_text('-100.00 USD',exact=True)).to_have_count(0)
  controls['stats_fail']=False;controls['health_fail']=False;page.clock.fast_forward(30_100);page.get_by_text('-100.00 USD',exact=True).wait_for()
  assert calls.count('signals')>=3
  controls['news_fail']=True;page.clock.fast_forward(300_100);page.get_by_role('alert').filter(has_text='Unable to refresh news').wait_for()
  page.get_by_role('button',name='High-impact Calendar',exact=True).click();page.get_by_role('alert').filter(has_text='Unable to refresh calendar').wait_for()
  controls['news_fail']=False;page.clock.fast_forward(300_100);expect(page.get_by_role('alert').filter(has_text='Unable to refresh')).to_have_count(0)
  print('PASS negative P/L, periodic refresh, missing-total safeguard, API/news/calendar failure and recovery')
  links=page.locator('a[href]').evaluate_all('(items)=>items.map(x=>({text:x.textContent.trim(),href:x.getAttribute("href")}))')
  expected={'/accounts','/journal','/analytics','/signals','/settings'};assert expected.issubset({x['href'] for x in links})
  page.get_by_role('link',name='View Full History',exact=True).click();page.wait_for_url('**/signals');page.goto(BASE+'/dashboard',wait_until='networkidle')
  print('PASS dashboard navigation targets and signal-history route')
  out=Path('.wrangler/dashboard-audit');out.mkdir(parents=True,exist_ok=True)
  page.screenshot(path=str(out/'desktop.png'),full_page=True,animations='disabled')
  page.set_viewport_size({'width':390,'height':844});page.reload(wait_until='networkidle');page.clock.fast_forward(600)
  page.get_by_role('button',name='Open navigation',exact=True).click();page.clock.fast_forward(600);expect(page.get_by_role('button',name='Open navigation',exact=True)).to_have_attribute('aria-expanded','true')
  page.get_by_role('button',name='Close navigation',exact=True).click();page.clock.fast_forward(600);expect(page.get_by_role('button',name='Open navigation',exact=True)).to_have_attribute('aria-expanded','false')
  page.screenshot(path=str(out/'mobile.png'),full_page=True,animations='disabled')
  assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth+1'),'Mobile horizontal overflow'
  print('PASS mobile navigation open/close and no page overflow')
  controls['empty']=True;page.goto(BASE+'/dashboard',wait_until='networkidle');page.get_by_text('Welcome to TradeMetrics Pro',exact=True).wait_for()
  page.get_by_role('button',name='Skip this step',exact=True).click();page.get_by_role('button',name='Skip this step',exact=True).click();expect(page.get_by_role('link',name='Open Prop Firm Hub',exact=False)).to_have_attribute('href','/app/prop-firms');page.get_by_role('button',name='Close',exact=True).click();expect(page.get_by_text('Welcome to TradeMetrics Pro',exact=True)).to_have_count(0)
  page.reload(wait_until='networkidle');expect(page.get_by_text('Welcome to TradeMetrics Pro',exact=True)).to_have_count(0)
  print('PASS empty-account state, onboarding steps and persisted dismissal')
  page.get_by_role('button',name='Open navigation',exact=True).click();page.clock.fast_forward(600)
  page.get_by_role('button',name='Logout',exact=True).click();page.wait_for_url('**/login')
  anonymous=browser.new_page(service_workers='block');anonymous.goto(BASE+'/dashboard',wait_until='networkidle');anonymous.wait_for_url('**/login');anonymous.close()
  print('PASS logout and unauthenticated dashboard redirect')
  assert not errors,errors
 finally:browser.close()
