# -*- coding: utf-8 -*-
"""根因探针（离线）：教师工作台「重试」→ POST /actions 返回了什么？为何崩溃？"""
import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright  # noqa: E402

ROOT = r'D:\zxsy-math-arena-showcase'
OFF = 'file:///' + os.path.join(ROOT, 'release', '开始演示.html').replace('\\', '/')
OUT = os.path.join(ROOT, 'qa', 'verify-final', 'tools')
SESSION = 'f5c84551-18a7-454d-b49c-8f115e816299'
ACT = f'/api/teacher-v3/prep/conversations/{SESSION}/actions'


def login(p):
    p.goto(OFF, wait_until='load', timeout=60000)
    p.wait_for_timeout(1600)
    p.select_option('#preferred-role', 'teacher')
    p.fill('#auth-phone', '13800001002')
    p.get_by_role('button', name='获取验证码').click()
    p.wait_for_timeout(900)
    p.get_by_placeholder('6 位验证码').fill('246810')
    p.get_by_role('button', name='安全登录').click()
    p.wait_for_timeout(2600)


with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, offline=True)
    page = ctx.new_page()
    errs, reqs, cons = [], [], []
    page.on('pageerror', lambda e: errs.append(str(e)[:400]))
    page.on('console', lambda m: cons.append(m.text[:400]) if m.type == 'error' else None)
    page.on('request', lambda r: reqs.append(r.url) if r.url.startswith(('http://', 'https://', 'ws://')) else None)
    login(page)
    page.goto('about:blank')
    page.goto(OFF + '#/teacher-v3/prep/w/' + SESSION + '/classroom', wait_until='load', timeout=60000)
    page.wait_for_timeout(4500)
    print('URL', page.url)
    print('banner', '本轮生成没有完成' in page.inner_text('body'))
    # 直接调用 fetch 观察回放层返回
    res = page.evaluate("""async (act) => {
      const r = await fetch(act, {method: 'POST', headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
        body: JSON.stringify({action: 'retry_run', target: '29a20efc-7011-47c6-ba01-c802ea42f418'})});
      const t = await r.text();
      return {status: r.status, body: t.slice(0, 600)};
    }""", ACT)
    print('DIRECT_FETCH', json.dumps(res, ensure_ascii=False))
    page.reload(wait_until='load')
    page.wait_for_timeout(4000)
    # UI 点击重试
    btn = page.locator('button.pc-actions__btn', has_text='重试')
    print('retry buttons', btn.count())
    hook = []
    page.evaluate("""() => {
      window.__vf_hook = [];
      const orig = window.fetch.bind(window);
      window.fetch = async function (input, init) {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        const res = await orig(input, init);
        if (String(url).includes('/actions')) {
          const rec = {url: String(url), status: res.status, body: null};
          try { rec.body = (await res.clone().text()).slice(0, 600); } catch (e) {}
          window.__vf_hook.push(rec);
        }
        return res;
      };
    }""")
    before = page.inner_text('body')
    if btn.count():
        btn.first.click()
        page.wait_for_timeout(4000)
    after = page.inner_text('body')
    print('HOOK', json.dumps(page.evaluate('() => window.__vf_hook'), ensure_ascii=False))
    print('ERROR_BOUNDARY', '教师页面加载出现异常' in after)
    print('markers', [m for m in ('不可执行', '无法重跑', '离线演示未收录', '教师页面加载出现异常', '没有上下文快照') if m in after])
    print('console_errors', json.dumps(cons[:6], ensure_ascii=False))
    print('pageerrors', json.dumps(errs[:4], ensure_ascii=False))
    print('http_requests', len(reqs))
    page.screenshot(path=os.path.join(OUT, 'probe-off-retry-crash.png'))
    # 沉浸式 surface 的「重试」快动作
    page.goto('about:blank')
    page.goto(OFF + '#/teacher-v3/prep-immersive/' + SESSION, wait_until='load', timeout=60000)
    page.wait_for_timeout(4200)
    qa = page.locator('button[data-testid=prep-quick-action]', has_text='重试')
    print('immersive retry count', qa.count())
    if qa.count():
        qa.first.click()
        page.wait_for_timeout(4000)
    after2 = page.inner_text('body')
    print('IMMERSIVE_AFTER', '教师页面加载出现异常' in after2, [m for m in ('不可执行', '无法重跑', '离线演示未收录', '教师页面加载出现异常') if m in after2])
    print('IMMERSIVE_SNIPPET', after2[-400:].replace('\n', ' | '))
    page.screenshot(path=os.path.join(OUT, 'probe-off-retry-immersive.png'))
    ctx.close(); b.close()