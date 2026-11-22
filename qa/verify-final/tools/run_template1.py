# -*- coding: utf-8 -*-
"""verify-final · 样板一复跑：现役正常学生入口上传 题1.png → 按采证 turns[].input 逐轮推进。

核对：每一轮离线回复 vs evidence/live/run-02/student/api/flow-A.json 的采证 SSE 文本；
      终点与现役一致（未收束：前置补课卡）；刷新后对话恢复。
产物：qa/verify-final/template1.json + shots/t1-*.png
"""
import datetime as dt
import difflib
import json
import os
import re
import sys
import time

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = r'D:\zxsy-math-arena-showcase'
LIVE = 'http://127.0.0.1:5176'
OFF = 'file:///' + os.path.join(ROOT, 'release', '开始演示.html').replace('\\', '/')
OUT = os.path.join(ROOT, 'qa', 'verify-final')
SHOTS = os.path.join(OUT, 'shots')
SESSION_DIR = os.path.join(SHOTS, 'template1')
os.makedirs(SESSION_DIR, exist_ok=True)
sys.path.insert(0, os.path.join(ROOT, '.work', 'scripts'))
from live_login import STUDENT, login  # noqa: E402

EVIDENCE = os.path.join(ROOT, 'evidence', 'live', 'run-02', 'student', 'api', 'flow-A.json')
IMAGE = r'D:\zxsy-math-arena\docs\superpowers\plans\题1.png'
VIEW = {'width': 1672, 'height': 941}


def norm(s):
    return re.sub(r'[^0-9A-Za-z\u4e00-\u9fff]', '', s or '')


def parse_sse(raw):
    out, cards = [], []
    for block in str(raw or '').split('\n\n'):
        m = re.match(r'event:\s*(\S+)\s*\ndata:\s*(.*)', block, re.S)
        if not m:
            continue
        try:
            data = json.loads(m.group(2).strip())
        except Exception:
            continue
        if m.group(1) == 'token':
            out.append(data.get('text') or '')
        elif m.group(1) in ('card', 'status'):
            cards.append({'event': m.group(1), 'data': data})
    return ''.join(out), cards


MATH_RE = re.compile(r'\$\$.*?\$\$|\$[^$]*\$|\\\(.*?\\\)|\\\[.*?\\\]', re.S)


def prose_segments(text):
    prose = MATH_RE.sub(' ', text or '')
    segs = [s.strip() for s in re.split(r'[。！？；：\n\r\t]+', prose) if s.strip()]
    return [norm(s) for s in segs if len(norm(s)) >= 6]


def clean_dom_text(page):
    """去掉 KaTeX 双份（mathml）后的可见文本，避免公式重复造成误判。"""
    return page.evaluate("""() => {
      const bubbles = [...document.querySelectorAll('.msg-row.ai .ai-bubble')];
      if (!bubbles.length) return '';
      const el = bubbles[bubbles.length - 1].cloneNode(true);
      el.querySelectorAll('.katex-mathml').forEach(n => n.remove());
      return el.innerText || '';
    }""")


def reply_metrics(evidence_text, dom_text):
    ne, nd = norm(evidence_text), norm(dom_text)
    segs = prose_segments(evidence_text)
    covered = [s for s in segs if s in nd]
    return {
        'prose_segments': len(segs), 'prose_covered': len(covered),
        'prose_coverage': round(len(covered) / len(segs), 3) if segs else None,
        'missing_prose': [s[:30] for s in segs if s not in nd][:4],
        'norm_similarity': round(difflib.SequenceMatcher(None, ne, nd).ratio(), 3),
        'prefix24_in_dom': (ne[:24] in nd) if ne else None,
        'dom_len': len(dom_text or ''), 'evidence_len': len(evidence_text or ''),
    }


