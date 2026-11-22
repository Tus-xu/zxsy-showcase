# -*- coding: utf-8 -*-
"""主持人口径核查（离线）：默认无浮标；Ctrl+Shift+H 可开；登录页有无可见入口。"""
import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright  # noqa: E402

ROOT = r'D:\zxsy-math-arena-showcase'
OFF = 'file:///' + os.path.join(ROOT, 'release', '开始演示.html').replace('\\', '/')
OUT = os.path.join(ROOT, 'qa', 'verify-final', 'shots')

with sync_playwright() as pw:
    b = pw.chromium.launch(headless=True)
    ctx = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, offline=True)
    p = ctx.new_page()
    p.goto(OFF, wait_until='load', timeout=60000)
    p.wait_for_timeout(2600)
    rec = {}
    rec['login_visible_host_text'] = ('主持人' in p.inner_text('body'))
    rec['msh_exists'] = p.locator('.msh').count()
    rec['msh_display'] = p.eval_on_selector('.msh', "el => getComputedStyle(el).display") if p.locator('.msh').count() else None
    rec['msh_on'] = p.locator('.msh.on').count()
    rec['login_visible_text'] = p.inner_text('body')[:800]
    p.screenshot(path=os.path.join(OUT, 'off-host-default.png'))
    # 快捷键
    p.keyboard.press('Control+Shift+H')
    p.wait_for_timeout(700)
    rec['after_shortcut_msh_on'] = p.locator('.msh.on').count()
    rec['after_shortcut_text'] = p.locator('.msh').inner_text()[:400] if p.locator('.msh').count() else ''
    p.screenshot(path=os.path.join(OUT, 'off-host-open.png'))
    # Esc 关闭
    p.keyboard.press('Escape')
    p.wait_for_timeout(500)
    rec['after_esc_msh_on'] = p.locator('.msh.on').count()
    # 登录页底部是否含入口元素（按文本）
    rec['entry_like'] = p.evaluate("""() => [...document.querySelectorAll('button, a')].filter(e => /主持人/.test(e.innerText||'')).map(e => ({t:(e.innerText||'').trim(), cls:(e.className||'').toString()}))""")
    ctx.close(); b.close()
with open(os.path.join(ROOT, 'qa', 'verify-final', 'host_check.json'), 'w', encoding='utf-8') as f:
    json.dump(rec, f, ensure_ascii=False, indent=1)
print(json.dumps(rec, ensure_ascii=False)[:1200])