"""Homepage startup, theme, route-failure and Telegram isolation regressions. Run against a production preview."""
import os,re,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.environ.get('TEST_BASE_URL','http://127.0.0.1:4180')
OUT=Path('.wrangler/homepage-audit');OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 context=browser.new_context(service_workers='block');page=context.new_page();errors=[];telegram=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('request',lambda r:telegram.append(r.url) if 'telegram.org/js/' in r.url else None)
 # External font/SDK failure cannot prevent homepage rendering.
 page.route('**/telegram.org/**',lambda r:r.abort());page.route('**/fonts.googleapis.com/**',lambda r:r.abort());page.route('**/fonts.gstatic.com/**',lambda r:r.abort())
 page.goto(BASE,wait_until='domcontentloaded');expect(page.get_by_role('heading',name='Copy Trades Across Any VPS. Any Broker. Free for a Year.',exact=True)).to_be_visible();assert not telegram
 for theme in ['dark','light']:
  if theme=='light':page.get_by_role('button',name='Switch to light mode').click()
  for width in [320,390,768,1440]:
   page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(theme,width)
  page.screenshot(path=str(OUT/f'after-{theme}.png'),full_page=True)
 page.reload(wait_until='domcontentloaded');expect(page.get_by_role('button',name='Switch to dark mode')).to_be_visible()
 for href in ['/login','/register','/strategy-hub','/three-strategies','/terms','/privacy','/tools/position-size-calculator']:
  page.goto(BASE+href,wait_until='domcontentloaded');page.locator('h1,h2').first.wait_for();assert page.locator('body').inner_text().strip(),href
 assert not errors,errors
 context.close();print('PASS homepage with unavailable third parties; desktop/mobile themes, persisted choice and public destinations',flush=True)
 # Restored navigation and correct auth mode on each open; no credentials submitted.
 c=browser.new_context(service_workers='block');page=c.new_page();page.set_viewport_size({'width':1440,'height':900});page.goto(BASE)
 page.get_by_role('button',name='Login',exact=True).click();expect(page.get_by_text('Sign in to your trading terminal',exact=True)).to_be_visible();page.get_by_role('button',name='Close authentication').click()
 page.get_by_role('button',name='Get Started Free',exact=True).first.click();expect(page.get_by_text('Create your free account',exact=True)).to_be_visible();page.get_by_role('button',name='Close authentication').click()
 for width in [320,390,768]:
  page.set_viewport_size({'width':width,'height':900});page.get_by_role('button',name='Menu',exact=True).click();expect(page.get_by_role('button',name='Menu',exact=True)).to_have_attribute('aria-expanded','true');page.get_by_role('button',name='Login',exact=True).click();expect(page.get_by_text('Sign in to your trading terminal',exact=True)).to_be_visible();page.get_by_role('button',name='Close authentication').click()
 page.set_viewport_size({'width':1440,'height':1000});page.reload();page.wait_for_timeout(1200);page.screenshot(path=str(OUT/'restored-desktop.png'))
 page.set_viewport_size({'width':390,'height':844});page.reload();page.wait_for_timeout(1200);assert page.locator('h1').bounding_box()['x']>=0;page.screenshot(path=str(OUT/'restored-mobile.png'));c.close()
 print('PASS restored desktop/mobile navigation and login/register modal modes',flush=True)
 # A failed lazy route displays an actionable error rather than a blank page.
 c=browser.new_context(service_workers='block');page=c.new_page();page.route('**/ThreeStrategiesStudioPage-*.js',lambda r:r.abort())
 page.goto(BASE+'/three-strategies',wait_until='domcontentloaded');expect(page.get_by_role('heading',name='This page could not load')).to_be_visible();page.get_by_role('link',name='Return to homepage').click();expect(page.locator('h1')).to_contain_text('Copy Trades Across');c.close()
 # An unavailable entry bundle retains standalone recovery HTML.
 c=browser.new_context(service_workers='block');page=c.new_page();page.route('**/assets/index-*.js',lambda r:r.abort());page.goto(BASE,wait_until='domcontentloaded');expect(page.get_by_role('button',name='Reload page')).to_be_visible();expect(page.locator('h1')).to_have_text('TradeMetrics Pro');c.close()
 # Privacy settings blocking browser storage must not break page or theme switching.
 c=browser.new_context(service_workers='block');c.add_init_script("Storage.prototype.getItem=function(){throw new DOMException('Unavailable','SecurityError')};Storage.prototype.setItem=function(){throw new DOMException('Unavailable','SecurityError')};")
 page=c.new_page();page.goto(BASE+'/?ref=test',wait_until='domcontentloaded');expect(page.locator('h1')).to_contain_text('Copy Trades Across');page.get_by_role('button',name='Switch to light mode').click();expect(page.get_by_role('button',name='Switch to dark mode')).to_be_visible();c.close()
 print('PASS failed-route recovery, failed-entry fallback and blocked-storage startup',flush=True)
 # SDK is loaded on /tg and waited for before authentication; no real auth or messages.
 c=browser.new_context(service_workers='block');page=c.new_page();auth=[]
 page.route('**/telegram.org/js/telegram-web-app.js',lambda r:r.fulfill(content_type='text/javascript',body="window.Telegram={WebApp:{initData:'test-only',ready(){window.sdkReady=true},expand(){}}}"))
 def authenticate(route):
  auth.append(route.request.post_data_json);route.fulfill(json={'data':None,'error':{'message':'Synthetic auth response'}})
 page.route('**/v1/auth/telegram',authenticate);page.goto(BASE+'/tg',wait_until='domcontentloaded');expect(page.get_by_text('Synthetic auth response',exact=True)).to_be_visible();assert auth==[{'initData':'test-only'}];assert page.evaluate('window.sdkReady===true');c.close()
 c=browser.new_context(service_workers='block');page=c.new_page();page.route('**/telegram.org/js/telegram-web-app.js',lambda r:r.abort());page.goto(BASE+'/tg',wait_until='domcontentloaded');expect(page.get_by_text('Telegram could not load. Check your connection and retry.',exact=True)).to_be_visible();c.close()
 print('PASS Telegram route-specific SDK initialization, authentication order and load-failure retry UI',flush=True)
 browser.close()
