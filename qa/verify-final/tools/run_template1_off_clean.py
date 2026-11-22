# -*- coding: utf-8 -*-
"""样板一 · 离线清洁复跑（不点「新对话」，从空态 hero 上传）+ 新对话按钮行为 + 刷新恢复卡片核查。"""
import difflib
import json
import os
import re
import sys
import time

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = r'D:\zxsy-math-arena-showcase'
OFF = 'file:///' + os.path.join(ROOT, 'release', '开始演示.html').replace('\\', '/')
OUT = os.path.join(ROOT, 'qa', 'verify-final')
SHOTS = os.path.join(OUT, 'shots', 'template1')
EVIDENCE = os.path.join(ROOT, 'evidence', 'live', 'run-02', 'student', 'api', 'flow-A.json')
IMAGE = r'D:\zxsy-math-arena\docs\superpowers\plans\题1.png'
VIEW = {'width': 1672, 'height': 941}
CN = re.compile(r'[\u4e00-\u9fff]+')
MATH_RE = re.compile(r'\$\$.*?\$\$|\$[^$]*\$|\\\(.*?\\\)|\\\[.*?\\\]', re.S)


def cn(s):
    return ''.join(CN.findall(s or ''))


def parse_sse(raw):
    out = []
    for block in str(raw or '').split('\n\n'):
        m = re.match(r'event:\s*(\S+)\s*\ndata:\s*(.*)', block, re.S)
        if m and m.group(1) == 'token':
            try:
                out.append(json.loads(m.group(2).strip()).get('text') or '')
            except Exception:
                pass
    return ''.join(out)


def retention(ev, dom):
    a, b = cn(ev), cn(dom)
    if not a:
        return None
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    return round(sum(bl.size for bl in sm.get_matching_blocks()) / len(a), 3)


def clean_dom(page):
    return page.evaluate("""() => {
      const b = [...document.querySelectorAll('.msg-row.ai .ai-bubble')];
      if (!b.length) return '';
      const el = b[b.length - 1].cloneNode(true);
      el.querySelectorAll('.katex-mathml').forEach(n => n.remove());
      return el.innerText || '';
    }""")


def card_state(page):
    return page.evaluate("""() => {
      const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
      const c = (s) => [...document.querySelectorAll(s)].filter(vis).length;
      return {ix: c('.ix-submit'), si: c('.si-fallback input') + c('.si-input'), att: c('.att-card.ready'),
              fill: c('.flex-fill__blank, .blank-card, [class*=fill]'), has0_1: document.body.innerText.includes('0/1 空已填'),
              hasRemediation: document.body.innerText.includes('先补 5 分钟') || document.body.innerText.includes('前置缺口补课')};
    }""")


def wait_ai(page, prev, timeout=150000):
    t0 = time.time(); stable = 0
    while time.time() - t0 < timeout / 1000:
        n = page.locator('.msg-row.ai').count()
        if n > prev and not page.locator('button.ci-stop').count():
            stable += 1
            if stable >= 3:
                page.wait_for_timeout(1400)
                return {'ok': True, 'rows': n, 'sec': round(time.time() - t0, 1)}
        else:
            stable = 0
        page.wait_for_timeout(800)
    return {'ok': page.locator('.msg-row.ai').count() > prev, 'rows': page.locator('.msg-row.ai').count(),
            'sec': round(time.time() - t0, 1), 'timeout': True}


def thread_probe(page):
    """消息行数/角色顺序/首末文案/附件丢失提示（刷新恢复用）。"""
    return page.evaluate("""() => {
      const rows = [...document.querySelectorAll('.msg-row')];
      const roleOf = (el) => el.classList.contains('ai') ? 'ai' : (el.classList.contains('user') ? 'user' : 'other');
      const seq = rows.map(roleOf);
      const ai = [...document.querySelectorAll('.msg-row.ai .ai-bubble')];
      const users = [...document.querySelectorAll('.msg-row.user')];
      const txt = (el) => (el.innerText || '').replace(/\\s+/g, ' ').trim();
      const expect = Array.from({length: seq.length}, (_, i) => (i % 2 ? 'ai' : 'user')).join(',');
      return {total: rows.length, ai_count: ai.length, user_count: users.length,
              seq: seq.join(','), alternates: seq.join(',') === expect,
              first_user: users.length ? txt(users[0]).slice(0, 120) : '',
              last_ai: ai.length ? (ai[ai.length - 1].innerText || '') : '',
              attach_lost: (document.body.innerText || '').includes('附件已丢失')};
    }""")


