# -*- coding: utf-8 -*-
"""verify-final · 样板二核对：教师 备课中心 → 工作台（课堂设计/PPT/教案/导出/发布/重试）。

核对项：
  T1 从教材开始：无后续弹层、无业务请求
  T2 教学蓝图未生成：界面常驻「本轮生成没有完成，未写入任何内容。」
  T3 重试：现役 409 文案；离线是否逐字一致
  T4 PPT：幻灯片 0/0；添加页/T 文本/Σ 公式/数学图形/图片/备注/发布课堂 7 项 disabled
  T6 导出：三卡 disabled + 理由；0 次 /exports /tickets 请求、无产物下载
  T7 发布：发布课堂 disabled；无发布对话框/班级列表/成功态
产物：qa/verify-final/template2.json + shots/t2-*.png
"""
import datetime as dt
import json
import os
import re
import sys

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = r'D:\zxsy-math-arena-showcase'
LIVE = 'http://127.0.0.1:5176'
OFF = 'file:///' + os.path.join(ROOT, 'release', '开始演示.html').replace('\\', '/')
OUT = os.path.join(ROOT, 'qa', 'verify-final')
SHOTS = os.path.join(OUT, 'shots')
T2SHOTS = os.path.join(SHOTS, 'template2')
os.makedirs(T2SHOTS, exist_ok=True)
sys.path.insert(0, os.path.join(ROOT, '.work', 'scripts'))
from live_login import TEACHER, login  # noqa: E402

SESSION = 'f5c84551-18a7-454d-b49c-8f115e816299'
VIEW = {'width': 1672, 'height': 941}
FORBID = ['发布成功', '已发布到', '选择班级', '班级列表', '导出成功', '下载文件', '演示身份卡', '内容匹配', 'SHA-256']


def norm(s):
    return re.sub(r'\s+', ' ', s or '').strip()


class Side:
    def __init__(self, browser, side):
        self.side = side
        self.ctx = browser.new_context(viewport=VIEW, device_scale_factor=1, offline=(side == 'off'))
        self.page = self.ctx.new_page()
        self.requests, self.responses, self.pageerrors, self.console, self.downloads = [], [], [], [], []
        self.page.on('request', lambda r: self.requests.append(r.url[:250]) if r.url.startswith(('http://', 'https://', 'ws://')) else None)
        self.page.on('response', lambda r: self.responses.append({'url': r.url[:220], 'status': r.status})
                     if r.url.startswith(('http://', 'https://')) else None)
        self.page.on('pageerror', lambda e: self.pageerrors.append(str(e)[:250]))
        self.page.on('console', lambda m: self.console.append(m.text[:250]) if m.type == 'error' else None)
        self.page.on('download', lambda d: self.downloads.append(d.suggested_filename))

    def reset(self):
        self.requests.clear(); self.responses.clear(); self.pageerrors.clear(); self.console.clear()

    def login(self):
        p = self.page
        if self.side == 'live':
            last = None
            for attempt in range(3):
                try:
                    login(p, TEACHER)
                    break
                except Exception as e:
                    last = e
                    print('  ! live login retry %d: %r' % (attempt + 1, repr(e)[:120]), flush=True)
                    p.wait_for_timeout(65000)
            else:
                raise RuntimeError('live login failed: %r' % (last,))
        else:
            p.goto(OFF, wait_until='load', timeout=60000)
            p.wait_for_timeout(1600)
            p.select_option('#preferred-role', 'teacher')
            p.fill('#auth-phone', '13800001002')
            p.get_by_role('button', name='获取验证码').click()
            p.wait_for_timeout(900)
            p.get_by_placeholder('6 位验证码').fill('246810')
            p.get_by_role('button', name='安全登录').click()
            p.wait_for_timeout(2800)

    def goto(self, route):
        # 强制整页加载（离线错误边界/单页状态不会因 hash 变化自动清除）
        if self.side == 'live':
            self.page.goto(LIVE + route, wait_until='load')
        else:
            self.page.goto('about:blank')
            self.page.goto(OFF + '#' + route, wait_until='load', timeout=60000)
        self.page.wait_for_timeout(4200)
        self.page.evaluate('() => window.scrollTo(0,0)')
        self.page.mouse.move(1, 1)
        self.page.wait_for_timeout(300)

    def shot(self, name):
        self.page.screenshot(path=os.path.join(T2SHOTS, f'{self.side}-{name}.png'))
        return f'shots/template2/{self.side}-{name}.png'

    def hook_actions(self):
        """在离线回放层之上再包一层 fetch：记录 UI 实际触发到的 /actions 等响应（离线也有 status/text）。"""
        self.page.evaluate("""() => {
          if (window.__vf_hook) return;
          window.__vf_hook = [];
          const orig = window.fetch.bind(window);
          window.fetch = async function (input, init) {
            const url = typeof input === 'string' ? input : (input && input.url) || '';
            const res = await orig(input, init);
            if (String(url).includes('/actions') || String(url).includes('/exports') || String(url).includes('/tickets') || String(url).includes('/publish')) {
              const rec = { url: String(url).slice(0, 220), status: res.status, body: null };
              try { rec.body = (await res.clone().text()).slice(0, 600); } catch (e) { }
              window.__vf_hook.push(rec);
            }
            return res;
          };
        }""")

    def hook(self):
        return self.page.evaluate('() => window.__vf_hook || []')


