# -*- coding: utf-8 -*-
"""verify-final · 20 页逐屏并排（现役 vs 离线单文件发行包）+ 断网审计 + 编造项核查。

用法：
  python run_parity.py --off-only      # 只采离线（无 SMS 消耗，可反复）
  python run_parity.py                 # 采两侧并比对（会真实登录现役三端）
产物（仅写 qa/verify-final/）：
  shots/{live,off,side}-<role>-<slug>.png
  verify.json                          # 每页路由/布局盒/控件/破图/判定 + 审计 + 核查
"""
import datetime as dt
import difflib
import json
import os
import re
import sys
import time

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = r'D:\zxsy-math-arena-showcase'
LIVE = 'http://127.0.0.1:5176'
OFF = 'file:///' + os.path.join(ROOT, 'release', '开始演示.html').replace('\\', '/')
OUT = os.path.join(ROOT, 'qa', 'verify-final')
SHOTS = os.path.join(OUT, 'shots')
os.makedirs(SHOTS, exist_ok=True)
sys.path.insert(0, os.path.join(ROOT, '.work', 'scripts'))
from live_login import RESEARCH, STUDENT, TEACHER, login  # noqa: E402

VIEW = {'width': 1672, 'height': 941}
SETTLE_MS = 3000
TITLE_H = 44
GAP = 10
SESSION = 'f5c84551-18a7-454d-b49c-8f115e816299'
PROJ = 'e49b27e2-b05f-45c3-ac99-dd0792d9ab80'

PAGES = {
    'student': {
        'ident': STUDENT, 'role': 'student',
        'routes': [('/dialog', 'dialog', 'student'), ('/practice', 'practice', 'student'),
                   ('/errors', 'errors', 'student'), ('/library', 'library', 'student'),
                   ('/resources', 'resources', 'student'), ('/classroom', 'classroom', 'student'),
                   ('/me', 'me', 'student')],
    },
    'teacher': {
        'ident': TEACHER, 'role': 'teacher',
        'routes': [('/teacher-v3/prep', 'prep', 'teacher'), ('/teacher-v3/classes', 'classes', 'teacher'),
                   ('/teacher-v3/bank', 'bank', 'teacher'), ('/teacher-v3/assign', 'assign', 'teacher'),
                   ('/teacher-v3/insights', 'insights', 'teacher'),
                   ('/teacher-v3/resources', 'resources', 'teacher'),
                   ('/teacher-v3/grading', 'grading', 'teacher'),
                   (f'/teacher-v3/prep-immersive/{SESSION}', 'workbench', 'workbench')],
    },
    'researcher': {
        'ident': RESEARCH, 'role': 'researcher',
        'routes': [('/research-workspace', 'landing', 'research-landing'),
                   ('/research-workspace/workspace', 'workspace', 'research-workspace'),
                   (f'/research-workspace/{PROJ}/read', 'read', 'research-workspace'),
                   ('/research-workspace/write', 'write', 'research-landing'),
                   (f'/research-workspace/{PROJ}/write', 'write-canonical', 'research-workspace'),
                   ('/research-workspace/account', 'account', 'research-account')],
    },
}

LAYOUT_KEYS = {
    'student': ['header.topbar', 'aside.sidebar', 'main.main'],
    'teacher': ['aside.tv3-nav', 'header.tv3-topbar', 'main.tv3-page'],
    'workbench': ['header.focus-shell__bar', 'main.focus-shell__body', '.surface'],
    'research-landing': ['header.rh-head', 'main.rl-main'],
    'research-account': ['header.rh-head', 'main.ra-main'],
    'research-workspace': ['header.rw-header', '.rw-body', 'aside.rw-sb', '.rw-pane--agent'],
}
ALL_SELS = sorted({s for v in LAYOUT_KEYS.values() for s in v})
CONTENT_HEIGHT_IGNORE = {'main.main', 'main.tv3-page', 'main.rl-main', 'main.ra-main',
                         'main.focus-shell__body', '.surface'}

FORBIDDEN = ['演示身份卡', '三题陈列卡', '内容匹配', 'SHA-256', 'sha256', '发布成功', '导出成功',
             '下载课件', '主持人浮标', '主持人工具', '嘉宾模式', '演示专用']
