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
 page.goto(BASE,wait_until='domcontentloaded');expect(page.get_by_role('heading',name='Three setups. One disciplined workflow.',exact=True)).to_be_visible();assert not telegram
 for theme in ['dark','light']:
  if theme=='light':page.get_by_role('button',name='Switch to light mode').click()
  for width in [320,390,768,1440]:
   page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(theme,width)
  page.screenshot(path=str(OUT/f'after-{theme}.png'),full_page=True)
  # Verify muted copy against the card and page surfaces (WCAG normal text >=4.5).
  ratio=page.evaluate('''() => { const el=document.querySelector('aside p.text-terminal-muted'); const rgb=s=>s.match(/[\\d.]+/g).slice(0,3).map(Number);const lum=a=>a.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);const a=lum(rgb(getComputedStyle(el).color)),b=lum(rgb(getComputedStyle(el.closest('aside')).backgroundColor));return (Math.max(a,b)+.05)/(Math.min(a,b)+.05); }''')
  assert ratio>=4.5,(theme,ratio)
 page.reload(wait_until='domcontentloaded');expect(page.get_by_role('button',name='Switch to dark mode')).to_be_visible()
 for href in ['/login','/register','/strategy-hub','/three-strategies','/terms','/privacy','/tools/position-size-calculator']:
  page.goto(BASE+href,wait_until='domcontentloaded');page.locator('h1,h2').first.wait_for();assert page.locator('body').inner_text().strip(),href
 assert not errors,errors
 context.close();print('PASS homepage with unavailable third parties; desktop/mobile themes, persisted choice, readable supporting copy and public destinations',flush=True)
 # A failed lazy route displays an actionable error rather than a blank page.
 c=browser.new_context(service_workers='block');page=c.new_page();page.route('**/ThreeStrategiesStudioPage-*.js',lambda r:r.abort())
 page.goto(BASE+'/three-strategies',wait_until='domcontentloaded');expect(page.get_by_role('heading',name='This page could not load')).to_be_visible();page.get_by_role('link',name='Return to homepage').click();expect(page.locator('h1')).to_contain_text('Three setups.');c.close()
 # An unavailable entry bundle retains standalone recovery HTML.
 c=browser.new_context(service_workers='block');page=c.new_page();page.route('**/assets/index-*.js',lambda r:r.abort());page.goto(BASE,wait_until='domcontentloaded');expect(page.get_by_role('button',name='Reload page')).to_be_visible();expect(page.locator('h1')).to_have_text('TradeMetrics Pro');c.close()
 # Privacy settings blocking browser storage must not break page or theme switching.
 c=browser.new_context(service_workers='block');c.add_init_script("Storage.prototype.getItem=function(){throw new DOMException('Unavailable','SecurityError')};Storage.prototype.setItem=function(){throw new DOMException('Unavailable','SecurityError')};")
 page=c.new_page();page.goto(BASE+'/?ref=test',wait_until='domcontentloaded');expect(page.locator('h1')).to_contain_text('Three setups.');page.get_by_role('button',name='Switch to light mode').click();expect(page.get_by_role('button',name='Switch to dark mode')).to_be_visible();c.close()
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