def visible_text(page):
    return page.inner_text('body')


def buttons(page):
    return page.evaluate("""() => {
      const vis = (el) => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
        return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
      return [...document.querySelectorAll('button')].filter(vis).map(b => ({
        t: (b.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 40), disabled: !!b.disabled,
        title: b.getAttribute('title') || '', testid: b.getAttribute('data-testid') || '',
        cls: (b.className || '').toString().slice(0, 60)}));
    }""")


def t1_textbook(s):
    rec = {'steps': []}
    s.goto('/teacher-v3/prep')
    entries = s.page.evaluate("""() => [...document.querySelectorAll('.pc-home__entry-name')].map(e => (e.innerText||'').trim())""")
    rec['entry_cards'] = entries
    before_req = len(s.requests)
    before_text = visible_text(s.page)
    overlays_before = s.page.evaluate("""() => document.querySelectorAll('[role=dialog], .n-modal, .pc-export-mask, [class*=mask]').length""")
    try:
        s.page.locator('.pc-home__entry', has_text='从教材开始').first.click(timeout=6000)
    except Exception as e:
        rec['click_error'] = repr(e)[:200]
    s.page.wait_for_timeout(2200)
    after_text = visible_text(s.page)
    overlays_after = s.page.evaluate("""() => document.querySelectorAll('[role=dialog], .n-modal, .pc-export-mask, [class*=mask]').length""")
    rec['overlays_before'] = overlays_before
    rec['overlays_after'] = overlays_after
    rec['requests_after_click'] = list(s.requests[before_req:])
    rec['business_requests_after_click'] = [u for u in s.requests[before_req:]
                                            if '/api/' in u and '/tasks' not in u and 'notifications' not in u]
    rec['text_changed'] = norm(before_text)[:400] != norm(after_text)[:400]
    rec['screenshot'] = s.shot('01-prep-textbook-click')
    rec['visible_text_head'] = norm(after_text)[:400]
    return rec