def login_off(ctx):
    p = ctx.new_page()
    obs = {'requests': [], 'pageerrors': [], 'console': []}
    p.on('request', lambda r: obs['requests'].append(r.url) if r.url.startswith(('http://', 'https://', 'ws://')) else None)
    p.on('pageerror', lambda e: obs['pageerrors'].append(str(e)[:250]))
    p.on('console', lambda m: obs['console'].append(m.text[:250]) if m.type == 'error' else None)
    p.goto(OFF, wait_until='load', timeout=60000)
    p.wait_for_timeout(1600)
    p.select_option('#preferred-role', 'student')
    p.fill('#auth-phone', '13800001001')
    p.get_by_role('button', name='获取验证码').click()
    p.wait_for_timeout(900)
    p.get_by_placeholder('6 位验证码').fill('246810')
    p.get_by_role('button', name='安全登录').click()
    p.wait_for_timeout(2800)
    return p, obs


def send_turn(page, turn):
    st = card_state(page)
    text = (turn.get('input') or '').strip()
    is_expr = turn.get('kind') == 'form_expr' or text.startswith('[式子]')
    expr = text.replace('[式子]', '').strip()
    if is_expr and st['ix']:
        try:
            page.locator('.ix-ei-input').first.fill(expr)
            page.wait_for_timeout(400)
            if page.locator('.ix-submit:enabled').count():
                page.locator('.ix-submit:enabled').first.click(timeout=6000)
                return 'card-expr'
            page.locator('.ix-submit').first.click(force=True, timeout=6000)
            return 'card-expr-force'
        except Exception as e:
            err = repr(e)[:100]
    else:
        err = ''
    if st['si']:
        try:
            for sel in ('.si-fallback input', '.si-input'):
                if page.locator(sel).count():
                    page.locator(sel).first.fill(text)
                    page.wait_for_timeout(500)
                    page.locator('button.si-send:enabled, .si-send:enabled').first.click(timeout=6000)
                    return 'card-typewrite'
        except Exception as e:
            err += ' | typewrite:' + repr(e)[:80]
    page.locator('textarea.ci-ta').first.fill(text)
    page.wait_for_timeout(400)
    page.locator('button.ci-send').first.click(timeout=8000)
    return 'composer' + ('(fallback' + err + ')' if err else '')


def new_chat_probe(b):
    print('=== 新对话按钮行为 ===')
    ctx = b.new_context(viewport=VIEW, device_scale_factor=1, offline=True)
    p, obs = login_off(ctx)
    p.wait_for_timeout(1200)
    rec = {'hero_ai_rows': p.locator('.msg-row.ai').count(),
           'hero_has_he_card': p.locator('.he-card').count(), 'hero_text': p.inner_text('body')[-300:]}
    p.locator('button.sb-new').first.click()
    p.wait_for_timeout(3000)
    rec['after_new_ai_rows'] = p.locator('.msg-row.ai').count()
    rec['after_new_url'] = p.url
    rec['after_new_text_tail'] = p.inner_text('body')[-500:]
    rec['after_new_has_he_card'] = p.locator('.he-card').count()
    ai = p.locator('.msg-row.ai .ai-bubble')
    rec['after_new_last_ai'] = (ai.nth(ai.count() - 1).inner_text()[:200] if ai.count() else '')
    p.screenshot(path=os.path.join(SHOTS, 'off-new-chat-click.png'))
    rec['requests'] = len(obs['requests'])
    ctx.close()
    return rec


