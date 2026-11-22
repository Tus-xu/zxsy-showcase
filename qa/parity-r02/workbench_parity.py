# -*- coding: utf-8 -*-
"""样板二对照：教师工作台（immersive）同一会话，现役 vs 离线 状态比对。

核查点：幻灯片数量、工具按钮 disabled、教案是否生成、错误横幅、发布/导出入口状态。
"""
import json
import os
import sys

sys.path.insert(0, os.path.join(r'D:\zxsy-math-arena-showcase', '.work', 'scripts'))
from playwright.sync_api import sync_playwright  # noqa: E402

from live_login import TEACHER, login  # noqa: E402

ROOT = r'D:\zxsy-math-arena-showcase'
LIVE = 'http://127.0.0.1:5176'
OFF = 'file:///' + os.path.join(ROOT, 'app', 'dist-offline', 'index.html').replace('\\', '/')
SHOTS = os.path.join(ROOT, 'qa', 'parity-r02', 'shots')
SESSION = 'f5c84551-18a7-454d-b49c-8f115e816299'
ROUTE = f'/teacher-v3/prep-immersive/{SESSION}'

PROBE = r"""() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 };
  const txt = (el) => (el.innerText || '').replace(/\s+/g, ' ').trim();
  const buttons = Array.from(document.querySelectorAll('button')).filter(vis).map(b => ({
    t: txt(b).slice(0, 26), disabled: !!b.disabled, title: b.getAttribute('title') || '',
    testid: b.getAttribute('data-testid') || ''
  }));
  return {
    url: location.href,
    text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 4000),
    buttons: buttons.slice(0, 80),
    disabledCount: buttons.filter(b => b.disabled).length,
    tabs: Array.from(document.querySelectorAll('[role=tab], .tab, .prep-tab')).filter(vis).map(e => txt(e).slice(0, 20)),
  };
}"""


def open_live(b):
    ctx = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1)
    page = ctx.new_page()
    login(page, TEACHER)
    page.wait_for_timeout(1500)
    return ctx, page


def open_off(b):
    ctx = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, offline=True)
    page = ctx.new_page()
    page.goto(OFF, wait_until='load')
    page.wait_for_timeout(1200)
    page.select_option('#preferred-role', 'teacher')
    page.fill('#auth-phone', '13800001002')
    page.get_by_role('button', name='获取验证码').click()
    page.wait_for_timeout(800)
    page.get_by_placeholder('6 位验证码').fill('246810')
    page.get_by_role('button', name='安全登录').click()
    page.wait_for_timeout(2200)
    return ctx, page


with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    lctx, lpage = open_live(b)
    lpage.goto(LIVE + ROUTE, wait_until='load')
    lpage.wait_for_timeout(6000)
    live = lpage.evaluate(PROBE)
    lpage.screenshot(path=os.path.join(SHOTS, 'wb-live-prep-workbench.png'))

    octx, opage = open_off(b)
    opage.evaluate("(r) => { location.hash = '#' + r }", ROUTE)
    opage.wait_for_timeout(5000)
    off = opage.evaluate(PROBE)
    opage.screenshot(path=os.path.join(SHOTS, 'wb-off-prep-workbench.png'))

    print('=== LIVE ===')
    print('url', live['url'])
    print('text', live['text'][:600])
    print('disabled', live['disabledCount'], 'of', len(live['buttons']))
    print(json.dumps([x for x in live['buttons'] if x['disabled']][:10], ensure_ascii=False))
    print('=== OFFLINE ===')
    print('url', off['url'])
    print('text', off['text'][:600])
    print('disabled', off['disabledCount'], 'of', len(off['buttons']))
    print(json.dumps([x for x in off['buttons'] if x['disabled']][:10], ensure_ascii=False))

    # 差异摘要
    import difflib
    d = list(difflib.unified_diff(live['text'].split(' '), off['text'].split(' '), lineterm='', n=0))[2:12]
    print('=== TEXT DIFF (first) ===')
    for line in d:
        print(' ', line[:200])
    out = {'route': ROUTE, 'live': live, 'off': off, 'diff': d}
    with open(os.path.join(ROOT, 'qa', 'parity-r02', 'workbench-parity.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    lctx.close()
    octx.close()
    b.close()