def t2_t3_workbench(s):
    rec = {}
    s.reset()
    s.goto('/teacher-v3/prep')
    try:
        s.page.locator('button.pc-home__row-cta', has_text='继续备课').first.click(timeout=6000)
        s.page.wait_for_timeout(4200)
        rec['continue_landing_url'] = s.page.evaluate('() => location.hash || location.pathname')
    except Exception as e:
        rec['continue_error'] = repr(e)[:200]
    # 统一回到规格指定的会话（f5c84551…）再核对，避免两侧「继续备课」落到不同历史会话导致不可比
    s.goto(f'/teacher-v3/prep/w/{SESSION}/classroom')
    rec['landing_url'] = s.page.evaluate('() => location.hash || location.pathname')
    text = visible_text(s.page)
    rec['blueprint_banner'] = '本轮生成没有完成，未写入任何内容' in text
    rec['blueprint_banner_text'] = '本轮生成没有完成，未写入任何内容。' if rec['blueprint_banner'] else None
    rec['blueprint_null_note'] = ('教学蓝图' in text) or ('本轮生成' in text)
    rec['screenshot_classroom'] = s.shot('02-workbench-classroom')
    # T3 重试
    s.reset()
    s.hook_actions()
    retry = s.page.locator('button.pc-actions__btn', has_text='重试')
    rec['retry_button_count'] = retry.count()
    rec['retry_target'] = 'classroom-actions-bar'
    if not retry.count():
        alt = s.page.locator('button[data-testid=prep-quick-action]', has_text='重试')
        if alt.count():
            retry = alt
            rec['retry_target'] = 'immersive-quick-action'
    rec['retry_button_disabled'] = retry.first.is_disabled() if retry.count() else None
    before = visible_text(s.page)
    try:
        retry.first.click(timeout=8000)
        s.page.wait_for_timeout(4500)
    except Exception as e:
        rec['retry_click_error'] = repr(e)[:200]
    after = visible_text(s.page)
    hook = s.hook()
    rec['retry_hook'] = hook
    rec['retry_http_status'] = hook[-1]['status'] if hook else None
    rec['retry_http_body_head'] = (hook[-1]['body'] or '')[:500] if hook else None
    rec['retry_responses'] = [r for r in s.responses if '/actions' in r['url']][-4:]
    rec['error_boundary'] = '教师页面加载出现异常' in after
    rec['error_boundary_text'] = None
    if rec['error_boundary']:
        m = re.search(r'教师页面加载出现异常[\s\S]{0,240}', after)
        rec['error_boundary_text'] = norm(m.group(0))[:260] if m else None
    # 现役同款冲突卡（最终复核对齐口径）：文案 + request_id 行
    CONFLICT_HEAD = '会话已被其他操作更新'
    rec['conflict_card_present'] = CONFLICT_HEAD in after
    rec['conflict_card_text'] = None
    if rec['conflict_card_present']:
        i = after.find(CONFLICT_HEAD)
        rec['conflict_card_text'] = norm(after[max(0, i - 60):i + 420])[:420]
    m = re.search(r'[Rr]equest[ _]?[Ii][Dd][：:]\s*([0-9a-fA-F-]{6,})|请求\s*[Ii][Dd][：:]\s*([0-9a-fA-F-]{6,})|request_id[：:]\s*([0-9a-fA-F-]{6,})', after)
    rec['request_id'] = (m.group(1) or m.group(2) or m.group(3)) if m else None
    rec['no_attachment_lost'] = '附件已丢失' not in after
    # UI 上新增的错误/冲突文案
    markers = ['会话已被其他操作更新', '服务端已有更新的版本', '刷新查看新版本', 'request_id', '请求 ID',
               '不可执行', '无法重跑', '没有上下文快照', '离线演示未收录', '请重新发送消息', '重试失败',
               '教师页面加载出现异常']
    rec['retry_ui_markers'] = [m for m in markers if m in after]
    rec['retry_expected_live_text'] = "动作 'retry_run' 不可执行：消息无上下文快照，无法重跑（请重新发送消息）"
    rec['retry_live_text_present'] = rec['retry_expected_live_text'].replace("'", '') in after.replace("'", '')
    rec['retry_screenshot'] = s.shot('03-retry-result')
    rec['retry_error_region'] = s.page.evaluate("""() => {
      const sels = ['.pc-actions__error', '.toast', '.n-message', '[class*=toast]', '[role=alert]'];
      const out = [];
      for (const sel of sels) for (const el of document.querySelectorAll(sel)) {
        const t = (el.innerText || '').replace(/\\s+/g, ' ').trim(); if (t) out.push(t.slice(0, 200));
      }
      return out.slice(0, 8);
    }""")
    rec['requests'] = list(s.requests)
    rec['console_errors'] = s.console[:5]
    # 错误边界/异常状态清理：整页重载后再继续后续检查
    try:
        s.page.reload(wait_until='load')
        s.page.wait_for_timeout(4200)
        rec['after_retry_reload_ok'] = '教师页面加载出现异常' not in visible_text(s.page)
    except Exception as e:
        rec['reload_error'] = repr(e)[:160]
    return rec