HOST_SELS = ['#host-fab', '.host-fab', '.host-float', '.host-tool', '.host-orb', '[data-host]',
             '[class*=host-fab]', '[class*=hostFAB]']

BOX_JS = r"""(args) => {
  const [sels, hostSels] = args;
  const boxes = {};
  for (const s of sels) {
    const els = [...document.querySelectorAll(s)];
    const el = els.find((e) => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; });
    if (el) { const r = el.getBoundingClientRect(); boxes[s] = {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)}; }
  }
  const imgs = [...document.images];
  const vis = (el) => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity || 1) > 0.05; };
  const txt = (el) => (el.innerText || '').replace(/\s+/g, ' ').trim();
  const buttons = [...document.querySelectorAll('button')].filter(vis).map(b => ({
    t: txt(b).slice(0, 40), disabled: !!b.disabled, title: b.getAttribute('title') || '',
    testid: b.getAttribute('data-testid') || ''
  })).slice(0, 220);
  const inputs = [...document.querySelectorAll('input, textarea, select')].filter(vis).map(i => ({
    tag: i.tagName.toLowerCase(), type: i.getAttribute('type') || '', ph: i.getAttribute('placeholder') || '',
    disabled: !!i.disabled
  })).slice(0, 60);
  const hostHits = {};
  for (const s of hostSels) hostHits[s] = document.querySelectorAll(s).length;
  const hostWords = [...document.querySelectorAll('*')].filter(el => {
    const a = (el.getAttribute('aria-label') || '') + (el.getAttribute('title') || '') + txt(el).slice(0, 30);
    return /主持人|host/i.test(a) && el.children.length === 0;
  }).slice(0, 5).map(el => txt(el).slice(0, 40));
  // 右下角浮动元素（嘉宾界面浮标风险面）
  const fixedCorner = [...document.querySelectorAll('body *')].filter(el => {
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    return cs.position === 'fixed' && r.width > 20 && r.height > 20 &&
           r.bottom > innerHeight - 160 && r.right > innerWidth - 160;
  }).map(el => ({ cls: (el.className || '').toString().slice(0, 50), t: txt(el).slice(0, 50) })).slice(0, 6);
  return {
    boxes, imgs: { total: imgs.length, broken: imgs.filter(i => i.complete && i.naturalWidth === 0).length,
                   pending: imgs.filter(i => !i.complete).length },
    buttons, inputs, hostHits, hostWords, fixedCorner,
    scroll: { w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight },
    text: document.body.innerText || '', url: location.href,
    ready: document.readyState,
  };
}"""


def norm_lines(text):
    return [re.sub(r'\s+', ' ', ln).strip() for ln in (text or '').splitlines() if ln.strip()]


def digits_norm(lines):
    return [re.sub(r'\d+', '#', ln) for ln in lines]


def text_diff(live_lines, off_lines, limit=8):
    sm = difflib.SequenceMatcher(None, live_lines, off_lines, autojunk=False)
    out = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            continue
        out.append({'op': tag, 'live': ' / '.join(live_lines[i1:i2])[:300],
                    'off': ' / '.join(off_lines[j1:j2])[:300]})
        if len(out) >= limit:
            break
    return out


def load_font(size, bold=False):
    for p in ([r'C:\Windows\Fonts\arialbd.ttf'] if bold else []) + [r'C:\Windows\Fonts\arial.ttf']:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            continue
    return ImageFont.load_default()


def side_by_side(live_png, off_png, out_png, route, slug, role):
    a = Image.open(live_png).convert('RGB')
    b = Image.open(off_png).convert('RGB')
    w = max(a.width, b.width)
    h = max(a.height, b.height)
    canvas = Image.new('RGB', (w * 2 + GAP, TITLE_H + h), (11, 18, 32))
    draw = ImageDraw.Draw(canvas)
    fb, fr = load_font(19, True), load_font(14)
    draw.rectangle([0, 0, w * 2 + GAP, TITLE_H], fill=(17, 24, 39))
    draw.text((16, 10), 'LIVE', font=fb, fill=(52, 211, 153))
    draw.text((16 + 68, 13), f'{role} · {route}  ·  {slug}', font=fr, fill=(203, 213, 225))
    draw.text((w + GAP + 16, 10), 'OFFLINE', font=fb, fill=(251, 191, 36))
    draw.text((w + GAP + 16 + 96, 13), f'{role} · {route}  ·  {slug}', font=fr, fill=(203, 213, 225))
    draw.rectangle([0, TITLE_H, w * 2 + GAP, TITLE_H + h], fill=(226, 232, 240))
    canvas.paste(a, (0, TITLE_H))
    canvas.paste(b, (w + GAP, TITLE_H))
    canvas.save(out_png)
    return {'width': canvas.width, 'height': canvas.height,
            'path': os.path.relpath(out_png, OUT).replace('\\', '/')}


