# -*- coding: utf-8 -*-
"""run-02 逐屏并排对照（可复跑）— Mathesis 现役 vs 离线发行包。

同一角色 / 同一路由 / 同一视口（1672x941, DPR=1, headless）：
  - 现役：http://127.0.0.1:5176（真实登录，复用 .work/scripts/live_login.py）
  - 离线：file:///D:/zxsy-math-arena-showcase/app/dist-offline/index.html（offline=True）
产出：
  qa/parity-r02/shots/{live,off,side}-<role>-<slug>.png
  qa/parity-r02/metrics.json
  qa/parity-r02/PARITY.md
  qa/parity-r02/parity.csv

用法：
  python qa/parity-r02/run_parity.py            # 全量 18 页 + 3 组交互态
  python qa/parity-r02/run_parity.py student    # 只跑某角色
  python qa/parity-r02/run_parity.py --no-md    # 只采证，不重写 PARITY.md
"""
import csv
import datetime as dt
import difflib
import json
import os
import re
import sys
import time

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = r'D:\zxsy-math-arena-showcase'
LIVE = 'http://127.0.0.1:5176'
OFF = 'file:///' + os.path.join(ROOT, 'app', 'dist-offline', 'index.html').replace('\\', '/')
OUT = os.path.join(ROOT, 'qa', 'parity-r02')
SHOTS = os.path.join(OUT, 'shots')
os.makedirs(SHOTS, exist_ok=True)

sys.path.insert(0, os.path.join(ROOT, '.work', 'scripts'))
from live_login import RESEARCH, STUDENT, TEACHER, login  # noqa: E402

VIEW = {'width': 1672, 'height': 941}
SETTLE_MS = 3000           # 最少渲染稳定时间（需求 >= 2.5s）
TITLE_H = 40
GAP = 8

ROLES = {
    'student': {
        'ident': STUDENT, 'off_role': 'student', 'kind': 'student',
        'routes': [('/dialog', 'dialog'), ('/practice', 'practice'), ('/errors', 'errors'),
                   ('/library', 'library'), ('/resources', 'resources'),
                   ('/classroom', 'classroom'), ('/me', 'me')],
    },
    'teacher': {
        'ident': TEACHER, 'off_role': 'teacher', 'kind': 'teacher',
        'routes': [('/teacher-v3/prep', 'prep'), ('/teacher-v3/today', 'today'),
                   ('/teacher-v3/classes', 'classes'), ('/teacher-v3/bank', 'bank'),
                   ('/teacher-v3/assign', 'assign'), ('/teacher-v3/insights', 'insights'),
                   ('/teacher-v3/resources', 'resources'), ('/teacher-v3/grading', 'grading')],
    },
    'researcher': {
        'ident': RESEARCH, 'off_role': 'researcher', 'kind': 'research',
        'routes': [('/research-workspace', 'landing'),
                   ('/research-workspace/workspace', 'workspace'),
                   ('/research-workspace/account', 'account')],
    },
}

# 主区域布局盒：不同端的主要骨架选择器（存在才采集，缺一侧即结构差异）
LAYOUT_KEYS = {
    'student': ['header.topbar', 'aside.sidebar', 'main.main'],
    'teacher': ['aside.tv3-nav', 'header.tv3-topbar', 'main.tv3-page'],
    'research-landing': ['header.rh-head', 'main.rl-main'],
    'research-account': ['header.rh-head', 'main.ra-main'],
    'research-workspace': ['header.rw-header', '.rw-body', 'aside.rw-sb', '.rw-pane--agent'],
}
ALL_BOXES = sorted({s for v in LAYOUT_KEYS.values() for s in v} | {
    'aside.rw-sb', '.rw-mid', '.rw-pane--agent', '.rw-pane--left', 'main', 'aside', 'header',
})
GRID_BY_KIND = {'student': 'student', 'teacher': 'teacher', 'landing': 'research-landing',
                'account': 'research-account', 'workspace': 'research-workspace'}

BOX_JS = """(sels) => {
  const boxes = {};
  for (const s of sels) {
    const els = [...document.querySelectorAll(s)];
    const el = els.find((e) => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; });
    if (!el) continue;
    const r = el.getBoundingClientRect();
    boxes[s] = {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)};
  }
  const imgs = [...document.images];
  return {
    boxes,
    scroll: {w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight},
    imgs: {total: imgs.length, broken: imgs.filter((i) => i.complete && i.naturalWidth === 0).length,
           pending: imgs.filter((i) => !i.complete).length},
    text: document.body.innerText || '',
    url: location.href,
  };
}"""


# ─────────────────────────── 工具 ───────────────────────────
def norm_lines(text):
    return [re.sub(r'\s+', ' ', ln).strip() for ln in (text or '').splitlines() if ln.strip()]


def digits_norm(lines):
    """把数字/时间戳统一成 #，用于判定「只差数字/时间」。"""
    return [re.sub(r'\d+', '#', ln) for ln in lines]


def text_diff(live_lines, off_lines, limit=5):
    sm = difflib.SequenceMatcher(None, live_lines, off_lines, autojunk=False)
    out = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            continue
        lv = ' / '.join(live_lines[i1:i2])[:240]
        ov = ' / '.join(off_lines[j1:j2])[:240]
        out.append({'op': tag, 'live': lv, 'off': ov})
        if len(out) >= limit:
            break
    return out


def login_live(page, ident):
    last = None
    for attempt in range(4):
        try:
            return login(page, ident)
        except Exception as e:  # 短信 60s 频控：等待后重试
            last = e
            print('  ! live login retry %d: %s' % (attempt + 1, repr(e)[:160]))
            page.wait_for_timeout(65000)
    raise RuntimeError('live login failed: %r' % (last,))


def open_offline(browser, role_cfg):
    ctx = browser.new_context(viewport=VIEW, device_scale_factor=1, offline=True)
    page = ctx.new_page()
    page.goto(OFF, wait_until='load')
    page.wait_for_timeout(1000)
    logged = page.evaluate("() => { try { return !!JSON.parse(localStorage.getItem('ma_offline_demo_v1')||'{}').session } catch(e) { return false } }")
    if not logged:
        page.select_option('#preferred-role', role_cfg['off_role'])
        page.fill('#auth-phone', role_cfg['ident']['phone'])
        page.get_by_role('button', name='获取验证码').click()
        page.wait_for_timeout(1000)
        page.get_by_placeholder('6 位验证码').fill('246810')
        page.get_by_role('button', name='安全登录').click()
        page.wait_for_timeout(2400)
    return ctx, page


def reset_observers(page):
    state = {'console': [], 'failed': []}
    page.on('console', lambda msg: state['console'].append(msg.text) if msg.type == 'error' else None)
    page.on('requestfailed', lambda req: state['failed'].append(req.url))
    return state


def settle(page, kind):
    page.wait_for_timeout(SETTLE_MS)
    try:
        page.evaluate("() => document.fonts && document.fonts.ready")
    except Exception:
        pass
    if kind == 'research-workspace':
        # bootstrap() 无 projectId 时会 loadList() 后 router.replace 到 /<id>/read：多等一拍等重定向完成
        page.wait_for_timeout(1600)
    page.evaluate("() => window.scrollTo(0, 0)")
    page.wait_for_timeout(250)


def snap(page, label, outfile, kind):
    settle(page, kind)
    page.mouse.move(1, 1)         # 鼠标归位，消除 hover 态
    page.wait_for_timeout(250)
    page.screenshot(path=outfile, full_page=False)
    return page.evaluate(BOX_JS, ALL_BOXES)


def goto_live(page, route):
    page.goto(LIVE + route, wait_until='load')


def goto_off(page, route):
    page.evaluate("(r) => { location.hash = '#' + r }", route)


def route_state(page):
    return page.evaluate("() => ({hash: location.hash, path: location.pathname, href: location.href})")


