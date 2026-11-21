# -*- coding: utf-8 -*-
"""探查发布弹窗 / 学生课堂 / 课后回看 / 双师页控件。"""
from playwright.sync_api import sync_playwright

BASE = r'D:\zxsy-math-arena-showcase'
url = 'file:///' + BASE.replace('\\', '/') + '/release/index.html'

JS_INPUTS = """els => els.map(e => ({
  tag: e.tagName, type: e.type || '', cls: String(e.className).slice(0, 56),
  val: String(e.value || e.innerText || '').slice(0, 40), ph: e.placeholder || ''
}))"""
JS_BTNS = """els => els.map(e => (e.innerText || '').trim().slice(0, 30)).filter(Boolean)"""

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, offline=True)
    page = ctx.new_page()

    page.goto(url + '#/teacher/prep/w/prep-ellipse/ppt', wait_until='load')
    page.wait_for_timeout(1200)
    page.get_by_role('button', name='发布课堂').click()
    page.wait_for_timeout(700)
    print('===== PUBLISH DIALOG')
    print('text', page.inner_text('body')[-800:].replace('\n', ' / '))
    print('inputs', page.eval_on_selector_all('input,select,textarea', JS_INPUTS))
    print('buttons', page.eval_on_selector_all('button', JS_BTNS))
    page.screenshot(path=BASE + r'\qa\probe-publish-dialog.png')

    page.goto(url + '#/student/classroom?tab=dual', wait_until='load')
    page.wait_for_timeout(1200)
    print('===== STUDENT CLASSROOM DUAL TAB')
    print('text', page.inner_text('body')[:600].replace('\n', ' / '))
    print('buttons', page.eval_on_selector_all('button', JS_BTNS))
    print('cards', page.eval_on_selector_all('[class*=card], [class*=Card]', """els => els.map(e => ({cls:String(e.className).slice(0,40), txt:String(e.innerText||'').replace(/\\n/g,' / ').slice(0,80)}))"""))
    page.screenshot(path=BASE + r'\qa\probe-student-classroom.png')
    b.close()
