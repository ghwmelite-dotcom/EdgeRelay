"""Local browser QA: API responses mocked; real server validation is covered by test-three-strategies.cjs."""
import base64,json,os,time,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.environ.get('TEST_BASE_URL','http://127.0.0.1:4176')
source=Path('packages/shared/src/gold-range-academy.ts').read_text(encoding='utf-8')
lessons=json.loads(source.split('export const GOLD_RANGE_LESSONS: GoldRangeLesson[] = ',1)[1].split(';\nexport const GOLD_RANGE_TEACHING_CONTEXT',1)[0])
output=Path('.wrangler/range-course-audit');output.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 page=browser.new_page(service_workers='block',viewport={'width':1440,'height':1000})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 token='e30.'+base64.urlsafe_b64encode(json.dumps({'exp':int(time.time())+7200}).encode()).decode().rstrip('=')+'.test'
 state={'state':{'token':token,'isAuthenticated':True,'user':{'id':'range-audit','email':'test@example.invalid','name':'Audit Trader','plan':'pro'}},'version':0}
 page.add_init_script('localStorage.setItem("edgerelay-auth",'+json.dumps(json.dumps(state))+');')
 progress={};writes=[]
 def respond(route):
  path=route.request.url.split('/v1/')[-1].split('?')[0]
  data=None
  if path=='accounts':data=[]
  elif path=='academy/progress':
   if route.request.method=='GET':data={'progress':list(progress.values())}
   else:
    b=json.loads(route.request.post_data);writes.append(b)
    progress.setdefault(b['lessonId'],{'lesson_id':b['lessonId'],'level_id':b['levelId'],'status':'in_progress','quiz_score':None,'quiz_passed':False,'completed_at':None});data={'ok':True}
  elif path=='academy/quiz':
   b=json.loads(route.request.post_data);lesson=next(l for l in lessons if l['id']==b['lessonId']);correct=sum(next(a['selected'] for a in b['answers'] if a['questionId']==q['id'])==q['correctIndex'] for q in lesson['quiz']);score=round(correct/len(lesson['quiz'])*100)
   results=[{'questionId':q['id'],'selected':next(a['selected'] for a in b['answers'] if a['questionId']==q['id']),'correctIndex':q['correctIndex'],'isCorrect':next(a['selected'] for a in b['answers'] if a['questionId']==q['id'])==q['correctIndex']} for q in lesson['quiz']]
   data={'score':score,'passed':score>=80,'correct':correct,'total':len(lesson['quiz']),'results':results}
   progress[b['lessonId']]={'lesson_id':b['lessonId'],'level_id':b['levelId'],'status':'completed' if score>=80 else 'in_progress','quiz_score':score,'quiz_passed':score>=80,'completed_at':None}
  elif path=='academy/homework':data={'homework':{}}
  route.fulfill(json={'data':data,'error':None})
 page.route('**/v1/**',respond)
 page.goto(BASE+'/academy',wait_until='domcontentloaded')
 page.get_by_text('0 / 12 lessons',exact=True).wait_for(timeout=60000)
 page.get_by_role('button',name=re.compile('TMPro Range Breakout')).click()
 page.get_by_text('0 / 6 lessons',exact=True).wait_for()
 expect(page).to_have_url(re.compile('course=gold-range-utc'))
 page.goto(BASE+'/academy/gr-v1-03');page.get_by_role('heading',name='Level 2 is locked',exact=True).wait_for()
 assert not any(w['lessonId']=='gr-v1-03' for w in writes),writes
 for lesson in lessons:
  page.goto(BASE+'/academy/'+lesson['id'],wait_until='domcontentloaded')
  page.get_by_role('heading',name=lesson['title'],exact=True).wait_for()
  assert page.locator('video').count()==0
  assert page.get_by_text('Scarface Trades',exact=True).count()==0
  expect(page.get_by_role('button',name='Submit Quiz',exact=True)).to_be_disabled()
  for q in lesson['quiz']:page.get_by_role('button',name=q['options'][q['correctIndex']],exact=True).click()
  page.get_by_role('button',name='Submit Quiz',exact=True).click()
  page.get_by_text('Lesson Complete!',exact=True).wait_for()
  if lesson==lessons[-1]:assert page.get_by_role('link',name=re.compile('Next Lesson')).count()==0
 page.get_by_role('link',name='Back to Academy',exact=True).click()
 page.get_by_text('6 / 6 lessons',exact=True).wait_for()
 page.reload();page.get_by_text('6 / 6 lessons',exact=True).wait_for()
 page.get_by_role('button',name=re.compile('Three Strategies')).click();page.get_by_text('0 / 12 lessons',exact=True).wait_for()
 page.goto(BASE+'/academy/ts-v1-03');page.get_by_role('heading',name='Level 2 is locked',exact=True).wait_for()
 page.goto(BASE+'/academy/gold-range-guide');page.get_by_role('button',name='Sell example',exact=True).click()
 expect(page.get_by_role('button',name='Sell example',exact=True)).to_have_attribute('aria-pressed','true')
 expect(page.locator('img[src="/playbook/tmpro-range-sell.svg"]')).to_be_visible()
 page.get_by_role('button',name='100+ pip body: wait',exact=True).click()
 expect(page.locator('img[src="/playbook/tmpro-range-sell-delayed.svg"]')).to_be_visible()
 page.get_by_role('button',name='Buy example',exact=True).click()
 expect(page.locator('img[src="/playbook/tmpro-range-buy-delayed.svg"]')).to_be_visible()
 page.screenshot(path=str(output/'guide-desktop.png'),full_page=True)
 for route,name in [('/academy?course=gold-range-utc','course'),('/academy/gr-v1-04','lesson'),('/academy/gold-range-guide','guide'),('/playbook/tmpro-range-breakout.html','print-guide')]:
  page.set_viewport_size({'width':390,'height':844});page.goto(BASE+route,wait_until='networkidle')
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),route
  page.screenshot(path=str(output/(name+'-mobile.png')),full_page=True)
 page.set_viewport_size({'width':1050,'height':1500});page.goto(BASE+'/playbook/tmpro-range-breakout.html');page.screenshot(path=str(output/'print-guide-desktop.png'),full_page=True)
 page.pdf(path=str(output/'TMPro-Range-Breakout-UTC.pdf'),format='A4',print_background=True,prefer_css_page_size=True)
 assert not errors,errors
 print('PASS two course selectors, independent progress, six lesson quizzes, refresh persistence, no misattributed media, no cross-course next link, guide toggle, mobile overflow, printable PDF; API mocked')
 browser.close()
