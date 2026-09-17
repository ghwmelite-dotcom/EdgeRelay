"""Synthetic live-P/L UI states. Requires preview server and Python Playwright."""
import base64, json, os, time
from playwright.sync_api import sync_playwright
BASE = os.environ.get('TEST_BASE_URL', 'http://127.0.0.1:4175')
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(service_workers='block')
    errors=[]
    page.on('pageerror', lambda e: errors.append(str(e)))
    token='e30.'+base64.urlsafe_b64encode(json.dumps({'exp':int(time.time())+3600}).encode()).decode().rstrip('=')+'.test'
    state={'state':{'token':token,'isAuthenticated':True,'user':{'id':'synthetic','email':'test@example.invalid','name':'Test','plan':'pro'}},'version':0}
    page.add_init_script('localStorage.setItem("edgerelay-auth", '+json.dumps(json.dumps(state))+');')
    snapshot={'version':1,'account_id':'owned','captured_at':int(time.time()),'currency':'GHS','balance':500,'equity':512,'floating_profit':12,'positions':[{'ticket':'1','position_id':'1','symbol':'USDJPY.s','direction':'buy','volume':0.05,'price_open':156.011,'price_current':156.3,'sl':155,'tp':158,'profit':13,'swap':-1}]}
    mode='missing'
    def respond(route):
        path=route.request.url.split('/v1/')[-1].split('?')[0]
        data=None
        if path=='accounts': data=[{'id':'owned','alias':'Connected MT5','role':'master','last_heartbeat':str(time.time())}]
        elif path=='signals': data=[]
        elif path=='command/health': data={'accounts':[]}
        elif path.startswith('journal/trades/'): data={'trades':[]}
        elif path.startswith('journal/positions/'):
            if mode=='error':
                route.abort('failed'); return
            data={'snapshot':None if mode=='missing' else snapshot,'received_at':None if mode=='missing' else snapshot['captured_at']*1000,'stale':mode=='stale'}
        route.fulfill(json={'data':data,'error':None})
    page.route('**/v1/**',respond)
    page.clock.install()
    try:
        page.goto(BASE+'/dashboard',wait_until='networkidle')
        section=page.get_by_role('region',name='Live positions',exact=True)
        section.get_by_text('Waiting for MT5 live telemetry.',exact=False).wait_for()
        assert '0.00' not in section.inner_text()
        print('PASS no telemetry is not zero P/L')
        mode='live'; snapshot['captured_at']+=15
        page.clock.fast_forward(15_100)
        section.get_by_text('12.00 GHS',exact=True).wait_for()
        assert section.get_by_role('cell',name='USDJPY.s',exact=True).count()==1
        assert section.get_by_role('cell',name='-1.00 GHS',exact=True).count()==1
        print('PASS real snapshot values and account currency, separate swap')
        mode='error'; page.clock.fast_forward(15_100)
        section.get_by_text('Stale — last known values',exact=False).wait_for()
        print('PASS network failure marks retained values stale')
        mode='live'; snapshot['positions']=[]; snapshot['floating_profit']=0; snapshot['equity']=500; snapshot['captured_at']+=30
        page.clock.fast_forward(15_100)
        section.get_by_text('No open positions in the latest MT5 snapshot.',exact=True).wait_for()
        assert section.get_by_text('0.00 GHS',exact=True).count()==1
        assert section.get_by_role('cell',name='USDJPY.s',exact=True).count()==0
        print('PASS closed-position snapshot removes old position and displays genuine zero')
        assert not errors,errors
    finally: browser.close()
