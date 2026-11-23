# -*- coding: utf-8 -*-
"""R03 学生端离线复刻 VQA 采证：现役(5176) 与 离线(file:// dist-offline) 同条件截图。

用法:
  python capture_vqa.py live
  python capture_vqa.py offline

固定条件: 1440x900, DPR=1, zh-CN, headless Chromium, 主区域锚点出现 + 800ms 后截图。
截图输出: qa/student-showcase/vqa/{live,offline}/<page>.png
元数据:   qa/student-showcase/probes/vqa-meta-<side>.json
"""
import json
import os
import re
import sys
import time

from playwright.sync_api import sync_playwright

WT = r'D:\zxsy-math-arena-showcase-student'
OUT = os.path.join(WT, 'qa', 'student-showcase', 'vqa')
PROBES = os.path.join(WT, 'qa', 'student-showcase', 'probes')
OFFLINE_ENTRY = 'file:///' + os.path.join(WT, 'app', 'dist-offline', 'index.html').replace('\\', '/')
LIVE = 'http://127.0.0.1:5176'
PHONE = '13800001001'
OFF_DUAL = '5304e914-edb1-47d2-b0db-7cbb804bcd86'
OFF_TASK = 'a9107e51-d407-4299-8791-0d1b22cb3ca6'

SIDE = sys.argv[1] if len(sys.argv) > 1 else 'live'
IS_LIVE = SIDE == 'live'
os.makedirs(os.path.join(OUT, SIDE), exist_ok=True)

PAGES = ['p01-dialog-home', 'p02-library-docs', 'p03-library-bank', 'p04-resources',
         'p05-errors', 'p06-classroom-tasks', 'p07-dual-player', 'p08-task-graded',
         'p09-me-report', 'p10-me-map']

ROUTE = {
    'p01-dialog-home': '/dialog',
    'p02-library-docs': '/library?tab=materials',
    'p03-library-bank': '/library?tab=questions',
    'p04-resources': '/resources',
    'p05-errors': '/errors',
    'p06-classroom-tasks': '/classroom?tab=tasks',
    'p09-me-report': '/me?tab=report',
    'p10-me-map': '/me?tab=graph',
}


def log(*a):
    print('[%s]' % SIDE, *a, flush=True)


def snap(page, key, extra_wait=0):
    wait_anchor(page)
    page.wait_for_timeout(800 + extra_wait)
    page.evaluate('() => window.scrollTo(0,0)')
    page.wait_for_timeout(300)
    path = os.path.join(OUT, SIDE, key + '.png')
    page.screenshot(path=path)
    rec = {
        'url': page.url,
        'body_text': page.inner_text('body')[:6000],
        'katex': page.evaluate("() => document.querySelectorAll('.katex').length"),
        'broken_imgs': page.evaluate(
            "() => Array.from(document.images).filter(i=>i.complete && i.naturalWidth===0).map(i=>i.src.slice(0,140))"),
        'img_count': page.evaluate("() => document.images.length"),
    }
    log('   shot', key, 'katex=%s imgs=%s broken=%s' % (rec['katex'], rec['img_count'], len(rec['broken_imgs'])))
    return rec


def wait_anchor(page):
    """主区域锚点: 等待 .view/.main 出现; 题库页再等「已显示」计数文字。"""
    deadline = time.time() + 15
    while time.time() < deadline:
        try:
            if page.locator('.view, .main').count():
                if 'p03-library-bank' in (page.url or ''):
                    pass
                return
        except Exception:
            pass
        page.wait_for_timeout(200)
    log('   ! main anchor timeout')


def wait_bank_counted(page):
    deadline = time.time() + 15
    while time.time() < deadline:
        t = page.inner_text('body')
        if '已显示' in t:
            return
        page.wait_for_timeout(250)


def nav_live(page, route):
    page.goto(LIVE + route, wait_until='load', timeout=30000)
    page.wait_for_timeout(1000)


def nav_off(page, route):
    page.evaluate("(r) => { location.hash = '#' + r }", route)
    page.wait_for_timeout(1200)


