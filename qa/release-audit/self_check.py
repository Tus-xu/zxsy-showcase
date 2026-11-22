# -*- coding: utf-8 -*-
"""发行包交互自检：刷新恢复、返回、主持人入口、嘉宾界面无浮标、无自造内容。"""
import json
import os
import re

from playwright.sync_api import sync_playwright

ROOT = r'D:\zxsy-math-arena-showcase'
ENTRY = 'file:///' + os.path.join(ROOT, 'release', '开始演示.html').replace('\\', '/')
OUT = os.path.join(ROOT, 'qa', 'release-audit')
PLANS = r'D:\zxsy-math-arena\docs\superpowers\plans'
res = {}


def login(page, role, phone):
    page.select_option('#preferred-role', role)
    page.fill('#auth-phone', phone)
    page.get_by_role('button', name='获取验证码').click()
    page.wait_for_timeout(800)
    page.get_by_placeholder('6 位验证码').fill('246810')
    page.get_by_role('button', name='安全登录').click()
    page.wait_for_timeout(2000)


with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, offline=True)
    page = ctx.new_page()
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)[:150]))
    page.goto(ENTRY, wait_until='load')
    page.wait_for_timeout(1500)

    # 1. 嘉宾界面无主持人浮标
    res['guest_no_host_fab'] = page.locator('.ms-host-fab, #host-console-fab, [title="主持人工具"]').count()

    login(page, 'student', '13800001001')
    res['student_home'] = page.url.split('#')[-1]
    # 2. 上传 + 首轮
    if page.locator('button.sb-new').count():
        page.locator('button.sb-new').first.click()
        page.wait_for_timeout(1200)
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
    page.locator('button.ci-send').first.click()
    for _ in range(80):
        if page.locator('.msg-row.ai').count() > 0 and page.locator('button.ci-stop').count() == 0:
            break
        page.wait_for_timeout(600)
    page.wait_for_timeout(1500)
    res['ai_before_reload'] = page.locator('.msg-row.ai').count()
    url_before = page.url
    # 3. 刷新恢复
    page.reload(wait_until='load')
    page.wait_for_timeout(3500)
    res['after_reload_url'] = page.url
    res['ai_after_reload'] = page.locator('.msg-row.ai').count()
    res['reload_same_conv'] = url_before.split('#')[-1].split('/')[:3] == page.url.split('#')[-1].split('/')[:3]
    page.screenshot(path=os.path.join(OUT, 'self-after-reload.png'))
    # 4. 写死的自造内容检索（可见文本）
    body = page.inner_text('body')
    fabricated = ['演示身份卡', '三题陈列卡', '内容匹配', 'SHA-256', '已发布 · 版本 v1', '发布成功', '验收矩阵']
    res['fabricated_hits'] = [x for x in fabricated if x in body]
    # 5. 主持人工具：快捷键
    page.keyboard.press('Control+Shift+H')
    page.wait_for_timeout(800)
    res['host_panel_opened'] = page.locator('text=主持人工具').count() > 0
    page.screenshot(path=os.path.join(OUT, 'self-host-panel.png'))
    page.keyboard.press('Escape')
    page.wait_for_timeout(400)

    # 6. 教师：工作台阻塞态 + 刷新
    ctx2 = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, offline=True)
    tp = ctx2.new_page()
    tp.goto(ENTRY, wait_until='load')
    tp.wait_for_timeout(1500)
    login(tp, 'teacher', '13800001002')
    tp.evaluate("() => { location.hash = '#/teacher-v3/prep-immersive/f5c84551-18a7-454d-b49c-8f115e816299' }")
    tp.wait_for_timeout(5000)
    tbody = tp.inner_text('body')
    res['teacher_block'] = {
        'slides_zero': '幻灯片 0 / 0' in tbody or '0 / 0' in tbody,
        'export_disabled_text': '尚未生成课件，无法导出' in tbody,
        'publish_disabled': '先完成课件生成' in tbody or tp.locator('[data-testid="pc-deck-publish"][disabled], [data-testid="ov-publish"][disabled]').count() > 0,
    }
    tp.screenshot(path=os.path.join(OUT, 'self-teacher-block.png'))
    tp.reload(wait_until='load')
    tp.wait_for_timeout(4000)
    res['teacher_after_reload_ok'] = '我的备课' in tp.inner_text('body')
    res['page_errors'] = errs[:5]
    res['total_page_errors'] = len(errs)
    b.close()

with open(os.path.join(OUT, 'self-check.json'), 'w', encoding='utf-8') as f:
    json.dump(res, f, ensure_ascii=False, indent=1)
print(json.dumps(res, ensure_ascii=False, indent=1))