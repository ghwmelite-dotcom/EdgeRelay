"""Homepage click audit. Authentication and dashboard APIs are intercepted, never real mutations."""
import os,json,base64,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.environ.get('TEST_BASE_URL','http://127.0.0.1:4180')
OUT=Path('.wrangler/homepage-audit');OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch();c=b.new_context(service_workers='block',viewport={'width':1440,'height':900});page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 if BASE.startswith('http://127.0.0.1'):
  page.route('**/playbook/tmpro-range-breakout',lambda r:r.fulfill(content_type='text/html',body=Path('apps/web/public/playbook/tmpro-range-breakout.html').read_text(encoding='utf-8')))
 page.goto(BASE,wait_until='domcontentloaded');page.get_by_role('heading',name='Copy Trades Across Any VPS. Any Broker. Free for a Year.',exact=True).wait_for()
 links=page.locator('a').evaluate_all('(els)=>els.map(e=>({text:e.innerText.trim(),href:e.getAttribute("href")}))')
 results=[]
 for href in sorted(set(x['href'] for x in links)):
  page.goto(BASE,wait_until='domcontentloaded');page.get_by_role('heading',name='Copy Trades Across Any VPS. Any Broker. Free for a Year.',exact=True).wait_for()
  link=page.locator('a[href="'+href+'"]:visible').first
  if not link.count():continue
  link.click();page.wait_for_timeout(400)
  if href.startswith('#'):
   if href!='#':assert page.locator(href).count()==1
  else:
   page.locator('h1,h2').first.wait_for();body=page.locator('body').inner_text();assert 'This page could not load' not in body and 'Post not found' not in body
   expected='/login' if href=='/academy' else href
   assert page.url.split('#')[0].endswith(expected),(href,page.url)
   if href!='/':assert 'Copy Trades Across' not in page.locator('h1').all_text_contents()
  results.append({'href':href,'url':page.url});print('PASS click',href,flush=True)
 page.goto(BASE,wait_until='domcontentloaded');page.get_by_role('heading',name='Copy Trades Across Any VPS. Any Broker. Free for a Year.',exact=True).wait_for()
 filters=page.get_by_role('navigation',name='Blog categories').get_by_role('button')
 for i in range(filters.count()):
  button=filters.nth(i);button.click();expect(button).to_have_attribute('aria-pressed','true');assert page.locator('#blog a[href^="/blog/"]').count()>0
 disclosure=page.get_by_role('button',name='Risk Disclosure',exact=False);disclosure.click();expect(disclosure).to_have_attribute('aria-expanded','true');disclosure.click();expect(disclosure).to_have_attribute('aria-expanded','false')
 page.get_by_role('button',name='Scroll to top',exact=True).click();page.wait_for_function('scrollY < 5',timeout=5000)
 page.get_by_role('button',name='Switch to light mode').click();page.get_by_role('button',name='Switch to dark mode').click()
 for name in ['Login','Launch App','Get Started Free']:
  buttons=page.get_by_role('button',name=name,exact=True)
  for i in range(buttons.count()):
   if not buttons.nth(i).is_visible():continue
   buttons.nth(i).click();expect(page.get_by_role('dialog')).to_be_visible();page.keyboard.press('Escape');expect(page.get_by_role('dialog')).to_have_count(0)
 page.set_viewport_size({'width':390,'height':844});page.goto(BASE,wait_until='domcontentloaded');page.get_by_role('button',name='Menu',exact=True).click()
 for text in ['Features','How It Works','Ecosystem','Academy']:
  page.locator('#homepage-mobile-menu').get_by_role('link',name=text,exact=True).click();expect(page.get_by_role('button',name='Menu',exact=True)).to_have_attribute('aria-expanded','false');page.get_by_role('button',name='Menu',exact=True).click()
 page.locator('#homepage-mobile-menu').get_by_role('button',name='Launch App').click();expect(page.get_by_role('dialog',name='Create account',exact=True)).to_be_visible()
 dialog=page.get_by_role('dialog');dialog.get_by_label('Name',exact=True).fill('Test');dialog.get_by_label('Email',exact=True).fill('test@example.invalid');dialog.get_by_label('Password',exact=True).fill('synthetic-only');dialog.get_by_label('Confirm Password',exact=True).fill('mismatch');dialog.locator('button[type="submit"]').click();expect(dialog.get_by_text('Passwords do not match',exact=True)).to_be_visible()
 dialog.get_by_role('button',name='Sign In',exact=True).click();expect(page.get_by_role('dialog',name='Sign in',exact=True)).to_be_visible();dialog.get_by_role('button',name='Create Account',exact=True).click();expect(page.get_by_role('dialog',name='Create account',exact=True)).to_be_visible()
 dialog.get_by_role('link',name='Continue with Google').focus();page.keyboard.press('Tab');expect(dialog.get_by_role('button',name='Close authentication')).to_be_focused();page.keyboard.press('Shift+Tab');expect(dialog.get_by_role('link',name='Continue with Google')).to_be_focused();page.get_by_role('button',name='Close authentication').click()
 # All auth requests below are synthetic, including success/failure and dashboard responses.
 control={'login':'rejected'};calls=[]
 token='e30.'+base64.urlsafe_b64encode(json.dumps({'exp':int(time.time())+3600}).encode()).decode().rstrip('=')+'.synthetic'
 def respond(route):
  path=route.request.url.split('/v1/')[-1].split('?')[0];calls.append(path)
  if path=='auth/login':
   if control['login']=='network':route.abort();return
   if control['login']=='rejected':route.fulfill(status=401,json={'data':None,'error':{'code':'INVALID','message':'Invalid credentials'}});return
   data={'token':token,'user':{'id':'test','email':'test@example.invalid','name':'Test Trader','plan':'pro'}}
  else:
   data={'accounts':[],'trades':[],'headlines':[],'events':[],'assets':[],'insights':[],'alerts':[],'unreadCount':0,'symbols':[],'enabled':False}
   if path in ('accounts','signals'):data=[]
  route.fulfill(json={'data':data,'error':None})
 page.route('**/v1/**',respond)
 page.get_by_role('button',name='Menu',exact=True).click();page.get_by_role('button',name='Login',exact=True).click()
 dialog=page.get_by_role('dialog');dialog.get_by_label('Email',exact=True).fill('test@example.invalid');dialog.get_by_label('Password',exact=True).fill('synthetic-only-password')
 dialog.locator('button[type="submit"]').click();expect(dialog.get_by_text('Invalid credentials',exact=True)).to_be_visible()
 control['login']='network';dialog.locator('button[type="submit"]').click();expect(dialog.get_by_text('Unable to connect. Please try again.',exact=True)).to_be_visible()
 control['login']='success';dialog.locator('button[type="submit"]').click();page.wait_for_url('**/dashboard');page.wait_for_timeout(1800);assert page.locator('h1').count()>0;assert 'This page could not load' not in page.locator('body').inner_text()
 page.reload();page.wait_for_timeout(1200);assert page.url.endswith('/dashboard')
 page.goto(BASE,wait_until='domcontentloaded');page.get_by_role('button',name='Menu',exact=True).click();page.get_by_role('button',name='Launch App',exact=True).click();page.wait_for_url('**/dashboard');expect(page.get_by_role('dialog')).to_have_count(0)
 assert not errors,errors
 (OUT/'homepage-click-audit.json').write_text(json.dumps({'links':links,'tested_destinations':results,'errors':errors,'authentication':'Synthetic API: rejected login, network error, success, dashboard reload and signed-in Launch App'},indent=2))
 print('PASS all destinations, category filters, disclosure, theme, scroll, CTAs, mobile menu and synthetic sign-in/dashboard flow',flush=True);b.close()