def wait_ai(page, prev, timeout=150000):
    t0 = time.time()
    stable = 0
    last = prev
    while time.time() - t0 < timeout / 1000:
        n = page.locator('.msg-row.ai').count()
        stopping = page.locator('button.ci-stop').count() > 0
        if n > prev and not stopping:
            stable += 1
            last = n
            if stable >= 3:
                page.wait_for_timeout(1400)
                return {'ok': True, 'rows': page.locator('.msg-row.ai').count(), 'sec': round(time.time() - t0, 1)}
        else:
            stable = 0
        page.wait_for_timeout(800)
    return {'ok': page.locator('.msg-row.ai').count() > prev, 'rows': page.locator('.msg-row.ai').count(),
            'sec': round(time.time() - t0, 1), 'timeout': True}


CARD_JS = r"""() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 && getComputedStyle(el).visibility !== 'hidden'; };
  const has = (s) => [...document.querySelectorAll(s)].some(vis);
  return {expr: has('.ix-ei-input'), si: has('.si-fallback input') || has('.si-input'),
          typewrite: [...document.querySelectorAll('button')].some(b => (b.innerText||'').includes('改用打字') && !b.disabled && vis(b)),
          submit: [...document.querySelectorAll('.ix-submit')].filter(vis).map(b => ({d: !!b.disabled, t: (b.innerText||'').trim()})),
          labels: [...document.querySelectorAll('button')].filter(vis).map(b => (b.innerText||'').replace(/\s+/g,' ').trim()).filter(Boolean).slice(0,40)};
}"""


def send_turn(page, turn):
    """按交互卡优先、输入条兜底的顺序发送一轮；返回 (how, detail)。"""
    text = (turn.get('input') or '').strip()
    is_expr = turn.get('kind') == 'form_expr' or text.startswith('[式子]')
    expr = text.replace('[式子]', '').strip()
    state = page.evaluate(CARD_JS)
    # 1) 式子卡：卡片输入 + 卡片提交
    if is_expr and state['expr']:
        try:
            page.locator('.ix-ei-input').first.fill(expr)
            page.wait_for_timeout(400)
            for sel in ('.ix-submit:enabled',):
                if page.locator(sel).count():
                    page.locator(sel).first.click(timeout=6000)
                    return 'card-expr', expr
            btns = page.locator('button:has-text("写好了"):not([disabled])')
            if btns.count():
                btns.first.click(timeout=6000)
                return 'card-expr-write', expr
            page.locator('.ix-submit').first.click(force=True, timeout=6000)
            return 'card-expr-force', expr
        except Exception as e:
            detail = 'card-expr-fail:' + repr(e)[:120]
    else:
        detail = ''
    # 2) 卡底打字兜底（annotate / binary 等卡自带「改用打字」）
    if state['si'] or state['typewrite']:
        try:
            if not state['si'] and state['typewrite']:
                page.locator('button:has-text("改用打字")').first.click(timeout=5000)
                page.wait_for_timeout(600)
            for sel in ('.si-fallback input', '.si-input'):
                if page.locator(sel).count():
                    page.locator(sel).first.fill(text)
                    page.wait_for_timeout(500)
                    page.locator('button.si-send:enabled, .si-send:enabled').first.click(timeout=6000)
                    return 'card-typewrite', text
        except Exception as e:
            detail = (detail + ' | typewrite-fail:' + repr(e)[:120])
    # 3) 主输入条
    page.locator('textarea.ci-ta').first.fill(text)
    page.wait_for_timeout(400)
    page.locator('button.ci-send').first.click(timeout=8000)
    return 'composer', text