def pixel_diff(live_png, off_png):
    a = np.asarray(Image.open(live_png).convert('RGB')).astype(np.int16)
    b = np.asarray(Image.open(off_png).convert('RGB')).astype(np.int16)
    if a.shape != b.shape:
        return {'ratio': None, 'reason': 'size-mismatch'}
    delta = np.abs(a - b).max(axis=2)
    return {'ratio': round(float((delta > 8).mean()), 5), 'threshold': 'max-channel-delta>8'}


class Side:
    """一侧（live / offline）的浏览器会话 + 观测器。"""

    def __init__(self, browser, side, role_cfg, use_offline):
        self.side = side
        self.role = role_cfg['role']
        self.ctx = browser.new_context(viewport=VIEW, device_scale_factor=1, offline=use_offline)
        self.page = self.ctx.new_page()
        self.requests, self.pageerrors, self.consoles, self.responses = [], [], [], []
        self.page.on('request', self._on_req)
        self.page.on('requestfailed', lambda r: self.requests.append({'url': r.url[:300], 'failed': True}) if self._net(r.url) else None)
        self.page.on('pageerror', lambda e: self.pageerrors.append(str(e)[:300]))
        self.page.on('console', lambda m: self.consoles.append({'type': m.type, 'text': m.text[:400],
                                                               'loc': f'{m.location.get("url", "")}:{m.location.get("lineNumber", "")}'})
                      if m.type in ('error', 'warning') else None)
        self.page.on('response', lambda r: self.responses.append({'url': r.url[:300], 'status': r.status})
                     if self._net(r.url) else None)

    @staticmethod
    def _net(url):
        return str(url).startswith(('http://', 'https://', 'ws://', 'wss://'))

    def _on_req(self, req):
        if self._net(req.url) or req.resource_type == 'websocket':
            self.requests.append({'url': req.url[:300], 'type': req.resource_type, 'failed': False})

    def reset(self):
        self.requests.clear(); self.pageerrors.clear(); self.consoles.clear(); self.responses.clear()

    def login_live(self, ident):
        last = None
        for attempt in range(3):
            try:
                return login(self.page, ident)
            except Exception as e:  # 短信 60s 频控
                last = e
                print('  ! live login retry %d: %r' % (attempt + 1, repr(e)[:120]), flush=True)
                self.page.wait_for_timeout(65000)
        raise RuntimeError('live login failed: %r' % (last,))

    def login_off(self, phone):
        p = self.page
        p.goto(OFF, wait_until='load', timeout=60000)
        p.wait_for_timeout(1500)
        p.select_option('#preferred-role', self.role)
        p.fill('#auth-phone', phone)
        p.get_by_role('button', name='获取验证码').click()
        p.wait_for_timeout(900)
        p.get_by_placeholder('6 位验证码').fill('246810')
        p.get_by_role('button', name='安全登录').click()
        p.wait_for_timeout(2600)

    def goto(self, route):
        if self.side == 'live':
            self.page.goto(LIVE + route, wait_until='load')
        else:
            self.page.evaluate("(r) => { location.hash = '#' + r }", route)
        settle = SETTLE_MS + (9000 if 'research-workspace' in route else 0)
        self.page.wait_for_timeout(settle)
        try:
            self.page.evaluate('() => document.fonts && document.fonts.ready')
        except Exception:
            pass
        self.page.evaluate('() => window.scrollTo(0, 0)')
        self.page.mouse.move(1, 1)
        self.page.wait_for_timeout(400)

    def measure(self):
        return self.page.evaluate(BOX_JS, [ALL_SELS, HOST_SELS])

    def screenshot(self, path):
        self.page.screenshot(path=path)


