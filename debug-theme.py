from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    # Capture console errors
    errors = []
    page.on("console", lambda msg: errors.append(f"[{msg.type}] {msg.text}") if msg.type in ("error", "warning") else None)
    page.on("pageerror", lambda err: errors.append(f"[PAGE_ERROR] {err.message}"))

    # Load the landing page
    print("=== Loading landing page ===")
    page.goto("https://trademetricspro.com", wait_until="networkidle", timeout=30000)
    page.screenshot(path="C:/Users/USER/OneDrive - Smart Workplace/Desktop/Projects/EdgeRelay/debug-before.png", full_page=False)
    print(f"Title: {page.title()}")
    print(f"Errors so far: {len(errors)}")
    for e in errors:
        print(f"  {e}")

    # Find the theme toggle button
    print("\n=== Looking for theme toggle ===")
    # Check for Sun/Moon icons or theme-related buttons
    buttons = page.locator("button").all()
    print(f"Total buttons: {len(buttons)}")

    theme_btn = None
    for btn in buttons:
        title = btn.get_attribute("title") or ""
        aria = btn.get_attribute("aria-label") or ""
        text = btn.inner_text()
        if "light" in title.lower() or "dark" in title.lower() or "theme" in title.lower() or "light" in aria.lower() or "dark" in aria.lower():
            print(f"  FOUND theme button: title='{title}' aria='{aria}' text='{text}'")
            theme_btn = btn
            break

    if not theme_btn:
        print("  No theme button found! Checking for Sun/Moon SVGs...")
        # Look for lucide sun/moon icons
        sun_btns = page.locator("button:has(svg)").all()
        print(f"  Buttons with SVGs: {len(sun_btns)}")
        for sb in sun_btns[:10]:
            title = sb.get_attribute("title") or ""
            cls = sb.get_attribute("class") or ""
            print(f"    title='{title}' class='{cls[:80]}'")

    if theme_btn:
        print("\n=== Clicking theme toggle ===")
        errors.clear()
        theme_btn.click()
        page.wait_for_timeout(1000)

        print(f"Errors after click: {len(errors)}")
        for e in errors:
            print(f"  {e}")

        # Check if page is blank
        html_class = page.locator("html").get_attribute("class") or ""
        print(f"HTML class: '{html_class}'")
        body_html = page.locator("body").inner_html()
        print(f"Body length: {len(body_html)}")
        if len(body_html) < 100:
            print(f"Body content: {body_html}")

        page.screenshot(path="C:/Users/USER/OneDrive - Smart Workplace/Desktop/Projects/EdgeRelay/debug-after.png", full_page=False)
        print("Screenshots saved: debug-before.png and debug-after.png")

    browser.close()
