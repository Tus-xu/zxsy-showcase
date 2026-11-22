# -*- coding: utf-8 -*-
"""补充现役核验：①学生「新对话」按钮行为；②科研 e49/read 项目概览是否加载慢（排除采集竞态）。"""
import json
import os
import sys
import time

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright  # noqa: E402

ROOT = r'D:\zxsy-math-arena-showcase'
LIVE = 'http://127.0.0.1:5176'
OUT = os.path.join(ROOT, 'qa', 'verify-final')
SHOTS = os.path.join(OUT, 'shots')
sys.path.insert(0, os.path.join(ROOT, '.work', 'scripts'))
from live_login import RESEARCH, STUDENT, login  # noqa: E402

VIEW = {'width': 1672, 'height': 941}
PROJ = 'e49b27e2-b05f-45c3-ac99-dd0792d9ab80'


def do_login(page, ident):
    last = None
    for attempt in range(3):
        try:
            login(page, ident)
            return
        except Exception as e:
            last = e
            print('  ! login retry', attempt, repr(e)[:100], flush=True)
            page.wait_for_timeout(65000)
    raise RuntimeError(repr(last))


with sync_playwright() as pw:
    b = pw.chromium.launch(headless=True)
    out = {}
    # ① 学生新对话
    ctx = b.new_context(viewport=VIEW, device_scale_factor=1)
    p = ctx.new_page()
    do_login(p, STUDENT)
    p.goto(LIVE + '/dialog', wait_until='load')
    p.wait_for_timeout(3200)
    rec = {'before_ai_rows': p.locator('.msg-row.ai').count(),
           'before_he_card': p.locator('.he-card').count(),
           'before_hero': p.locator('.hero-title').count()}
    p.locator('button.sb-new').first.click()
    p.wait_for_timeout(3200)
    rec['after_ai_rows'] = p.locator('.msg-row.ai').count()
    rec['after_he_card'] = p.locator('.he-card').count()
    rec['after_url'] = p.url
    rec['after_body_head'] = p.inner_text('body')[:400].replace('\n', ' | ')
    p.screenshot(path=os.path.join(SHOTS, 'live-new-chat-click.png'))
    out['student_new_chat'] = rec
    ctx.close()
    # ② 科研 read 概览加载竞态
    ctx = b.new_context(viewport=VIEW, device_scale_factor=1)
    p = ctx.new_page()
    do_login(p, RESEARCH)
    p.goto(LIVE + f'/research-workspace/{PROJ}/read', wait_until='load')
    samples = []
    for i in range(4):
        p.wait_for_timeout(5000)
        txt = p.inner_text('body')
        samples.append({'at_s': (i + 1) * 5,
                        'has_overview_sentence': '椭圆型偏微分方程有限元方法' in txt,
                        'empty_overview': '暂无项目数据' in txt,
                        'overview_text': (p.locator('.rw-ov, [class*=overview]').first.inner_text()[:300]
                                          if p.locator('.rw-ov, [class*=overview]').count() else ''),
                        'counts': [x for x in ('4\n文献', '1\n草稿', '2\n笔记') if x in txt]})
    out['research_read_overview'] = samples
    p.screenshot(path=os.path.join(SHOTS, 'live-read-overview-recheck.png'))
    ctx.close()
    b.close()
with open(os.path.join(OUT, 'live_extra.json'), 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print('NEW_CHAT', json.dumps(out['student_new_chat'], ensure_ascii=False)[:800])
print('READ_SAMPLES', json.dumps(out['research_read_overview'], ensure_ascii=False)[:1600])