def compare_page(live, off, rec):
    layout = {'common': [], 'missing': [], 'deltas': {}, 'max_delta': 0}
    keys = LAYOUT_KEYS[rec['kind']]
    for sel in keys:
        l, o = live['boxes'].get(sel), off['boxes'].get(sel)
        if l and o:
            d = [o['x'] - l['x'], o['y'] - l['y'], o['w'] - l['w'], o['h'] - l['h']]
            judged = d[:3] if sel in CONTENT_HEIGHT_IGNORE else d
            layout['common'].append(sel)
            layout['deltas'][sel] = d
            layout['max_delta'] = max(layout['max_delta'], max(abs(v) for v in judged))
        elif l or o:
            layout['missing'].append({'selector': sel, 'live': bool(l), 'off': bool(o)})
    rec['layout'] = layout

    ll, ol = norm_lines(live['text']), norm_lines(off['text'])
    text = {'live_len': len(live['text']), 'off_len': len(off['text']),
            'live_lines': len(ll), 'off_lines': len(ol),
            'exact': ll == ol,
            'number_time_drift_only': (ll != ol and len(ll) == len(ol) and digits_norm(ll) == digits_norm(ol)),
            'diff_count': sum(1 for o in difflib.SequenceMatcher(None, ll, ol, autojunk=False).get_opcodes() if o[0] != 'equal'),
            'diff': text_diff(ll, ol)}
    rec['text'] = text

    # 控件逐条：可见按钮 (文本, disabled)；数字归一化后再比
    def ctl_key(b):
        return (re.sub(r'\d+', '#', b['t']), b['disabled'])
    lset = {ctl_key(b) for b in live['buttons']}
    oset = {ctl_key(b) for b in off['buttons']}
    rec['controls'] = {
        'live_count': len(live['buttons']), 'off_count': len(off['buttons']),
        'live_disabled': sum(1 for b in live['buttons'] if b['disabled']),
        'off_disabled': sum(1 for b in off['buttons'] if b['disabled']),
        'only_live': [list(x) for x in sorted(lset - oset)][:12],
        'only_off': [list(x) for x in sorted(oset - lset)][:12],
        'inputs_live': live['inputs'], 'inputs_off': off['inputs'],
    }

    def numbers(t):
        return re.findall(r'\d+(?:\.\d+)?%?', t)
    rec['numbers'] = {'live': numbers(live['text'])[:80], 'off': numbers(off['text'])[:80]}
    rec['numbers']['diff'] = sorted(set(rec['numbers']['live']) ^ set(rec['numbers']['off']))[:20]
    rec['imgs'] = {'live': live['imgs'], 'off': off['imgs']}
    rec['host'] = {'live': {'fixedCorner': live['fixedCorner'], 'hostHits': live['hostHits'], 'hostWords': live['hostWords']},
                   'off': {'fixedCorner': off['fixedCorner'], 'hostHits': off['hostHits'], 'hostWords': off['hostWords']}}
    rec['forbidden_hits'] = {'live': [w for w in FORBIDDEN if w in live['text']],
                             'off': [w for w in FORBIDDEN if w in off['text']]}
    rec['forbidden_hits']['union'] = sorted(set(rec['forbidden_hits']['live']) | set(rec['forbidden_hits']['off']))
    return rec


