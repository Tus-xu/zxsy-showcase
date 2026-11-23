# -*- coding: utf-8 -*-
"""学生端离线回放探针（候选包 dist-offline）：验证 run-03 采证后列表类数据不再为空。"""
import json
import os
import sys

from playwright.sync_api import sync_playwright

WT = r'D:\zxsy-math-arena-showcase-student'
ENTRY = 'file:///' + os.path.join(WT, 'app', 'dist-offline', 'index.html').replace('\\', '/')
OUT = os.path.join(WT, 'qa', 'student-showcase', 'probes')
os.makedirs(OUT, exist_ok=True)


def login(page, role='student', phone='13800001001'):
    page.select_option('#preferred-role', role)
    page.fill('#auth-phone', phone)
    page.get_by_role('button', name='获取验证码').click()
    page.wait_for_timeout(700)
    page.get_by_placeholder('6 位验证码').fill('246810')
    page.get_by_role('button', name='安全登录').click()
    page.wait_for_timeout(2200)


res = {}
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=1, offline=True)
    page = ctx.new_page()
    reqs = []
    errs = []
    page.on('request', lambda r: reqs.append(r.url) if r.url.startswith(('http://', 'https://')) else None)
    page.on('pageerror', lambda e: errs.append(str(e)[:150]))
    page.goto(ENTRY, wait_until='load')
    page.wait_for_timeout(1200)
    login(page)

    def goto(path):
        page.evaluate("(r) => { location.hash = '#' + r }", path)
        page.wait_for_timeout(3200)

    # 题库
    goto('/library')
    try:
        tab = page.get_by_role('button', name='我的题库')
        if tab.count():
            tab.first.click()
            page.wait_for_timeout(3000)
    except Exception as e:
        res['lib_tab_err'] = str(e)[:120]
    lib = page.inner_text('body')
    rows = page.evaluate("() => document.querySelectorAll('[class*=question], .lib-q-row, .q-card').length")
    res['library'] = {'has_total24': '24' in lib, 'text_len': len(lib), 'rows_guess': rows,
                      'snippet': lib[:300].replace('\n', ' | ')}
    page.screenshot(path=os.path.join(OUT, 'library-1440.png'))

    # 资源中心
    goto('/resources')
    cards = page.evaluate("() => document.querySelectorAll('.rc-card, [class*=video-card], .card').length")
    res['resources'] = {'card_count': cards, 'text_len': len(page.inner_text('body')),
                        'has_10plus': cards >= 8}
    page.screenshot(path=os.path.join(OUT, 'resources-1440.png'))

    # 错题
    goto('/errors')
    page.wait_for_timeout(1500)
    err_rows = page.evaluate("() => document.querySelectorAll('.er-row, [class*=error-row], tr').length")
    res['errors'] = {'rows': err_rows, 'text_len': len(page.inner_text('body'))}
    page.screenshot(path=os.path.join(OUT, 'errors-1440.png'))

    # 课堂
    goto('/classroom')
    cls = page.inner_text('body')
    res['classroom'] = {'text_len': len(cls), 'has_deck': '函数的单调性' in cls,
                        'snippet': cls[:260].replace('\n', ' | ')}
    page.screenshot(path=os.path.join(OUT, 'classroom-1440.png'))

    # 我的
    goto('/me')
    me = page.inner_text('body')
    res['me'] = {'text_len': len(me), 'snippet': me[:200].replace('\n', ' | ')}
    page.screenshot(path=os.path.join(OUT, 'me-1440.png'))

    res['network'] = {'http_requests': len(reqs), 'sample': reqs[:5], 'page_errors': errs[:3]}
    b.close()

with open(os.path.join(OUT, 'probe-offline.json'), 'w', encoding='utf-8') as f:
    json.dump(res, f, ensure_ascii=False, indent=1)
print(json.dumps(res, ensure_ascii=False, indent=1))