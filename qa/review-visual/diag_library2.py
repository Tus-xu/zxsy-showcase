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
    page.locator('[data-qa^="library-ingest"]').first.click(); page.wait_for_timeout(1000)
    # 用输入框提问，排除 suggest 路径
    page.fill('[data-qa="library-input"]', '导数符号怎么判断单调性')
    page.keyboard.press('Enter'); page.wait_for_timeout(1500)
    page.mouse.move(3, 3); page.wait_for_timeout(300)
    page.screenshot(path=OUT + r'\diag-library-chat2.png')
    data = page.evaluate(r"""() => {
      const bubble = document.querySelectorAll('.lib-msg--student .lib-msg__bubble');
      const el = bubble[bubble.length - 1];
      if (!el) return { err: 'no bubble' };
      const r = el.getBoundingClientRect();
      const node = [...el.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
      const range = document.createRange();
      let rr = null;
      if (node) { range.selectNodeContents(node); rr = range.getBoundingClientRect(); }
      const cs = getComputedStyle(el);
      const parentCS = getComputedStyle(el.parentElement);
      return {
        text: el.innerText.slice(0, 80),
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        rangeRect: rr ? { x: Math.round(rr.x), y: Math.round(rr.y), w: Math.round(rr.width), h: Math.round(rr.height) } : null,
        color: cs.color, bg: cs.backgroundColor, font: cs.fontFamily, fs: cs.fontSize, lh: cs.lineHeight,
        textFill: cs.webkitTextFillColor, blend: cs.mixBlendMode, filter: cs.filter,
        parent: { color: parentCS.color, display: parentCS.display, alignItems: parentCS.alignItems },
        siblings: [...el.childNodes].map(n => ({ type: n.nodeType, text: (n.textContent || '').slice(0, 40) })),
      };
    }""")
    print(json.dumps(data, ensure_ascii=False, indent=1))
    # 元素截图
    loc = page.locator('.lib-msg--student .lib-msg__bubble').last
    loc.screenshot(path=OUT + r'\crop-library-bubble-element.png')
    b.close()
