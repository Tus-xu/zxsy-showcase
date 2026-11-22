# -*- coding: utf-8 -*-
"""离线样板一验证：按采集组真机脚本逐轮回放 A/B/C 三题，比对离线渲染文本与采证 SSE 文本。

断言口径：把两侧文本都归一化为「仅中文/字母/数字」，取采证文本前 24 个字符做包含匹配。
产物：qa/parity-r02/template1/template1-<case>.json + 逐步截图
"""
import json
import os
import re
import sys

from playwright.sync_api import sync_playwright

ROOT = r'D:\zxsy-math-arena-showcase'
ENTRY = 'file:///' + os.path.join(ROOT, 'app', 'dist-offline', 'index.html').replace('\\', '/')
OUT = os.path.join(ROOT, 'qa', 'parity-r02', 'template1')
os.makedirs(OUT, exist_ok=True)
FIX = os.path.join(ROOT, 'app', 'src', 'offline', 'fixtures', 'student')
PLANS = r'D:\zxsy-math-arena\docs\superpowers\plans'
IMAGES = {'A': '题1.png', 'B': '题2.png', 'C': '题3.png'}


def norm(s):
    return re.sub(r'[^0-9A-Za-z\u4e00-\u9fff]', '', s or '')


def sse_text(raw):
    out = []
    for block in str(raw).split('\n\n'):
        m = re.match(r'event:\s*(\S+)\s*\ndata:\s*(.*)', block, re.S)
        if m and m.group(1) == 'token':
            try:
                out.append(json.loads(m.group(2).strip()).get('text') or '')
            except Exception:
                pass
    return ''.join(out)


