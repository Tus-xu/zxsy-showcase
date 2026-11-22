# -*- coding: utf-8 -*-
"""离线样板一验证：现役学生入口上传题图 → 回放采证 SSE → 助手回复。

file:// 断网，检查：上传卡片就绪、回复文本与采证一致、0 http 请求。
"""
import json
import os
import sys

from playwright.sync_api import sync_playwright

ROOT = r'D:\zxsy-math-arena-showcase'
ENTRY = 'file:///' + os.path.join(ROOT, 'app', 'dist-offline', 'index.html').replace('\\', '/')
SHOTS = os.path.join(ROOT, 'qa', 'parity-r02', 'shots')
os.makedirs(SHOTS, exist_ok=True)
IMAGES = {'A': '题1.png', 'B': '题2.png', 'C': '题3.png'}
PLANS = r'D:\zxsy-math-arena\docs\superpowers\plans'


def expect_text(flows, case):
    """从采证 SSE 里取首轮 assistant 文本片段，用于断言『离线回放的就是采证内容』。"""
    path = os.path.join(ROOT, 'app', 'src', 'offline', 'fixtures', 'student', f'flow-{case}.json')
    if not os.path.exists(path):
        return None
    flow = json.load(open(path, encoding='utf-8'))
    turns = flow.get('turns') or []
    if not turns:
        return None
    raw = turns[0].get('sse') or ''
    txt = []
    for block in raw.split('\n\n'):
        for line in block.split('\n'):
            if line.startswith('event: token'):
                pass
            elif line.startswith('data:') and '"text"' in line:
                try:
                    txt.append(json.loads(line[5:].strip()).get('text') or '')
                except Exception:
                    pass
    s = ''.join(txt)
    return s[:40] if s else None


with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    for case in ('A',):
        ctx = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, offline=True)
        page = ctx.new_page()
        reqs, errs = [], []
        page.on('request', lambda r: reqs.append(r.url) if r.url.startswith(('http://', 'https://', 'ws://')) else None)
        page.on('pageerror', lambda e: errs.append(str(e)[:200]))
        page.goto(ENTRY, wait_until='load')
        page.wait_for_timeout(2000)
        # 登录（离线验证码固定 246810）
        page.select_option('#preferred-role', 'student')
        page.fill('#auth-phone', '13800001001')
        page.get_by_role('button', name='获取验证码').click()
        page.wait_for_timeout(1000)
        page.get_by_placeholder('6 位验证码').fill('246810')
        page.get_by_role('button', name='安全登录').click()
        page.wait_for_timeout(2200)
        print('after login:', page.url.split('#')[-1])
        # 新对话
        if page.locator('button.sb-new').count():
            page.locator('button.sb-new').first.click()
            page.wait_for_timeout(1500)
        # 上传
        img = os.path.join(PLANS, IMAGES[case])
        used = None
        chooser = None
        try:
            if page.locator('.he-card', has_text='拍一道不会的题').count():
                ctrl = page.locator('.he-card', has_text='拍一道不会的题').first
                used = 'he-card'
            else:
                ctrl = page.locator("button[title='拍照识题']").first
                used = 'camera'
            with page.expect_file_chooser(timeout=8000) as fc:
                ctrl.click()
            chooser = fc.value
        except Exception as e:
            used = 'fallback-input'
        if chooser:
            chooser.set_files(img)
        else:
            page.locator('input[type=file]').first.set_input_files(img)
        for _ in range(60):
            if page.locator('.att-card.ready').count() or page.locator('.att-card.failed').count():
                break
            page.wait_for_timeout(500)
        page.wait_for_timeout(800)
        print('entry:', used, 'att ready:', page.locator('.att-card.ready').count(), 'failed:', page.locator('.att-card.failed').count())
        page.screenshot(path=os.path.join(SHOTS, 'off-template1-uploaded.png'))
        # 发送
        page.locator('button.ci-send').first.click()
        n0 = page.locator('.msg-row.ai').count()
        for _ in range(60):
            if page.locator('.msg-row.ai').count() > n0 and page.locator('button.ci-stop').count() == 0:
                break
            page.wait_for_timeout(700)
        page.wait_for_timeout(1500)
        reply = ''
        loc = page.locator('.msg-row.ai .ai-bubble')
        if loc.count():
            reply = loc.nth(loc.count() - 1).inner_text()
        print('ai rows:', page.locator('.msg-row.ai').count())
        print('REPLY:', reply[:300].replace('\n', ' | '))
        exp = expect_text(None, case)
        print('EXPECT(from captured sse):', exp)
        print('HTTP_REQS:', len(reqs), 'PAGE_ERRORS:', len(errs), errs[:2])
        page.screenshot(path=os.path.join(SHOTS, 'off-template1-reply.png'))
        ctx.close()
    b.close()