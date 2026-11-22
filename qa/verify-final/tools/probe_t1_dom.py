# -*- coding: utf-8 -*-
"""离线样板一：逐轮交互 DOM 探测（卡片输入控件/兜底按钮）。"""
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright  # noqa: E402

ROOT = r'D:\zxsy-math-arena-showcase'
OFF = 'file:///' + os.path.join(ROOT, 'release', '开始演示.html').replace('\\', '/')
OUT = os.path.join(ROOT, 'qa', 'verify-final', 'tools')
PLANS = r'D:\zxsy-math-arena\docs\superpowers\plans'
IMG = os.path.join(PLANS, '题1.png')
PROBE = r"""() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 && getComputedStyle(el).visibility !== 'hidden'; };
  const txt = (el) => (el.innerText || '').replace(/\s+/g, ' ').trim();
  const counts = {};
  for (const s of ['.ix-ei-input', '.ix-submit', '.ix-opt', '.ix-panel', '.si-input', '.si-fallback input', '.si-send',
                   '.ci-ta', '.ci-send', '.att-card.ready']) counts[s] = [...document.querySelectorAll(s)].filter(vis).length;
  const btns = [...document.querySelectorAll('button')].filter(vis).map(b => ({t: txt(b).slice(0, 24), d: !!b.disabled, cls: (b.className||'').toString().slice(0,40)})).filter(b => b.t);
  const ai = [...document.querySelectorAll('.msg-row.ai .ai-bubble')];
  const last = ai.length ? txt(ai[ai.length - 1]).slice(0, 260) : '';
  return {counts, btns: btns.slice(0, 30), ai_rows: ai.length, last_ai: last,
          body: (document.body.innerText || '').slice(-800)};
}"""


def wait_ai(page, prev, timeout=60000):
    for _ in range(int(timeout / 500)):
        n = page.locator('.msg-row.ai').count()
        if n > prev and page.locator('button.ci-stop').count() == 0:
            page.wait_for_timeout(1200)
            return n
        page.wait_for_timeout(500)
    return page.locator('.msg-row.ai').count()


def dump(tag, page):
    p = page.evaluate(PROBE)
    print('=== %s === ai_rows=%s' % (tag, p['ai_rows']))
    print('counts', p['counts'])
    print('btns', json.dumps(p['btns'], ensure_ascii=False)[:1500])
    print('last_ai', p['last_ai'][:200])
    page.screenshot(path=os.path.join(OUT, f'insp-{tag}.png'))
    return p


with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, offline=True)
    page = ctx.new_page()
    page.goto(OFF, wait_until='load'); page.wait_for_timeout(1500)
    page.select_option('#preferred-role', 'student'); page.fill('#auth-phone', '13800001001')
    page.get_by_role('button', name='获取验证码').click(); page.wait_for_timeout(900)
    page.get_by_placeholder('6 位验证码').fill('246810')
    page.get_by_role('button', name='安全登录').click(); page.wait_for_timeout(2600)
    dump('after-login', page)
    if not page.locator('.he-card').count():
        if page.locator('button.sb-new').count():
            page.locator('button.sb-new').first.click(); page.wait_for_timeout(2600)
        dump('after-new', page)
    # upload
    try:
        with page.expect_file_chooser(timeout=15000) as fc:
            page.locator('.he-card', has_text='拍一道不会的题').first.click()
        fc.value.set_files(IMG)
    except Exception:
        with page.expect_file_chooser(timeout=15000) as fc:
            page.locator("button[title='拍照识题']").first.click()
        fc.value.set_files(IMG)
    for _ in range(60):
        if page.locator('.att-card.ready').count():
            break
        page.wait_for_timeout(500)
    page.wait_for_timeout(800)
    dump('after-upload', page)
    prev = page.locator('.msg-row.ai').count()
    page.locator('button.ci-send').first.click()
    wait_ai(page, prev)
    dump('turn0', page)
    turns = json.load(open(os.path.join(ROOT, 'evidence/live/run-02/student/api/flow-A.json'), encoding='utf-8'))['turns']
    for i in range(1, 6):
        t = turns[i]
        txt = (t.get('input') or '').strip()
        prev = page.locator('.msg-row.ai').count()
        how = None
        if page.locator('.ix-ei-input').count():
            try:
                page.locator('.ix-ei-input').first.fill(txt.replace('[式子]', '').strip())
                page.wait_for_timeout(300)
                page.locator('.ix-submit:enabled').first.click(timeout=5000)
                how = 'ix-panel'
            except Exception as e:
                how = 'ix-fail:' + repr(e)[:80]
        if not how:
            for sel in ('.si-fallback input', '.si-input'):
                if page.locator(sel).count():
                    page.locator(sel).first.fill(txt)
                    page.locator('button.si-send:enabled, .si-send:enabled').first.click(timeout=5000)
                    how = 'si:' + sel
                    break
        if not how:
            page.locator('textarea.ci-ta').first.fill(txt)
            page.wait_for_timeout(300)
            page.locator('button.ci-send').first.click(timeout=5000)
            how = 'composer'
        wait_ai(page, prev)
        p2 = dump(f'turn{i}', page)
        print('how', how, 'input', txt[:40])
    ctx.close(); b.close()