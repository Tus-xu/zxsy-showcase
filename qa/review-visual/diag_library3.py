# -*- coding: utf-8 -*-
import json
from playwright.sync_api import sync_playwright

URL = 'file:///D:/zxsy-math-arena-showcase/release/index.html'
OUT = r'D:\zxsy-math-arena-showcase\qa\review-visual\shots'

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, locale='zh-CN')
    page = ctx.new_page()
    page.goto(URL, wait_until='load'); page.wait_for_timeout(1100)
    page.evaluate('() => localStorage.clear()'); page.reload(wait_until='load'); page.wait_for_timeout(1200)
    page.locator('.ms-role').nth(0).click(); page.wait_for_timeout(700)
    page.evaluate("() => { location.hash = '#/student/library' }"); page.wait_for_timeout(1500)
    page.locator('[data-qa^="library-ingest"]').first.click(); page.wait_for_timeout(1200)
    print('suggest count:', page.locator('[data-qa^="library-suggest"]').count())
    print('suggest0 disabled:', page.locator('[data-qa^="library-suggest"]').first.is_disabled())
    page.locator('[data-qa^="library-suggest"]').first.click(); page.wait_for_timeout(400)
    page.screenshot(path=OUT + r'\diag-library-suggest-400ms.png')
    page.wait_for_timeout(900)
    page.mouse.move(3, 3); page.wait_for_timeout(250)
    page.screenshot(path=OUT + r'\diag-library-suggest-1300ms.png')
    loc = page.locator('.lib-msg--student .lib-msg__bubble').last
    loc.screenshot(path=OUT + r'\diag-library-suggest-bubble.png')
    print(page.evaluate(r"""() => {
      const el = document.querySelectorAll('.lib-msg--student .lib-msg__bubble');
      const b = el[el.length-1]; const r = b.getBoundingClientRect();
      return JSON.stringify({text: b.innerText, rect: [r.x, r.y, r.width, r.height].map(Math.round)});
    }"""))
    b.close()
