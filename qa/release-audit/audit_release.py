# -*- coding: utf-8 -*-
"""发行包断网审计：逐页访问 + 样板一全流程，统计 http(s)/ws 请求、页面错误、破图。"""
import json
import os
import re

from playwright.sync_api import sync_playwright

ROOT = r'D:\zxsy-math-arena-showcase'
REL = os.path.join(ROOT, 'release', '开始演示.html')
ENTRY = 'file:///' + REL.replace('\\', '/')
PLANS = r'D:\zxsy-math-arena\docs\superpowers\plans'
OUT = os.path.join(ROOT, 'qa', 'release-audit')
os.makedirs(OUT, exist_ok=True)

ROUTES = {
    'student': ['/dialog', '/practice', '/errors', '/library', '/resources', '/classroom', '/me'],
    'teacher': ['/teacher-v3/prep', '/teacher-v3/classes', '/teacher-v3/bank', '/teacher-v3/assign',
                '/teacher-v3/insights', '/teacher-v3/resources', '/teacher-v3/grading',
                '/teacher-v3/prep-immersive/f5c84551-18a7-454d-b49c-8f115e816299'],
    'researcher': ['/research-workspace', '/research-workspace/workspace',
                   '/research-workspace/e49b27e2-b05f-45c3-ac99-dd0792d9ab80/read',
                   '/research-workspace/e49b27e2-b05f-45c3-ac99-dd0792d9ab80/write',
                   '/research-workspace/account'],
}
PHONE = {'student': '13800001001', 'teacher': '13800001002', 'researcher': '13800001003'}
ROLE = {'student': 'student', 'teacher': 'teacher', 'researcher': 'researcher'}

report = {'entry': ENTRY, 'routes': {}, 'template1': {}, 'totals': {}}


def login_off(page, role):
    logged = page.evaluate("() => { try { return !!JSON.parse(localStorage.getItem('ma_offline_demo_v1')||'{}').session } catch(e) { return false } }")
    if logged:
        return
    page.select_option('#preferred-role', ROLE[role])
    page.fill('#auth-phone', PHONE[role])
    page.get_by_role('button', name='获取验证码').click()
    page.wait_for_timeout(900)
    page.get_by_placeholder('6 位验证码').fill('246810')
    page.get_by_role('button', name='安全登录').click()
    page.wait_for_timeout(2000)


with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    total_http = 0
    total_err = 0
    for role, routes in ROUTES.items():
        ctx = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, offline=True)
        page = ctx.new_page()
        reqs, errs = [], []
        page.on('request', lambda r: reqs.append(r.url) if re.match(r'^(https?|wss?):', r.url) else None)
        page.on('pageerror', lambda e: errs.append(str(e)[:150]))
        page.goto(ENTRY, wait_until='load')
        page.wait_for_timeout(1500)
        login_off(page, role)
        for route in routes:
            before = len(reqs)
            page.evaluate("(r) => { location.hash = '#' + r }", route)
            page.wait_for_timeout(4500)
            probe = page.evaluate("""() => {
              const imgs = Array.from(document.querySelectorAll('img'));
              return {
                len: (document.body.innerText || '').length,
                broken: imgs.filter(i => !i.complete || i.naturalWidth === 0).length,
                imgs: imgs.length,
                head: (document.body.innerText || '').replace(/\\s+/g, ' ').slice(0, 90),
              };
            }""")
            slug = route.strip('/').replace('/', '_') or 'root'
            page.screenshot(path=os.path.join(OUT, f'{role}-{slug}.png'))
            report['routes'][f'{role}{route}'] = {
                'http_during_nav': len(reqs) - before, 'text_len': probe['len'],
                'imgs': probe['imgs'], 'broken': probe['broken'], 'head': probe['head'],
            }
        report['routes'][f'{role}__errors'] = errs[:3]
        total_http += len(reqs)
        total_err += len(errs)
        print(f'{role}: routes={len(routes)} http={len(reqs)} errors={len(errs)}')
        ctx.close()

    # 样板一：A 题全流程
    ctx = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, offline=True)
    page = ctx.new_page()
    reqs, errs = [], []
    page.on('request', lambda r: reqs.append(r.url) if re.match(r'^(https?|wss?):', r.url) else None)
    page.on('pageerror', lambda e: errs.append(str(e)[:150]))
    page.goto(ENTRY, wait_until='load')
    page.wait_for_timeout(1500)
    login_off(page, 'student')
    if page.locator('button.sb-new').count():
        page.locator('button.sb-new').first.click()
        page.wait_for_timeout(1200)
    try:
        with page.expect_file_chooser(timeout=8000) as fc:
            page.locator('.he-card', has_text='拍一道不会的题').first.click()
        fc.value.set_files(os.path.join(PLANS, '题1.png'))
    except Exception:
        page.locator('input[type=file]').first.set_input_files(os.path.join(PLANS, '题1.png'))
    for _ in range(60):
        if page.locator('.att-card.ready').count():
            break
        page.wait_for_timeout(500)
    page.wait_for_timeout(600)
    page.locator('button.ci-send').first.click()
    for _ in range(60):
        if page.locator('.msg-row.ai').count() > 0 and page.locator('button.ci-stop').count() == 0:
            break
        page.wait_for_timeout(600)
    page.wait_for_timeout(1200)
    ai = page.locator('.msg-row.ai').count()
    last = page.locator('.msg-row.ai .ai-bubble').nth(max(0, ai - 1)).inner_text() if ai else ''
    page.screenshot(path=os.path.join(OUT, 'template1-A-first-turn.png'))
    report['template1'] = {'att_ready': page.locator('.att-card.ready').count(), 'ai_rows': ai,
                           'reply_head': last[:120], 'http': len(reqs), 'errors': errs[:3]}
    total_http += len(reqs)
    total_err += len(errs)
    print(f'template1: ai={ai} http={len(reqs)} errors={len(errs)}')
    ctx.close()
    b.close()

report['totals'] = {'http_requests': total_http, 'page_errors': total_err,
                    'routes_checked': sum(len(v) for v in ROUTES.values())}
with open(os.path.join(OUT, 'audit.json'), 'w', encoding='utf-8') as f:
    json.dump(report, f, ensure_ascii=False, indent=1)
print(json.dumps(report['totals'], ensure_ascii=False))
print('broken images total:', sum(v.get('broken', 0) for v in report['routes'].values() if isinstance(v, dict)))