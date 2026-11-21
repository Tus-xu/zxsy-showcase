# -*- coding: utf-8 -*-
"""探查教师工作台 / 批改页可编辑控件结构。"""
from playwright.sync_api import sync_playwright

BASE = r'D:\zxsy-math-arena-showcase'
url = 'file:///' + BASE.replace('\\', '/') + '/release/index.html'

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, offline=True)
    page = ctx.new_page()

    def dump(route):
        page.goto(url + '#' + route, wait_until='load')
        page.wait_for_timeout(1300)
        print('=====', route)
        print('INPUTS', page.eval_on_selector_all(
            'input,textarea,[contenteditable=true]',
            """els => els.map(e => ({
                tag: e.tagName,
                type: e.type || '',
                cls: String(e.className).slice(0, 50),
                val: String(e.value || e.innerText || '').slice(0, 40),
                ph: e.placeholder || ''
            }))"""))
        print('BUTTONS', page.eval_on_selector_all(
            'button', """els => els.map(e => (e.innerText || '').trim().slice(0, 26)).filter(Boolean)"""))

    dump('/teacher/prep/w/prep-ellipse/ppt')
    dump('/teacher/grading')
    b.close()
