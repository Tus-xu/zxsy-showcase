# -*- coding: utf-8 -*-
"""探查科研 READ 选段工具条 / 问 AI / 公式检查 / WRITE 编译交互。"""
from playwright.sync_api import sync_playwright

BASE = r'D:\zxsy-math-arena-showcase'
url = 'file:///' + BASE.replace('\\', '/') + '/release/index.html'
JS_BTNS = """els => els.map(e => (e.innerText || '').trim().slice(0, 30)).filter(Boolean)"""

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, offline=True)
    page = ctx.new_page()

    page.goto(url + '#/research/read', wait_until='load')
    page.wait_for_timeout(1800)
    paras = page.locator('.paper p')
    print('PARA_COUNT', paras.count())
    if paras.count() > 1:
        paras.nth(1).click()
        page.wait_for_timeout(500)
        print('AFTER_CLICK_BTNS', page.eval_on_selector_all('button', JS_BTNS)[-14:])
        print('TOOLBAR_TEXT', page.inner_text('body')[-600:].replace('\n', ' / '))
        page.screenshot(path=BASE + r'\qa\explore\r-read-selected.png')
        # 尝试点问 AI
        try:
            page.get_by_role('button', name='问 AI').first.click()
            page.wait_for_timeout(900)
            print('AFTER_ASK_TEXT', page.inner_text('body')[-900:].replace('\n', ' / '))
            print('AFTER_ASK_BTNS', page.eval_on_selector_all('button', JS_BTNS)[-14:])
            page.screenshot(path=BASE + r'\qa\explore\r-read-ask.png')
        except Exception as e:
            print('ASK_FAIL', str(e)[:200])
    # 公式检查
    try:
        page.get_by_role('button', name='公式检查').first.click()
        page.wait_for_timeout(700)
        print('FORMULA_TEXT', page.inner_text('body')[-1000:].replace('\n', ' / '))
        page.screenshot(path=BASE + r'\qa\explore\r-read-formula.png')
    except Exception as e:
        print('FORMULA_FAIL', str(e)[:200])

    # WRITE 编译错误流程
    page.goto(url + '#/research/write', wait_until='load')
    page.wait_for_timeout(1500)
    ed = page.locator('textarea.ed__input').first
    content = ed.input_value()
    ed.fill(content.replace('\\end{document}', '\\undefinedcmdhere\n\\end{document}'))
    page.get_by_role('button', name='重新编译').first.click()
    page.wait_for_timeout(1200)
    body = page.inner_text('body')
    print('WRITE_ERR_HAS', '错误' in body, '错误 1' in body, body[-700:].replace('\n', ' / '))
    page.screenshot(path=BASE + r'\qa\explore\r-write-error.png')
    ed.fill(content)
    page.get_by_role('button', name='重新编译').first.click()
    page.wait_for_timeout(1200)
    print('WRITE_FIXED', '编译成功' in page.inner_text('body'))
    b.close()
