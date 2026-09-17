"""Synthetic dashboard journal regression. Run against Vite preview on 4175."""
import base64, json, os, time
from playwright.sync_api import sync_playwright
BASE = os.environ.get('TEST_BASE_URL', 'http://127.0.0.1:4175')
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(service_workers='block')
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    token = 'e30.' + base64.urlsafe_b64encode(json.dumps({'exp': int(time.time()) + 3600}).encode()).decode().rstrip('=') + '.synthetic'
    state = {'state': {'token': token, 'user': {'id': 'test-user', 'email': 'test@example.invalid', 'name': 'Test', 'plan': 'pro'}, 'isAuthenticated': True}, 'version': 0}
    page.add_init_script('localStorage.setItem("edgerelay-auth", ' + json.dumps(json.dumps(state)) + ');')
    accounts = [
        {'id': 'unused-follower', 'alias': 'Unused Demo', 'role': 'follower', 'last_heartbeat': None},
        {'id': 'connected-master', 'alias': 'Connected Journal', 'role': 'master', 'last_heartbeat': str(time.time())},
        {'id': 'journal-only', 'alias': 'Journal Only', 'role': 'journal', 'last_heartbeat': None},
    ]
    trades = [{'deal_ticket': 123, 'symbol': 'USDJPY.s', 'direction': 'buy', 'deal_entry': 'in', 'volume': 0.05, 'price': 156.011, 'time': int(time.time()), 'profit': 0}]
    fail = False
    calls = []
    def respond(route):
        path = route.request.url.split('/v1/')[-1].split('?')[0]
        data = None
        if path == 'accounts': data = accounts
        elif path == 'signals': data = []
        elif path == 'command/health': data = {'accounts': []}
        elif path.startswith('journal/trades/'):
            account = path.split('/')[-1]
            calls.append(account)
            if fail:
                route.fulfill(status=503, json={'data': None, 'error': {'code': 'UNAVAILABLE', 'message': 'Unavailable'}})
                return
            data = {'trades': trades if account != 'unused-follower' else [], 'has_more': False, 'next_cursor': None}
        route.fulfill(json={'data': data, 'error': None})
    page.route('**/v1/**', respond)
    page.clock.install()
    try:
        page.goto(BASE + '/dashboard', wait_until='networkidle')
        section = page.get_by_role('region', name='Journal activity')
        selector = page.get_by_label('Journal account', exact=True)
        assert selector.input_value() == 'connected-master'
        assert section.get_by_role('cell', name='USDJPY.s', exact=True).count() == 1
        assert section.get_by_role('cell', name='Entry', exact=True).count() == 1
        assert section.get_by_role('cell', name='0.05', exact=True).count() == 1
        print('PASS connected master entry visible with follower first')
        trades.append({**trades[0], 'deal_ticket': 124, 'symbol': 'EURUSD'})
        page.clock.fast_forward(30_100)
        section.get_by_role('cell', name='EURUSD', exact=True).wait_for()
        print('PASS automatic journal refresh')
        trades.pop()
        selector.select_option('unused-follower')
        section.get_by_text('No synced trades for this account.', exact=False).wait_for()
        assert section.get_by_role('cell', name='USDJPY.s', exact=True).count() == 0
        print('PASS account switch clears previous trades')
        selector.select_option('journal-only')
        section.get_by_role('cell', name='USDJPY.s', exact=True).wait_for()
        print('PASS journal-only role')
        fail = True
        page.get_by_role('button', name='Refresh journal', exact=True).click()
        section.get_by_role('alert').wait_for()
        assert section.get_by_role('cell', name='USDJPY.s', exact=True).count() == 0
        fail = False
        trades[0]['price'] = None
        page.get_by_role('button', name='Refresh journal', exact=True).click()
        section.get_by_role('cell', name='USDJPY.s', exact=True).wait_for()
        assert section.get_by_role('cell', name='—', exact=True).count() == 1
        print('PASS refresh recovery and nullable price')
        page.get_by_role('link', name='Full journal', exact=True).click()
        page.wait_for_url('**/journal')
        page.wait_for_load_state('networkidle')
        page.get_by_role('heading', name='Trade Journal', exact=True).wait_for()
        page.get_by_role('cell', name='USDJPY.s', exact=True).wait_for()
        assert not errors, errors
        assert calls[-1] == 'connected-master', (calls, page.locator('body').inner_text()[:400])
        print('PASS independent Journal account selection')
        assert not errors, errors
    finally:
        browser.close()