def open_side(browser, side, netlist):
    ctx = browser.new_context(viewport=VIEW, device_scale_factor=1, offline=(side == 'off'))
    page = ctx.new_page()
    obs = {'requests': [], 'pageerrors': [], 'console': [], 'responses': []}
    page.on('request', lambda r: obs['requests'].append(r.url[:250]) if r.url.startswith(('http://', 'https://', 'ws://', 'wss://')) else None)
    page.on('pageerror', lambda e: obs['pageerrors'].append(str(e)[:250]))
    page.on('console', lambda m: obs['console'].append(m.text[:250]) if m.type == 'error' else None)
    page.on('response', lambda r: obs['responses'].append({'url': r.url[:200], 'status': r.status})
             if r.url.startswith(('http://', 'https://')) else None)
    if side == 'live':
        last = None
        for attempt in range(3):
            try:
                login(page, STUDENT)
                break
            except Exception as e:
                last = e
                print('  ! live login retry %d: %r' % (attempt + 1, repr(e)[:120]), flush=True)
                page.wait_for_timeout(65000)
        else:
            raise RuntimeError('live login failed: %r' % (last,))
    else:
        page.goto(OFF, wait_until='load', timeout=60000)
        page.wait_for_timeout(1600)
        page.select_option('#preferred-role', 'student')
        page.fill('#auth-phone', '13800001001')
        page.get_by_role('button', name='获取验证码').click()
        page.wait_for_timeout(900)
        page.get_by_placeholder('6 位验证码').fill('246810')
        page.get_by_role('button', name='安全登录').click()
        page.wait_for_timeout(2600)
    page.wait_for_timeout(1200)
    if page.locator('button.sb-new').count():
        try:
            page.locator('button.sb-new').first.click(timeout=5000)
            page.wait_for_timeout(2200)
        except Exception:
            pass
    return ctx, page, obs


def upload(page, side, rec):
    img = IMAGE
    if not os.path.exists(img):
        raise RuntimeError('missing image ' + img)
    rec['image'] = {'path': img, 'bytes': os.path.getsize(img)}
    try:
        with page.expect_file_chooser(timeout=12000) as fc:
            page.locator('.he-card', has_text='拍一道不会的题').first.click()
        fc.value.set_files(img)
        rec['upload_entry'] = 'hero-card'
    except Exception:
        with page.expect_file_chooser(timeout=12000) as fc:
            page.locator("button[title='拍照识题']").first.click()
        fc.value.set_files(img)
        rec['upload_entry'] = 'composer-camera'
    ready = False
    for _ in range(90):
        if page.locator('.att-card.ready').count():
            ready = True
            break
        if page.locator('.att-card.failed').count():
            break
        page.wait_for_timeout(600)
    rec['attachment_ready'] = ready
    rec['attachment_failed'] = page.locator('.att-card.failed').count() > 0
    page.wait_for_timeout(900)
    return ready


def terminal_probe(page):
    body = page.inner_text('body')
    return {
        'has_remediation': ('先补 5 分钟' in body) or ('前置缺口补课' in body),
        'has_remediation_card': '前置缺口' in body,
        'has_blank_0_1': '0/1 空已填' in body,
        'has_step_badge': ('第 2 步' in body) or ('共 3 步' in body),
        'has_finish_card': ('已完成本题' in body) or ('本题已完成' in body),
        'concluded_words': [w for w in ('恭喜你完成', '最终答案', '答案：2√2', '本题答案') if w in body],
        'tail': re.sub(r'\s+', ' ', body[-420:]),
        'url': page.url,
    }


def refresh_probe(page):
    before_rows = page.locator('.msg-row.ai').count()
    before_text = clean_dom_text(page)
    page.reload(wait_until='load')
    page.wait_for_timeout(4500)
    after_rows = page.locator('.msg-row.ai').count()
    after_text = clean_dom_text(page)
    body = page.inner_text('body')
    return {
        'before_rows': before_rows, 'after_rows': after_rows, 'rows_restored': after_rows >= before_rows - 1,
        'last_reply_restored': norm(before_text)[-80:] in norm(after_text) if before_text else None,
        'remediation_after_refresh': ('先补 5 分钟' in body) or ('前置缺口补课' in body),
        'url_after_refresh': page.url,
    }


