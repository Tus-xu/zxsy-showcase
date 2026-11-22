# -*- coding: utf-8 -*-
"""离线 20 页脚手架探测：路由可渲染性 / 布局选择器 / 破图 / 控制台错误。"""
import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright  # noqa: E402

ROOT = r'D:\zxsy-math-arena-showcase'
OFF = 'file:///' + os.path.join(ROOT, 'release', '开始演示.html').replace('\\', '/')
OUT = os.path.join(ROOT, 'qa', 'verify-final', 'tools')
SESSION = 'f5c84551-18a7-454d-b49c-8f115e816299'
PROJ = 'e49b27e2-b05f-45c3-ac99-dd0792d9ab80'
PAGES = {
    'student': [('/dialog', 'dialog'), ('/practice', 'practice'), ('/errors', 'errors'),
                ('/library', 'library'), ('/resources', 'resources'), ('/classroom', 'classroom'), ('/me', 'me')],
    'teacher': [('/teacher-v3/prep', 'prep'), ('/teacher-v3/classes', 'classes'), ('/teacher-v3/bank', 'bank'),
                ('/teacher-v3/assign', 'assign'), ('/teacher-v3/insights', 'insights'),
                ('/teacher-v3/resources', 'resources'), ('/teacher-v3/grading', 'grading'),
                (f'/teacher-v3/prep-immersive/{SESSION}', 'workbench')],
    'researcher': [('/research-workspace', 'landing'), ('/research-workspace/workspace', 'workspace'),
                   (f'/research-workspace/{PROJ}/read', 'read'), ('/research-workspace/write', 'write'),
                   ('/research-workspace/account', 'account')],
}
SELS = ['header.topbar', 'aside.sidebar', 'main.main', 'aside.tv3-nav', 'header.tv3-topbar', 'main.tv3-page',
        'header.rh-head', 'main.rl-main', 'main.ra-main', 'header.rw-header', '.rw-body', 'aside.rw-sb',
        '.rw-pane--agent', 'header.focus-shell__bar', 'main.focus-shell__body', '.surface']
BOX = r"""(sels) => {
  const out = {};
  for (const s of sels) {
    const els = [...document.querySelectorAll(s)];
    const el = els.find((e) => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; });
    if (el) { const r = el.getBoundingClientRect(); out[s] = {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}; }
  }
  const imgs = [...document.images];
  const fixed = [...document.querySelectorAll('body *')].filter(el => {
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    return cs.position === 'fixed' && r.width > 20 && r.height > 20 && r.bottom > innerHeight - 140 && r.right > innerWidth - 140;
  }).map(el => ({cls:(el.className||'').toString().slice(0,40), t:(el.innerText||'').replace(/\s+/g,' ').slice(0,40)}));
  return {boxes: out, imgs:{total:imgs.length, broken:imgs.filter(i=>i.complete&&i.naturalWidth===0).length},
          fixed_corner: fixed.slice(0,5), text: document.body.innerText || '', url: location.href,
          scroll:{w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight}};
}"""


def login_off(page, role, phone):
    page.goto(OFF, wait_until='load')
    page.wait_for_timeout(1400)
    page.select_option('#preferred-role', role)
    page.fill('#auth-phone', phone)
    page.get_by_role('button', name='获取验证码').click()
    page.wait_for_timeout(800)
    page.get_by_placeholder('6 位验证码').fill('246810')
    page.get_by_role('button', name='安全登录').click()
    page.wait_for_timeout(2500)


with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    result = {}
    for role, phone, kind in (('student', '13800001001', 'student'), ('teacher', '13800001002', 'teacher'),
                              ('researcher', '13800001003', 'research')):
        ctx = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, offline=True)
        page = ctx.new_page()
        errs, reqs, cons = [], [], []
        page.on('pageerror', lambda e: errs.append(str(e)[:200]))
        page.on('request', lambda r: reqs.append(r.url) if r.url.startswith(('http://', 'https://', 'ws://')) else None)
        page.on('console', lambda m: cons.append(m.text[:160]) if m.type == 'error' else None)
        login_off(page, role, phone)
        for route, slug in PAGES[role]:
            page.evaluate("(r) => { location.hash = '#' + r }", route)
            page.wait_for_timeout(3600)
            if slug in ('workspace', 'read', 'write'):
                page.wait_for_timeout(2500)
            m = page.evaluate(BOX, SELS)
            result[f'{role}/{slug}'] = {'url': m['url'], 'boxes': m['boxes'], 'imgs': m['imgs'],
                                        'fixed_corner': m['fixed_corner'],
                                        'text_len': len(m['text']), 'text_head': m['text'][:260],
                                        'scroll': m['scroll'],
                                        'console_errors': cons[-3:], 'pageerrors': errs[-3:]}
            cons.clear(); errs.clear()
            page.screenshot(path=os.path.join(OUT, f'probe-off-{role}-{slug}.png'))
            print(f'{role}/{slug} boxes={json.dumps(m["boxes"], ensure_ascii=False)[:220]} imgs={m["imgs"]} url={m["url"][-60:]}')
        result[f'{role}/__requests'] = len(reqs)
        ctx.close()
    with open(os.path.join(OUT, 'probe-off-all.json'), 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=1)
    print('total off requests', {k: v for k, v in result.items() if k.endswith('__requests')})
    b.close()