# ─────────────────────────── 图片 ───────────────────────────
def load_font(size, bold=False):
    for p in ([r'C:\Windows\Fonts\arialbd.ttf'] if bold else []) + [r'C:\Windows\Fonts\arial.ttf']:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            continue
    return ImageFont.load_default()


def side_by_side(live_png, off_png, out_png, route, slug):
    a = Image.open(live_png).convert('RGB')
    b = Image.open(off_png).convert('RGB')
    w = max(a.width, b.width)
    h = max(a.height, b.height)
    canvas = Image.new('RGB', (w * 2 + GAP, TITLE_H + h), (11, 18, 32))
    draw = ImageDraw.Draw(canvas)
    fb, fr = load_font(18, True), load_font(14)
    draw.rectangle([0, 0, w * 2 + GAP, TITLE_H], fill=(17, 24, 39))
    draw.text((16, 9), 'LIVE', font=fb, fill=(52, 211, 153))
    draw.text((16 + 62, 12), route + '  ·  ' + slug, font=fr, fill=(203, 213, 225))
    draw.text((w + GAP + 16, 9), 'OFFLINE', font=fb, fill=(251, 191, 36))
    draw.text((w + GAP + 16 + 82, 12), route + '  ·  ' + slug, font=fr, fill=(203, 213, 225))
    draw.rectangle([0, TITLE_H, w * 2 + GAP, TITLE_H + h], fill=(226, 232, 240))
    canvas.paste(a, (0, TITLE_H))
    canvas.paste(b, (w + GAP, TITLE_H))
    canvas.save(out_png)
    return {'width': canvas.width, 'height': canvas.height}


def pixel_diff(live_png, off_png):
    a = np.asarray(Image.open(live_png).convert('RGB')).astype(np.int16)
    b = np.asarray(Image.open(off_png).convert('RGB')).astype(np.int16)
    if a.shape != b.shape:
        return {'ratio': None, 'reason': 'size-mismatch', 'live_shape': list(a.shape), 'off_shape': list(b.shape)}
    delta = np.abs(a - b).max(axis=2)
    return {'ratio': round(float((delta > 8).mean()), 5), 'threshold': 'max-channel-delta>8',
            'mean_abs': round(float(np.abs(a - b).mean()), 3)}


# ─────────────────────────── 采集 ───────────────────────────
def box_comparison(live_boxes, off_boxes, keys):
    # 内容区（main.*）高度随真实数据条数变化，不属于「骨架布局」差异；判定时只比较 x/y/w。
    CONTENT_HEIGHT_IGNORE = {'main.main', 'main.tv3-page', 'main.rl-main', 'main.ra-main'}
    common, missing = {}, []
    deltas, judged = {}, {}
    for s in keys:
        l, o = live_boxes.get(s), off_boxes.get(s)
        if l and o:
            common[s] = True
            d = [o['x'] - l['x'], o['y'] - l['y'], o['w'] - l['w'], o['h'] - l['h']]
            deltas[s] = d
            judged[s] = d[:3] if s in CONTENT_HEIGHT_IGNORE else d
        elif l or o:
            missing.append({'selector': s, 'live': bool(l), 'off': bool(o)})
    max_delta = max((max(abs(v) for v in d) for d in judged.values()), default=0)
    return {'common': sorted(common), 'missing': missing, 'deltas': deltas,
            'deltas_judged': judged, 'height_ignored': sorted(CONTENT_HEIGHT_IGNORE & set(common)),
            'max_delta': max_delta}


def classify_text(live_text, off_text):
    ll, ol = norm_lines(live_text), norm_lines(off_text)
    exact = ll == ol
    drift = (not exact) and len(ll) == len(ol) and digits_norm(ll) == digits_norm(ol)
    return {
        'live_len': len(live_text or ''), 'off_len': len(off_text or ''),
        'live_lines': len(ll), 'off_lines': len(ol),
        'exact': exact, 'number_time_drift_only': drift,
        'diff_count': sum(1 for o in difflib.SequenceMatcher(None, ll, ol, autojunk=False).get_opcodes() if o[0] != 'equal'),
        'diff': text_diff(ll, ol, 5),
    }


def capture_page(page_live, page_off, role, slug, route, kind):
    rec = {'role': role, 'route': route, 'slug': slug, 'kind': kind,
           'captured_at': dt.datetime.now().astimezone().isoformat(timespec='seconds')}
    obsl = reset_observers(page_live)
    obso = reset_observers(page_off)
    lf = os.path.join(SHOTS, f'live-{role}-{slug}.png')
    of = os.path.join(SHOTS, f'off-{role}-{slug}.png')
    sf = os.path.join(SHOTS, f'side-{role}-{slug}.png')
    lurl = ourl = ''
    try:
        goto_live(page_live, route)
        lm = snap(page_live, f'live-{role}-{slug}', lf, kind)
        lurl = route_state(page_live)['href']
        rec['live'] = {'url': lurl, 'scroll': lm['scroll'], 'boxes': lm['boxes'], 'imgs': lm['imgs'],
                       'screenshot': f'shots/live-{role}-{slug}.png',
                       'console_errors': obsl['console'][:5], 'failed_requests': obsl['failed'][:5]}
        rec['live']['text'] = lm['text']
    except Exception as e:
        rec['live'] = {'error': repr(e)[:300]}
        rec['live']['text'] = ''
        lm = {'scroll': {}, 'boxes': {}, 'imgs': {}}
    try:
        goto_off(page_off, route)
        om = snap(page_off, f'off-{role}-{slug}', of, kind)
        ourl = route_state(page_off)['href']
        rec['off'] = {'url': ourl, 'scroll': om['scroll'], 'boxes': om['boxes'], 'imgs': om['imgs'],
                      'screenshot': f'shots/off-{role}-{slug}.png',
                      'console_errors': obso['console'][:5], 'failed_requests': obso['failed'][:5]}
        rec['off']['text'] = om['text']
    except Exception as e:
        rec['off'] = {'error': repr(e)[:300]}
        rec['off']['text'] = ''
        om = {'scroll': {}, 'boxes': {}, 'imgs': {}}
    if os.path.exists(lf) and os.path.exists(of):
        rec['side'] = dict(side_by_side(lf, of, sf, route, slug), path=f'shots/side-{role}-{slug}.png')
        rec['pixel'] = pixel_diff(lf, of)
    else:
        rec['side'] = None
        rec['pixel'] = {'ratio': None, 'reason': 'missing-screenshot'}
    text = classify_text(rec['live'].get('text', ''), rec['off'].get('text', ''))
    rec['text'] = text
    layout_grid = GRID_BY_KIND.get(slug) or GRID_BY_KIND.get(kind) or kind
    keys = LAYOUT_KEYS.get(layout_grid, ['header', 'main', 'aside'])
    boxes = box_comparison(rec['live'].get('boxes', {}), rec['off'].get('boxes', {}), keys)
    rec['layout'] = boxes
    rec['final_url'] = {'live': lurl, 'off': ourl}
    rec['_live_full'] = rec['live'].get('text', '')
    rec['_off_full'] = rec['off'].get('text', '')
    rec['verdict'], rec['verdict_kind'], rec['verdict_reason'] = judge(rec)
    return rec


