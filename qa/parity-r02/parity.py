# -*- coding: utf-8 -*-
"""run-02 逐屏对照：同一角色/路由/视口下，现役 vs 离线 截图并排 + 可见文本差异。

用法：python qa/parity-r02/parity.py [role ...]
产出：qa/parity-r02/shots/live-<role>-<slug>.png / off-<role>-<slug>.png / side-<...>.png
      qa/parity-r02/parity.csv
"""
import csv
import os
import re
import sys

from playwright.sync_api import sync_playwright

ROOT = r'D:\zxsy-math-arena-showcase'
LIVE = 'http://127.0.0.1:5176'
OFF = 'file:///' + os.path.join(ROOT, 'app', 'dist-offline', 'index.html').replace('\\', '/')
OUT = os.path.join(ROOT, 'qa', 'parity-r02')
SHOTS = os.path.join(OUT, 'shots')
STATE = os.path.join(ROOT, '.work', 'state')
os.makedirs(SHOTS, exist_ok=True)
os.makedirs(STATE, exist_ok=True)

sys.path.insert(0, os.path.join(ROOT, '.work', 'scripts'))
from live_login import RESEARCH, STUDENT, TEACHER, login  # noqa: E402

ROLES = {
    'student': {'ident': STUDENT, 'off_role': 'student', 'home': '/dialog', 'routes': [
        ('/dialog', 'home'),
        ('/practice', 'practice'),
        ('/errors', 'errors'),
        ('/library', 'library'),
        ('/resources', 'resources'),
        ('/classroom', 'classroom'),
        ('/me', 'me'),
    ]},
    'teacher': {'ident': TEACHER, 'off_role': 'teacher', 'home': '/teacher-v3/prep', 'routes': [
        ('/teacher-v3/prep', 'prep'),
        ('/teacher-v3/today', 'today'),
        ('/teacher-v3/classes', 'classes'),
        ('/teacher-v3/bank', 'bank'),
        ('/teacher-v3/assign', 'assign'),
        ('/teacher-v3/insights', 'insights'),
        ('/teacher-v3/resources', 'resources'),
        ('/teacher-v3/grading', 'grading'),
    ]},
    'researcher': {'ident': RESEARCH, 'off_role': 'researcher', 'home': '/research-workspace', 'routes': [
        ('/research-workspace', 'landing'),
        ('/research-workspace/workspace', 'workspace'),
        ('/research-workspace/account', 'account'),
    ]},
}


def norm_text(t):
    t = re.sub(r'\s+', ' ', t or '')
    return t.strip()


def login_state(browser, role):
    """登录一次并存 storage_state 复用（避免短信频控）。"""
    p = os.path.join(STATE, f'{role}.json')
    if os.path.exists(p):
        return p
    ctx = browser.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1)
    page = ctx.new_page()
    for attempt in range(3):
        try:
            login(page, ROLES[role]['ident'])
            ctx.storage_state(path=p)
            ctx.close()
            return p
        except Exception:
            page.wait_for_timeout(65000)
    ctx.close()
    return None


def open_live(browser, role):
    """在同一次上下文里真实登录（token 只在内存，storage_state 不保留 → 直接登录）。"""
    ctx = browser.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1)
    page = ctx.new_page()
    for attempt in range(3):
        try:
            login(page, ROLES[role]['ident'])
            page.wait_for_timeout(1800)
            return ctx, page
        except Exception:
            page.wait_for_timeout(65000)
    return ctx, page


def open_off(browser, role):
    ctx = browser.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, offline=True)
    page = ctx.new_page()
    page.goto(OFF, wait_until='load')
    page.wait_for_timeout(1000)
    # 离线已登录态（localStorage 会话）或走一次登录
    logged = page.evaluate("() => { try { return !!JSON.parse(localStorage.getItem('ma_offline_demo_v1')||'{}').session } catch(e) { return false } }")
    if not logged:
        page.select_option('#preferred-role', ROLES[role]['off_role'])
        page.fill('#auth-phone', ROLES[role]['ident']['phone'])
        page.get_by_role('button', name='获取验证码').click()
        page.wait_for_timeout(900)
        page.get_by_placeholder('6 位验证码').fill('246810')
        page.get_by_role('button', name='安全登录').click()
        page.wait_for_timeout(2200)
    return ctx, page


def goto_off(page, route):
    page.evaluate("(r) => { location.hash = '#' + r }", route)
    page.wait_for_timeout(2500)


def main(only):
    rows = []
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        for role in ROLES:
            if only and role not in only:
                continue
            print('=== role', role, '===')
            lctx, lpage = open_live(b, role)
            octx, opage = open_off(b, role)
            for route, slug in ROLES[role]['routes']:
                rec = {'role': role, 'route': route, 'slug': slug}
                try:
                    lpage.goto(LIVE + route, wait_until='load')
                    lpage.wait_for_timeout(3200)
                    ltxt = norm_text(lpage.inner_text('body'))
                    lf = os.path.join(SHOTS, f'live-{role}-{slug}.png')
                    lpage.screenshot(path=lf)
                    rec['live_len'] = len(ltxt)
                except Exception as e:
                    rec['live_err'] = repr(e)[:150]
                    ltxt = ''
                try:
                    goto_off(opage, route)
                    otxt = norm_text(opage.inner_text('body'))
                    of = os.path.join(SHOTS, f'off-{role}-{slug}.png')
                    opage.screenshot(path=of)
                    rec['off_len'] = len(otxt)
                except Exception as e:
                    rec['off_err'] = repr(e)[:150]
                    otxt = ''
                same = 1.0 if ltxt == otxt else 0.0
                # 粗粒度相似度：字符级集合重叠
                if ltxt and otxt:
                    a, bb = set(ltxt), set(otxt)
                    same = round(len(a & bb) / max(1, len(a | bb)), 3)
                rec['text_similarity'] = same
                rec['live_tail'] = (ltxt[-300:] if ltxt else '')
                rec['off_tail'] = (otxt[-300:] if otxt else '')
                rows.append(rec)
                print(f'  {slug:12s} live={rec.get("live_len",0):6d} off={rec.get("off_len",0):6d} sim={same}')
            lctx.close()
            octx.close()
        b.close()

    csv_path = os.path.join(OUT, 'parity.csv')
    keys = ['role', 'route', 'slug', 'live_len', 'off_len', 'text_similarity', 'live_err', 'off_err', 'live_tail', 'off_tail']
    with open(csv_path, 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.DictWriter(f, fieldnames=keys, extrasaction='ignore')
        w.writeheader()
        for r in rows:
            w.writerow(r)
    print('WROTE', csv_path, len(rows), 'rows')


if __name__ == '__main__':
    main(sys.argv[1:])