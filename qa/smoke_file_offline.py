# -*- coding: utf-8 -*-
"""断网 file:// 冒烟：登录 -> 学生首页 -> 上传题1 -> 引导第一轮 -> 正确作答 -> 截图"""
import sys, os, json
from playwright.sync_api import sync_playwright

BASE = r'D:\zxsy-math-arena-showcase'
OUT = os.path.join(BASE, 'qa', 'smoke')
os.makedirs(OUT, exist_ok=True)
errors = []

def shot(page, name):
    page.screenshot(path=os.path.join(OUT, name), full_page=False)
    print('SHOT', name)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, offline=True)
    page = ctx.new_page()
    page.on('console', lambda m: errors.append(('console', m.type, m.text)) if m.type in ('error', 'warning') else None)
    page.on('pageerror', lambda e: errors.append(('pageerror', str(e))))
    url = 'file:///' + BASE.replace('\\', '/') + '/release/index.html'
    page.goto(url, wait_until='load')
    page.wait_for_timeout(800)
    shot(page, '01-login.png')
    print('URL', page.url)

    # 进入学生端
    page.locator('.ms-role', has_text='学生').first.click()
    page.wait_for_timeout(600)
    shot(page, '02-student-home.png')
    print('URL2', page.url)

    # 直接进入案例 A 引导页（等价于点卡片）
    page.locator('.student-home__case', has_text='双曲线').first.click()
    page.wait_for_timeout(500)
    shot(page, '03-guide-upload.png')

    # 上传题1（隐藏 input -> set_input_files 模拟文件选择器结果）
    img = r'D:\zxsy-math-arena\docs\superpowers\plans\题1.png'
    page.locator('input[type=file]').set_input_files(img)
    page.wait_for_timeout(900)
    shot(page, '04-guide-after-upload.png')
    body = page.inner_text('body')
    print('HAS_OCR', '虚轴长' in body, 'HAS_ASK', '2b' in body or '实半轴' in body)

    # 第一轮作答：2b=√7·2a
    inp = page.locator('.guide__input').first
    inp.fill('2b=√7·2a，所以 b/a=√7')
    page.locator('.guide__composer .ms-btn--primary').first.click()
    page.wait_for_timeout(700)
    shot(page, '05-guide-turn2.png')
    body = page.inner_text('body')
    print('AFTER_ANSWER_HAS_C2EQ', 'c^2' in body or 'c²' in body or '双曲线是' in body)

    # 第二轮：c²=a²+b²
    inp = page.locator('.guide__input').first
    inp.fill('c²=a²+b²')
    page.locator('.guide__composer .ms-btn--primary').first.click()
    page.wait_for_timeout(700)
    shot(page, '06-guide-turn3.png')

    # 第三轮：8
    inp = page.locator('.guide__input').first
    inp.fill('8')
    page.locator('.guide__composer .ms-btn--primary').first.click()
    page.wait_for_timeout(700)
    shot(page, '07-guide-choice.png')

    # 第四轮：选择 D
    page.locator('.guide__choice', has_text='2√2').first.click()
    page.wait_for_timeout(200)
    page.locator('.guide__composer .ms-btn--primary').first.click()
    page.wait_for_timeout(800)
    shot(page, '08-guide-final.png')
    body = page.inner_text('body')
    print('FINISHED', '已完成本题' in body)

    # 刷新恢复
    page.reload(wait_until='load')
    page.wait_for_timeout(800)
    shot(page, '09-after-refresh.png')
    body = page.inner_text('body')
    print('REFRESH_KEEPS_FINAL', '已完成本题' in body)

    # 错误文件分支
    page.goto(url + '#/student/guide/B', wait_until='load')
    page.wait_for_timeout(500)
    page.locator('input[type=file]').set_input_files(img)  # 题1 传给 B
    page.wait_for_timeout(600)
    shot(page, '10-wrong-file.png')
    body = page.inner_text('body')
    print('WRONG_FILE_MSG', '不匹配' in body)

    print('NET_LOG_LEN', page.evaluate('window.__MATHSIS_NET_LOG__ ? window.__MATHSIS_NET_LOG__.length : -1'))
    print('ERRORS', json.dumps(errors[:10], ensure_ascii=False))
    browser.close()