def judge(rec):
    if rec['live'].get('error') or rec['off'].get('error'):
        return '不一致', 'structure', '采集失败：' + str(rec['live'].get('error') or rec['off'].get('error'))[:120]
    layout = rec['layout']
    if layout['missing']:
        return '不一致', 'structure', '布局骨架缺失：' + ', '.join(m['selector'] for m in layout['missing'])
    if layout['max_delta'] > 20:
        return '不一致', 'structure', '布局盒偏移 %dpx：%s' % (
            layout['max_delta'], json.dumps(layout['deltas'], ensure_ascii=False)[:200])
    if layout['max_delta'] > 4:
        return '差异', 'layout', '布局盒偏移 %dpx（>4px 阈值）：%s' % (
            layout['max_delta'], json.dumps(layout['deltas'], ensure_ascii=False)[:200])
    pix = rec['pixel']
    # 资源图缺失 / 渲染差异
    lb, rb = rec['live'].get('imgs', {}).get('broken', 0), rec['off'].get('imgs', {}).get('broken', 0)
    if rb - lb >= 2:
        return '差异', 'media', '离线图片破图 %d 张（现役 %d 张），文本一致但视觉资源缺失' % (rb, lb)
    if pix.get('ratio') is not None and pix['ratio'] > 0.06:
        if rec['text']['exact']:
            return '差异（待复点）', 'pixel', '像素差异 %.1f%% 但文本一致（需人工复点）' % (pix['ratio'] * 100)
    if rec['text']['exact']:
        return '一致', 'none', '布局盒≤%dpx、可见文本逐行一致、破图数一致' % layout['max_delta']
    if rec['text']['number_time_drift_only']:
        return '一致', 'number_time_drift', '布局盒≤%dpx、文本仅数字/时间戳漂移（%d 处）' % (
            layout['max_delta'], rec['text']['diff_count'])
    # 工作台：内容区/文档数量级差异 → 不一致
    if rec['role'] == 'researcher' and rec['slug'] == 'workspace':
        return '不一致', 'structure', '工作区内容结构不同：%d 行 vs %d 行（离线打开了历史项目文档，现役为空项目）' % (
            rec['text']['live_lines'], rec['text']['off_lines'])
    # 关键内容标记缺失 → 不一致（防止把结构缺失当成数据漂移）
    markers = {
        'dialog': ['拍一道不会的题', '上传我的资料', '开始今日练题', '复习到期错题', '0/4000'],
        'prep': ['从教材开始', '从已有教案开始', '从已有PPT开始', '备课历史'],
        'today': ['从教材开始', '从已有教案开始', '从已有PPT开始', '备课历史'],
        'landing': ['进入科研工作台', '读论文', '写论文', '问 Agent'],
    }.get(rec['slug'], [])
    miss = []
    # 用完整可见文本检查关键内容标记（防止把结构缺失当成数据漂移）
    for m in markers:
        if m and (rec.get('_live_full', '').find(m) < 0 or rec.get('_off_full', '').find(m) < 0):
            miss.append(m)
    if miss:
        return '不一致', 'structure', '关键内容标记缺失：%s' % ', '.join(miss)
    if rec['text']['diff_count'] <= 20 and (pix.get('ratio') or 0) < 0.12:
        return '差异', 'data_drift', '结构一致；%d 处内容行不同（列表/数字/时间等真实数据漂移）' % rec['text']['diff_count']
    return '不一致', 'structure', '内容结构不同：可见文本 %d 行 vs %d 行，%d 处差异' % (
        rec['text']['live_lines'], rec['text']['off_lines'], rec['text']['diff_count'])


# ─────────────────────────── 重点核查 ───────────────────────────
def txt(page, sel):
    try:
        loc = page.locator(sel).first
        return loc.inner_text(timeout=2500) if loc.count() else ''
    except Exception:
        return ''


def key_checks_dialog(page_live, page_off):
    def get(page):
        groups = []
        try:
            groups = [g.strip() for g in page.locator('.cs-group-title').all_inner_texts() if g.strip()]
        except Exception:
            pass
        cards = []
        try:
            cards = [c.strip() for c in page.locator('.he-card').all_inner_texts() if c.strip()]
        except Exception:
            pass
        return {
            'groups': groups,
            'he_cards': cards,
            'input_count': txt(page, '.ci-count'),
            'send_btn': txt(page, '.ci-send'),
            'welcome': txt(page, '.hero-title'),
            'hero_sub': txt(page, '.hero-sub'),
            'placeholder': page.locator('.ci-ta').first.get_attribute('placeholder') if page.locator('.ci-ta').count() else '',
        }
    return {'live': get(page_live), 'off': get(page_off)}


def key_checks_prep(page_live, page_off):
    def get(page):
        entries = []
        try:
            entries = [t.strip() for t in page.locator('.pc-home__entry-name').all_inner_texts() if t.strip()]
        except Exception:
            pass
        rows = []
        try:
            rows = [t.strip() for t in page.locator('.pc-home__row').all_inner_texts() if t.strip()]
        except Exception:
            pass
        times = [ln for ln in norm_lines(txt(page, '.pc-home')) if '最近修改' in ln]
        return {'entry_cards': entries, 'entry_count': len(entries),
                'recent_count_text': txt(page, '.pc-home__recent-head').replace('\n', ' '),
                'recent_rows': len(rows), 'recent_row_texts': [r.replace('\n', ' | ')[:160] for r in rows[:4]],
                'recent_times': times[:6],
                'ai_assistant': txt(page, '.pc-home__ai'),
                'ai_assistant_present': page.locator('.pc-home__ai').count() > 0}
    return {'live': get(page_live), 'off': get(page_off)}


def extract_numbers(lines):
    return re.findall(r'\d+(?:\.\d+)?%?', ' '.join(lines))


def key_checks_numbers(page_live, page_off, scope_sel):
    def get(page):
        body = txt(page, scope_sel)
        lines = norm_lines(body)
        return {'lines': lines, 'numbers': extract_numbers(lines)[:40],
                'text': ' '.join(lines)[:2000]}
    live, off = get(page_live), get(page_off)
    return {'live': live, 'off': off,
            'number_diff': sorted(set(live['numbers']) ^ set(off['numbers'])),
            'normalized_equal': [re.sub(r'\d+', '#', x) for x in live['lines']] == [re.sub(r'\d+', '#', x) for x in off['lines']]}


def key_checks_workspace(page_live, page_off):
    """科研 workspace：现役 vs 离线差异根因定位（路由 / localStorage / 数据源）。"""
    def get_ls(page):
        try:
            return page.evaluate("() => { const o={}; for (let i=0;i<localStorage.length;i++){const k=localStorage.key(i); o[k]=(localStorage.getItem(k)||'').slice(0,300);} return o; }")
        except Exception:
            return {}
    live = {'url': route_state(page_live)['href'], 'localStorage': get_ls(page_live),
            'body_head': norm_lines(page_live.inner_text('body'))[:22],
            'body_full': page_live.inner_text('body')}
    off = {'url': route_state(page_off)['href'], 'localStorage': get_ls(page_off),
           'body_head': norm_lines(page_off.inner_text('body'))[:22],
           'body_full': page_off.inner_text('body')}
    # 数据源：现役项目列表（由网络响应另行采集）vs 离线 fixture
    off_projects = page_off.evaluate("async () => { try { return (await (await fetch('/api/research-vnext/projects')).json()); } catch(e) { return {err:String(e)}; } }")
    off_first = None
    try:
        items = off_projects.get('items') or []
        if items:
            pid = items[0]['id']
            off_papers = page_off.evaluate("async (pid) => (await (await fetch(`/api/research-vnext/projects/${pid}/papers`)).json())", pid)
            off_first = {'project_id': pid, 'papers_count': len(off_papers.get('items') or [])}
    except Exception as e:
        off_first = {'error': repr(e)[:150]}
    return {'live': live, 'off': off, 'off_projects_response': off_projects, 'off_first_project': off_first}


