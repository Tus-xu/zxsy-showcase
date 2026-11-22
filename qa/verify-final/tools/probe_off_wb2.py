# -*- coding: utf-8 -*-
"""探测离线包教师工作台 DOM 结构（不点击）。"""
import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright  # noqa: E402

ROOT = r'D:\zxsy-math-arena-showcase'
OFF = 'file:///' + os.path.join(ROOT, 'release', '开始演示.html').replace('\\', '/')
OUT = os.path.join(ROOT, 'qa', 'verify-final', 'tools')
SESSION = 'f5c84551-18a7-454d-b49c-8f115e816299'
WB = f'/teacher-v3/prep-immersive/{SESSION}'

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, offline=True)
    page = ctx.new_page()
    page.goto(OFF, wait_until='load')
    page.wait_for_timeout(1400)
    page.select_option('#preferred-role', 'teacher')
    page.fill('#auth-phone', '13800001002')
    page.get_by_role('button', name='获取验证码').click()
    page.wait_for_timeout(800)
    page.get_by_placeholder('6 位验证码').fill('246810')
    page.get_by_role('button', name='安全登录').click()
    page.wait_for_timeout(2600)
    print('after login url', page.url)
    page.evaluate("(r) => { location.hash = '#' + r }", WB)
    page.wait_for_timeout(5000)
    print('wb url', page.url)
    print('body', page.inner_text('body')[:2500].replace('\n', ' | '))
    print('tabs-ish', page.evaluate(r"""() => {
      const out = [];
      for (const el of document.querySelectorAll('[role=tab], .pc-header__tab, [class*=tab]')) {
        const r = el.getBoundingClientRect();
        if (r.width > 2 && r.height > 2) out.push({cls: (el.className||'').toString().slice(0,80), t: (el.innerText||'').trim().slice(0,40), role: el.getAttribute('role')});
      }
      return out.slice(0, 40);
    }"""))
    print('top-level classes', page.evaluate(r"""() => Array.from(document.querySelectorAll('body > *, #app > *, #app > * > *')).map(el => (el.className||'').toString().slice(0,100)).slice(0,20)"""))
    print('buttons', page.evaluate(r"""() => Array.from(document.querySelectorAll('button')).map(b => ({t:(b.innerText||'').replace(/\s+/g,' ').trim().slice(0,30), d: b.disabled, tid: b.getAttribute('data-testid')||'', cls:(b.className||'').toString().slice(0,50)})).slice(0,80)"""))
    page.screenshot(path=os.path.join(OUT, 'probe-off-wb-raw.png'))
    ctx.close()
    b.close()