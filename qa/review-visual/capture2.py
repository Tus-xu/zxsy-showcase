# -*- coding: utf-8 -*-
"""补齐：引导 A 主线结论、教师发布弹层、练习交互状态。"""
import json
import os
import traceback

from playwright.sync_api import sync_playwright

URL = 'file:///D:/zxsy-math-arena-showcase/release/index.html'
OUT = r'D:\zxsy-math-arena-showcase\qa\review-visual\shots'
Q = {'A': r'D:\zxsy-math-arena\docs\superpowers\plans\题1.png'}

issues = []


def shot(page, name, full=False):
    page.mouse.move(3, 3)
    page.wait_for_timeout(260)
    page.evaluate('() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur() }')
    page.wait_for_timeout(60)
    page.screenshot(path=os.path.join(OUT, name + '.png'), full_page=full)


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, locale='zh-CN', timezone_id='Asia/Shanghai')
    page = ctx.new_page()
    page.goto(URL, wait_until='load'); page.wait_for_timeout(1200)
    page.evaluate('() => localStorage.clear()'); page.reload(wait_until='load'); page.wait_for_timeout(1300)

    # ---- 引导 A 主线到结论（按主持人手册输入） ----
    page.locator('.ms-role').nth(0).click(); page.wait_for_timeout(900)
    page.evaluate("() => { location.hash = '#/student/guide/A' }"); page.wait_for_timeout(900)
    try:
        page.set_input_files('input[type=file]', Q['A']); page.wait_for_timeout(1200)
        page.fill('.guide__input', '2b=√7·2a，所以 b/a=√7'); page.keyboard.press('Enter'); page.wait_for_timeout(700)
        page.fill('.guide__input', 'c²=a²+b²'); page.keyboard.press('Enter'); page.wait_for_timeout(700)
        shot(page, 'S04b-guide-A-before-choice')
        page.fill('.guide__input', '8'); page.keyboard.press('Enter'); page.wait_for_timeout(700)
        shot(page, 'S04c-guide-A-choice')
        page.locator('.guide__choices .guide__choice').nth(3).click(); page.wait_for_timeout(300)
        page.locator('.guide__choices .ms-btn--primary').click(); page.wait_for_timeout(1300)
        shot(page, 'S05-guide-A-final')
        # 变式面板
        try:
            page.locator('button:has-text("举一反三")').first.click(); page.wait_for_timeout(900)
            shot(page, 'S05b-guide-A-variant')
        except Exception:
            issues.append('A variant: ' + traceback.format_exc()[-300:])
    except Exception:
        issues.append('guide A: ' + traceback.format_exc()[-1200:])

    # ---- 教师：发布弹层 ----
    page.evaluate("() => { location.hash = '#/login' }"); page.wait_for_timeout(600)
    page.locator('.ms-role').nth(1).click(); page.wait_for_timeout(900)
    page.evaluate("() => { location.hash = '#/teacher/prep/w/prep-ellipse/ppt' }"); page.wait_for_timeout(1600)
    try:
        page.mouse.move(3, 3); page.wait_for_timeout(200)
        page.locator('[data-testid="publish-open"]').click(); page.wait_for_timeout(1000)
        shot(page, 'T07-publish-dialog')
        # 发布确认按钮状态
        txt = page.locator('body').inner_text()
        print('publish dialog words:', len(txt), txt.count('发布'))
    except Exception:
        issues.append('publish: ' + traceback.format_exc()[-800:])
    # 关闭弹层
    try:
        page.keyboard.press('Escape'); page.wait_for_timeout(500)
    except Exception:
        pass

    # ---- 学生：练习交互 ----
    page.evaluate("() => { location.hash = '#/login' }"); page.wait_for_timeout(600)
    page.locator('.ms-role').nth(0).click(); page.wait_for_timeout(800)
    page.evaluate("() => { location.hash = '#/student/practice' }"); page.wait_for_timeout(1400)
    try:
        shot(page, 'S10-practice-again')
        items = page.locator('[data-qa^="practice-item-"]')
        print('practice items:', items.count())
        if items.count() > 1:
            items.nth(1).click(); page.wait_for_timeout(800)
            shot(page, 'S11-practice-item2')
            opts = page.locator('[data-qa^="practice-option-"]')
            print('options:', opts.count())
            if opts.count():
                opts.first.click(); page.wait_for_timeout(400)
                page.locator('[data-qa="practice-submit"]').click(); page.wait_for_timeout(1000)
                shot(page, 'S12-practice-feedback2')
    except Exception:
        issues.append('practice: ' + traceback.format_exc()[-600:])

    b.close()

print('issues:', json.dumps(issues, ensure_ascii=False)[:1500])
