# -*- coding: utf-8 -*-
import json
from playwright.sync_api import sync_playwright

URL = 'file:///D:/zxsy-math-arena-showcase/release/index.html'
OUT = r'D:\zxsy-math-arena-showcase\qa\review-visual\shots'
Q = {'A': r'D:\zxsy-math-arena\docs\superpowers\plans\题1.png'}

JS = r"""() => {
  const ask = document.querySelector('.guide__ask');
  const dots = [...document.querySelectorAll('.guide__step-dot')].map(d => d.className);
  const chat = [...document.querySelectorAll('.guide__msg')].map(m => m.innerText.replace(/\s+/g,' ').slice(0,60));
  const choices = [...document.querySelectorAll('.guide__choice')].map(c => c.innerText.replace(/\s+/g,' ').slice(0,30));
  return { ask: ask ? ask.innerText.replace(/\s+/g,' ').slice(0,120) : null, dots, choices, chatCount: chat.length, chatLast: chat.slice(-2) };
}"""

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, locale='zh-CN')
    page = ctx.new_page()
    page.goto(URL, wait_until='load'); page.wait_for_timeout(1200)
    page.evaluate('() => localStorage.clear()'); page.reload(wait_until='load'); page.wait_for_timeout(1300)
    page.locator('.ms-role').nth(0).click(); page.wait_for_timeout(800)
    page.evaluate("() => { location.hash = '#/student/guide/A' }"); page.wait_for_timeout(900)
    page.set_input_files('input[type=file]', Q['A']); page.wait_for_timeout(1300)
    print('after upload:', json.dumps(page.evaluate(JS), ensure_ascii=False))
    page.fill('.guide__input', '2b=√7·2a，所以 b/a=√7'); page.keyboard.press('Enter'); page.wait_for_timeout(800)
    print('after a1:', json.dumps(page.evaluate(JS), ensure_ascii=False))
    page.fill('.guide__input', 'c²=a²+b²'); page.keyboard.press('Enter'); page.wait_for_timeout(800)
    print('after a2:', json.dumps(page.evaluate(JS), ensure_ascii=False))
    page.fill('.guide__input', '8'); page.keyboard.press('Enter'); page.wait_for_timeout(800)
    print('after a3:', json.dumps(page.evaluate(JS), ensure_ascii=False))
    page.mouse.move(3, 3); page.wait_for_timeout(300)
    page.screenshot(path=OUT + r'\diag-A-after-a3.png')
    # 尝试判断当前是否有选项
    print('choices count:', page.locator('.guide__choices .guide__choice').count())
    b.close()