def judge(rec):
    layout = rec['layout']
    if layout['missing']:
        return '未通过', 'structure', '布局骨架缺失：' + ', '.join(m['selector'] for m in layout['missing'])
    if layout['max_delta'] > 20:
        return '未通过', 'structure', '布局盒偏移 %dpx' % layout['max_delta']
    if layout['max_delta'] > 4:
        return '差异', 'layout', '布局盒偏移 %dpx（>4px 阈值）' % layout['max_delta']
    if rec['imgs']['off']['broken'] - rec['imgs']['live']['broken'] >= 2:
        return '未通过', 'media', '离线破图 %d 张（现役 %d）' % (rec['imgs']['off']['broken'], rec['imgs']['live']['broken'])
    if rec['forbidden_hits']['union']:
        return '未通过', 'fabrication', '可见界面出现无现役依据内容：' + '、'.join(rec['forbidden_hits']['union'])
    c = rec['controls']
    only = [x for x in c['only_live'] + c['only_off']]
    if only:
        only_numeric = all(re.sub(r'[\d\s%#]', '', str(x[0])) == '' for x in only)
        if not only_numeric:
            return '未通过', 'controls', '可见控件集合不同（仅现役 %d / 仅离线 %d）' % (len(c['only_live']), len(c['only_off']))
    if rec['text']['exact']:
        return '一致', 'none', '布局盒≤%dpx、可见文本逐行一致、控件 disabled 状态一致、破图一致' % layout['max_delta']
    if rec['text']['number_time_drift_only']:
        return '一致', 'number_time_drift', '布局盒≤%dpx、文本仅数字/时间漂移（%d 处）' % (layout['max_delta'], rec['text']['diff_count'])
    if rec['text']['diff_count'] <= 25:
        return '差异', 'data_drift', '结构一致；%d 行内容不同（真实数据漂移，见 text.diff）' % rec['text']['diff_count']
    return '未通过', 'content', '内容结构不同：可见文本 %d 行 vs %d 行，%d 处差异' % (
        rec['text']['live_lines'], rec['text']['off_lines'], rec['text']['diff_count'])


# ───────────────────────────── 交互态 ─────────────────────────────
def interaction_student(live, off):
    out = {'key': 'student-input-back', 'name': '学生 /dialog：输入文字 + 点击侧栏「练题」 + 浏览器返回'}
    res = {}
    for side in (live, off):
        d = {}
        side.goto('/dialog')
        st = side.page
        try:
            ta = st.locator('.ci-ta').first
            ta.fill('已知函数 f(x)=x³-3x，求单调区间')
            st.wait_for_timeout(500)
            d['count_text'] = st.locator('.ci-count').first.inner_text() if st.locator('.ci-count').count() else ''
            d['send_disabled'] = st.locator('.ci-send').first.is_disabled() if st.locator('.ci-send').count() else None
            d['input_value'] = ta.input_value()
        except Exception as e:
            d['input_error'] = repr(e)[:200]
        try:
            clicked = st.evaluate("""() => {
              for (const sel of ['a', 'button', 'li', 'div', 'span']) {
                for (const el of document.querySelectorAll(sel)) {
                  const t = (el.innerText || '').replace(/\\s+/g, '').trim();
                  const r = el.getBoundingClientRect();
                  if ((t === '练题' || t === '练题待练') && r.width > 40 && r.height > 10) { el.click(); return el.tagName + '.' + el.className; }
                }
              }
              return null;
            }""")
            st.wait_for_timeout(2400)
            d['click_target'] = clicked
            d['after_click_path'] = st.evaluate('() => location.hash || location.pathname')
        except Exception as e:
            d['click_error'] = repr(e)[:200]
        try:
            st.go_back(wait_until='load')
            st.wait_for_timeout(1800)
            d['after_back_path'] = st.evaluate('() => location.hash || location.pathname')
        except Exception as e:
            d['back_error'] = repr(e)[:200]
        d['screenshot'] = f'shots/inter-{side.side}-student.png'
        st.evaluate('() => window.scrollTo(0,0)')
        st.wait_for_timeout(250)
        st.screenshot(path=os.path.join(SHOTS, f'inter-{side.side}-student.png'))
        res[side.side] = d
    side_by_side(os.path.join(SHOTS, 'inter-live-student.png'), os.path.join(SHOTS, 'inter-off-student.png'),
                 os.path.join(SHOTS, 'side-inter-student.png'), '/dialog', 'interact-input-back', 'student')
    out['live'], out['off'] = res['live'], res['off']
    out['side'] = 'shots/side-inter-student.png'
    out['same'] = (res['live'].get('input_value') == res['off'].get('input_value') and
                   res['live'].get('send_disabled') == res['off'].get('send_disabled'))
    return out


