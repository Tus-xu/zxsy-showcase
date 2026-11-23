# -*- coding: utf-8 -*-
"""DOM 盒模型量化对比: live/offline 各页关键区域 bounding box 差值与可见控件差异。"""
import json
import os
import re
import sys
import time

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

WT = r'D:\zxsy-math-arena-showcase-student'
P = os.path.join(WT, 'qa', 'student-showcase', 'probes')
OUT = os.path.join(WT, 'qa', 'student-showcase', 'vqa')
ENTRY = 'file:///' + os.path.join(WT, 'app', 'dist-offline', 'index.html').replace('\\', '/')
LIVE = 'http://127.0.0.1:5176'
OFF_DUAL = '5304e914-edb1-47d2-b0db-7cbb804bcd86'
OFF_TASK = 'a9107e51-d407-4299-8791-0d1b22cb3ca6'

SEL = {
    'shell.topbar': '.topbar',
    'shell.sidebar': '.sidebar',
    'shell.main': 'main.main',
    'view': '.view',
    'tabs': '.lib-tabs, .me-tabs, .cls-tabs, .task-tabs',
    'first-card': '.task-item, .tc-card, .rc-card, .lib-doc-row, .q-row, .lib-q-row',
    'greeting': '.greeting',
    'primary-btn': 'button.btn-primary, button.primary',
    'input': 'input.input, textarea, input[placeholder]',
}

BOX_JS = """(sels) => {
  const out = {};
  for (const [k, sel] of Object.entries(sels)) {
    const el = document.querySelector(sel);
    if (!el) { out[k] = null; continue; }
    const r = el.getBoundingClientRect();
    out[k] = {x: Math.round(r.x*10)/10, y: Math.round(r.y*10)/10, w: Math.round(r.width*10)/10, h: Math.round(r.height*10)/10};
  }
  return out;
}"""

PAGES = [
    ('p01-dialog-home', '/dialog'),
    ('p02-library-docs', '/library?tab=materials'),
    ('p03-library-bank', '/library?tab=questions'),
    ('p04-resources', '/resources'),
    ('p05-errors', '/errors'),
    ('p06-classroom-tasks', '/classroom?tab=tasks'),
    ('p07-dual-player', '/dual/' + OFF_DUAL),
    ('p08-task-graded', '/tasks/' + OFF_TASK),
    ('p09-me-report', '/me?tab=report'),
    ('p10-me-map', '/me?tab=graph'),
]


def login(page, live):
    page.goto((LIVE + '/') if live else ENTRY, wait_until='load', timeout=30000)
    page.wait_for_timeout(1500)
    if page.locator('header.topbar').count():
        try:
            page.locator('.user-chip').first.click(); page.wait_for_timeout(300)
            page.get_by_role('button', name='退出登录').first.click(); page.wait_for_timeout(1500)
        except Exception:
            pass
    page.select_option('#preferred-role', 'student')
    page.fill('#auth-phone', '13800001001')
    page.get_by_role('button', name='获取验证码').click()
    page.wait_for_timeout(900)
    if live:
        code = ''
        for _ in range(3):
            n = page.locator('.demo-note')
            if n.count():
                m = re.search(r'(\d{6})', n.first.inner_text())
                if m:
                    code = m.group(1); break
            print('   wait 65s')
            page.wait_for_timeout(65000)
            page.get_by_role('button', name='获取验证码').click()
            page.wait_for_timeout(900)
    else:
        code = '246810'
    page.get_by_placeholder('6 位验证码').fill(code)
    page.get_by_role('button', name='安全登录').click()
    page.wait_for_selector('header.topbar', timeout=20000)
    page.wait_for_timeout(2200)


def run(side):
    live = side == 'live'
    data = {}
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        ctx = b.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=1,
                            offline=not live, locale='zh-CN')
        page = ctx.new_page()
        login(page, live)
        for key, route in PAGES:
            if live:
                page.goto(LIVE + route, wait_until='load', timeout=30000)
                page.wait_for_timeout(1600)
            else:
                page.evaluate("(r) => { location.hash = '#' + r }", route)
                page.wait_for_timeout(1600)
            if key in ('p04-resources',):
                page.wait_for_timeout(4500)
            if key in ('p07-dual-player', 'p08-task-graded'):
                page.wait_for_timeout(3500)
            boxes = page.evaluate(BOX_JS, SEL)
            data[key] = boxes
            print(side, key, json.dumps(boxes, ensure_ascii=False))
        b.close()
    with open(os.path.join(P, 'vqa-boxes-%s.json' % side), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)


if __name__ == '__main__':
    run(sys.argv[1])