# -*- coding: utf-8 -*-
"""离线端经课堂→双师课堂→老师课件卡片进入, 验证顶部老师/班级 badge 与 URL。"""
import json
import os
import re

from playwright.sync_api import sync_playwright

WT = r'D:\zxsy-math-arena-showcase-student'
OUT = os.path.join(WT, 'qa', 'student-showcase', 'vqa', 'offline')
ENTRY = 'file:///' + os.path.join(WT, 'app', 'dist-offline', 'index.html').replace('\\', '/')

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=1,
                        offline=True, locale='zh-CN')
    page = ctx.new_page()
    page.goto(ENTRY, wait_until='load', timeout=30000)
    page.wait_for_timeout(1500)
    page.select_option('#preferred-role', 'student')
    page.fill('#auth-phone', '13800001001')
    page.get_by_role('button', name='获取验证码').click()
    page.wait_for_timeout(800)
    page.get_by_placeholder('6 位验证码').fill('246810')
    page.get_by_role('button', name='安全登录').click()
    page.wait_for_selector('header.topbar', timeout=20000)
    page.wait_for_timeout(2000)

    page.evaluate("() => { location.hash = '#/classroom?tab=dual' }")
    page.wait_for_timeout(3000)
    cards = page.locator('article.tc-card')
    print('tc-cards:', cards.count())
    if cards.count():
        print('card text:', cards.first.inner_text().replace('\n', ' | ')[:300])
        cards.first.click()
        page.wait_for_timeout(4500)
        print('url:', page.url)
        page.screenshot(path=os.path.join(OUT, 'p07-dual-via-classroom.png'))
        body = page.inner_text('body')
        print('badge present(张老师):', '张老师' in body, '| 高一(3)班:', '高一(3)班' in body)
        print('header snippet:', body[:400].replace('\n', ' | '))
    b.close()