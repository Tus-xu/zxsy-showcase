# -*- coding: utf-8 -*-
"""探测离线包：备课中心 tabbed 工作台 /prep/w/<sid>/<tab>（PPT/教案/导出/发布）。"""
import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright  # noqa: E402

ROOT = r'D:\zxsy-math-arena-showcase'
OFF = 'file:///' + os.path.join(ROOT, 'release', '开始演示.html').replace('\\', '/')
OUT = os.path.join(ROOT, 'qa', 'verify-final', 'tools')
SESSION = 'f5c84551-18a7-454d-b49c-8f115e816299'
PROBE = r"""() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 && getComputedStyle(el).visibility !== 'hidden'; };
  const txt = (el) => (el.innerText || '').replace(/\s+/g, ' ').trim();
  const btns = Array.from(document.querySelectorAll('button')).filter(vis).map(b => ({
    t: txt(b).slice(0, 40), disabled: !!b.disabled, title: b.getAttribute('title') || '',
    testid: b.getAttribute('data-testid') || '', cls: (b.className || '').toString().slice(0, 60)
  }));
  return {
    url: location.href,
    text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 8000),
    buttons: btns.slice(0, 150),
    tabs: Array.from(document.querySelectorAll('.pc-header__tab')).map(e => ({ t: txt(e), active: e.classList.contains('is-active') })),
    fixed: Array.from(document.querySelectorAll('body *')).filter(el => {
      const s = getComputedStyle(el); const r = el.getBoundingClientRect();
      return (s.position === 'fixed') && r.width > 10 && r.height > 10;
    }).slice(0, 10).map(el => ({ cls: (el.className || '').toString().slice(0, 60), t: (el.innerText || '').slice(0, 40) })),
  };
}"""

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
    page.wait_for_timeout(2400)
    out = {}
    for tab in ('ppt', 'plan', 'classroom'):
        route = f'/teacher-v3/prep/w/{SESSION}/{tab}'
        page.evaluate("(r) => { location.hash = '#' + r }", route)
        page.wait_for_timeout(4200)
        out[tab] = page.evaluate(PROBE)
        page.screenshot(path=os.path.join(OUT, f'probe-off-prepw-{tab}.png'))
        print('===', tab, out[tab]['url'])
        print('text', out[tab]['text'][:1400])
        print('tabs', out[tab]['tabs'])
        print('disabled buttons', json.dumps([x for x in out[tab]['buttons'] if x['disabled']], ensure_ascii=False)[:2000])
        print('all buttons', json.dumps([x['t'] for x in out[tab]['buttons']], ensure_ascii=False)[:1500])
        print('fixed', out[tab]['fixed'])
    with open(os.path.join(OUT, 'probe-off-prepw.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    ctx.close()
    b.close()