def ppt_collect(s):
    rec = {}
    s.goto(f'/teacher-v3/prep/w/{SESSION}/ppt')
    text = visible_text(s.page)
    rec['url'] = s.page.evaluate('() => location.hash || location.pathname')
    rec['slide_pager_text'] = s.page.evaluate("""() => { const el = document.querySelector('.pc-deck__pager-text'); return el ? (el.innerText||'').replace(/\\s+/g,' ').trim() : null; }""")
    rec['zero_pages'] = '幻灯片 0 / 0' in rec['slide_pager_text'] if rec['slide_pager_text'] else ('幻灯片 0 / 0' in text)
    tools = s.page.evaluate("""() => [...document.querySelectorAll('.pc-deck__tool')].map(b => ({
      t: (b.innerText || '').replace(/\\s+/g, ' ').trim(), disabled: !!b.disabled, title: b.getAttribute('title') || '',
      testid: b.getAttribute('data-testid') || ''}))""")
    rec['deck_tools'] = tools
    rec['deck_tool_count'] = len(tools)
    rec['deck_tools_all_disabled'] = all(t['disabled'] for t in tools) if tools else None
    rec['publish_tool'] = next((t for t in tools if '发布课堂' in t['t']), None)
    rec['publish_disabled'] = bool(rec['publish_tool'] and rec['publish_tool']['disabled'])
    # 点击发布（disabled）：无对话框/无请求/无成功态
    s.reset()
    s.hook_actions()
    before_text = visible_text(s.page)
    try:
        s.page.locator('button[data-testid=pc-deck-publish]').first.click(force=True, timeout=5000)
        s.page.wait_for_timeout(2200)
    except Exception as e:
        rec['publish_click_error'] = repr(e)[:160]
    after_text = visible_text(s.page)
    rec['publish_dialog_count'] = s.page.evaluate("""() => document.querySelectorAll('[role=dialog], .n-modal, .pc-publish, [class*=publish-dialog]').length""")
    rec['publish_requests'] = [u for u in s.requests if '/publish' in u]
    rec['publish_forbidden'] = [w for w in FORBID if w in after_text]
    rec['publish_screenshot'] = s.shot('04-ppt-publish-click')
    rec['ppt_screenshot'] = s.shot('05-ppt-zero')
    # 导出三卡
    s.reset()
    s.hook_actions()
    opened = False
    for label in ('导出',):
        loc = s.page.locator('button.pc-header__tool', has_text=label)
        if loc.count():
            loc.first.click(timeout=6000)
            opened = True
            break
    if not opened:
        loc = s.page.get_by_role('button', name=re.compile('^导出'))
        if loc.count():
            loc.first.click(timeout=6000)
            opened = True
    s.page.wait_for_timeout(2000)
    rec['export_dialog_open'] = s.page.locator('.pc-export').count() > 0
    if rec['export_dialog_open']:
        cards = s.page.evaluate("""() => [...document.querySelectorAll('.pc-export__card')].map(li => ({
          title: (li.querySelector('.pc-export__card-title')||{}).textContent || '',
          desc: (li.querySelector('.pc-export__card-desc')||{}).textContent || '',
          disabled: li.classList.contains('is-disabled'),
          file: (li.querySelector('.pc-export__card-file')||{}).textContent || '',
          btn: (() => { const b = li.querySelector('.pc-export__btn'); return b ? {t:(b.innerText||'').trim(), disabled:!!b.disabled, title:b.getAttribute('title')||''} : null; })()
        }))""")
        rec['export_cards'] = cards
        rec['export_card_count'] = len(cards)
        rec['export_all_disabled'] = all(c['disabled'] and (c['btn'] or {}).get('disabled') for c in cards) if cards else None
        # 逐卡点击（disabled 按钮 force）→ 无下载、无请求
        for li in s.page.locator('.pc-export__card').all():
            try:
                li.locator('.pc-export__btn').first.click(force=True, timeout=3000)
            except Exception:
                pass
        s.page.wait_for_timeout(1500)
        rec['downloads'] = s.downloads
        rec['export_requests'] = [u for u in s.requests if '/exports' in u or '/tickets' in u]
        rec['export_hook'] = s.hook()
        rec['export_dialog_text'] = norm(s.page.locator('.pc-export').inner_text())[:900]
        rec['export_screenshot'] = s.shot('06-export-dialog')
        # 关闭
        close = s.page.locator('.pc-export__close')
        if close.count():
            close.first.click()
            s.page.wait_for_timeout(600)
    # 教案
    s.goto(f'/teacher-v3/prep/w/{SESSION}/plan')
    plan_text = visible_text(s.page)
    rec['plan_not_generated'] = '教案尚未生成' in plan_text
    rec['plan_editable'] = s.page.evaluate("""() => { const els = [...document.querySelectorAll('[contenteditable=true]')]; return els.length; }""")
    rec['plan_toolbar_disabled'] = s.page.evaluate("""() => { const btns = [...document.querySelectorAll('.pc-toolbar__btn, .pc-toolbar__menu')]; return btns.length ? btns.filter(b => b.disabled).length + '/' + btns.length : '0/0'; }""")
    rec['plan_screenshot'] = s.shot('07-plan-empty')
    # 刷新状态不变
    s.page.reload(wait_until='load')
    s.page.wait_for_timeout(4200)
    refresh_text = visible_text(s.page)
    rec['after_refresh_plan_still_empty'] = '教案尚未生成' in refresh_text
    # 发布成功态 / 班级列表 / 导出产物 全局核查
    rec['forbidden_after_all'] = [w for w in FORBID if w in refresh_text]
    return rec