def clean_replay(b):
    print('=== 离线清洁复跑 ===')
    flow = json.load(open(EVIDENCE, encoding='utf-8'))
    turns = flow['turns']
    ctx = b.new_context(viewport=VIEW, device_scale_factor=1, offline=True)
    p, obs = login_off(ctx)
    rec = {'steps': [], 'hero_ai_rows': p.locator('.msg-row.ai').count(),
           'hero_has_he_card': p.locator('.he-card').count()}
    p.wait_for_timeout(800)
    # 上传（hero 卡）
    with p.expect_file_chooser(timeout=15000) as fc:
        p.locator('.he-card', has_text='拍一道不会的题').first.click()
    fc.value.set_files(IMAGE)
    for _ in range(90):
        if p.locator('.att-card.ready').count():
            break
        p.wait_for_timeout(600)
    rec['attachment_ready'] = p.locator('.att-card.ready').count() > 0
    p.wait_for_timeout(900)
    p.screenshot(path=os.path.join(SHOTS, 'offclean-01-uploaded.png'))
    base_ai = p.locator('.msg-row.ai').count()
    rec['ai_before'] = base_ai
    for i, turn in enumerate(turns):
        prev = p.locator('.msg-row.ai').count()
        step = {'idx': i, 'kind': turn.get('kind'), 'input': (turn.get('input') or '')[:60]}
        if i == 0:
            p.locator('button.ci-send').first.click(timeout=8000)
            step['how'] = 'image-only-send'
        else:
            step['how'] = send_turn(p, turn)
        step['wait'] = wait_ai(p, prev)
        dom = clean_dom(p)
        ev = parse_sse(turn.get('sse'))
        step['reply'] = dom[:4000]
        step['evidence'] = ev[:4000]
        step['retention_cn'] = retention(ev, dom)
        step['similarity_full'] = round(difflib.SequenceMatcher(None, re.sub(r'\s+', '', ev), re.sub(r'\s+', '', dom)).ratio(), 3)
        step['ai_rows'] = p.locator('.msg-row.ai').count()
        rec['steps'].append(step)
        p.screenshot(path=os.path.join(SHOTS, f'offclean-{i + 2:02d}-turn.png'))
        print('  turn', i, step['how'], 'ok', step['wait']['ok'], 'retention', step['retention_cn'], flush=True)
    rec['terminal'] = card_state(p)
    rec['terminal_text_tail'] = re.sub(r'\s+', ' ', p.inner_text('body')[-400:])
    p.screenshot(path=os.path.join(SHOTS, 'offclean-99-terminal.png'))
    # 刷新恢复
    rec['before_refresh'] = card_state(p)
    rec['before_refresh_rows'] = p.locator('.msg-row.ai').count()
    rec['before_refresh_last_ai'] = clean_dom(p)[:300]
    rec['thread_before_refresh'] = thread_probe(p)
    p.reload(wait_until='load')
    p.wait_for_timeout(5000)
    rec['after_refresh'] = card_state(p)
    rec['after_refresh_rows'] = p.locator('.msg-row.ai').count()
    rec['after_refresh_last_ai'] = clean_dom(p)[:300]
    rec['thread_after_refresh'] = thread_probe(p)
    rec['after_refresh_url'] = p.url
    rec['after_refresh_text_has_remediation'] = ('先补 5 分钟' in p.inner_text('body')) or ('前置缺口补课' in p.inner_text('body'))
    ev8 = parse_sse(turns[8].get('sse'))
    rec['last_ai_round8_retention'] = retention(ev8, rec['thread_after_refresh']['last_ai'])
    rec['first_user_is_upload'] = '请分析我上传的文件' in rec['thread_after_refresh']['first_user']
    p.screenshot(path=os.path.join(SHOTS, 'offclean-98-after-refresh.png'))
    rec['http_requests'] = len(obs['requests'])
    rec['pageerrors'] = obs['pageerrors'][:5]
    rec['console_errors'] = obs['console'][:6]
    ctx.close()
    return rec


with sync_playwright() as pw:
    b = pw.chromium.launch(headless=True)
    out = {'generated_at': time.strftime('%Y-%m-%dT%H:%M:%S%z'),
           'new_chat_probe': new_chat_probe(b), 'clean_replay': clean_replay(b)}
    b.close()
steps = out['clean_replay']['steps']
out['consistent_rounds'] = sum(1 for s in steps if (s.get('retention_cn') or 0) >= 0.92)
out['rounds'] = len(steps)
with open(os.path.join(OUT, 'template1_off_clean.json'), 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print('OFF-CLEAN consistent', out['consistent_rounds'], '/', out['rounds'],
      'refresh rows', out['clean_replay']['after_refresh_rows'],
      'refresh card', out['clean_replay']['after_refresh'],
      'new_chat_rows_after', out['new_chat_probe']['after_new_ai_rows'])