# -*- coding: utf-8 -*-
"""离线根因：学生「＋新对话」触发的 POST /api/agent/conversations 回放返回了什么。"""
import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright  # noqa: E402

ROOT = r'D:\zxsy-math-arena-showcase'
OFF = 'file:///' + os.path.join(ROOT, 'release', '开始演示.html').replace('\\', '/')
OUT = os.path.join(ROOT, 'qa', 'verify-final', 'tools')

with sync_playwright() as pw:
    b = pw.chromium.launch(headless=True)
    ctx = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, offline=True)
    p = ctx.new_page()
    p.goto(OFF, wait_until='load', timeout=60000); p.wait_for_timeout(1500)
    p.select_option('#preferred-role', 'student'); p.fill('#auth-phone', '13800001001')
    p.get_by_role('button', name='获取验证码').click(); p.wait_for_timeout(900)
    p.get_by_placeholder('6 位验证码').fill('246810')
    p.get_by_role('button', name='安全登录').click(); p.wait_for_timeout(2800)
    p.evaluate("""() => {
      window.__vf = [];
      const orig = window.fetch.bind(window);
      window.fetch = async function (input, init) {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        const method = String((init && init.method) || 'GET').toUpperCase();
        const res = await orig(input, init);
        if (String(url).includes('/api/agent/conversations') && method === 'POST') {
          let body = null; try { body = (await res.clone().text()).slice(0, 400); } catch (e) {}
          window.__vf.push({url: String(url), status: res.status, body});
        }
        return res;
      };
    }""")
    p.wait_for_timeout(800)
    # 直接调用（复现回放层返回）
    direct = p.evaluate("""async () => {
      const r = await fetch('/api/agent/conversations', {method: 'POST', headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
        body: JSON.stringify({title: '新对话', workspace: 'student'})});
      return {status: r.status, body: (await r.text()).slice(0, 500)};
    }""")
    print('DIRECT_NEW_CONV', json.dumps(direct, ensure_ascii=False))
    p.locator('button.sb-new').first.click()
    p.wait_for_timeout(2800)
    print('HOOK_NEW_CONV', json.dumps(p.evaluate('() => window.__vf'), ensure_ascii=False))
    print('URL_AFTER', p.url)
    print('AI_ROWS', p.locator('.msg-row.ai').count())
    p.screenshot(path=os.path.join(OUT, 'probe-off-newchat.png'))
    ctx.close(); b.close()