def immersive_workbench(s):
    rec = {}
    s.goto(f'/teacher-v3/prep-immersive/{SESSION}')
    rec['url'] = s.page.evaluate('() => location.hash || location.pathname')
    text = visible_text(s.page)
    rec['has_session_state'] = '会话状态' in text
    rec['retry_quick_action_count'] = s.page.locator('button[data-testid=prep-quick-action]', has_text='重试').count()
    rec['forbidden'] = [w for w in FORBID if w in text]
    rec['ppt_words_present'] = ('幻灯片' in text) or ('发布课堂' in text)
    rec['screenshot'] = s.shot('08-immersive-workbench')
    # 沉浸式「重试」快动作：与现役同款冲突卡核对
    s.reset()
    s.hook_actions()
    qa = s.page.locator('button[data-testid=prep-quick-action]', has_text='重试')
    rec['retry_quick_action_count_after'] = qa.count()
    try:
        if qa.count():
            qa.first.click(timeout=8000)
            s.page.wait_for_timeout(4000)
    except Exception as e:
        rec['retry_click_error'] = repr(e)[:200]
    after = visible_text(s.page)
    rec['retry_error_boundary'] = '教师页面加载出现异常' in after
    rec['retry_conflict_present'] = '会话已被其他操作更新' in after
    rec['retry_conflict_text'] = None
    if rec['retry_conflict_present']:
        i = after.find('会话已被其他操作更新')
        rec['retry_conflict_text'] = norm(after[max(0, i - 40):i + 300])[:340]
    m = re.search(r'request_id[：:]\s*([0-9a-fA-F-]{6,})', after)
    rec['retry_request_id'] = m.group(1) if m else None
    hook = s.hook()
    rec['retry_hook'] = hook
    rec['retry_http_status'] = hook[-1]['status'] if hook else None
    rec['retry_ui_markers'] = [x for x in ('会话已被其他操作更新', '刷新查看新版本', '不可执行', '无法重跑',
                                           '教师页面加载出现异常', '暂时无法加载备课会话') if x in after]
    rec['requests_during_retry'] = list(s.requests)
    rec['retry_screenshot'] = s.shot('09-immersive-retry')
    return rec


def run_side(browser, side):
    print('=== 样板二 %s ===' % side, flush=True)
    s = Side(browser, side)
    rec = {'side': side}
    try:
        s.login()
        rec['t1_textbook'] = t1_textbook(s)
        rec['t2_t3_workbench'] = t2_t3_workbench(s)
        rec['ppt_export_publish'] = ppt_collect(s)
        rec['immersive'] = immersive_workbench(s)
        rec['local_state_published'] = s.page.evaluate("""() => { try { const o = JSON.parse(localStorage.getItem('ma_offline_demo_v1')||'{}'); return (o.published||[]).length; } catch (e) { return null; } }""")
        rec['global_downloads'] = s.downloads
        rec['all_requests'] = s.requests[:]
        rec['pageerrors'] = s.pageerrors[:5]
        rec['console_errors'] = s.console[:8]
    except Exception as e:
        rec['error'] = repr(e)[:800]
        try:
            s.shot('error')
        except Exception:
            pass
    s.ctx.close()
    return rec


