# -*- coding: utf-8 -*-
"""DA5025 复核：未采证端点是否返回 404 信封（B1 修复的核心纪律）。"""
import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright  # noqa: E402

ROOT = r'D:\zxsy-math-arena-showcase'
OFF = 'file:///' + os.path.join(ROOT, 'release', '开始演示.html').replace('\\', '/')

with sync_playwright() as pw:
    b = pw.chromium.launch(headless=True)
    ctx = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, offline=True)
    p = ctx.new_page()
    p.goto(OFF, wait_until='load', timeout=60000)
    p.wait_for_timeout(1500)
    p.select_option('#preferred-role', 'teacher'); p.fill('#auth-phone', '13800001002')
    p.get_by_role('button', name='获取验证码').click(); p.wait_for_timeout(900)
    p.get_by_placeholder('6 位验证码').fill('246810')
    p.get_by_role('button', name='安全登录').click(); p.wait_for_timeout(2800)
    out = p.evaluate("""async () => {
      const cases = [
        ['POST', '/api/foo/bar', {}],
        ['POST', '/api/agent/conversations/xyz/actions', {action: 'retry_run'}],
        ['GET', '/api/nonexistent/path', null],
        ['POST', '/api/teacher-v3/prep/conversations/f5c84551-18a7-454d-b49c-8f115e816299/actions',
         {action: 'retry_run', target: 'x'}],
      ];
      const res = [];
      for (const [method, url, body] of cases) {
        const r = await fetch(url, {method, headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
          body: body ? JSON.stringify(body) : undefined});
        res.push({method, url, status: r.status, body: (await r.text()).slice(0, 240)});
      }
      return res;
    }""")
    print(json.dumps(out, ensure_ascii=False, indent=1))
    ctx.close(); b.close()