"""Dashboard regression: delayed nullable signal data must not unmount React.
Run against Vite: python scripts/test-dashboard-render.py
Requires the existing Python Playwright installation.
"""
import base64
import json
import os
import time
from playwright.sync_api import sync_playwright

BASE = os.environ.get('TEST_BASE_URL', 'http://127.0.0.1:3000')

def run_case(browser, route_path, volume, price):
    page = browser.new_page(service_workers='block')
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    payload = base64.urlsafe_b64encode(json.dumps({'exp': int(time.time()) + 3600}).encode()).decode().rstrip('=')
    state = {'state': {'token': 'e30.' + payload + '.synthetic', 'user': {'id': 'synthetic', 'email': 'test@example.invalid', 'name': 'Test', 'plan': 'pro'}, 'isAuthenticated': True}, 'version': 0}
    page.add_init_script('localStorage.setItem("edgerelay-auth", ' + json.dumps(json.dumps(state)) + ');')
    signal = {'id': 'synthetic-signal', 'master_account_id': 'test-master', 'sequence_num': 1, 'action': 'close', 'order_type': None, 'symbol': 'TESTPAIR', 'volume': volume, 'price': price, 'sl': None, 'tp': None, 'received_at': '2026-09-10T12:00:00Z'}
    def respond(route):
        path = route.request.url.split('/v1/')[-1].split('?')[0]
        data = {'accounts': [], 'trades': [], 'headlines': [], 'events': [], 'assets': [], 'insights': [], 'alerts': [], 'unreadCount': 0}
        if path == 'accounts': data = []
        if path == 'signals':
            # Resolve after the initial dashboard paint.
            time.sleep(0.3)
            data = [signal]
        route.fulfill(json={'data': data, 'error': None})
    page.route('**/v1/**', respond)
    page.goto(BASE + route_path, wait_until='networkidle')
    assert not errors, errors
    row = page.locator('tr').filter(has_text='TESTPAIR')
    assert row.count() == 1, 'Signal row disappeared'
    assert page.url.endswith(route_path), 'Unexpected authentication redirect'
    text = row.inner_text()
    if volume is None or price is None:
        assert '\u2014' in text, 'Missing values should show an em dash'
    if volume == 0:
        assert '0.00' in text, 'Zero is a real value, not missing data'
    page.close()

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    try:
        for route_path in ['/dashboard', '/signals']:
            for volume, price in [(None, None), (0.1, None), (None, 1.23456), (0, 0), (0.1, 2500.25)]:
                run_case(browser, route_path, volume, price)
                print('PASS', route_path, volume, price)
    finally:
        browser.close()
