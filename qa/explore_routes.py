# -*- coding: utf-8 -*-
"""探查整包 release 各端页面真实 DOM：输出主要按钮/标题文本 + 截图，供验收脚本选点。"""
import os, json
from playwright.sync_api import sync_playwright

BASE = r'D:\zxsy-math-arena-showcase'
OUT = os.path.join(BASE, 'qa', 'explore')
os.makedirs(OUT, exist_ok=True)
url = 'file:///' + BASE.replace('\\', '/') + '/release/index.html'

PAGES = [
    ('student', '/student/dialog'),
    ('student-classroom', '/student/classroom'),
    ('student-practice', '/student/practice'),
    ('student-errors', '/student/errors'),
    ('student-library', '/student/library'),
    ('student-me', '/student/me'),
    ('teacher-prep', '/teacher/prep'),
    ('teacher-workbench-ppt', '/teacher/prep/w/prep-ellipse/ppt'),
    ('teacher-workbench-plan', '/teacher/prep/w/prep-ellipse/plan'),
    ('teacher-grading', '/teacher/grading'),
    ('teacher-classroom', '/teacher/classroom'),
    ('teacher-insights', '/teacher/insights'),
    ('teacher-bank', '/teacher/bank'),
    ('teacher-resources', '/teacher/resources'),
    ('research-home', '/research'),
    ('research-read', '/research/read'),
    ('research-write', '/research/write'),
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, offline=True)
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(url, wait_until='load')
    page.wait_for_timeout(400)
    report = {}
    for name, route in PAGES:
        page.goto(url + '#' + route, wait_until='load')
        page.wait_for_timeout(700)
        txt = page.inner_text('body')
        btns = page.eval_on_selector_all('button', 'els => els.slice(0,60).map(e => (e.innerText||"").trim().slice(0,24)).filter(Boolean)')
        report[name] = {'route': route, 'url': page.url, 'buttons': btns, 'text_head': txt[:1200]}
        page.screenshot(path=os.path.join(OUT, name + '.png'))
    report['_pageerrors'] = errors[:10]
    json.dump(report, open(os.path.join(OUT, 'report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('EXPLORED', len(PAGES), 'pages; errors:', len(errors))
    for name, _ in PAGES:
        r = report[name]
        print('==', name, '==')
        print(' buttons:', ' | '.join(r['buttons'][:18]))
    browser.close()
