# -*- coding: utf-8 -*-
"""探测离线包：教师工作台 tab / PPT 工具条 / 导出 / 发布；科研 read/write 路由。仅写 qa/verify-final。"""
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright  # noqa: E402

ROOT = r'D:\zxsy-math-arena-showcase'
OFF = 'file:///' + os.path.join(ROOT, 'release', '开始演示.html').replace('\\', '/')
OUT = os.path.join(ROOT, 'qa', 'verify-final', 'tools')
SESSION = 'f5c84551-18a7-454d-b49c-8f115e816299'
WB = f'/teacher-v3/prep-immersive/{SESSION}'
PROBE = r"""() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 && getComputedStyle(el).visibility !== 'hidden'; };
  const txt = (el) => (el.innerText || '').replace(/\s+/g, ' ').trim();
  const btns = Array.from(document.querySelectorAll('button')).filter(vis).map(b => ({
    t: txt(b).slice(0, 30), disabled: !!b.disabled, title: b.getAttribute('title') || '',
    testid: b.getAttribute('data-testid') || '', cls: (b.className || '').toString().slice(0, 60)
  }));
  return {
    url: location.href,
    text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 6000),
    buttons: btns.slice(0, 120),
    tabs: Array.from(document.querySelectorAll('.pc-header__tab')).map(e => ({ t: txt(e), active: e.classList.contains('is-active') })),
  };
}"""


def login_off(page, role, phone):
    page.goto(OFF, wait_until='load')
    page.wait_for_timeout(1500)
    page.select_option('#preferred-role', role)
    page.fill('#auth-phone', phone)
    page.get_by_role('button', name='获取验证码').click()
    page.wait_for_timeout(800)
    page.get_by_placeholder('6 位验证码').fill('246810')
    page.get_by_role('button', name='安全登录').click()
    page.wait_for_timeout(2600)


with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, offline=True)
    page = ctx.new_page()
    con = []
    page.on('console', lambda m: con.append((m.type, m.text[:300])) if m.type == 'error' else None)
    login_off(page, 'teacher', '13800001002')
    page.evaluate("(r) => { location.hash = '#' + r }", WB)
    page.wait_for_timeout(4500)
    out = {'default': page.evaluate(PROBE)}
    page.screenshot(path=os.path.join(OUT, 'probe-off-wb-default.png'))
    # 点 PPT tab
    tab = page.locator('.pc-header__tab', has_text='PPT')
    print('ppt tabs', tab.count())
    tab.first.click()
    page.wait_for_timeout(3500)
    out['ppt'] = page.evaluate(PROBE)
    page.screenshot(path=os.path.join(OUT, 'probe-off-wb-ppt.png'))
    # 导出按钮
    for label in ('导出', '导出课件', '更多'):
        loc = page.get_by_role('button', name=re.compile(label))
        print('button', label, loc.count())
    # 教案 tab
    page.locator('.pc-header__tab', has_text='教案').first.click()
    page.wait_for_timeout(3000)
    out['plan'] = page.evaluate(PROBE)
    page.screenshot(path=os.path.join(OUT, 'probe-off-wb-plan.png'))
    # 科研路由
    out['research'] = {}
    for route, slug in (('/research-workspace', 'landing'), ('/research-workspace/workspace', 'workspace'),
                        ('/research-workspace/e49b27e2-b05f-45c3-ac99-dd0792d9ab80/read', 'read'),
                        ('/research-workspace/write', 'write'),
                        ('/research-workspace/account', 'account')):
        page.evaluate("(r) => { location.hash = '#' + r }", route)
        page.wait_for_timeout(4200)
        st = page.evaluate(PROBE)
        out['research'][slug] = {'url': st['url'], 'text': st['text'][:1200], 'buttons': st['buttons'][:15]}
        page.screenshot(path=os.path.join(OUT, f'probe-off-research-{slug}.png'))
    out['console_errors'] = con[:10]
    with open(os.path.join(OUT, 'probe-off.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    for k in ('default', 'ppt', 'plan'):
        print('=== %s ===' % k)
        print('url', out[k]['url'])
        print('tabs', out[k]['tabs'])
        print('text', out[k]['text'][:1800])
        print('buttons', json.dumps([x for x in out[k]['buttons'] if x['disabled'] or x['t']], ensure_ascii=False)[:2500])
    print('=== research urls ===')
    for k, v in out['research'].items():
        print(k, v['url'])
    print('console errors', out['console_errors'])
    ctx.close()
    b.close()