def run_side(browser, side, turns):
    print('=== 样板一 %s ===' % side, flush=True)
    ctx, page, obs = open_side(browser, side, {})
    rec = {'side': side, 'started_at': dt.datetime.now().astimezone().isoformat(timespec='seconds'),
           'steps': []}
    try:
        page.wait_for_timeout(800)
        rec['upload'] = {}
        ready = upload(page, side, rec['upload'])
        rec['ai_before'] = page.locator('.msg-row.ai').count()
        page.screenshot(path=os.path.join(SESSION_DIR, f'{side}-01-uploaded.png'))
        for i, turn in enumerate(turns):
            prev = page.locator('.msg-row.ai').count()
            step = {'idx': i, 'kind': turn.get('kind'), 'input': (turn.get('input') or '')[:80],
                    'attachment': bool(turn.get('attachment'))}
            if i == 0:
                page.locator('button.ci-send').first.click(timeout=8000)
                step['how'] = 'image-only-send'
            else:
                step['how'], step['sent'] = send_turn(page, turn)
            wait = wait_ai(page, prev)
            step['wait'] = wait
            dom = clean_dom_text(page)
            evidence, cards = parse_sse(turn.get('sse'))
            step['reply'] = dom[:4000]
            step['evidence'] = evidence[:4000]
            step['metrics'] = reply_metrics(evidence, dom)
            step['card_events'] = [c['event'] for c in cards][:10]
            step['ai_rows'] = page.locator('.msg-row.ai').count()
            rec['steps'].append(step)
            page.screenshot(path=os.path.join(SESSION_DIR, f'{side}-{i + 2:02d}-turn.png'))
            print('  turn %d kind=%s how=%s ok=%s cov=%s sim=%s' % (
                i, step.get('kind'), step['how'], wait['ok'],
                step['metrics']['prose_coverage'], step['metrics']['norm_similarity']), flush=True)
            page.wait_for_timeout(400)
        rec['terminal'] = terminal_probe(page)
        page.screenshot(path=os.path.join(SESSION_DIR, f'{side}-99-terminal.png'))
        rec['terminal_evidence'] = {'concluded': json.load(open(EVIDENCE, encoding='utf-8'))['final_state']['concluded']}
        rec['refresh'] = refresh_probe(page)
        page.screenshot(path=os.path.join(SESSION_DIR, f'{side}-98-after-refresh.png'))
        rec['observers'] = {'request_count': len(obs['requests']), 'request_sample': obs['requests'][:8],
                            'pageerrors': obs['pageerrors'][:5], 'console_errors': obs['console'][:5],
                            'responses': [r for r in obs['responses'] if r['url'].find('/api/') >= 0][-12:]}
    except Exception as e:
        rec['error'] = repr(e)[:800]
        try:
            page.screenshot(path=os.path.join(SESSION_DIR, f'{side}-error.png'))
        except Exception:
            pass
    ctx.close()
    return rec


def main():
    flow = json.load(open(EVIDENCE, encoding='utf-8'))
    turns = flow['turns']
    out = {'generated_at': dt.datetime.now().astimezone().isoformat(timespec='seconds'),
           'image_sha256_expected': flow['image']['sha256'],
           'turns': len(turns), 'sides': {}}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        out['sides']['off'] = run_side(browser, 'off', turns)
        out['sides']['live'] = run_side(browser, 'live', turns)
        browser.close()
    # 逐轮汇总
    off_steps = out['sides']['off'].get('steps', [])
    live_steps = out['sides']['live'].get('steps', [])
    summary = []
    for i, step in enumerate(off_steps):
        m = step['metrics']
        consistent = (m['prose_coverage'] is not None and m['prose_coverage'] >= 0.9)
        livem = live_steps[i]['metrics'] if i < len(live_steps) else {}
        summary.append({'idx': i, 'kind': step['kind'], 'how': step['how'],
                        'off_prose_coverage': m['prose_coverage'], 'off_similarity': m['norm_similarity'],
                        'off_consistent': consistent,
                        'live_prose_coverage_vs_evidence': livem.get('prose_coverage'),
                        'live_similarity_vs_evidence': livem.get('norm_similarity')})
    out['round_summary'] = summary
    out['off_consistent_rounds'] = sum(1 for s in summary if s['off_consistent'])
    out['rounds'] = len(summary)
    with open(os.path.join(OUT, 'template1.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print('SAMPLE1 off consistent %d/%d · live endpoint remediation=%s · off endpoint remediation=%s' % (
        out['off_consistent_rounds'], out['rounds'],
        out['sides']['live'].get('terminal', {}).get('has_remediation'),
        out['sides']['off'].get('terminal', {}).get('has_remediation')), flush=True)


if __name__ == '__main__':
    main()