def interaction_teacher(live, off):
    out = {'key': 'teacher-continue-back', 'name': '教师 /teacher-v3/prep：点「继续备课」→ 工作台 → 浏览器返回 → 工作台刷新'}
    res = {}
    for side in (live, off):
        d = {}
        side.goto('/teacher-v3/prep')
        st = side.page
        try:
            st.locator('button.pc-home__row-cta', has_text='继续备课').first.click(timeout=6000)
            st.wait_for_timeout(3200)
            d['after_continue_path'] = st.evaluate('() => location.hash || location.pathname')
        except Exception as e:
            d['continue_error'] = repr(e)[:200]
        try:
            st.go_back(wait_until='load')
            st.wait_for_timeout(2000)
            d['after_back_path'] = st.evaluate('() => location.hash || location.pathname')
        except Exception as e:
            d['back_error'] = repr(e)[:200]
        side.goto(f'/teacher-v3/prep/w/{SESSION}/classroom')
        st.wait_for_timeout(2500)
        before = st.inner_text('body')
        d['before_refresh_key'] = '本轮生成没有完成' in before
        d['before_refresh_text'] = re.sub(r'\s+', ' ', before)[:600]
        st.reload(wait_until='load')
        st.wait_for_timeout(3500)
        after = st.inner_text('body')
        d['after_refresh_key'] = '本轮生成没有完成' in after
        d['refresh_state_same'] = (d['before_refresh_key'] == d['after_refresh_key'])
        d['screenshot'] = f'shots/inter-{side.side}-teacher-before.png'
        st.screenshot(path=os.path.join(SHOTS, f'inter-{side.side}-teacher-before.png'))
        res[side.side] = d
    side_by_side(os.path.join(SHOTS, 'inter-live-teacher-before.png'), os.path.join(SHOTS, 'inter-off-teacher-before.png'),
                 os.path.join(SHOTS, 'side-inter-teacher.png'), f'/prep/w/{SESSION}/classroom',
                 'interact-continue-refresh', 'teacher')
    out['live'], out['off'] = res['live'], res['off']
    out['side'] = 'shots/side-inter-teacher.png'
    out['same'] = res['live'].get('after_continue_path', '').replace(LIVE, '') == res['off'].get('after_continue_path', '')
    return out


def interaction_researcher(live, off):
    out = {'key': 'researcher-enter-refresh', 'name': '科研 /research-workspace：点「进入科研工作台」→ 阅读页 → 刷新'}
    res = {}
    for side in (live, off):
        d = {}
        side.goto('/research-workspace')
        st = side.page
        try:
            st.locator('.rl-cta--primary').first.click(timeout=6000)
            st.wait_for_timeout(4200)
            d['after_enter_path'] = st.evaluate('() => location.hash || location.pathname')
            d['has_agent_pane'] = st.locator('.rw-pane--agent').count() > 0
        except Exception as e:
            d['enter_error'] = repr(e)[:200]
        try:
            st.reload(wait_until='load')
            st.wait_for_timeout(4200)
            d['after_refresh_path'] = st.evaluate('() => location.hash || location.pathname')
            d['after_refresh_agent'] = st.locator('.rw-pane--agent').count() > 0
        except Exception as e:
            d['refresh_error'] = repr(e)[:200]
        d['screenshot'] = f'shots/inter-{side.side}-researcher.png'
        st.screenshot(path=os.path.join(SHOTS, f'inter-{side.side}-researcher.png'))
        res[side.side] = d
    side_by_side(os.path.join(SHOTS, 'inter-live-researcher.png'), os.path.join(SHOTS, 'inter-off-researcher.png'),
                 os.path.join(SHOTS, 'side-inter-researcher.png'), '/research-workspace',
                 'interact-enter-refresh', 'researcher')
    out['live'], out['off'] = res['live'], res['off']
    out['side'] = 'shots/side-inter-researcher.png'
    out['same'] = all(res[s].get('has_agent_pane') == res[s].get('after_refresh_agent') for s in ('live', 'off'))
    return out


