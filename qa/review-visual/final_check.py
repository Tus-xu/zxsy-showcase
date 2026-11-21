# -*- coding: utf-8 -*-
"""最终包 04:33 构建：关键 BLOCKER/MAJOR 是否仍存在（≤3 分钟）。"""
import json
from playwright.sync_api import sync_playwright

URL = 'file:///D:/zxsy-math-arena-showcase/release/index.html'
Q = r'D:\zxsy-math-arena\docs\superpowers\plans\题1.png'
OUT = r'D:\zxsy-math-arena-showcase\qa\review-visual\shots'

res = {}
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, locale='zh-CN')
    page = ctx.new_page()
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)[:300]))
    page.goto(URL, wait_until='load'); page.wait_for_timeout(1200)
    page.evaluate('() => localStorage.clear()'); page.reload(wait_until='load'); page.wait_for_timeout(1300)

    # 登录态 + 浮标重叠
    page.locator('.ms-role').nth(0).click(); page.wait_for_timeout(900)
    res['fab'] = page.evaluate("""() => {
      const r = (s) => { const el = document.querySelector(s); if (!el) return null; const b = el.getBoundingClientRect(); return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)}; };
      const a = r('.ms-butler'), h = r('.ms-host-fab');
      let overlap = null;
      if (a && h) { const ox = Math.max(0, Math.min(a.x+a.w,h.x+h.w)-Math.max(a.x,h.x)); const oy = Math.max(0, Math.min(a.y+a.h,h.y+h.h)-Math.max(a.y,h.y)); overlap = ox*oy; }
      return {butler:a, host:h, overlapArea:overlap};
    }""")

    # 引导 A 主线
    page.evaluate("() => { location.hash = '#/student/guide/A' }"); page.wait_for_timeout(700)
    page.set_input_files('input[type=file]', Q); page.wait_for_timeout(1100)
    page.fill('.guide__input', '2b=√7·2a，所以 b/a=√7'); page.keyboard.press('Enter'); page.wait_for_timeout(500)
    page.fill('.guide__input', 'c²=a²+b²'); page.keyboard.press('Enter'); page.wait_for_timeout(500)
    page.fill('.guide__input', '8'); page.keyboard.press('Enter'); page.wait_for_timeout(500)
    page.fill('.guide__input', '2√2'); page.keyboard.press('Enter'); page.wait_for_timeout(600)
    try:
        page.locator('.guide__choices .guide__choice').nth(3).click(); page.wait_for_timeout(250)
        page.locator('.guide__choices .ms-btn--primary').click(); page.wait_for_timeout(900)
    except Exception as e:  # noqa: BLE001
        res['guide_click_err'] = str(e)[:200]
    res['guide'] = page.evaluate("""() => {
      const r = (s) => { const el = document.querySelector(s); if (!el) return null; const b = el.getBoundingClientRect(); return {y:Math.round(b.y),h:Math.round(b.height)}; };
      const h3 = document.querySelector('.guide__final h3');
      return { scrollH: document.documentElement.scrollHeight, innerH: innerHeight,
               composer: r('.guide__composer-wrap'), final: r('.guide__final'),
               finalTitle: h3 ? h3.innerText : null,
               chatOverflow: (() => { const c = document.querySelector('.guide__chat'); return c ? getComputedStyle(c).overflowY + ':' + (c.scrollHeight > c.clientHeight + 2) : null; })() };
    }""")
    page.mouse.move(3, 3); page.wait_for_timeout(250)
    page.screenshot(path=OUT + r'\final-build-guide.png')

    # 知识库 Tab / 科研导航
    page.evaluate("() => { location.hash = '#/student/library' }"); page.wait_for_timeout(1100)
    res['library'] = page.evaluate("""() => ({ tabs: [...document.querySelectorAll('.lib-tabs .lib-tab')].map(e => e.innerText.replace(/\\s+/g,' ')), hasQBank: document.body.innerText.includes('我的题库') })""")
    page.evaluate("() => { location.hash = '#/login' }"); page.wait_for_timeout(600)
    page.locator('.ms-role').nth(2).click(); page.wait_for_timeout(1000)
    page.mouse.move(3, 3); page.wait_for_timeout(300)
    page.screenshot(path=OUT + r'\final-build-research-home.png')
    res['research'] = page.evaluate("""() => ({ text: document.body.innerText.slice(0,400), hasStart: document.body.innerText.includes('启动页'), hasAccount: document.body.innerText.includes('个人中心'), url: location.hash })""")
    page.evaluate("() => { location.hash = '#/research/read' }"); page.wait_for_timeout(1400)
    res['read'] = page.evaluate("""() => ({ bodyLen: document.body.innerText.length, hasPaper: !!document.querySelector('[data-testid=read-paper]'), cols: [...document.querySelectorAll('.read > *, .read__left, .read__center, .read__right')].length })""")
    res['errors'] = errs
    b.close()

print(json.dumps(res, ensure_ascii=False, indent=1))
