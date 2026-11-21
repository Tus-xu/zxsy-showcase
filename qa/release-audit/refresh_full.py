# -*- coding: utf-8 -*-
"""M1 复验（完整版）：跑完 A 题 9 轮 → 刷新 → 校验消息顺序/轮数/终态卡。"""
import json
import os
import re

from playwright.sync_api import sync_playwright

ROOT = r'D:\zxsy-math-arena-showcase'
ENTRY = 'file:///' + os.path.join(ROOT, 'release', '开始演示.html').replace('\\', '/')
FIX = os.path.join(ROOT, 'app', 'src', 'offline', 'fixtures', 'student')
PLANS = r'D:\zxsy-math-arena\docs\superpowers\plans'
OUT = os.path.join(ROOT, 'qa', 'release-audit')

flow = json.load(open(os.path.join(FIX, 'flow-A.json'), encoding='utf-8'))
turns = flow['turns']


def log(msg):
    print(msg, flush=True)


with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, offline=True)
    page = ctx.new_page()
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)[:150]))
    page.goto(ENTRY, wait_until='load')
    page.wait_for_timeout(1500)
    page.select_option('#preferred-role', 'student')
    page.fill('#auth-phone', '13800001001')
    page.get_by_role('button', name='获取验证码').click()
    page.wait_for_timeout(800)
    page.get_by_placeholder('6 位验证码').fill('246810')
    page.get_by_role('button', name='安全登录').click()
    page.wait_for_timeout(2000)
    page.locator('button.sb-new').first.click()
    page.wait_for_timeout(1500)
    try:
        with page.expect_file_chooser(timeout=8000) as fc:
            page.locator('.he-card', has_text='拍一道不会的题').first.click()
        fc.value.set_files(os.path.join(PLANS, '题1.png'))
    except Exception:
        page.locator('input[type=file]').first.set_input_files(os.path.join(PLANS, '题1.png'))
    for _ in range(60):
        if page.locator('.att-card.ready').count():
            break
        page.wait_for_timeout(500)
    for i, turn in enumerate(turns):
        prev = page.locator('.msg-row.ai').count()
        if i == 0:
            page.locator('button.ci-send').first.click()
        else:
            expr = (turn.get('input') or '').replace('[式子]', '').strip()
            how = None
            if page.locator('.ix-ei-input').count():
                try:
                    page.locator('.ix-ei-input').first.fill(expr)
                    page.locator('.ix-submit:enabled').first.click()
                    how = 'ix'
                except Exception:
                    how = None
            if not how:
                for sel in ('.si-fallback input', '.si-input'):
                    if page.locator(sel).count():
                        page.locator(sel).first.fill(expr)
                        for btn in ('.si-fallback button.si-send:enabled', 'button.si-send:enabled'):
                            if page.locator(btn).count():
                                page.locator(btn).first.click()
                                how = 'si'
                                break
                        break
            if not how:
                page.locator('textarea.ci-ta').first.fill(expr)
                page.locator('button.ci-send').first.click()
        for _ in range(120):
            if page.locator('.msg-row.ai').count() > prev and page.locator('button.ci-stop').count() == 0:
                break
            page.wait_for_timeout(500)
        page.wait_for_timeout(900)
        log(f'turn {i} ai={page.locator(".msg-row.ai").count()}')
    before = page.evaluate("""() => {
      const rows = Array.from(document.querySelectorAll('.msg-row'));
      const txt = document.body.innerText || '';
      return { rows: rows.length, ai: rows.filter(r=>r.className.includes('ai')).length,
               hasRemediation: txt.includes('前置缺口') || txt.includes('先补 5 分钟'),
               tail: txt.slice(-140) };
    }""")
    page.reload(wait_until='load')
    page.wait_for_timeout(4000)
    after = page.evaluate("""() => {
      const rows = Array.from(document.querySelectorAll('.msg-row'));
      const txt = document.body.innerText || '';
      const roles = rows.map(r => r.className.includes('ai') ? 'ai' : 'user');
      return { rows: rows.length, ai: rows.filter(r=>r.className.includes('ai')).length,
               roles, firstRow: (rows[0]?.innerText||'').slice(0,50),
               lastRow: (rows[rows.length-1]?.innerText||'').slice(0,80),
               hasRemediation: txt.includes('前置缺口') || txt.includes('先补 5 分钟'),
               hasSendDisabled: !!document.querySelector('button.ci-send[disabled]') };
    }""")
    page.screenshot(path=os.path.join(OUT, 'refresh-full-after.png'))
    res = {'before': before, 'after': after, 'page_errors': errs[:3],
           'order_ok': after['roles'][:6] == ['user', 'ai', 'user', 'ai', 'user', 'ai']}
    with open(os.path.join(OUT, 'refresh-full.json'), 'w', encoding='utf-8') as f:
        json.dump(res, f, ensure_ascii=False, indent=1)
    log(json.dumps(res, ensure_ascii=False, indent=1))
    b.close()