# -*- coding: utf-8 -*-
"""诊断引导页布局：输入区是否在视口内、页面是否整体滚动。"""
import json
from playwright.sync_api import sync_playwright

URL = 'file:///D:/zxsy-math-arena-showcase/release/index.html'
OUT = r'D:\zxsy-math-arena-showcase\qa\review-visual\shots'
Q = {'B': r'D:\zxsy-math-arena\docs\superpowers\plans\题2.png'}

JS = r"""
() => {
  const b = (s) => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), oy: cs.overflowY, height: cs.height, flex: cs.flex }; };
  return { innerH: innerHeight, scrollH: document.documentElement.scrollHeight, scrollY: scrollY,
           layout: b('.layout'), main: b('.main'), guide: b('.guide'), head: b('.guide__head'), body: b('.guide__body'),
           chat: b('.guide__chat'), composer: b('.guide__composer-wrap'), right: b('.guide__right') };
}
"""

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, locale='zh-CN')
    page = ctx.new_page()
    page.goto(URL, wait_until='load'); page.wait_for_timeout(1100)
    page.evaluate('() => localStorage.clear()'); page.reload(wait_until='load'); page.wait_for_timeout(1200)
    page.locator('.ms-role').nth(0).click(); page.wait_for_timeout(700)
    page.evaluate("() => { location.hash = '#/student/guide/B' }"); page.wait_for_timeout(800)
    page.set_input_files('input[type=file]', Q['B']); page.wait_for_timeout(1100)
    print('after upload:', json.dumps(page.evaluate(JS), ensure_ascii=False))
    for i in range(1):
        page.fill('.guide__input', '垂直'); page.keyboard.press('Enter'); page.wait_for_timeout(500)
        page.fill('.guide__input', '垂直'); page.keyboard.press('Enter'); page.wait_for_timeout(500)
        page.locator('.guide__choices .guide__choice').nth(1).click(); page.wait_for_timeout(200)
        page.locator('.guide__choices .ms-btn--primary').click(); page.wait_for_timeout(700)
    print('after 4 turns:', json.dumps(page.evaluate(JS), ensure_ascii=False))
    page.screenshot(path=OUT + r'\diag-guide-B-current.png')
    page.evaluate('() => window.scrollTo(0, document.documentElement.scrollHeight)')
    page.wait_for_timeout(400)
    page.mouse.move(3, 3)
    page.screenshot(path=OUT + r'\diag-guide-B-scrolled-bottom.png')
    print('after scroll:', json.dumps(page.evaluate(JS), ensure_ascii=False))
    # 视口内是否有 composer 可见
    vis = page.evaluate("() => { const el = document.querySelector('.guide__composer-wrap'); if (!el) return null; const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), visible: r.top < innerHeight && r.bottom > 0 }; }")
    print('composer visibility at initial scroll:', json.dumps(vis, ensure_ascii=False))
    b.close()