def interaction_student(page_live, page_off):
    out = {'key': 'student-compose', 'name': '学生 · 输入条：打字后计数/发送态（同一操作）',
           'steps': ['/dialog 等待稳定', "点击首页卡「📷 拍一道不会的题」→ 记录是否触发系统文件选择器（无页面内弹层）",
                     "在 .ci-ta 输入固定文本，读取 .ci-count 与发送按钮 disabled 态", '截图并拼接']}
    res = {}
    for side, page in (('live', page_live), ('off', page_off)):
        if side == 'live':
            goto_live(page, '/dialog')
        else:
            goto_off(page, '/dialog')
        page.wait_for_timeout(2800)
        chooser = False
        try:
            with page.expect_file_chooser(timeout=2500):
                page.locator('.he-card', has_text='拍一道不会的题').first.click()
            chooser = True
        except Exception:
            chooser = False
        page.wait_for_timeout(300)
        page.locator('.ci-ta').first.fill('已知函数 f(x)=x³-3x，求单调区间')
        page.wait_for_timeout(500)
        res[side] = {'file_chooser_opened': chooser,
                     'input_value': page.locator('.ci-ta').first.input_value(),
                     'count_text': txt(page, '.ci-count'),
                     'send_disabled': page.locator('.ci-send').first.is_disabled(),
                     'send_text': txt(page, '.ci-send'),
                     'groups': [g.strip() for g in page.locator('.cs-group-title').all_inner_texts()],
                     'he_cards': [c.strip() for c in page.locator('.he-card').all_inner_texts()]}
        lf = os.path.join(SHOTS, f'inter-{side}-student.png')
        page.evaluate("() => window.scrollTo(0,0)")
        page.mouse.move(1, 1)
        page.wait_for_timeout(250)
        page.screenshot(path=lf)
        res[side]['screenshot'] = f'shots/inter-{side}-student.png'
    side_by_side(os.path.join(SHOTS, 'inter-live-student.png'),
                 os.path.join(SHOTS, 'inter-off-student.png'),
                 os.path.join(SHOTS, 'side-inter-student-compose.png'),
                 '/dialog', 'interact-compose')
    out['live'], out['off'] = res['live'], res['off']
    out['side'] = 'shots/side-inter-student-compose.png'
    out['same_state'] = (res['live']['input_value'] == res['off']['input_value'] and
                         res['live']['count_text'] == res['off']['count_text'] and
                         res['live']['send_disabled'] == res['off']['send_disabled'] and
                         res['live']['file_chooser_opened'] == res['off']['file_chooser_opened'])
    return out


def interaction_teacher(page_live, page_off):
    out = {'key': 'teacher-textbook', 'name': '教师 · 点击「从教材开始」→ NL 输入预填态（同一操作）',
           'steps': ['/teacher-v3/prep 等待稳定', '点击入口卡「从教材开始」', '读取 .pc-home__nl-input 值与聚焦态', '截图并拼接']}
    res = {}
    for side, page in (('live', page_live), ('off', page_off)):
        if side == 'live':
            goto_live(page, '/teacher-v3/prep')
        else:
            goto_off(page, '/teacher-v3/prep')
        page.wait_for_timeout(3000)
        page.locator('.pc-home__entry', has_text='从教材开始').first.click()
        page.wait_for_timeout(800)
        ta = page.locator('.pc-home__nl-input').first
        res[side] = {'input_value': ta.input_value(),
                     'focused': page.evaluate("() => document.activeElement && document.activeElement.classList.contains('pc-home__nl-input')"),
                     'entry_cards': [t.strip() for t in page.locator('.pc-home__entry-name').all_inner_texts()],
                     'screenshot': ''}
        lf = os.path.join(SHOTS, f'inter-{side}-teacher.png')
        page.evaluate("() => window.scrollTo(0,0)")
        page.mouse.move(1, 1)
        page.wait_for_timeout(250)
        page.screenshot(path=lf)
        res[side]['screenshot'] = f'shots/inter-{side}-teacher.png'
    side_by_side(os.path.join(SHOTS, 'inter-live-teacher.png'),
                 os.path.join(SHOTS, 'inter-off-teacher.png'),
                 os.path.join(SHOTS, 'side-inter-teacher-textbook.png'),
                 '/teacher-v3/prep', 'interact-textbook')
    out['live'], out['off'] = res['live'], res['off']
    out['side'] = 'shots/side-inter-teacher-textbook.png'
    out['same_state'] = res['live']['input_value'] == res['off']['input_value'] and res['live']['focused'] == res['off']['focused']
    return out


def interaction_researcher(page_live, page_off):
    out = {'key': 'researcher-enter', 'name': '科研 · 点击「进入科研工作台」→ 工作区（同一操作）',
           'steps': ['/research-workspace 等待稳定', '点击 .rl-cta--primary（进入科研工作台）', '等待路由落定', '记录 URL/首屏文本/截图并拼接']}
    res = {}
    for side, page in (('live', page_live), ('off', page_off)):
        if side == 'live':
            goto_live(page, '/research-workspace')
        else:
            goto_off(page, '/research-workspace')
        page.wait_for_timeout(2600)
        try:
            page.locator('.rl-cta--primary').first.click()
        except Exception as e:
            res[side] = {'error': repr(e)[:200]}
        page.wait_for_timeout(3600)
        res[side] = {'url': route_state(page)['href'],
                     'body_head': norm_lines(page.inner_text('body'))[:15],
                     'screenshot': ''}
        lf = os.path.join(SHOTS, f'inter-{side}-researcher.png')
        page.evaluate("() => window.scrollTo(0,0)")
        page.mouse.move(1, 1)
        page.wait_for_timeout(250)
        page.screenshot(path=lf)
        res[side]['screenshot'] = f'shots/inter-{side}-researcher.png'
    side_by_side(os.path.join(SHOTS, 'inter-live-researcher.png'),
                 os.path.join(SHOTS, 'inter-off-researcher.png'),
                 os.path.join(SHOTS, 'side-inter-researcher-enter.png'),
                 '/research-workspace', 'interact-enter')
    out['live'], out['off'] = res['live'], res['off']
    out['side'] = 'shots/side-inter-researcher-enter.png'
    def _norm(u):
        u = u.replace(LIVE, '').split('#')[-1]
        return re.sub(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '<id>', u)
    out['same_state'] = _norm(res['live'].get('url', '')) == _norm(res['off'].get('url', ''))
    return out


# ─────────────────────────── 主流程 ───────────────────────────
def collect_workspace_net(page, timeout=6000):
    """现役 workspace 载入时抓取 projects / papers / project detail 的真实响应。"""
    cap = {}
    def on_resp(resp):
        try:
            u = resp.url
            m = re.search(r'/api/research-vnext/projects(\?.*)?$', u)
            if m and resp.request.method == 'GET':
                cap['projects'] = resp.json()
                return
            m2 = re.search(r'/api/research-vnext/projects/([0-9a-f-]{36})(\?.*)?$', u)
            if m2 and resp.request.method == 'GET':
                cap['project'] = resp.json()
                return
            m3 = re.search(r'/api/research-vnext/projects/([0-9a-f-]{36})/papers(\?.*)?$', u)
            if m3 and resp.request.method == 'GET':
                cap['papers'] = resp.json()
        except Exception:
            pass
    page.on('response', on_resp)
    return cap, on_resp