def login(page):
    if IS_LIVE:
        page.goto(LIVE + '/', wait_until='load', timeout=30000)
    else:
        page.goto(OFFLINE_ENTRY, wait_until='load', timeout=30000)
    page.wait_for_timeout(1500)

    if page.locator('header.topbar').count():  # 已有会话 → 登出重来
        try:
            page.locator('.user-chip').first.click()
            page.wait_for_timeout(300)
            page.get_by_role('button', name='退出登录').first.click()
            page.wait_for_timeout(1500)
        except Exception as e:
            log('  logout skip:', repr(e)[:80])

    page.select_option('#preferred-role', 'student')
    page.fill('#auth-phone', PHONE)
    page.get_by_role('button', name='获取验证码').click()
    page.wait_for_timeout(900)

    if IS_LIVE:
        code = ''
        for attempt in range(4):
            note = page.locator('.demo-note')
            if note.count():
                m = re.search(r'(\d{6})', note.first.inner_text())
                if m:
                    code = m.group(1)
                    break
            log('  ! no demo-note (attempt %d), wait 65s' % (attempt + 1))
            page.wait_for_timeout(65000)
            page.get_by_role('button', name='获取验证码').click()
            page.wait_for_timeout(900)
        if not code:
            raise RuntimeError('live login: no demo code from .demo-note')
        log('  demo code:', code)
    else:
        code = '246810'

    page.get_by_placeholder('6 位验证码').fill(code)
    page.get_by_role('button', name='安全登录').click()
    page.wait_for_selector('header.topbar', timeout=20000)
    page.wait_for_timeout(2500)
    log('  login ok ->', page.url)


def nav(page, route):
    if IS_LIVE:
        nav_live(page, route)
    else:
        nav_off(page, route)


def find_dual_sid(page):
    """课堂→双师课堂 tab→点老师课堂卡片(继续学习)/最近课堂→取 /dual/<sid>"""
    nav(page, '/classroom?tab=dual')
    page.wait_for_timeout(2500)
    card = page.locator('article.tc-card')
    if card.count():
        log('  tc-cards:', card.count())
        card.first.click()
        page.wait_for_timeout(4500)
    m = re.search(r'/dual/([0-9a-fA-F-]{36})', page.url)
    if not m:
        item = page.locator('.de-r-item')
        if item.count():
            item.first.click()
            page.wait_for_timeout(4500)
        m = re.search(r'/dual/([0-9a-fA-F-]{36})', page.url)
    return (m.group(1) if m else None)


def find_task_sid(page):
    """课堂→课堂任务→已完成 tab→查看作答→取 /tasks/<id>"""
    nav(page, '/classroom?tab=tasks')
    page.wait_for_timeout(2500)
    tabs = page.locator('.task-tabs button')
    n = tabs.count()
    for i in range(n):
        try:
            if '已完成' in tabs.nth(i).inner_text():
                tabs.nth(i).click()
                page.wait_for_timeout(1600)
                break
        except Exception:
            pass
    btn = page.get_by_text('查看作答', exact=False)
    if btn.count():
        btn.first.click()
        page.wait_for_timeout(3500)
    m = re.search(r'/tasks/([0-9a-fA-F-]{36})', page.url)
    return (m.group(1) if m else None)


def main():
    meta = {'side': SIDE, 'started': time.strftime('%Y-%m-%dT%H:%M:%S'),
            'viewport': '1440x900', 'dpr': 1, 'locale': 'zh-CN', 'pages': {}}
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        ctx = b.new_context(viewport={'width': 1440, 'height': 900},
                            device_scale_factor=1, offline=not IS_LIVE, locale='zh-CN')
        page = ctx.new_page()
        page.set_default_timeout(20000)
        login(page)

        dual_sid = task_sid = None
        for key in PAGES:
            log('==', key)
            rec = {}
            try:
                if key == 'p07-dual-player':
                    if IS_LIVE:
                        dual_sid = find_dual_sid(page)
                        rec['session_id'] = dual_sid
                        if not dual_sid:
                            rec['error'] = 'live dual session id not found'
                            meta['pages'][key] = rec
                            continue
                        nav_live(page, '/dual/' + dual_sid)
                    else:
                        rec['session_id'] = OFF_DUAL
                        nav_off(page, '/dual/' + OFF_DUAL)
                    rec.update(snap(page, key, extra_wait=2500))
                elif key == 'p08-task-graded':
                    if IS_LIVE:
                        task_sid = find_task_sid(page)
                        rec['assignment_id'] = task_sid
                        if not task_sid:
                            rec['error'] = 'live task assignment id not found'
                            meta['pages'][key] = rec
                            continue
                        nav_live(page, '/tasks/' + task_sid)
                    else:
                        rec['assignment_id'] = OFF_TASK
                        nav_off(page, '/tasks/' + OFF_TASK)
                    rec.update(snap(page, key, extra_wait=1500))
                else:
                    nav(page, ROUTE[key])
                    if key == 'p03-library-bank':
                        wait_bank_counted(page)
                    rec.update(snap(page, key))
            except Exception as e:
                rec['error'] = repr(e)[:300]
                log('   ERROR:', repr(e)[:200])
            meta['pages'][key] = rec

        b.close()

    meta['finished'] = time.strftime('%Y-%m-%dT%H:%M:%S')
    with open(os.path.join(PROBES, 'vqa-meta-%s.json' % SIDE), 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
    brief = {k: {'url': v.get('url'), 'sid': v.get('session_id') or v.get('assignment_id'),
                 'err': (v.get('error') or '')[:60]} for k, v in meta['pages'].items()}
    print(json.dumps(brief, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