def main():
    out = {'generated_at': dt.datetime.now().astimezone().isoformat(timespec='seconds'),
           'session': SESSION, 'sides': {}}
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        out['sides']['live'] = run_side(b, 'live')
        out['sides']['off'] = run_side(b, 'off')
        b.close()
    l, o = out['sides']['live'], out['sides']['off']
    def norm_conflict(t):
        t = t or ''
        t = re.sub(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '<id>', t)
        t = re.sub(r'\b[0-9a-f]{12,}\b', '<id>', t)
        return re.sub(r'\s+', '', t)
    lt3, ot3 = l.get('t2_t3_workbench', {}), o.get('t2_t3_workbench', {})
    cmp = {
        't3_conflict_present': (lt3.get('conflict_card_present'), ot3.get('conflict_card_present')),
        't3_conflict_text_norm_live': norm_conflict(lt3.get('conflict_card_text')),
        't3_conflict_text_norm_off': norm_conflict(ot3.get('conflict_card_text')),
        't3_conflict_same_text': (bool(lt3.get('conflict_card_present')) and bool(ot3.get('conflict_card_present'))
                                  and norm_conflict(lt3.get('conflict_card_text')) == norm_conflict(ot3.get('conflict_card_text'))),
        't3_request_ids': (lt3.get('request_id'), ot3.get('request_id')),
        't3_no_attachment_lost': (lt3.get('no_attachment_lost'), ot3.get('no_attachment_lost')),
        'immersive_retry_conflict': (l.get('immersive', {}).get('retry_conflict_present'),
                                     o.get('immersive', {}).get('retry_conflict_present')),
        'immersive_retry_status': (l.get('immersive', {}).get('retry_http_status'),
                                   o.get('immersive', {}).get('retry_http_status')),
        'immersive_retry_error_boundary': (l.get('immersive', {}).get('retry_error_boundary'),
                                           o.get('immersive', {}).get('retry_error_boundary')),
        'immersive_retry_text_same': (norm_conflict(l.get('immersive', {}).get('retry_conflict_text'))
                                      == norm_conflict(o.get('immersive', {}).get('retry_conflict_text'))
                                      and bool(l.get('immersive', {}).get('retry_conflict_present'))),
        't4_zero_pages': (l.get('ppt_export_publish', {}).get('zero_pages'), o.get('ppt_export_publish', {}).get('zero_pages')),
        't4_deck_tools_disabled': (l.get('ppt_export_publish', {}).get('deck_tools_all_disabled'), o.get('ppt_export_publish', {}).get('deck_tools_all_disabled')),
        't4_publish_disabled': (l.get('ppt_export_publish', {}).get('publish_disabled'), o.get('ppt_export_publish', {}).get('publish_disabled')),
        't6_export_all_disabled': (l.get('ppt_export_publish', {}).get('export_all_disabled'), o.get('ppt_export_publish', {}).get('export_all_disabled')),
        't6_export_requests': (l.get('ppt_export_publish', {}).get('export_requests'), o.get('ppt_export_publish', {}).get('export_requests')),
        't6_downloads': (l.get('ppt_export_publish', {}).get('downloads'), o.get('ppt_export_publish', {}).get('downloads')),
        't7_publish_dialog_count': (l.get('ppt_export_publish', {}).get('publish_dialog_count'), o.get('ppt_export_publish', {}).get('publish_dialog_count')),
        't2_banner': (l.get('t2_t3_workbench', {}).get('blueprint_banner'), o.get('t2_t3_workbench', {}).get('blueprint_banner')),
        't3_status': (l.get('t2_t3_workbench', {}).get('retry_http_status'), o.get('t2_t3_workbench', {}).get('retry_http_status')),
        't3_error_boundary': (l.get('t2_t3_workbench', {}).get('error_boundary'), o.get('t2_t3_workbench', {}).get('error_boundary')),
        't3_targets': (l.get('t2_t3_workbench', {}).get('retry_target'), o.get('t2_t3_workbench', {}).get('retry_target')),
        'continue_landing': (l.get('t2_t3_workbench', {}).get('continue_landing_url'), o.get('t2_t3_workbench', {}).get('continue_landing_url')),
        't3_live_text_present': (l.get('t2_t3_workbench', {}).get('retry_live_text_present'), o.get('t2_t3_workbench', {}).get('retry_live_text_present')),
        't3_markers': (l.get('t2_t3_workbench', {}).get('retry_ui_markers'), o.get('t2_t3_workbench', {}).get('retry_ui_markers')),
        't1_business_requests': (l.get('t1_textbook', {}).get('business_requests_after_click'), o.get('t1_textbook', {}).get('business_requests_after_click')),
        'plan_not_generated': (l.get('ppt_export_publish', {}).get('plan_not_generated'), o.get('ppt_export_publish', {}).get('plan_not_generated')),
        'forbidden_off': o.get('ppt_export_publish', {}).get('forbidden_after_all'),
        'published_state_off': o.get('local_state_published'),
    }
    out['compare'] = cmp
    with open(os.path.join(OUT, 'template2.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print('SAMPLE2 cmp', json.dumps(cmp, ensure_ascii=False)[:1600], flush=True)


if __name__ == '__main__':
    main()