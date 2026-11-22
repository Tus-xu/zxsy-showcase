# -*- coding: utf-8 -*-
"""交互选择器探测（离线）：学生侧栏练题 / 教师继续备课 / 科研进入工作台按钮。"""
import os
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright  # noqa: E402

ROOT = r'D:\zxsy-math-arena-showcase'
OFF = 'file:///' + os.path.join(ROOT, 'release', '开始演示.html').replace('\\', '/')

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    for role, phone in (('student', '13800001001'), ('teacher', '13800001002'), ('researcher', '13800001003')):
        ctx = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, offline=True)
        page = ctx.new_page()
        page.goto(OFF, wait_until='load'); page.wait_for_timeout(1400)
        page.select_option('#preferred-role', role); page.fill('#auth-phone', phone)
        page.get_by_role('button', name='获取验证码').click(); page.wait_for_timeout(800)
        page.get_by_placeholder('6 位验证码').fill('246810')
        page.get_by_role('button', name='安全登录').click(); page.wait_for_timeout(2600)
        if role == 'student':
            page.wait_for_timeout(2000)
            print('SIDEBAR LINKS', page.evaluate("""() => [...document.querySelectorAll('aside.sidebar a, aside.sidebar [role=link], aside.sidebar .sb-item, aside.sidebar button')].map(e => ({tag:e.tagName, cls:(e.className||'').toString().slice(0,40), t:(e.innerText||'').replace(/\\s+/g,' ').slice(0,20), href:e.getAttribute('href')||''})).slice(0,20)"""))
        elif role == 'teacher':
            page.evaluate("() => { location.hash = '#/teacher-v3/prep' }")
            page.wait_for_timeout(3200)
            print('CONTINUE', page.evaluate("""() => [...document.querySelectorAll('button, a')].filter(e => (e.innerText||'').includes('继续备课')).map(e => ({tag:e.tagName, cls:(e.className||'').toString().slice(0,50), t:(e.innerText||'').replace(/\\s+/g,' ').slice(0,40)}))"""))
            print('ENTRY', page.evaluate("""() => [...document.querySelectorAll('.pc-home__entry, .pc-home__entry-name')].map(e => (e.innerText||'').replace(/\\s+/g,' ').slice(0,30))"""))
        else:
            page.wait_for_timeout(2200)
            print('CTA', page.evaluate("""() => [...document.querySelectorAll('a, button')].filter(e => (e.innerText||'').includes('科研工作台') || (e.className||'').toString().includes('rl-cta')).map(e => ({tag:e.tagName, cls:(e.className||'').toString().slice(0,60), t:(e.innerText||'').replace(/\\s+/g,' ').slice(0,30)}))"""))
        ctx.close()
    b.close()