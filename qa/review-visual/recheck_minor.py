# -*- coding: utf-8 -*-
"""剩余 MINOR 快速复核（04:54 包）。"""
import json
from playwright.sync_api import sync_playwright

URL = 'file:///D:/zxsy-math-arena-showcase/release/index.html'
res = {}
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, locale='zh-CN')
    page = ctx.new_page()
    page.goto(URL, wait_until='load'); page.wait_for_timeout(1100)
    page.evaluate('() => localStorage.clear()'); page.reload(wait_until='load'); page.wait_for_timeout(1200)
    page.locator('.ms-role').nth(0).click(); page.wait_for_timeout(800)
    # 错题抽屉遮罩
    page.evaluate("() => { location.hash = '#/student/errors' }"); page.wait_for_timeout(1200)
    res['errors'] = page.evaluate("""() => ({ drawer: !!document.querySelector('[data-qa="errors-drawer"]'),
        masks: document.querySelectorAll('.mask,.overlay,.backdrop,.drawer-mask,.ms-mask').length })""")
    # 设置页浅色主题色块背景
    page.evaluate("() => { location.hash = '#/student/me' }"); page.wait_for_timeout(900)
    page.locator('[data-qa="me-tab-settings"]').click(); page.wait_for_timeout(700)
    res['settings_swatch'] = page.evaluate("""() => {
      const el = document.querySelector('.me-theme, .me-swatch, [class*=swatch], [class*=theme] .sw, .me-setting__swatch');
      if (!el) return { found: false };
      const cs = getComputedStyle(el); return { found: true, cls: el.className, bg: cs.backgroundColor, border: cs.borderColor };
    }""")
    # 练习/双师/我的/知识库 页面滚动高度
    h = {}
    for name, route in [('practice', '/student/practice'), ('dual', '/student/dual/preset-pub-ellipse-v1'), ('me', '/student/me'), ('library', '/student/library')]:
        page.evaluate(f"() => {{ location.hash = '{route}' }}"); page.wait_for_timeout(1000)
        h[name] = page.evaluate('() => document.documentElement.scrollHeight')
    res['scrollH'] = h
    # 科研 READ 右栏起点（m5）
    page.evaluate("() => { location.hash = '#/login' }"); page.wait_for_timeout(600)
    page.locator('.ms-role').nth(2).click(); page.wait_for_timeout(800)
    page.evaluate("() => { location.hash = '#/research/read' }"); page.wait_for_timeout(1500)
    res['read_right_col'] = page.evaluate("""() => {
      const right = document.querySelector('.read__right, [class*=read__right], .agent');
      const l = document.querySelector('.read__left'); const c = document.querySelector('.read__center');
      const b = (e) => e ? Math.round(e.getBoundingClientRect().x) : null;
      return { left: b(l), center: b(c), right: b(right) };
    }""")
    b.close()
print(json.dumps(res, ensure_ascii=False, indent=1))
