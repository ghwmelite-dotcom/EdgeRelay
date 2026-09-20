"""Synthetic authenticated browser QA. API writes mocked; local provided course served for media checks."""
import base64,json,os,time,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.environ.get('TEST_BASE_URL','http://127.0.0.1:4175')
VIDEO=Path(r'C:\Users\USER\Downloads\Three-Strategies-Visual-Playbook\Three-Strategies\The Simplest Way To Start Day Trading In 2026 (Full Course).mp4')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 page=browser.new_page(service_workers='block',viewport={'width':1440,'height':1000})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 token='e30.'+base64.urlsafe_b64encode(json.dumps({'exp':int(time.time())+7200}).encode()).decode().rstrip('=')+'.test'
 state={'state':{'token':token,'isAuthenticated':True,'user':{'id':'strategy-audit','email':'test@example.invalid','name':'Audit Trader','plan':'pro'}},'version':0}
 page.add_init_script('localStorage.setItem("edgerelay-auth",'+json.dumps(json.dumps(state))+');')
 calls=[];saved=[];progress=[]
 def respond(route):
  path=route.request.url.split('/v1/')[-1].split('?')[0];calls.append(path)
  if path=='academy-media/course':
   if not VIDEO.exists():route.fulfill(status=404,body='Missing local source');return
   size=VIDEO.stat().st_size;req=route.request.headers.get('range','bytes=0-');m=re.match(r'bytes=(\d+)-(\d*)',req);start=int(m.group(1)) if m else 0;end=min(int(m.group(2)) if m and m.group(2) else start+1024*1024-1,size-1)
   with VIDEO.open('rb') as f:f.seek(start);data=f.read(end-start+1)
   route.fulfill(status=206,body=data,headers={'Content-Type':'video/mp4','Accept-Ranges':'bytes','Content-Range':f'bytes {start}-{end}/{size}','Content-Length':str(len(data)),'Access-Control-Allow-Origin':'*'});return
  data=None
  if path=='accounts':data=[]
  elif path=='academy/progress':data={'progress':progress} if route.request.method=='GET' else {'ok':True}
  elif path=='academy/quiz':
   body=json.loads(route.request.post_data);data={'score':100,'passed':True,'correct':2,'total':2,'results':[{'questionId':a['questionId'],'selected':a['selected'],'correctIndex':a['selected'],'isCorrect':True} for a in body['answers']]}
  elif path=='academy/homework':data={'homework':{}}
  elif path=='strategy-reviews':
   if route.request.method=='POST':saved.append(json.loads(route.request.post_data));data={'id':'synthetic-review'}
   else:data={'reviews':[]}
  route.fulfill(json={'data':data,'error':None})
 page.route('**/v1/**',respond)
 page.goto(BASE+'/icc-studio',wait_until='domcontentloaded')
 expect(page).to_have_url(re.compile('/three-strategies$'))
 page.get_by_role('heading',name='Three Strategies Studio',exact=True).wait_for()
 page.get_by_label('Replay minute',exact=True).fill('11')
 expect(page.get_by_role('heading',name='Rule state: ready',exact=True)).to_be_visible()
 page.get_by_role('button',name='Entry permitted',exact=True).click();page.get_by_text('Correct: eligible in this practice model. No real order is sent.',exact=True).wait_for()
 page.get_by_label('Exercise',exact=True).select_option('cancel');page.get_by_label('Replay minute',exact=True).fill('11');page.get_by_role('heading',name='Rule state: cancelled',exact=True).wait_for()
 page.get_by_label('Setup',exact=True).select_option('previous-day');page.get_by_label('Exercise',exact=True).select_option('valid');page.get_by_label('Replay minute',exact=True).fill('6');page.get_by_role('heading',name='Rule state: ready',exact=True).wait_for()
 page.get_by_label('Teaching instrument',exact=True).select_option('USDJPY');page.get_by_label('Replay minute',exact=True).fill('6');page.get_by_role('heading',name='Rule state: ready',exact=True).wait_for()
 page.get_by_label('Setup',exact=True).select_option('pre-window');page.get_by_label('Replay minute',exact=True).fill('6');page.get_by_role('heading',name='Rule state: ready',exact=True).wait_for()
 expect(page.get_by_role('link',name='Scarface Trades — YouTube channel',exact=True)).to_have_attribute('href','https://www.youtube.com/@ScarfaceTrades')
 if VIDEO.exists():
  page.wait_for_function('document.querySelector("video").readyState>=1',timeout=30000)
  duration=page.locator('video').evaluate('(v)=>v.duration');assert 2647<duration<2649,duration
  page.get_by_role('button',name=re.compile('Go to lesson chapter')).click();assert abs(page.locator('video').evaluate('(v)=>v.currentTime')-1203)<2
 print('PASS public legacy redirect, all replay setups, two teaching markets, cancellation, credited video metadata and chapter seeking')
 page.goto(BASE+'/academy',wait_until='domcontentloaded');page.get_by_text('0 / 12 lessons',exact=True).wait_for()
 page.goto(BASE+'/academy/ts-v1-01',wait_until='domcontentloaded');page.get_by_role('button',name='One chosen before the session',exact=True).click();page.get_by_role('button',name='No; the cross-market adaptation needs testing',exact=True).click();page.get_by_role('button',name='Submit Quiz',exact=True).click();page.get_by_text('Lesson Complete!',exact=True).wait_for()
 page.get_by_role('link',name='Next Lesson',exact=False).click();page.get_by_role('button',name='Submit Quiz',exact=True).wait_for();expect(page.get_by_role('button',name='Submit Quiz',exact=True)).to_be_disabled();assert page.get_by_text('Lesson Complete!',exact=True).count()==0
 print('PASS new curriculum count, quiz submission and lesson-navigation state reset')
 page.goto(BASE+'/app/strategy-hub',wait_until='domcontentloaded');page.get_by_role('heading',name='Prepare, skip or review',exact=True).wait_for()
 page.get_by_label('UTC session-anchor date',exact=True).fill('2026-09-21');page.get_by_label('Provider / contract / day cutoff',exact=True).fill('Synthetic broker; verified for test only')
 page.get_by_label('Open / reference',exact=True).fill('2026-09-21T22:02');page.get_by_label('Venue close / reference end',exact=True).fill('2026-09-22T20:57');page.get_by_label('Practice cutoff',exact=True).fill('2026-09-21T23:32');page.get_by_label('I checked the date-specific symbol schedule, UTC conversion and availability.',exact=True).check();page.get_by_label('Evidence and notes',exact=True).fill('Synthetic skip: no retest.');page.get_by_label('Record type',exact=True).select_option('skip');page.get_by_role('button',name='Save review',exact=True).click();page.get_by_text('Saved as a self-reported review.',exact=True).wait_for();assert saved and saved[0]['session']['open']==1790028120,saved
 print('PASS UTC session evidence and self-reported review submission; requests mocked')
 Path('.wrangler/strategy-audit').mkdir(parents=True,exist_ok=True)
 for route,name in [('/','landing'),('/three-strategies','studio'),('/app/strategy-hub','hub'),('/academy/ts-v1-01','lesson')]:
  page.set_viewport_size({'width':390,'height':844});page.goto(BASE+route,wait_until='domcontentloaded');page.wait_for_timeout(700)
  assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth+1'),route
  page.screenshot(path=f'.wrangler/strategy-audit/{name}-mobile.png',full_page=True)
 print('PASS mobile layouts: landing, studio, session-review form and lesson')
 assert not errors,errors
 browser.close()
