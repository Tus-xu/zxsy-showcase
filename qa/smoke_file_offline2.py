# -*- coding: utf-8 -*-
"""断网 file:// 冒烟 2：完整走完题1 主线 + 错答分支 + 求助 + 字体/控制台诊断"""
import os, json
from playwright.sync_api import sync_playwright

BASE = r'D:\zxsy-math-arena-showcase'
OUT = os.path.join(BASE, 'qa', 'smoke')
os.makedirs(OUT, exist_ok=True)
errors = []
msgs = []

def log(*a):
    s = ' '.join(str(x) for x in a)
    print(s)

def shot(page, name, locator=None):
    p = os.path.join(OUT, name)
    if locator:
        locator.screenshot(path=p)
    else:
        page.screenshot(path=p)
    log('SHOT', name)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, offline=True)
    page = ctx.new_page()
    page.on('console', lambda m: errors.append((m.type, m.text)) if m.type in ('error',) else None)
    page.on('pageerror', lambda e: errors.append(('pageerror', str(e))))
    url = 'file:///' + BASE.replace('\\', '/') + '/release/index.html'
    page.goto(url, wait_until='load')
    page.wait_for_timeout(600)
    log('FONT_STATUS', page.evaluate("document.fonts.status"), 'KATEX_MAIN', page.evaluate("document.fonts.check('16px KaTeX_Main')"))
    page.locator('.ms-role', has_text='学生').first.click()
    page.wait_for_timeout(400)
    page.locator('.student-home__case', has_text='双曲线').first.click()
    page.wait_for_timeout(400)
    page.locator('input[type=file]').set_input_files(r'D:\zxsy-math-arena\docs\superpowers\plans\题1.png')
    page.wait_for_timeout(800)
    shot(page, '11-chat-after-upload.png', page.locator('.guide__chat'))

    def answer(text):
        inp = page.locator('.guide__input').first
        inp.fill(text)
        page.locator('.guide__composer .ms-btn--primary').first.click()
        page.wait_for_timeout(500)

    answer('2b=√7·2a，所以 b/a=√7')
    answer('c²=a²+b²')
    answer('8')
    page.wait_for_timeout(300)
    shot(page, '12-before-choice.png', page.locator('.guide__composer'))
    page.locator('.guide__choice').nth(3).click()
    page.wait_for_timeout(200)
    page.locator('.guide__composer .ms-btn--primary').first.click()
    page.wait_for_timeout(700)
    page.reload(wait_until='load')
    page.wait_for_timeout(700)
    shot(page, '13-final-after-refresh.png')
    body = page.inner_text('body')
    log('FINISHED', '已完成本题' in body)
    log('FINAL_HAS_61', '2√2' in body or '2\\sqrt{2}' in body)

    # 错答分支：新会话 B，选 A 而不是 B
    page.goto(url + '#/student/guide/B', wait_until='load')
    page.wait_for_timeout(400)
    page.locator('input[type=file]').set_input_files(r'D:\zxsy-math-arena\docs\superpowers\plans\题2.png')
    page.wait_for_timeout(700)
    answer('正三角形，AD⊥BC')
    answer('过 D 平行侧棱的线垂直于底面，所以也垂直于 BC')
    # 单选 B 项：应选 B(索引1)，故意先选 A(索引0)
    page.locator('.guide__choice').nth(0).click()
    page.wait_for_timeout(150)
    page.locator('.guide__composer .ms-btn--primary').first.click()
    page.wait_for_timeout(600)
    shot(page, '14-B-wrong-A.png', page.locator('.guide__chat'))
    # 求助
    page.locator('.guide__tool', has_text='给个提示').first.click()
    page.wait_for_timeout(400)
    shot(page, '15-B-help.png', page.locator('.guide__chat'))
    log('HELP_SHOWN', '线面垂直的判定' in page.inner_text('body'))

    # 页脚网络尝试计数
    page.locator('.ms-host-fab').click()
    page.wait_for_timeout(300)
    host_text = page.inner_text('.ms-host__panel')
    log('NET_TEXT', [l for l in host_text.splitlines() if '网络尝试' in l])
    page.keyboard.press('Escape')

    log('ERRORS', json.dumps(errors[:8], ensure_ascii=False))
    browser.close()