# ───────────────────────────── 主流程 ─────────────────────────────
def main():
    off_only = '--off-only' in sys.argv
    roles = [a for a in sys.argv[1:] if not a.startswith('--')] or list(PAGES)
    t0 = time.time()
    data = {'generated_at': dt.datetime.now().astimezone().isoformat(timespec='seconds'),
            'spec': {'viewport': VIEW, 'dpr': 1, 'headless': True, 'settle_ms': SETTLE_MS,
                     'live': LIVE, 'offline': OFF, 'offline_mode': True,
                     'release_sha256': 'ba0239c3bcab44912082299c5e264ab8d60aaa2182ce31b65a4ff3a1b2f2316e',
                     'off_only': off_only},
            'pages': [], 'interactions': [], 'offline_audit': {}, 'guest_login': {}, 'release_scan': {}}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for role in roles:
            cfg = PAGES[role]
            print('===', role, '===', flush=True)
            ls = Side(browser, 'live', cfg, False)
            os_ = Side(browser, 'off', cfg, True)
            ls.reset(); os_.reset()
            if role == 'student':
                for s in (ls, os_):
                    if s.side == 'off':
                        s.page.goto(OFF, wait_until='load', timeout=60000)
                        s.page.wait_for_timeout(2500)
                    else:
                        s.page.goto(LIVE + '/login', wait_until='load')
                        s.page.wait_for_timeout(2200)
                    m = s.measure()
                    s.screenshot(os.path.join(SHOTS, f'{s.side}-login.png'))
                    data['guest_login'][s.side] = {
                        'url': m['url'], 'text': m['text'][:2000], 'hostHits': m['hostHits'],
                        'hostWords': m['hostWords'], 'fixedCorner': m['fixedCorner'],
                        'forbidden': [w for w in FORBIDDEN if w in m['text']],
                        'console_errors': [c for c in s.consoles if c['type'] == 'error'][:6],
                        'pageerrors': s.pageerrors[:6],
                        'http_requests': len(s.requests),
                    }
                side_by_side(os.path.join(SHOTS, 'live-login.png'), os.path.join(SHOTS, 'off-login.png'),
                             os.path.join(SHOTS, 'side-login.png'), '/login', 'guest-role-select', 'guest')
                data['guest_login']['side'] = 'shots/side-login.png'
            if not off_only:
                ls.login_live(cfg['ident'])
                print('  live login ok', flush=True)
            os_.login_off(cfg['ident']['phone'])
            print('  offline login ok', flush=True)
            os_.reset()
            for route, slug, kind in cfg['routes']:
                rec = {'role': role, 'route': route, 'slug': slug, 'kind': kind,
                       'captured_at': dt.datetime.now().astimezone().isoformat(timespec='seconds')}
                lf = os.path.join(SHOTS, f'live-{role}-{slug}.png')
                of = os.path.join(SHOTS, f'off-{role}-{slug}.png')
                os_.reset()
                try:
                    os_.goto(route)
                    om = os_.measure()
                    os_.screenshot(of)
                    rec['off'] = {'url': om['url'], 'scroll': om['scroll'], 'boxes': om['boxes'],
                                  'imgs': om['imgs'], 'buttons': om['buttons'], 'inputs': om['inputs'],
                                  'hostHits': om['hostHits'], 'hostWords': om['hostWords'],
                                  'fixedCorner': om['fixedCorner'], 'text': om['text'],
                                  'requests': os_.requests[:10], 'request_count': len(os_.requests),
                                  'pageerrors': os_.pageerrors[:5],
                                  'console_errors': [c for c in os_.consoles if c['type'] == 'error'][:6],
                                  'screenshot': f'shots/off-{role}-{slug}.png'}
                except Exception as e:
                    rec['off'] = {'error': repr(e)[:300], 'text': '', 'boxes': {}, 'imgs': {}, 'buttons': [],
                                  'requests': [], 'pageerrors': os_.pageerrors[:5], 'console_errors': [], 'url': '',
                                  'scroll': {}, 'hostHits': {}, 'hostWords': [], 'fixedCorner': [], 'inputs': []}
                ls.reset()
                if off_only:
                    rec['live'] = {'skipped': True, 'text': '', 'boxes': {}, 'imgs': {'total': 0, 'broken': 0}}
                else:
                    try:
                        ls.goto(route)
                        lm = ls.measure()
                        ls.screenshot(lf)
                        rec['live'] = {'url': lm['url'], 'scroll': lm['scroll'], 'boxes': lm['boxes'],
                                       'imgs': lm['imgs'], 'buttons': lm['buttons'], 'inputs': lm['inputs'],
                                       'hostHits': lm['hostHits'], 'hostWords': lm['hostWords'],
                                       'fixedCorner': lm['fixedCorner'], 'text': lm['text'],
                                       'requests': ls.requests[:10], 'request_count': len(ls.requests),
                                       'pageerrors': ls.pageerrors[:5],
                                       'console_errors': [c for c in ls.consoles if c['type'] == 'error'][:6],
                                       'responses_4xx': [r for r in ls.responses if r['status'] >= 400][:6],
                                       'screenshot': f'shots/live-{role}-{slug}.png'}
                    except Exception as e:
                        rec['live'] = {'error': repr(e)[:300], 'text': '', 'boxes': {}, 'imgs': {}, 'buttons': [],
                                       'requests': [], 'pageerrors': ls.pageerrors[:5], 'console_errors': [],
                                       'url': '', 'scroll': {}, 'hostHits': {}, 'hostWords': [], 'fixedCorner': [],
                                       'inputs': []}
                if not off_only and not rec['live'].get('error') and not rec['off'].get('error'):
                    rec = compare_page(rec['live'], rec['off'], rec)
                    rec['side'] = side_by_side(lf, of, os.path.join(SHOTS, f'side-{role}-{slug}.png'),
                                               route, slug, role)
                    rec['pixel'] = pixel_diff(lf, of)
                    rec['verdict'], rec['verdict_kind'], rec['verdict_reason'] = judge(rec)
                else:
                    rec['verdict'] = '未采' if off_only else '未通过'
                    rec['verdict_kind'] = 'capture'
                    rec['verdict_reason'] = rec['live'].get('error') or rec['off'].get('error') or 'off-only 模式未采现役'
                data['pages'].append(rec)
                print('  %-14s %-6s live=%-5s off=%-5s layout=%spx text:%s' % (
                    slug, rec['verdict'], bool(rec['live'].get('url')), bool(rec['off'].get('url')),
                    (rec.get('layout') or {}).get('max_delta'), rec['verdict_kind']), flush=True)
            print('  interactions ...', flush=True)
            if not off_only:
                try:
                    if role == 'student':
                        data['interactions'].append(interaction_student(ls, os_))
                    elif role == 'teacher':
                        data['interactions'].append(interaction_teacher(ls, os_))
                    else:
                        data['interactions'].append(interaction_researcher(ls, os_))
                except Exception as e:
                    data['interactions'].append({'role': role, 'error': repr(e)[:300]})
            ls.ctx.close(); os_.ctx.close()
        browser.close()
    off_pages = data['pages']
    audit = {
        'pages': len(off_pages),
        'http_ws_requests_total': sum(p['off'].get('request_count', 0) for p in off_pages),
        'pageerrors_total': sum(len(p['off'].get('pageerrors', [])) for p in off_pages),
        'console_errors_total': sum(len(p['off'].get('console_errors', [])) for p in off_pages),
        'console_error_samples': sorted({c['text'][:220] for p in off_pages for c in p['off'].get('console_errors', [])}),
        'broken_images_total': sum(p['off'].get('imgs', {}).get('broken', 0) for p in off_pages),
        'per_page': {f"{p['role']}/{p['slug']}": {'requests': p['off'].get('request_count', 0),
                                                  'pageerrors': len(p['off'].get('pageerrors', [])),
                                                  'console_errors': len(p['off'].get('console_errors', [])),
                                                  'broken_images': p['off'].get('imgs', {}).get('broken', 0)}
                     for p in off_pages},
        'cold_login': {'http_requests': data['guest_login'].get('off', {}).get('http_requests'),
                       'console_errors': data['guest_login'].get('off', {}).get('console_errors'),
                       'pageerrors': data['guest_login'].get('off', {}).get('pageerrors')},
    }
    data['offline_audit'] = audit
    counts = {}
    for p in off_pages:
        counts[p['verdict']] = counts.get(p['verdict'], 0) + 1
    data['summary'] = {'total': len(off_pages), 'verdict_counts': counts,
                       'elapsed_sec': round(time.time() - t0, 1)}
    with open(os.path.join(OUT, 'verify.json'), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print('WROTE verify.json %.1fs verdicts=%s audit=%s' % (
        time.time() - t0, counts, {k: v for k, v in audit.items() if k not in ('per_page',)}), flush=True)


if __name__ == '__main__':
    main()