def run_case(b, case):
    flow = json.load(open(os.path.join(FIX, f'flow-{case}.json'), encoding='utf-8'))
    turns = flow['turns']
    res = {'case': case, 'turns': len(turns), 'steps': [], 'terminal': {}, 'http': 0, 'errors': []}
    ctx = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, offline=True)
    page = ctx.new_page()
    reqs = []
    page.on('request', lambda r: reqs.append(r.url) if r.url.startswith(('http://', 'https://', 'ws://')) else None)
    page.on('pageerror', lambda e: res['errors'].append(str(e)[:150]))
    page.goto(ENTRY, wait_until='load')
    page.wait_for_timeout(1800)
    page.select_option('#preferred-role', 'student')
    page.fill('#auth-phone', '13800001001')
    page.get_by_role('button', name='获取验证码').click()
    page.wait_for_timeout(900)
    page.get_by_placeholder('6 位验证码').fill('246810')
    page.get_by_role('button', name='安全登录').click()
    page.wait_for_timeout(2000)
    if page.locator('button.sb-new').count():
        page.locator('button.sb-new').first.click()
        page.wait_for_timeout(1400)
    img = os.path.join(PLANS, IMAGES[case])
    try:
        with page.expect_file_chooser(timeout=8000) as fc:
            page.locator('.he-card', has_text='拍一道不会的题').first.click()
        fc.value.set_files(img)
    except Exception:
        page.locator('input[type=file]').first.set_input_files(img)
    for _ in range(60):
        if page.locator('.att-card.ready').count():
            break
        page.wait_for_timeout(500)
    page.wait_for_timeout(700)
    res['att_ready'] = page.locator('.att-card.ready').count()
    page.screenshot(path=os.path.join(OUT, f'{case}-01-uploaded.png'))

    for i, turn in enumerate(turns):
        prev = page.locator('.msg-row.ai').count()
        step = {'idx': i, 'input': (turn.get('input') or '')[:50], 'how': None}
        if i == 0:
            page.locator('button.ci-send').first.click()
            step['how'] = 'image-only-send'
        else:
            txt = (turn.get('input') or '').strip()
            expr = txt.replace('[式子]', '').strip()
            how = None
            if page.locator('.ix-ei-input').count():
                try:
                    page.locator('.ix-ei-input').first.fill(expr)
                    page.locator('.ix-submit:enabled').first.click()
                    how = 'ix-panel'
                except Exception:
                    how = None
            if not how:
                for sel in ('.si-fallback input', '.si-input'):
                    if page.locator(sel).count():
                        page.locator(sel).first.fill(expr)
                        for btn in ('.si-fallback button.si-send:enabled', 'button.si-send:enabled'):
                            if page.locator(btn).count():
                                page.locator(btn).first.click()
                                how = 'si-fallback'
                                break
                        break
            if not how:
                # 卡片「改用打字」切换为输入框模式（现役卡片自带的逃生口）
                try:
                    tog = page.get_by_role('button', name='改用打字')
                    if tog.count():
                        tog.first.click(timeout=3000)
                        page.wait_for_timeout(500)
                except Exception:
                    pass
                ta = page.locator('textarea.ci-ta').first
                ta.fill(expr)
                page.wait_for_timeout(300)
                send = page.locator('button.ci-send').first
                if send.is_disabled():
                    # 仍禁用：尝试卡片内提交按钮
                    clicked = False
                    for sel in ('.ix-submit:enabled', '.si-fallback button.si-send:enabled', 'button.si-send:enabled',
                                '.si-skip', 'button:has-text("填好了")', 'button:has-text("写好了")'):
                        locb = page.locator(sel)
                        if locb.count():
                            try:
                                locb.first.click(timeout=3000)
                                clicked = True
                                break
                            except Exception:
                                pass
                    how = 'card-button' if clicked else 'composer-disabled'
                    if not clicked:
                        # 通用兜底：点最后一条 AI 消息里第一个可用的提交类按钮
                        js = """() => {
                          const rows = Array.from(document.querySelectorAll('.msg-row.ai'));
                          const last = rows[rows.length - 1];
                          if (!last) return null;
                          const btns = Array.from(last.querySelectorAll('button:not([disabled])'));
                          const pri = ['填好了','写好了','提交','确认','就这样判断','说完了','完成','下一步'];
                          const hit = btns.find(b => pri.some(p => (b.innerText || '').includes(p)));
                          const target = hit || btns.find(b => !/重播|演示|拖动|提示|答案|思路/.test(b.innerText || ''));
                          if (!target) return null;
                          target.click();
                          return (target.innerText || '').trim().slice(0, 20);
                        }"""
                        picked = page.evaluate(js)
                        step['generic_pick'] = picked
                        how = 'generic:' + str(picked)
                else:
                    send.click(timeout=8000)
                    how = 'composer'
            step['how'] = how
        got = False
        for _ in range(120):
            if page.locator('.msg-row.ai').count() > prev and page.locator('button.ci-stop').count() == 0:
                got = True
                break
            page.wait_for_timeout(600)
        page.wait_for_timeout(1500)
        loc = page.locator('.msg-row.ai .ai-bubble')
        reply = loc.nth(loc.count() - 1).inner_text() if loc.count() else ''
        exp = norm(sse_text(turn.get('sse')))[:24]
        step.update({'reply_ok': got, 'matched': bool(exp) and exp in norm(reply),
                     'ai_rows': page.locator('.msg-row.ai').count(),
                     'reply_head': reply[:60], 'reply_full': reply[:3000], 'expect': exp})
        res['steps'].append(step)
        page.screenshot(path=os.path.join(OUT, f'{case}-{i + 2:02d}-turn.png'))
        print(f'[{case}] turn {i}: ok={got} matched={step["matched"]} how={step["how"]} reply={step["reply_head"][:34]!r}')
        if not got:
            break
    body = page.inner_text('body')
    res['terminal'] = {'finish_card': '已完成本题' in body, 'remediation': '前置缺口' in body or '先补 5 分钟' in body,
                      'tail': body[-260:]}
    res['http'] = len(reqs)
    page.screenshot(path=os.path.join(OUT, f'{case}-99-terminal.png'))
    ctx.close()
    with open(os.path.join(OUT, f'template1-{case}.json'), 'w', encoding='utf-8') as f:
        json.dump(res, f, ensure_ascii=False, indent=1)
    matched = sum(1 for s in res['steps'] if s.get('matched'))
    print(f"[{case}] matched {matched}/{len(res['steps'])}  http={res['http']} errors={len(res['errors'])} "
          f"finish={res['terminal']['finish_card']} remediation={res['terminal']['remediation']}")
    return res


with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    for case in (sys.argv[1:] or ['A', 'B', 'C']):
        run_case(b, case)
    b.close()