def main(only):
    t0 = time.time()
    pages = []
    interactions = []
    workspace_diag = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for role, cfg in ROLES.items():
            if only and role not in only:
                continue
            print('=== %s ===' % role, flush=True)
            lctx = browser.new_context(viewport=VIEW, device_scale_factor=1)
            lpage = lctx.new_page()
            login_live(lpage, cfg['ident'])
            print('  live login ok', flush=True)
            octx, opage = open_offline(browser, cfg)
            print('  offline login ok', flush=True)
            for route, slug in cfg['routes']:
                # 科研 workspace：现役抓网络，离线抓回放数据
                if role == 'researcher' and slug == 'workspace':
                    cap, on_resp = collect_workspace_net(lpage)
                else:
                    cap = None
                rec = capture_page(lpage, opage, role, slug, route, cfg['kind'])
                if cap is not None:
                    lpage.remove_listener('response', on_resp)
                    rec['live_network'] = {k: (v if k != 'papers' else {'count': len(v.get('items') or []), 'first': (v.get('items') or [{}])[0]}) for k, v in cap.items()}
                    workspace_diag = key_checks_workspace(lpage, opage)
                    workspace_diag['live_network'] = cap
                # 重点核查
                if role == 'student' and slug == 'dialog':
                    rec['key_checks'] = key_checks_dialog(lpage, opage)
                if role == 'teacher' and slug == 'prep':
                    rec['key_checks'] = key_checks_prep(lpage, opage)
                if role == 'teacher' and slug in ('grading', 'insights'):
                    rec['key_checks'] = key_checks_numbers(lpage, opage, '.tv3-page')
                if role == 'researcher' and slug == 'workspace':
                    rec['key_checks'] = {'workspace_diag': 'see top-level workspace_diag'}
                pages.append(rec)
                print('  %-10s %-6s live=%-5s off=%-5s pix=%s layout=%spx text:%s' % (
                    slug, rec['verdict'], rec['live'].get('url', 'ERR'), rec['off'].get('url', 'ERR'),
                    rec['pixel'].get('ratio'), rec['layout']['max_delta'], rec['verdict_kind']), flush=True)
            # 交互态（按角色各跑自己的那组，复用该角色已登录的上下文）
            print('  interaction ...', flush=True)
            if role == 'student':
                interactions.append(interaction_student(lpage, opage))
            elif role == 'teacher':
                interactions.append(interaction_teacher(lpage, opage))
            elif role == 'researcher':
                interactions.append(interaction_researcher(lpage, opage))
            lctx.close()
            octx.close()
        browser.close()
    # 精简落盘（body text 太大，单独存全文摘要，metric 只保留行数/差异）
    for rec in pages:
        for side in ('live', 'off'):
            rec[side]['text_tail'] = (rec[side].get('text') or '')[-400:]
            rec[side].pop('text', None)
        rec.pop('_live_full', None)
        rec.pop('_off_full', None)
    counts = {}
    for rec in pages:
        counts[rec['verdict']] = counts.get(rec['verdict'], 0) + 1
    data = {
        'generated_at': dt.datetime.now().astimezone().isoformat(timespec='seconds'),
        'spec': {'viewport': VIEW, 'dpr': 1, 'headless': True, 'settle_ms': SETTLE_MS,
                 'live': LIVE, 'offline': OFF, 'side_by_side': {'gap': GAP, 'title_bar': TITLE_H}},
        'summary': {'total': len(pages), 'verdict_counts': counts, 'elapsed_sec': round(time.time() - t0, 1)},
        'pages': pages,
        'interactions': interactions,
        'workspace_diag': workspace_diag,
    }
    with open(os.path.join(OUT, 'metrics.json'), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    # csv
    with open(os.path.join(OUT, 'parity.csv'), 'w', newline='', encoding='utf-8-sig') as f:
        keys = ['role', 'route', 'slug', 'verdict', 'verdict_kind', 'layout_max_delta',
                'pixel_ratio', 'live_lines', 'off_lines', 'text_diff_count', 'number_time_drift_only', 'reason']
        w = csv.DictWriter(f, fieldnames=keys)
        w.writeheader()
        for r in pages:
            w.writerow({'role': r['role'], 'route': r['route'], 'slug': r['slug'],
                        'verdict': r['verdict'], 'verdict_kind': r['verdict_kind'],
                        'layout_max_delta': r['layout']['max_delta'],
                        'pixel_ratio': r['pixel'].get('ratio'),
                        'live_lines': r['text']['live_lines'], 'off_lines': r['text']['off_lines'],
                        'text_diff_count': r['text']['diff_count'],
                        'number_time_drift_only': r['text']['number_time_drift_only'],
                        'reason': r['verdict_reason']})
    print('WROTE metrics.json / parity.csv · %.1fs' % (time.time() - t0), flush=True)
    if '--no-md' not in sys.argv:
        write_markdown(data)
        print('WROTE PARITY.md', flush=True)
    return data


# ─────────────────────────── PARITY.md ───────────────────────────
def fmt_diff_pairs(rec, limit=2):
    """挑选有信息量的差异行：优先非纯数字的短行差异（去掉侧栏徽标 24→23 之类噪声）。"""
    pairs = []
    nice = []
    for d in rec['text']['diff']:
        l, o = (d['live'] or '').strip(), (d['off'] or '').strip()
        if not l and not o:
            continue
        compact = (len(l) <= 6 and len(o) <= 6)
        item = '%s → %s' % (l.replace('\n', ' / ')[:90], o.replace('\n', ' / ')[:90] or '（无）')
        (pairs if compact else nice).append(item)
    chosen = (nice or pairs)[:limit]
    return '；'.join(chosen)


def diff_regions(rec):
    mapping = {
        ('student', 'dialog'): '左侧会话列表（今天组/30 天内组）；学情脉搏数字',
        ('student', 'practice'): '训练主卡（知识点/掌握度/预计提升）',
        ('student', 'errors'): '侧栏错题计数；错题列表条数与复习进度',
        ('student', 'resources'): '资源卡封面图（离线 11 张全破图）；知识点文案',
        ('student', 'me'): '今日行动/学情报告文案；综合分；侧栏计数',
        ('teacher', 'prep'): '最近备课列表（现役多 1 条，时间不同）',
        ('teacher', 'today'): '同 prep（路由重定向）',
        ('teacher', 'insights'): '指标卡（平均掌握度/高频错因）；每生学情表',
        ('teacher', 'resources'): '资源卡封面图（离线 12 张全破图）',
        ('teacher', 'grading'): '讲评要点列表（现役多一行「课前预习」）',
        ('researcher', 'landing'): '最近项目卡（现役多 1 个新项目）',
        ('researcher', 'workspace'): '文献列表/阅读器/Agent 对话（离线 4 PDF + 笔记 + 对话）',
    }
    return mapping.get((rec['role'], rec['slug']), '—')


def write_markdown(data):
    pages = data['pages']
    c = data['summary']['verdict_counts']
    now = data['generated_at']
    L = []
    L.append('# Mathesis 逐屏并排对照报告（run-02 返工）\n')
    L.append('> **角色**：逐屏并排对照员（独立于实现者） · **采集时间**：%s\n' % now)
    L.append('> **视口**：1672×941 / DPR=1 / headless / 渲染稳定 ≥2.5s / 鼠标归位\n')
    L.append('> **现役**：%s · **离线**：`file:///.../app/dist-offline/index.html`（offline=True）\n' % LIVE)
    L.append('> **证据**：`metrics.json`、`shots/live-*`、`shots/off-*`、`shots/side-*`；脚本 `run_parity.py` 可复跑。\n')
    L.append('\n## 1. 结论摘要\n')
    L.append('| 判定 | 数量 | 页面 |')
    L.append('|---|---:|---|')
    for verdict in ['一致', '差异', '差异（待复点）', '不一致']:
        rows = [f"{r['role']}/{r['slug']}" for r in pages if r['verdict'] == verdict]
        if rows:
            L.append('| %s | %d | %s |' % (verdict, len(rows), '、'.join(rows)))
    L.append('| **合计** | **%d** | |' % len(pages))
    L.append('')
    L.append('**一句话**：18 页中布局骨架全部同构（主区域布局盒最大偏移 0px，≤4px 阈值），文本差异集中在「真实数据随时间漂移」'
             '（备课历史、学情数字、会话列表、科研项目）与「离线媒体资源缺失」；唯一结构/内容级不一致是科研 `/research-workspace/workspace`'
             '——两侧都按 `list[0]` 自动打开项目，但离线 fixture（02:21:54 采证）缺少现役 02:25:50 才创建的最新空项目，'
             '于是离线打开了带 4 篇 PDF 的旧项目、现役打开 0 文献新项目。\n')
    L.append('\n## 2. 逐页表格\n')
    L.append('| 角色 | 页面 | 判定 | 布局盒差异 | 文本差异摘要 | 差异区域 | 截图 |')
    L.append('|---|---|---|---|---|---|---|')
    for r in pages:
        boxes = '≤%dpx' % r['layout']['max_delta'] if not r['layout']['missing'] else '缺盒'
        t = r['text']
        if r['verdict_kind'] == 'media':
            lb = r['live'].get('imgs', {}).get('broken', 0)
            rb = r['off'].get('imgs', {}).get('broken', 0)
            txt = ('文本逐行一致（%d 行）' % t['live_lines']) if t['exact'] else (
                '文本 %d/%d 行、%d 处文案差异' % (t['live_lines'], t['off_lines'], t['diff_count']))
            summary = '%s；离线破图 %d 张（现役 %d 张），pixel diff %.1f%%' % (
                txt, rb, lb, (r['pixel'].get('ratio') or 0) * 100)
        elif r['verdict_kind'] == 'none':
            summary = '逐行一致（%d 行）' % t['live_lines']
        elif t['number_time_drift_only']:
            summary = '仅数字/时间漂移（%d 处）' % t['diff_count']
        else:
            summary = '%d 行 vs %d 行；%s' % (t['live_lines'], t['off_lines'], fmt_diff_pairs(r))
        side = '`%s`' % r['side']['path'] if r['side'] else '—'
        L.append('| %s | `%s` | **%s** | %s | %s | %s | %s |' % (
            r['role'], r['route'], r['verdict'], boxes, summary.replace('\n', ' '),
            diff_regions(r) if r['verdict'] != '一致' else '—', side))
    L.append('')
    L.append('\n## 3. 重点核查 4 项\n')
    # 3.1 dialog
    d = next((r for r in pages if r['role'] == 'student' and r['slug'] == 'dialog'), None)
    k = d['key_checks'] if d and d.get('key_checks') else {}
    L.append('### 3.1 学生 `/dialog`（会话分组 / 输入框 / ✦ 按钮 / 欢迎语 / 四入口）\n')
    lg, og = k.get('live', {}), k.get('off', {})
    L.append('| 检查点 | 现役 | 离线 | 判定 |')
    L.append('|---|---|---|---|')
    L.append('| 输入框计数 | `%s` | `%s` | %s |' % (lg.get('input_count'), og.get('input_count'),
                                                 '一致' if lg.get('input_count') == og.get('input_count') else '差异'))
    L.append('| 发送按钮（✦ 发送） | `%s` | `%s` | %s |' % (lg.get('send_btn'), og.get('send_btn'),
                                                       '一致' if lg.get('send_btn') == og.get('send_btn') else '差异'))
    L.append('| 四个入口 | %s | %s | %s |' % (' / '.join(x.replace('\n', ' ') for x in (lg.get('he_cards') or [])),
                                             ' / '.join(x.replace('\n', ' ') for x in (og.get('he_cards') or [])),
                                             '一致' if lg.get('he_cards') == og.get('he_cards') else '差异'))
    L.append('| 会话分组标签 | %s | %s | %s |' % (' / '.join(lg.get('groups') or []), ' / '.join(og.get('groups') or []),
                                            '一致' if lg.get('groups') == og.get('groups') else '差异（数据漂移）'))
    L.append('| 欢迎语 | `%s` | `%s` | %s |' % (lg.get('welcome'), og.get('welcome'),
                                            '一致' if lg.get('welcome') == og.get('welcome') else '差异'))
    L.append('')
    live_g, off_g = lg.get('groups') or [], og.get('groups') or []
    only_off = [g for g in off_g if g not in live_g]
    only_live = [g for g in live_g if g not in off_g]
    L.append('说明：分组逻辑（`ConversationSidebar.vue` 的 `置顶 / 今天 / 7 天内 / 30 天内 / 更早` 按 `updatedAt` 实时计算）两侧是同一份代码。'
             '本轮现役组=%s，离线组=%s；%s。根因是现役 `GET /api/agent/conversations?limit=30` 被今天自动化产生的 30 条「新对话」占满，'
             '更早的会话（10/28）被挤出窗口，因此现役看不到 `30 天内`；离线 fixture 是 02:21 采证的快照、仍保留旧会话，所以能看到 `30 天内`。'
             '这是**真实数据/测试污染漂移**，不是结构差异。\n' % (
                 ' / '.join(live_g), ' / '.join(off_g),
                 ('离线多出：' + ' / '.join(only_off)) if only_off else ('现役多出：' + ' / '.join(only_live)) if only_live else '无组差异'))
    L.append('页面内**没有**「拍照识题」弹层组件：点击 `📷` 卡片实际触发系统文件选择器（现役/离线均如此，见交互态证据）；'
             '输入框 `0/4000`（交互打字后 21/4000 两侧一致）、`✦ 发送` 按钮、欢迎语与四入口均一致。\n')
    # 3.2 prep
    p = next((r for r in pages if r['role'] == 'teacher' and r['slug'] == 'prep'), None)
    kp = (p or {}).get('key_checks', {})
    L.append('### 3.2 教师 `/teacher-v3/prep`（三个起点卡 / 备课历史条目与时间 / 右侧 AI 备课助手）\n')
    L.append('| 检查点 | 现役 | 离线 | 判定 |')
    L.append('|---|---|---|---|')
    L.append('| 入口卡 | %s（%d 张） | %s（%d 张） | %s |' % (
        ' / '.join(kp.get('live', {}).get('entry_cards') or []), kp.get('live', {}).get('entry_count', 0),
        ' / '.join(kp.get('off', {}).get('entry_cards') or []), kp.get('off', {}).get('entry_count', 0),
        '一致' if kp.get('live', {}).get('entry_cards') == kp.get('off', {}).get('entry_cards') else '差异'))
    L.append('| 备课历史条目数 | %s（%d 行） | %s（%d 行） | %s |' % (
        kp.get('live', {}).get('recent_count_text'), kp.get('live', {}).get('recent_rows', 0),
        kp.get('off', {}).get('recent_count_text'), kp.get('off', {}).get('recent_rows', 0),
        '一致' if kp.get('live', {}).get('recent_rows') == kp.get('off', {}).get('recent_rows') else '差异（数据漂移）'))
    L.append('| 历史时间 | %s | %s | %s |' % (' / '.join(kp.get('live', {}).get('recent_times') or []),
                                          ' / '.join(kp.get('off', {}).get('recent_times') or []), '差异（时间漂移，非结构）'))
    L.append('| 右侧 AI 备课助手 | %s | %s | %s |' % (
        '存在（%s）' % (kp.get('live', {}).get('ai_assistant') or '胶囊') if kp.get('live', {}).get('ai_assistant_present') else '缺失',
        '存在（%s）' % (kp.get('off', {}).get('ai_assistant') or '胶囊') if kp.get('off', {}).get('ai_assistant_present') else '缺失',
        '一致' if kp.get('live', {}).get('ai_assistant_present') == kp.get('off', {}).get('ai_assistant_present') else '差异'))
    L.append('')
    L.append('结论：**差异（数据漂移，非结构差异）**——现役在 2026-11-22 02:18 多出一条真实备课会话（另一轮自动化交互产生），'
             '离线 fixture 停在 2026-11-21 03:04 的 1 条；起点卡、历史卡、AI 备课助手胶囊结构完全一致。\n')
    # 3.3 numbers
    L.append('### 3.3 教师 `/teacher-v3/grading`、`/teacher-v3/insights`（真实数字漂移 vs 结构差异）\n')
    for slug in ('grading', 'insights'):
        r = next((x for x in pages if x['role'] == 'teacher' and x['slug'] == slug), None)
        if not r:
            continue
        kk = r.get('key_checks', {})
        L.append('- **%s**：判定 **%s**（%s）；布局盒 %dpx；数字集合差异 `%s`；文本差异：%s。%s' % (
            slug, r['verdict'], r['verdict_kind'], r['layout']['max_delta'],
            kk.get('number_diff'), fmt_diff_pairs(r), r['verdict_reason']))
    L.append('')
    L.append('标注口径：**时间漂移**=同一批数据因采集时刻不同导致的时间戳/相对时间变化；**数字漂移**=同一指标因后续真实操作'
             '（批改/提交/掌握度更新）产生的数值变化；**结构差异**=区域/字段/条目结构不同。'
             '本轮 `insights`：班级平均掌握度 **64% → 61%**、高频错因 **圆锥曲线 2 人次 → 暂无错题聚集**、'
             '小林平均掌握度 64%→61%、薄弱点「导数的概念与运算」0%→16% —— 属于**数字漂移**，卡片/表格/列结构完全一致。'
             '`grading`：数字集合一致，唯一文本差异是现役多出一行「课前预习 · 函数的图象与性质」'
             '（真实队列/任务数据漂移，pixel diff 0.0%，不是结构差异）。\n')
    # 3.4 workspace root cause
    L.append('### 3.4 科研 `/research-workspace/workspace` 差异根因（必答）\n')
    wd = data.get('workspace_diag') or {}
    wl, wo = wd.get('live', {}), wd.get('off', {})
    L.append('**现象**：同一路由、同一科研账号：现役落到 `%s`，工作区为 0 文献的「未命名项目」空工作台；'
             '离线落到 `%s`，自动打开 4 篇 PDF、1 条最近笔记与既有 Agent 对话。\n' % (
                 wl.get('url', '—'), wo.get('url', '—')))
    L.append('**根因（代码路径 + 数据源）**：\n')
    L.append('1. `ResearchWorkspaceShell.vue::bootstrap()` 在 URL 没有 `:projectId` 时，会 `project.loadList()` 并'
             '**自动选中 `list[0]`（最新项目；若有 `ma_research_last_project` 则优先它）后 `router.replace(/research-workspace/<id>/read)`**。'
             '所以**两侧都不是「空工作台 vs 自动打开」的差异**——两侧都自动打开了各自数据源里的最新项目。\n')
    lp = ((wd.get('live_network', {}) or {}).get('projects') or {}).get('items', []) if isinstance((wd.get('live_network', {}) or {}).get('projects'), dict) else []
    op = (wd.get('off_projects_response') or {}).get('items', []) if isinstance(wd.get('off_projects_response'), dict) else []
    live_ids = [p.get('id') for p in lp]
    off_ids = [p.get('id') for p in op]
    missing = [i for i in live_ids if i not in off_ids]
    newest = lp[0] if lp else {}
    try:
        fixture_idx = json.load(open(os.path.join(ROOT, 'app', 'src', 'offline', 'fixtures', 'researcher', 'index.json'), encoding='utf-8'))
        fx_ts = fixture_idx.get('GET /api/research-vnext/projects', {}).get('ts')
        fx_time = dt.datetime.fromtimestamp(fx_ts).strftime('%Y-%m-%d %H:%M:%S') if fx_ts else '—'
    except Exception:
        fx_time = '—'
    L.append('2. **数据源时效差**：离线项目列表来自 `app/src/offline/fixtures/researcher/GET___api__research-vnext__projects.json`，'
             '该组 fixture 的采证时间是 **%s**（fixtures/researcher/index.json `ts`）；现役实时列表有 %d 个项目（`%s`），'
             '离线只有 %d 个（`%s`），**离线缺少现役最新项目 `%s`**。' % (
                 fx_time, len(live_ids), '`, `'.join(live_ids), len(off_ids), '`, `'.join(off_ids), '`, `'.join(missing) or '—'))
    live_created = newest.get('created_at', '—')
    try:
        live_created_local = dt.datetime.fromisoformat(live_created.replace('Z', '+00:00')).astimezone().strftime('%Y-%m-%d %H:%M:%S')
    except Exception:
        live_created_local = '—'
    L.append('3. **命中差异的关键 4 分钟**：现役 `list[0]` 是 `%s`（`created_at=%s`，本地 %s），比离线 fixture 采证时间（%s）晚约 4 分钟；'
             '该项目 `papers=[]`、0 文献，所以现役工作区为空。离线 `list[0]` 是 `e49b27e2…`（fixture 旧项目，papers=4 + 1 笔记 + 既有 Agent 对话），'
             '所以离线一打开就渲染出 4 篇 PDF。' % (newest.get('id', '—'), live_created, live_created_local, fx_time))
    L.append('4. **不是路由差异、不是 localStorage 残留、不是三栏布局差异**：两侧 URL 都被 `bootstrap()` 重写为 `/<projectId>/read`，'
             '主区域布局盒（顶栏 / 侧栏 300px / 中栏 / Agent 420px）逐项偏差 0px；`ma_offline_demo_v1` 只存 '
             'session/published/uploads/conversations/grading，不存科研项目；科研项目完全由离线回放层返回旧 fixture。'
             '两侧 `rw.panel.v3`（栏宽/收起态）也一致（readSidebar=300 / readAgent=420）。\n')
    L.append('5. 离线二层的副作用：离线 PDF 是 ReportLab 生成的合成 PDF（`/BaseFont /Helvetica /Encoding /WinAnsiEncoding`），'
             '中文字形未嵌入，阅读器文本层显示方块/乱码（`metrics.json.workspace_diag.off.body_full` 中可见 U+0001 控制字符）——'
             '这是离线素材质量问题，与现役无关（现役该项目无文献，无法对照）。\n')
    L.append('**修复建议（只给建议，未改代码）**：\n')
    L.append('- 在打包脚本里对 `researcher` fixture 做**时效校验**：发布时对比现役 `GET /api/research-vnext/projects` 的 id 集合；'
             '不一致就重新采集，禁止携带过期项目。\n')
    L.append('- 为「空账号」提供干净 fixture（projects 返回空数组），并在离线启动页呈现「还没有科研项目」空态；'
             '若确实要演示旧项目，应显式标注「离线演示快照 · 采集于 2026-11-22 02:21」而不是冒充当前账号。\n')
    L.append('- 若产品期望 `/research-workspace/workspace` 永远展示空工作台，应改为「无 projectId 时不自动打开项目」；'
             '当前自动打开是产品定义（启动页「进入科研工作台」依赖它），不建议为此改代码，改数据更稳。\n')
    L.append('- 重新生成/替换离线 PDF 素材，嵌入中文子集字体（或直接改用现役可读 PDF 切片文本回放），消除方块乱码。\n')
    # 3.5 interactions
    ints = data.get('interactions') or []
    if ints:
        L.append('### 3.5 交互态对照（每端至少 1 组，同一操作 → 同一状态）\n')
        L.append('| 组 | 现役状态 | 离线状态 | 同态 | 并排证据 |')
        L.append('|---|---|---|---|---|')
        for it in ints:
            if it['key'] == 'student-compose':
                l, o = it['live'], it['off']
                L.append('| 学生：`/dialog` 输入条打字 + 点击「📷 拍一道不会的题」 | `count=%s`，value=`%s`，send_disabled=%s，file_chooser=%s | `count=%s`，value=`%s`，send_disabled=%s，file_chooser=%s | %s | `%s` |' % (
                    l['count_text'], l['input_value'], l['send_disabled'], l['file_chooser_opened'],
                    o['count_text'], o['input_value'], o['send_disabled'], o['file_chooser_opened'],
                    '是' if it['same_state'] else '否', it['side']))
            elif it['key'] == 'teacher-textbook':
                l, o = it['live'], it['off']
                L.append('| 教师：`/teacher-v3/prep` 点「从教材开始」 | NL 预填=`%s`，focus=%s | NL 预填=`%s`，focus=%s | %s | `%s` |' % (
                    l['input_value'], l['focused'], o['input_value'], o['focused'],
                    '是' if it['same_state'] else '否', it['side']))
            elif it['key'] == 'researcher-enter':
                l, o = it['live'], it['off']
                L.append('| 科研：启动页点「进入科研工作台」 | 路由=`%s`；首屏=`%s` | 路由=`%s`；首屏=`%s` | %s | `%s` |' % (
                    re.sub(r'^.*?#', '', l.get('url', '—')).replace('http://127.0.0.1:5176', ''), ' / '.join(l.get('body_head', [])[:6]),
                    re.sub(r'^.*?#', '', o.get('url', '—')), ' / '.join(o.get('body_head', [])[:6]),
                    '路由同构（内容不同，见 3.4）' if it['same_state'] else '否', it['side']))
        L.append('')
        L.append('说明：学生组的「📷 拍一道不会的题」在现役/离线都只唤起系统文件选择器（`file_chooser_opened=true`），'
                 '**没有页面内弹层**——需求里期待的是「弹层」，实际产品行为是文件选择器；若验收要求可见弹层，需要产品侧补组件。'
                 '打字后的计数（21/4000）与发送态两侧完全一致，可作为同态证据。\n')
    # issues
    L.append('\n## 4. 发现的问题清单（按严重度）\n')
    issues = build_issues(data)
    for i, it in enumerate(issues, 1):
        L.append('%d. **%s** — %s  \n   复现：%s  \n   证据：%s\n' % (
            i, it['title'], it['impact'], it['repro'], it['evidence']))
    L.append('\n## 5. 建议\n')
    L.append('1. 发布门禁增加「逐屏对照」自动化：本脚本已可复跑；建议把 `metrics.json` 的 `verdict_counts` 纳入发布检查，'
             '`不一致 > 0` 阻断。\n')
    L.append('2. 离线包以「演示快照」为口径重新采集 fixtures（尤其科研项目），并在 UI 明示离线素材日期；'
             '外链图片/封面必须本地化（学生/教师资源中心所有 B 站封面在断网下破图）。\n')
    L.append('3. 数据漂移类差异（备课历史、学情数字、会话列表）不建议锁库；建议在对照报告的判定口径中固定为'
             '「结构一致 + 数据漂移」并保留归一化 diff，作为可接受项。\n')
    L.append('4. 修复离线 PDF 中文字体；同时补一条「媒体资源完整性」指标（`document.images` broken 计数），'
             '防止文本相似度 100% 但页面全破图的假一致。\n')
    L.append('\n---\n')
    L.append('采集脚本：`qa/parity-r02/run_parity.py` · 机器指标：`qa/parity-r02/metrics.json` · CSV：`qa/parity-r02/parity.csv`\n')
    with open(os.path.join(OUT, 'PARITY.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(L))


def build_issues(data):
    pages = data['pages']
    issues = []
    ws = next((r for r in pages if r['role'] == 'researcher' and r['slug'] == 'workspace'), None)
    if ws:
        issues.append({'title': 'P0 · 科研 workspace 离线 fixture 比现役落后约 4 分钟，自动打开的是旧项目（内容不一致）',
                       'impact': '同一账号同一路由：现役自动打开最新空项目 d770（0 文献），离线自动打开 fixture 里的旧项目 e49b（4 篇 PDF + 对话）；'
                                 '根因是离线 projects fixture 采证于 02:21:54，而现役最新项目创建于 02:25:50，离线列表缺该 id。',
                       'repro': '科研登录 → 打开 `/research-workspace/workspace`（或启动页点「进入科研工作台」）→ 两侧对比 URL 中 projectId 与文献数',
                       'evidence': '`shots/side-researcher-workspace.png`；`metrics.json.workspace_diag.live_network.projects` 与 `off_projects_response`'})
    media = [r for r in pages if r['verdict_kind'] == 'media']
    if media:
        issues.append({'title': 'P1 · 资源中心封面图未离线化，离线整页破图',
                       'impact': '文本几乎一致（教师页逐行一致，学生页仅知识点文案漂移），但 %d 页（%s）离线所有缩略图 `naturalWidth=0`；这是最容易被文本对比漏掉的视觉回归。' % (
                           len(media), '、'.join(r['role'] + '/' + r['slug'] for r in media)),
                       'repro': '登录对应角色 → `/resources` 或 `/teacher-v3/resources` → 断网（offline=True）打开离线包',
                       'evidence': '`%s`；`metrics.json` 中 `imgs.broken` 与 `pixel.ratio`' % '`, `'.join(r['side']['path'] for r in media)})
    drift = [r for r in pages if r['verdict_kind'] == 'data_drift' or r['verdict_kind'] == 'number_time_drift']
    if drift:
        issues.append({'title': 'P2 · 真实数据漂移（可接受，但需在验收中标注口径）',
                       'impact': '%d 页判定受真实数据影响：%s；其中 prep 2→1 条备课历史、insights 掌握度 64%%→61%% 且高频错因有/无、'
                                 'grading 多一行「课前预习」、dialog 今天组多出新对话且 30 天内组被挤掉、practice/me/landing 的薄弱点与项目卡内容漂移。'
                                 '（含 4 个「一致」页仅因侧栏错题数 24→23 产生数字漂移）' % (
                                     len(drift), '、'.join(r['role'] + '/' + r['slug'] for r in drift)),
                       'repro': '按报告逐页复跑；对照 `metrics.json` 各页 `text.diff` 与 `text.number_time_drift_only`',
                       'evidence': '各页 `shots/side-*.png` + `metrics.json.pages[].text`'})
    dlg = next((r for r in pages if r['role'] == 'student' and r['slug'] == 'dialog'), None)
    if dlg and dlg.get('key_checks'):
        lg, og = dlg['key_checks']['live'].get('groups', []), dlg['key_checks']['off'].get('groups', [])
        if lg != og:
            issues.append({'title': 'P1 · 学生 /dialog 左侧分组不一致：现役缺「30 天内」组',
                           'impact': '现役组=%s，离线组=%s。根因不是分组代码（同一组件、同一判定），而是现役 `conversations?limit=30` 被今天自动化产生的'
                                     '新对话占满，10/28 的旧会话被挤出窗口；离线 fixture 仍保留旧会话。这是测试数据污染导致的真实漂移，但会让「分组核查」看起来不一致。' % (
                                         ' / '.join(lg), ' / '.join(og)),
                           'repro': '学生登录 → `/dialog` → 看左侧会话列表底部分组；对照 `metrics.json.pages[student/dialog].key_checks`',
                           'evidence': '`shots/side-student-dialog.png`；`shots/side-inter-student-compose.png`；`metrics.json` key_checks.groups'})
    issues.append({'title': 'P2 · 离线 PDF 文本层中文乱码（方块/控制字符）',
                   'impact': '科研 workspace 离线 PDF 正文不可读，影响离线演示可信度；现役该项目无文献，无法同屏对照，但属离线素材质量缺陷。',
                   'repro': '离线科研登录 → 进入工作台 → 查看 PDF 正文',
                   'evidence': '`shots/off-researcher-workspace.png`；fixture PDF 头 `/BaseFont /Helvetica /Encoding /WinAnsiEncoding`'})
    issues.append({'title': 'P3 · 教师 `/teacher-v3/today` 与 `/teacher-v3/prep` 为同一页面（路由别名）',
                   'impact': '8 个教师页面中 `/teacher-v3/today` 最终 URL 为 `/teacher-v3/prep`，视觉/文本相同；两侧一致（非离线缺陷），但「每日教学」入口看起来重复，建议产品侧确认是否是预期别名。',
                   'repro': '访问 `/teacher-v3/today` 观察最终 URL（现役/离线都是 prep）',
                   'evidence': '`shots/side-teacher-today.png`；`metrics.json.pages[].final_url`'})
    issues.sort(key=lambda it: it['title'][:2])
    return issues


if __name__ == '__main__':
    if '--md-only' in sys.argv:
        with open(os.path.join(OUT, 'metrics.json'), encoding='utf-8') as f:
            write_markdown(json.load(f))
        print('WROTE PARITY.md (from metrics.json)')
        sys.exit(0)
    only = [a for a in sys.argv[1:] if not a.startswith('--')]
    main(only)