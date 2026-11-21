# -*- coding: utf-8 -*-
"""探查科研 READ/WRITE 交互结构。"""
from playwright.sync_api import sync_playwright

BASE = r'D:\zxsy-math-arena-showcase'
url = 'file:///' + BASE.replace('\\', '/') + '/release/index.html'
JS_BTNS = """els => els.map(e => (e.innerText || '').trim().slice(0, 26)).filter(Boolean)"""
JS_INPUTS = """els => els.map(e => ({tag: e.tagName, type: e.type || '', cls: String(e.className).slice(0,40), val: String(e.value || '').slice(0,30), ph: e.placeholder || ''}))"""

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, offline=True)
    page = ctx.new_page()

    page.goto(url + '#/research/read', wait_until='load')
    page.wait_for_timeout(1800)
    print('===== READ')
    print('TEXT', page.inner_text('body')[:1400].replace('\n', ' / '))
    print('BTNS', page.eval_on_selector_all('button', JS_BTNS))
    print('INPUTS', page.eval_on_selector_all('input,textarea,[contenteditable=true]', JS_INPUTS))
    print('CLICKABLE-PARA', page.eval_on_selector_all('[class*=para], [class*=block], [class*=paper]', """els => els.slice(0,16).map(e => ({cls:String(e.className).slice(0,46), txt:String(e.innerText||'').replace(/\\n/g,' ').slice(0,60)}))"""))
    page.screenshot(path=BASE + r'\qa\explore\r-read.png')

    page.goto(url + '#/research/write', wait_until='load')
    page.wait_for_timeout(1800)
    print('===== WRITE')
    print('TEXT', page.inner_text('body')[:1200].replace('\n', ' / '))
    print('BTNS', page.eval_on_selector_all('button', JS_BTNS))
    print('INPUTS', page.eval_on_selector_all('input,textarea,[contenteditable=true],.cm-content', JS_INPUTS))
    page.screenshot(path=BASE + r'\qa\explore\r-write.png')
    b.close()
