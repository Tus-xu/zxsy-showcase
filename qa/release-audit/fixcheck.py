# -*- coding: utf-8 -*-
"""B1/M1 修复复验：教师「重试」应得 409 文案且不崩溃；学生刷新后消息顺序与终态卡保留。"""
import json
import os
import re

from playwright.sync_api import sync_playwright

ROOT = r'D:\zxsy-math-arena-showcase'
ENTRY = 'file:///' + os.path.join(ROOT, 'release', '开始演示.html').replace('\\', '/')
PLANS = os.path.join(ROOT, 'app', 'src', 'assets', 'showcase')  # ti1.png；不回读原真实项目
SESSION = 'f5c84551-18a7-454d-b49c-8f115e816299'
out = {}


def login(page, role, phone):
    page.select_option('#preferred-role', role)
    page.fill('#auth-phone', phone)
    page.get_by_role('button', name='获取验证码').click()
    page.wait_for_timeout(800)
    page.get_by_placeholder('6 位验证码').fill('246810')
    page.get_by_role('button', name='安全登录').click()
    page.wait_for_timeout(2000)


with sync_playwright() as p:
    b = p.chromium.launch(headless=True, channel='chrome')

    # ── B1：教师重试 ──
    ctx = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, offline=True)
    page = ctx.new_page()
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)[:200]))
    page.goto(ENTRY, wait_until='load')
    page.wait_for_timeout(1500)
    login(page, 'teacher', '13800001002')
    page.evaluate("(r) => { location.hash = '#' + r }", f'/teacher-v3/prep-immersive/{SESSION}')
    page.wait_for_timeout(5000)
    before = page.inner_text('body')
    clicked = False
    try:
        btn = page.get_by_role('button', name='重试')
        if btn.count():
            btn.first.click(timeout=8000)
            clicked = True
    except Exception as e:
        out['retry_click_err'] = repr(e)[:150]
    page.wait_for_timeout(4000)
    after = page.inner_text('body')
    out['retry'] = {
        'clicked': clicked,
        'has_409_message': '不可执行' in after,
        'has_crash': 'ErrorBoundary' in after or 'Cannot read properties' in after,
        'page_errors': errs[:3],
        'still_workbench': '我的备课' in after,
        'same_text_len': len(after) - len(before),
    }
    page.screenshot(path=os.path.join(ROOT, 'qa', 'release-audit', 'retry-offline.png'))
    ctx.close()

    # ── M1：学生刷新 ──
    ctx2 = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, offline=True)
    page = ctx2.new_page()
    errs2 = []
    page.on('pageerror', lambda e: errs2.append(str(e)[:200]))
    page.goto(ENTRY, wait_until='load')
    page.wait_for_timeout(1500)
    login(page, 'student', '13800001001')
    if page.locator('button.sb-new').count():
        page.locator('button.sb-new').first.click()
        page.wait_for_timeout(1500)
    try:
        with page.expect_file_chooser(timeout=8000) as fc:
            page.locator('.he-card', has_text='拍一道不会的题').first.click()
        fc.value.set_files(os.path.join(PLANS, 'ti1.png'))
    except Exception:
        page.locator('input[type=file]').first.set_input_files(os.path.join(PLANS, 'ti1.png'))
    for _ in range(60):
        if page.locator('.att-card.ready').count():
            break
        page.wait_for_timeout(500)
    page.locator('button.ci-send').first.click()
    for _ in range(90):
        if page.locator('.msg-row.ai').count() > 0 and page.locator('button.ci-stop').count() == 0:
            break
        page.wait_for_timeout(600)
    page.wait_for_timeout(1200)
    pre = page.evaluate("""() => {
      const rows = Array.from(document.querySelectorAll('.msg-row'));
      return { count: rows.length, roles: rows.map(r => r.className.includes('ai') ? 'ai' : 'user').slice(0,6),
               firstBubble: (document.querySelector('.msg-row .bubble, .msg-row .ai-bubble, .msg-row .user-bubble')||{}).innerText?.slice(0,40) || '' };
    }""")
    page.reload(wait_until='load')
    page.wait_for_timeout(3500)
    post = page.evaluate("""() => {
      const rows = Array.from(document.querySelectorAll('.msg-row'));
      const firstUser = document.querySelector('.msg-row.user');
      const att = document.querySelector('.att-card, [class*=attachment]');
      return { count: rows.length, roles: rows.map(r => r.className.includes('ai') ? 'ai' : 'user').slice(0,6),
               firstRowText: (rows[0]?.innerText || '').slice(0, 60),
               hasAttachmentLost: (document.body.innerText||'').includes('附件已丢失'),
               hasRemediation: (document.body.innerText||'').includes('前置缺口') || (document.body.innerText||'').includes('先补 5 分钟') };
    }""")
    out['refresh'] = {'pre': pre, 'post': post, 'page_errors': errs2[:3]}
    page.screenshot(path=os.path.join(ROOT, 'qa', 'release-audit', 'refresh-after.png'))
    ctx2.close()
    b.close()

with open(os.path.join(ROOT, 'qa', 'release-audit', 'fixcheck.json'), 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print(json.dumps(out, ensure_ascii=False, indent=1))