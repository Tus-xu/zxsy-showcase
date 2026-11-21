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
    page.evaluate("() => { location.hash = '#/student/library' }"); page.wait_for_timeout(1400)
    # 入库第一份
    page.locator('[data-qa^="library-ingest"]').first.click(); page.wait_for_timeout(1000)
    page.locator('[data-qa^="library-suggest"]').first.click(); page.wait_for_timeout(1200)
    data = page.evaluate(r"""() => {
      const out = [];
      document.querySelectorAll('.lib-msg').forEach(el => {
        const b = el.querySelector('.lib-msg__bubble');
        const r = b.getBoundingClientRect();
        const cs = getComputedStyle(b);
        out.push({ cls: el.className, html: b.innerHTML.slice(0, 300), text: b.innerText.slice(0, 120),
                   rect: {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)},
                   color: cs.color, bg: cs.backgroundColor, opacity: cs.opacity, fs: cs.fontSize });
      });
      return out;
    }""")
    print(json.dumps(data, ensure_ascii=False, indent=1))
    page.mouse.move(3, 3); page.wait_for_timeout(300)
    page.screenshot(path=OUT + r'\diag-library-chat.png')
    b.close()
