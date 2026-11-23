# -*- coding: utf-8 -*-
"""R03 学生端数据补采器（run-03）。

只通过现役 UI 操作触发 /api 请求，抓取完整 URL（含 query）与响应原文。
输出：evidence/live/run-03/data/{api/index.json, api/bodies/, shots/}

用法：
    python r03_capture.py           # 全流程
    python r03_capture.py library   # 只跑某阶段（library/resources/errors/classroom/me）
"""
import json
import os
import re
import sys
import time
import traceback
from urllib.parse import urlparse, parse_qsl

sys.path.insert(0, r'D:\zxsy-math-arena-showcase\.work\scripts')
from playwright.sync_api import sync_playwright  # noqa: E402

BASE = 'http://127.0.0.1:5176'
ROOT = r'D:\zxsy-math-arena-showcase\evidence\live\run-03\data'
API_DIR = os.path.join(ROOT, 'api')
BODY_DIR = os.path.join(API_DIR, 'bodies')
SHOT_DIR = os.path.join(ROOT, 'shots')
WORK = r'D:\zxsy-math-arena-showcase\.work\r03-data'
for d in (API_DIR, BODY_DIR, SHOT_DIR, WORK):
    os.makedirs(d, exist_ok=True)

CTX = {'page': '', 'trigger': ''}
LOG = {'errors': [], 'notes': []}


def safe_slug(method, path, query):
    raw = f'{method} {path}' + (('?' + query) if query else '')
    s = re.sub(r'[^A-Za-z0-9._~-]+', '_', raw)
    s = s.replace('/', '-').strip('_-')
    return s[:110] or 'root'


class Collector:
    def __init__(self):
        self.items = {}      # key -> entry
        self.order = []      # keys in arrival order
        self.shot_n = 0
        # 续采：已有 index.json 先载入，flush 时合并写出（不覆盖前一轮成果）
        idx = os.path.join(API_DIR, 'index.json')
        if os.path.exists(idx):
            try:
                with open(idx, encoding='utf-8') as f:
                    old = json.load(f)
                for k, v in old.items():
                    self.items[k] = v
                    self.order.append(k)
            except Exception as e:
                LOG['errors'].append({'load_existing_index': str(e)})
        try:
            self.shot_n = len([n for n in os.listdir(SHOT_DIR) if n.endswith('.png')])
        except Exception:
            self.shot_n = 0

    # ---------- 网络记录 ----------
    def on_response(self, resp):
        try:
            url = resp.url
            if '/api/' not in url or '/src/' in url or '/node_modules/' in url or '/@fs/' in url:
                return
            u = urlparse(url)
            method = resp.request.method.upper()
            key = f'{method} {u.path}' + (('?' + u.query) if u.query else '')
            page_name = CTX['page']
            trig = CTX['trigger']
            if key in self.items:
                self.items[key].setdefault('seenIn', []).append({'page': page_name, 'trigger': trig, 'status': resp.status})
                return
            ct = ''
            try:
                ct = resp.headers.get('content-type') or ''
            except Exception:
                pass
            body = None
            if 'event-stream' not in ct:
                try:
                    body = resp.text()
                except Exception as e:  # 流式/已释放
                    body = None
                    LOG['errors'].append({'url': url, 'body_read_error': str(e)})
            slug = safe_slug(method, u.path, u.query)
            name = None
            if body is not None:
                name = slug + '.txt'
                with open(os.path.join(BODY_DIR, name), 'w', encoding='utf-8') as f:
                    f.write(body)
            req_body = None
            try:
                req_body = resp.request.post_data
            except Exception:
                req_body = None
            entry = {
                'url': url,
                'status': resp.status,
                'ct': ct,
                'file': name,
                'bytes': len(body.encode('utf-8')) if body is not None else 0,
                'page': page_name,
                'trigger': trig,
            }
            if req_body:
                entry['reqBody'] = req_body[:4000]
            self.items[key] = entry
            self.order.append(key)
            print(f'    net {key} -> {resp.status} ({entry["bytes"]}B)', flush=True)
        except Exception as e:  # 绝不因单条记录失败而中断采集
            LOG['errors'].append({'url': getattr(resp, 'url', '?'), 'handler_error': str(e)})

    # ---------- 落盘 ----------
    def flush(self):
        idx = {}
        for k in self.order:
            idx[k] = self.items[k]
        with open(os.path.join(API_DIR, 'index.json'), 'w', encoding='utf-8') as f:
            json.dump(idx, f, ensure_ascii=False, indent=1, sort_keys=False)

    def shot(self, page, name, full=True):
        self.shot_n += 1
        fn = f'{self.shot_n:02d}-{name}.png'
        try:
            page.screenshot(path=os.path.join(SHOT_DIR, fn), full_page=bool(full))
        except Exception as e:
            LOG['errors'].append({'shot': name, 'err': str(e)})
            return None
        return fn


C = Collector()


def ctx(page, trigger):
    CTX['page'] = page
    CTX['trigger'] = trigger
    print(f'  [{page}] {trigger}  @{time.strftime("%H:%M:%S")}', flush=True)


def wait(page, ms):
    page.wait_for_timeout(ms)


def body_text(page):
    try:
        return page.inner_text('body')
    except Exception:
        return ''


def click_text(page, text, scope='button, a, [role=tab], .tag-pill, .rc-chip, .lib-cat', timeout=8000):
    loc = page.locator(scope).filter(has_text=text).first
    loc.wait_for(state='visible', timeout=timeout)
    loc.click()
    return True


def js_click(page, selector, text):
    """对真实 DOM 元素派发 click（用于被浮层遮挡/隐藏容器内的真实控件）。"""
    return page.evaluate(
        """([sel, text]) => {
             const els = [...document.querySelectorAll(sel)];
             let el = els.find(e => ((e.innerText || '').trim()) === text);
             if (!el) el = els.find(e => ((e.innerText || '').includes(text)));
             if (!el || !el.isConnected) return false;
             el.scrollIntoView({ block: 'center' });
             el.click();
             return true;
           }""", [selector, text])


def login_robust(page, max_rounds=30):
    """现役短信登录：真实点 UI。频控时按响应体 retry_after 等待，槽位可能被并行代理抢占，故耐心重试。
    返回 demo 验证码（页面 .demo-note 优先，响应体 demo_code 兜底）。"""
    box = []

    def on_resp(r):
        if '/api/auth/challenges/sms' in r.url:
            try:
                box.append((r.status, json.loads(r.text())))
            except Exception:
                box.append((r.status, None))

    page.on('response', on_resp)
    page.goto(BASE + '/login', wait_until='load')
    wait(page, 1200)
    page.select_option('#preferred-role', 'student')
    page.fill('#auth-phone', '13800001001')

    for rnd in range(max_rounds):
        box.clear()
        try:
            btn_txt = ''
            try:
                btn_txt = page.eval_on_selector_all('button', "els => els.map(e=>e.innerText.trim()).filter(t=>t && t.length<20).join('|').slice(0,120)")
            except Exception:
                btn_txt = '?'
            print(f'  [login] round {rnd + 1} buttons={btn_txt}', flush=True)
            page.get_by_role('button', name='获取验证码').click(timeout=8000)
        except Exception as e:
            print(f'  [login] click failed: {str(e)[:120]}', flush=True)
            wait(page, 3000)
            continue
        demo = ''
        waited = False
        for _ in range(40):
            wait(page, 500)
            # 页面演示码
            try:
                dn = page.eval_on_selector('.demo-note', 'el => el.innerText')
            except Exception:
                dn = ''
            if dn:
                m = re.search(r'(\d{6})', dn)
                if m:
                    demo = m.group(1)
                    break
            if box:
                status, payload = box[-1]
                print(f'  [login] resp status={status} payload={str(payload)[:160]}', flush=True)
                if status == 200 and payload:
                    data = payload.get('data') or {}
                    if data.get('demo_code'):
                        demo = str(data['demo_code'])
                        break
                if status == 429:
                    ra = 60
                    if payload:
                        ra = int(payload.get('retry_after') or (payload.get('data') or {}).get('retry_after') or 60)
                    print(f'  [login] 429 slot busy, retry_after={ra}s (round {rnd + 1})', flush=True)
                    time.sleep(max(3, min(ra + 2, 65)))
                    waited = True
                    break
        if demo:
            page.get_by_placeholder('6 位验证码').fill(demo)
            page.get_by_role('button', name='安全登录').click()
            wait(page, 3000)
            if '/login' not in page.url:
                print(f'  [login] ok demo={demo} url={page.url}', flush=True)
                page.remove_listener('response', on_resp)
                return demo
            print('  [login] submit failed, retry', flush=True)
            time.sleep(5)
        elif not waited:
            time.sleep(3)
    raise RuntimeError('login failed after retries')


# =====================================================================
# 阶段 1：我的题库（/library 我的题库 Tab）
# =====================================================================
def phase_library(page):
    ctx('library', '进入 /library（默认「我的资料」Tab）')
    page.goto(BASE + '/library', wait_until='load')
    wait(page, 4000)
    C.shot(page, 'library-materials-tab')
    C.flush()

    ctx('library', '点击 Tab「我的题库」→ 首次加载题库')
    click_text(page, '我的题库', scope='.lib-tabs button')
    wait(page, 3500)
    C.shot(page, 'library-questions-tab')
    C.flush()

    # 加载更多（offset 翻页）
    for i in range(4):
        try:
            btn = page.get_by_role('button', name=re.compile('加载更多'))
            if btn.count() == 0:
                break
            if btn.first.is_disabled():
                break
            ctx('library', f'我的题库 → 点击「加载更多」第 {i + 1} 次（offset 翻页）')
            btn.first.click()
            wait(page, 2200)
            C.shot(page, f'library-questions-load-more-{i + 1}')
            C.flush()
        except Exception as e:
            LOG['errors'].append({'step': 'load-more', 'err': str(e)})
            break

    # 题型筛选
    ctx('library', '我的题库 → 题型下拉选「选择题」')
    page.select_option('select[aria-label="题型"]', 'choice')
    wait(page, 1800)
    C.shot(page, 'library-q-filter-choice')
    C.flush()

    ctx('library', '我的题库 → 题型=选择题 && 难度 下拉选「基础」')
    page.select_option('select[aria-label="难度"]', 'easy')
    wait(page, 1800)
    C.shot(page, 'library-q-filter-choice-easy')
    C.flush()

    ctx('library', '我的题库 → 难度 下拉选「压轴」（题型仍=选择题）')
    page.select_option('select[aria-label="难度"]', 'hard')
    wait(page, 1800)
    C.flush()

    ctx('library', '我的题库 → 题型重置为「全部题型」（难度仍=压轴）')
    page.select_option('select[aria-label="题型"]', '')
    wait(page, 1800)
    C.flush()

    ctx('library', '我的题库 → 难度重置为「全部难度」')
    page.select_option('select[aria-label="难度"]', '')
    wait(page, 1800)
    C.flush()

    # 关键字搜索（防抖 280ms）
    for kw in ('函数', '导数'):
        ctx('library', f'我的题库 → 搜索框输入「{kw}」（防抖后触发）')
        page.fill('input[aria-label="搜索题干"]', kw)
        wait(page, 2200)
        C.shot(page, f'library-q-search-{kw}')
        C.flush()
    ctx('library', '我的题库 → 清空搜索关键字')
    page.fill('input[aria-label="搜索题干"]', '')
    wait(page, 2200)
    C.flush()

    # 打开题目详情抽屉
    try:
        ctx('library', '我的题库 → 点击第一张题卡（打开题目详情抽屉）')
        card = page.locator('.q-card').first
        card.wait_for(state='visible', timeout=8000)
        card.click()
        wait(page, 2500)
        C.shot(page, 'library-question-drawer')
        C.flush()
    except Exception as e:
        LOG['errors'].append({'step': 'question-drawer', 'err': str(e)})
    # 关闭抽屉
    try:
        page.keyboard.press('Escape')
        wait(page, 800)
        if page.locator('.drawer-close, [title="关闭"]').count():
            page.locator('.drawer-close, [title="关闭"]').first.click()
            wait(page, 800)
    except Exception:
        pass

    # 我的资料：分类 chip（纯前端）+ 点开资料抽屉（可能触发切片请求）
    ctx('library', '切回「我的资料」Tab（可能重新拉资料列表）')
    try:
        click_text(page, '我的资料', scope='.lib-tabs button')
        wait(page, 2500)
        C.flush()
        ctx('library', '我的资料 → 点击第一个分类 chip「教材」')
        click_text(page, '教材', scope='.lib-cat', timeout=4000)
        wait(page, 1500)
        ctx('library', '我的资料 → 点击第一份资料（打开资料抽屉）')
        row = page.locator('.doc-row').first
        if row.count():
            row.click()
            wait(page, 2800)
            C.shot(page, 'library-doc-drawer')
            C.flush()
    except Exception as e:
        LOG['errors'].append({'step': 'doc-drawer', 'err': str(e)})


# =====================================================================
# 阶段 1b：我的题库补采（搜索关键字 + 题卡详情；已采过的筛选组合不重复）
# =====================================================================
def phase_library2(page):
    ctx('library', '直接进入 /library?tab=questions（首次加载题库 limit=30&offset=0）')
    page.goto(BASE + '/library?tab=questions', wait_until='load')
    wait(page, 4500)
    C.shot(page, 'library2-questions')
    C.flush()
    # 「加载更多」是否存在（offset 翻页唯一切入点）
    more = page.evaluate("""() => {
        const btns = [...document.querySelectorAll('button')];
        const b = btns.find(x => (x.innerText || '').includes('加载更多'));
        const cnt = (document.querySelector('.lib-count') || {}).innerText || '';
        const foot = (document.querySelector('.q-load-more') || {}).innerText || '';
        return { hasLoadMore: !!b, disabled: b ? b.disabled : null, count: cnt.replace(/\\s+/g, ' '), foot: foot.replace(/\\s+/g, ' ') };
    }""")
    LOG['notes'].append({'library_load_more': more})
    print('  [library] load-more state:', more, flush=True)

    for kw in ('函数', '导数'):
        ctx('library', f'我的题库 → 搜索框输入「{kw}」（q=… 检索）')
        page.fill('input[aria-label="搜索题干"]', kw)
        wait(page, 2600)
        C.shot(page, f'library2-search-{kw}')
        C.flush()
    ctx('library', '我的题库 → 清空搜索关键字（回到全量）')
    page.fill('input[aria-label="搜索题干"]', '')
    wait(page, 2600)
    C.flush()

    ctx('library', '我的题库 → 点击第 1 张题卡（打开题目详情抽屉 → GET /v1/questions/{id}）')
    try:
        card = page.locator('.q-card').first
        card.wait_for(state='visible', timeout=8000)
        card.click()
        wait(page, 4000)
        C.shot(page, 'library2-question-drawer')
        C.flush()
    except Exception as e:
        LOG['errors'].append({'step': 'q-drawer', 'err': str(e)})
    C.flush()


# =====================================================================
# 阶段 1c：我的题库剩余筛选取值（q_type=blank/solution、difficulty=medium）
# =====================================================================
def phase_library3(page):
    ctx('library', '进入 /library?tab=questions（补采 q_type=blank/solution、difficulty=medium）')
    page.goto(BASE + '/library?tab=questions', wait_until='load')
    wait(page, 4000)
    for t in ('blank', 'solution'):
        ctx('library', f'我的题库 → 题型下拉选「{ {"blank": "填空题", "solution": "解答题"}[t] }」')
        page.select_option('select[aria-label="题型"]', t)
        wait(page, 2200)
    ctx('library', '我的题库 → 题型重置「全部题型」')
    page.select_option('select[aria-label="题型"]', '')
    wait(page, 2200)
    ctx('library', '我的题库 → 难度下拉选「进阶」(medium)')
    page.select_option('select[aria-label="难度"]', 'medium')
    wait(page, 2200)
    C.shot(page, 'library3-difficulty-medium')
    # 记录「加载更多」是否存在（offset 翻页是否可达）
    more = page.evaluate("""() => {
        const b = [...document.querySelectorAll('button')].find(x => (x.innerText || '').includes('加载更多'));
        return { hasLoadMore: !!b, count: ((document.querySelector('.lib-count')||{}).innerText||'').replace(/\\s+/g,' '),
                 foot: ((document.querySelector('.q-load-more')||{}).innerText||'').replace(/\\s+/g,' ') };
    }""")
    LOG['notes'].append({'library_load_more': more})
    print('  [library3] load-more:', more, flush=True)
    C.flush()


# =====================================================================
# 阶段 2：资源中心
# =====================================================================
def phase_resources(page):
    ctx('resources', '进入 /resources（默认「为你推荐」模式：装填分类 + POST 推荐流）')
    page.goto(BASE + '/resources', wait_until='load')
    wait(page, 6000)
    C.shot(page, 'resources-recommend')
    C.flush()

    ctx('resources', '点击「🧭 按知识点浏览」Tab')
    try:
        click_text(page, '按知识点浏览', scope='.rc-modes button')
    except Exception as e:
        LOG['errors'].append({'step': 'rc-topic-mode', 'err': str(e)})
    wait(page, 5000)
    C.shot(page, 'resources-topic-mode')
    C.flush()

    # 分类 chips（取前 3 个非 active）
    try:
        chips = page.locator('.rc-chip')
        n = min(chips.count(), 4)
        for i in range(n):
            label = chips.nth(i).inner_text().strip()
            ctx('resources', f'按知识点浏览 → 点击分类 chip「{label}」')
            chips.nth(i).click()
            wait(page, 4500)
            C.shot(page, f'resources-chip-{i + 1}')
            C.flush()
    except Exception as e:
        LOG['errors'].append({'step': 'rc-chips', 'err': str(e)})

    # 关键词搜索
    ctx('resources', '资源中心 → 搜索框输入「数列求和」并回车（keyword 检索）')
    try:
        page.fill('.rc-search', '数列求和')
        page.press('.rc-search', 'Enter')
        wait(page, 5000)
        C.shot(page, 'resources-search-keyword')
        C.flush()
    except Exception as e:
        LOG['errors'].append({'step': 'rc-search', 'err': str(e)})

    ctx('resources', '资源中心 → 点击「↻ 刷新」')
    try:
        click_text(page, '↻ 刷新', scope='.rc-actions button', timeout=4000)
        wait(page, 4000)
        C.flush()
    except Exception as e:
        LOG['errors'].append({'step': 'rc-refresh', 'err': str(e)})


# =====================================================================
# 阶段 3：错题
# =====================================================================
def phase_errors(page):
    ctx('errors', '进入 /errors（热力图 + 到期队列 + 筛选列表；自动弹出首题详情浮窗）')
    page.goto(BASE + '/errors', wait_until='load')
    wait(page, 8000)
    C.shot(page, 'errors-auto-detail-modal', full=False)
    C.flush()

    ctx('errors', '错题页 → 关闭自动弹出的详情浮窗（✕ 关闭）')
    try:
        btn = page.get_by_title('关闭详情')
        if btn.count():
            btn.first.click()
        else:
            js_click(page, 'button.modal-close', '✕ 关闭')
        wait(page, 2000)
        C.shot(page, 'errors-list-all')
        C.flush()
    except Exception as e:
        LOG['errors'].append({'step': 'close-modal', 'err': str(e)})

    # 浮窗关闭后详情区（含筛选 tabs）被 CSS 隐藏（.errors-left:not(.modal-mode) .detail-modal-wrap{display:none}）
    # → 点列表第一条错题重新打开浮窗，再切 5 个筛选 Tab
    ctx('errors', '错题页 → 点击列表第一条错题（重新打开详情浮窗：详情 + AI 诊断 + 正解）')
    try:
        row = page.locator('.errors-right .item, .errors-right [style*="border-bottom"]')
        if row.count():
            row.first.click()
        wait(page, 6000)
        C.shot(page, 'errors-detail-modal-reopen', full=False)
        C.flush()
    except Exception as e:
        LOG['errors'].append({'step': 'reopen-detail', 'err': str(e)})

    # 5 个筛选 Tab：全部 / 按错因 / 按知识点 / 按时间 / 按遗忘风险
    tabs = ['全部', '按错因', '按知识点', '按时间', '按遗忘风险']
    sub_by_tab = {
        '按错因': ['概念不清', '计算失误'],
        '按时间': ['近 7 天', '近 30 天'],
        '按遗忘风险': ['稳定区', '衰减中'],
    }
    for tab_name in tabs:
        try:
            ctx('errors', f'错题页 → 切换筛选 Tab「{tab_name}」')
            ok = js_click(page, '.view-tabs button', tab_name)
            if not ok:
                click_text(page, tab_name, scope='button', timeout=4000)
            wait(page, 2400)
            C.shot(page, f'errors-tab-{tab_name.replace("按", "by-")}')
            C.flush()
            # 该 Tab 下的维度取值（浮窗右侧维度取值行）
            if tab_name == '按知识点':
                labels = page.evaluate("""() => [...document.querySelectorAll('button.tag-pill')]
                                             .map(b => (b.innerText||'').trim()).slice(0, 2)""")
            else:
                labels = sub_by_tab.get(tab_name, [])[:2]
            for lab in labels:
                if not lab:
                    continue
                ctx('errors', f'错题页 → Tab「{tab_name}」下点击维度值「{lab}」')
                ok = js_click(page, 'button.tag-pill', lab)
                wait(page, 2400)
                if ok:
                    C.shot(page, f'errors-sub-{tab_name.replace("按", "by-")}-{lab}')
                else:
                    LOG['errors'].append({'step': f'sub-{tab_name}-{lab}', 'err': 'pill not found'})
                C.flush()
        except Exception as e:
            LOG['errors'].append({'step': f'tab-{tab_name}', 'err': str(e)})


# =====================================================================
# 阶段 4：课堂（任务 / 班级 / 双师 + 5 页课件播放 + 查看作答）
# =====================================================================
def phase_classroom(page):
    ctx('classroom', '进入 /classroom（默认「课堂任务」Tab：作业列表 + 老师课件 + 我的班级）')
    page.goto(BASE + '/classroom', wait_until='load')
    wait(page, 7000)
    C.shot(page, 'classroom-tasks')
    C.flush()

    # 课堂任务：切 已完成 / 待完成（客户端筛选）
    for t in ('已完成', '待完成', '全部'):
        ctx('classroom', f'课堂任务 → 切换任务 Tab「{t}」')
        try:
            js_click(page, '.task-tabs button', t)
            wait(page, 1500)
        except Exception as e:
            LOG['errors'].append({'step': f'tasks-tab-{t}', 'err': str(e)})
    C.shot(page, 'classroom-tasks-all')
    C.flush()

    # 我的班级
    ctx('classroom', '点击「🏫 我的班级」Tab（/classes/mine → 成员/动态/热门错题）')
    try:
        click_text(page, '我的班级', scope='.cls-tabs button')
        wait(page, 6000)
        C.shot(page, 'classroom-class')
        C.flush()
    except Exception as e:
        LOG['errors'].append({'step': 'class-tab', 'err': str(e)})

    # 双师课堂
    ctx('classroom', '点击「🎬 双师课堂」Tab（老师课堂课件列表 + 最近课堂 /classroom/sessions）')
    try:
        click_text(page, '双师课堂', scope='.cls-tabs button')
        wait(page, 7000)
        C.shot(page, 'classroom-dual')
        C.flush()
    except Exception as e:
        LOG['errors'].append({'step': 'dual-tab', 'err': str(e)})

    # 老师课件卡（标题含「函数的单调性」）
    target = '函数的单调性'
    card = None
    for sel in ('.tc-card', '.task-item'):
        loc = page.locator(sel).filter(has_text=target)
        if loc.count():
            card = loc.first
            break
    if card is None:
        LOG['errors'].append({'step': 'find-courseware-card', 'err': '未找到《函数的单调性》课件卡'})
    else:
        LOG['notes'].append({'courseware_card': card.inner_text().replace('\n', ' | ')})
        C.shot(page, 'classroom-dual-courseware-card', full=False)
        ctx('classroom', '双师课堂 → 点击老师课件卡《函数的单调性：从图像到导数》（POST open 建课堂会话 → 跳 /dual/<sid>）')
        try:
            card.click()
            wait(page, 10000)
            page.wait_for_url(re.compile(r'/dual/'), timeout=25000)
        except Exception as e:
            LOG['errors'].append({'step': 'open-courseware', 'err': str(e)})
        wait(page, 6000)
        C.shot(page, 'classroom-player-p1', full=False)
        C.flush()

        # 播放控件原话
        try:
            ctl = page.evaluate("""() => [...document.querySelectorAll('button, .dcx-pagechip, .dcx-ctl-page, .dcx-ctl')]
                 .map(el => ({ title: el.getAttribute('title') || '', text: (el.innerText || '').replace(/\\s+/g, ' ').trim() }))
                 .filter(x => x.title || x.text).slice(0, 60)""")
            LOG['notes'].append({'player_controls': ctl})
        except Exception as e:
            LOG['errors'].append({'step': 'player-controls', 'err': str(e)})

        # 逐页翻页（第 1 页已在打开时截）
        for i in range(1, 5):
            ctx('classroom', f'播放页 → 点击「下一页」（翻到第 {i + 1} 页，触发 slide_index 进度上报）')
            try:
                btn = page.get_by_title('下一页')
                if btn.count() == 0:
                    btn = page.locator('button', has_text='⟩')
                btn.first.click()
                wait(page, 3000)
                C.shot(page, f'classroom-player-p{i + 1}', full=False)
                chip = page.evaluate("""() => { const a = document.querySelector('.dcx-pagechip'); const b = document.querySelector('.dcx-ctl-page'); return { chip: a ? a.innerText.trim() : '', ctl: b ? b.innerText.trim() : '' }; }""")
                LOG['notes'].append({'player_page': i + 1, **chip})
                C.flush()
            except Exception as e:
                LOG['errors'].append({'step': f'next-page-{i + 1}', 'err': str(e)})
                break
        wait(page, 2500)
        C.flush()

        # 播放 / 暂停控件
        for label in ('播放', '暂停'):
            try:
                b = page.locator('button').filter(has_text=label)
                if b.count():
                    ctx('classroom', f'播放页 → 点击「{label}」控件（播放状态变化）')
                    b.first.click()
                    wait(page, 3000)
                    C.shot(page, f'classroom-player-{label}', full=False)
                    C.flush()
            except Exception as e:
                LOG['errors'].append({'step': f'player-{label}', 'err': str(e)})

    # 查看作答 / 查看反馈
    ctx('classroom', '返回 /classroom → 课堂任务 →「已完成」Tab → 点击「↻ 查看作答」（进入 /tasks/<assignment_id>）')
    try:
        page.goto(BASE + '/classroom', wait_until='load')
        wait(page, 6000)
        js_click(page, '.task-tabs button', '已完成')
        wait(page, 2000)
        C.shot(page, 'classroom-tasks-done')
        C.flush()
        view = page.locator('.task-item button').filter(has_text='查看作答')
        if view.count():
            ctx('classroom', '课堂任务（已完成）→ 点击「↻ 查看作答」（/tasks/:id 作业作答页：详情 + 结果反馈）')
            view.first.click()
            wait(page, 9000)
            C.shot(page, 'classroom-assignment-view')
            C.flush()
            fb = page.locator('button, a, [role=tab]').filter(has_text='反馈')
            if fb.count():
                ctx('classroom', '查看作答页 → 点击「查看反馈/反馈」入口')
                fb.first.click()
                wait(page, 5000)
                C.shot(page, 'classroom-assignment-feedback')
                C.flush()
        else:
            LOG['notes'].append({'assignment_view': '未找到「查看作答」按钮（可能无已完成作业）'})
    except Exception as e:
        LOG['errors'].append({'step': 'assignment-view', 'err': str(e)})


# =====================================================================
# 阶段 4b：仅课件播放（补采 5 页逐页截图 / 控件原话）
# =====================================================================
def phase_play(page):
    ctx('classroom-play', '进入 /classroom?tab=dual（老师课堂卡片）')
    page.goto(BASE + '/classroom?tab=dual', wait_until='load')
    wait(page, 8000)
    loc = page.locator('.tc-card').filter(has_text='函数的单调性')
    if not loc.count():
        LOG['errors'].append({'step': 'play-find-card', 'err': 'not found'})
        C.shot(page, 'classroom-dual-no-card')
        return
    LOG['notes'].append({'play_card': loc.first.inner_text().replace('\n', ' | ')})
    ctx('classroom-play', '双师课堂 → 点击《函数的单调性：从图像到导数》卡片（POST open → 播放页）')
    loc.first.click()
    wait(page, 10000)
    page.wait_for_url(re.compile(r'/dual/'), timeout=25000)
    wait(page, 5000)
    C.flush()

    # 先把页数读出来
    meta = page.evaluate("""() => { const a=document.querySelector('.dcx-pagechip'); const b=document.querySelector('.dcx-ctl-page');
        return { chip: a?a.innerText.trim():'', ctl: b?b.innerText.trim():'' }; }""")
    LOG['notes'].append({'play_open_at': meta})
    page.screenshot(path=os.path.join(SHOT_DIR, 'classroom-player-open.png'))
    C.flush()

    # 回到第 1 页
    for _ in range(6):
        try:
            b = page.get_by_title('上一页')
            if b.count() == 0 or b.first.is_disabled():
                break
            ctx('classroom-play', '播放页 → 点击「上一页」回到第一页')
            b.first.click()
            wait(page, 1800)
        except Exception as e:
            LOG['errors'].append({'step': 'prev-page', 'err': str(e)})
            break
    C.flush()

    for i in range(1, 6):
        cur = page.evaluate("""() => { const a=document.querySelector('.dcx-pagechip'); const b=document.querySelector('.dcx-ctl-page');
            return { chip: a?a.innerText.trim():'', ctl: b?b.innerText.trim():'' }; }""")
        C.shot(page, f'player-page-{i}')
        head = page.evaluate("""() => { const el=document.querySelector('.dcx-slide-head, .dcx-slide-title, h2, h3');
            return el ? el.innerText.replace(/\\s+/g,' ').slice(0,120) : ''; }""")
        LOG['notes'].append({'play_page': i, **cur, 'head': head})
        ctx('classroom-play', f'播放页 → 第 {i} 页；点击「下一页」翻页（slide_index 进度上报）')
        C.flush()
        if i == 5:
            break
        try:
            b = page.get_by_title('下一页')
            if b.count() == 0:
                break
            b.first.click()
            wait(page, 3000)
        except Exception as e:
            LOG['errors'].append({'step': f'play-next-{i}', 'err': str(e)})
            break
    # 播放/暂停控件原话 + 交互
    try:
        ctl = page.evaluate("""() => [...document.querySelectorAll('button')]
            .map(el => ({ title: el.getAttribute('title') || '', text: (el.innerText || '').replace(/\\s+/g,' ').trim() }))
            .filter(x => x.title || x.text).slice(0, 80)""")
        LOG['notes'].append({'play_controls_all': ctl})
    except Exception as e:
        LOG['errors'].append({'step': 'play-controls', 'err': str(e)})
    for title in ('播放讲解', '停止讲解'):
        try:
            b = page.get_by_title(title)
            if b.count():
                ctx('classroom-play', f'播放页 → 点击「{title}」控件（播放状态变化）')
                b.first.click()
                wait(page, 3500)
                C.shot(page, f'player-{title}')
                C.flush()
        except Exception as e:
            LOG['errors'].append({'step': f'play-{title}', 'err': str(e)})
    C.flush()


# =====================================================================
# 阶段 5：我的（4 Tab）
# =====================================================================
def phase_me(page):
    ctx('me', '进入 /me（默认「学情报告」Tab）')
    page.goto(BASE + '/me', wait_until='load')
    wait(page, 9000)
    C.shot(page, 'me-report')
    C.flush()

    for en, zh, wait_ms in (('graph', '掌握地图', 7000), ('trial', '体验反馈', 5000), ('profile', '个人设置', 6000)):
        ctx('me', f'我的 → 切换 Tab「{zh}」')
        try:
            click_text(page, zh, scope='.me-tabs button', timeout=6000)
            wait(page, wait_ms)
            C.shot(page, f'me-{en}')
            C.flush()
        except Exception as e:
            LOG['errors'].append({'step': f'me-{en}', 'err': str(e)})

    # 掌握地图：点一个知识点节点（触发 deps/recommend/errors）
    ctx('me', '我的 → 掌握地图：点击一个知识点节点（deps/recommend/errors）')
    try:
        click_text(page, '掌握地图', scope='.me-tabs button', timeout=5000)
        wait(page, 4000)
        node = page.locator('.tree-node, .kp-node, [class*="node"]').first
        if node.count():
            node.click()
            wait(page, 5000)
            C.shot(page, 'me-graph-node')
            C.flush()
    except Exception as e:
        LOG['errors'].append({'step': 'graph-node', 'err': str(e)})

    # 回到学情报告，滚动让懒加载块触发
    ctx('me', '我的 → 回到「学情报告」Tab（补齐报告各分块请求）')
    try:
        click_text(page, '学情报告', scope='.me-tabs button', timeout=5000)
        wait(page, 8000)
        C.shot(page, 'me-report-full')
        C.flush()
    except Exception as e:
        LOG['errors'].append({'step': 'me-report-again', 'err': str(e)})


def main():
    phases = sys.argv[1:] or ['library', 'resources', 'errors', 'classroom', 'me']
    t0 = time.time()
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True, args=[
            '--disable-gpu', '--disable-dev-shm-usage', '--disable-software-rasterizer',
            '--disable-backgrounding-occluded-windows', '--js-flags=--max-old-space-size=2048',
        ])
        c = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1)
        page = c.new_page()
        page.on('response', C.on_response)
        page.on('pageerror', lambda e: LOG['errors'].append({'pageerror': str(e)}))
        page.on('crash', lambda pg: LOG['errors'].append({'page_crash_at': dict(CTX),
                                                          'url': (pg.url if pg else '')}))
        demo = login_robust(page)
        LOG['notes'].append({'login_url': page.url, 'demo_code': demo})
        print('login ok ->', page.url)
        fn = {'library': phase_library, 'library2': phase_library2, 'library3': phase_library3,
              'resources': phase_resources, 'errors': phase_errors,
              'classroom': phase_classroom, 'me': phase_me, 'play': phase_play}
        for ph in phases:
            print(f'--- phase {ph} ---', flush=True)
            try:
                fn[ph](page)
                with open(os.path.join(WORK, f'phase-{ph}.ok'), 'w', encoding='utf-8') as mf:
                    mf.write(time.strftime('%Y-%m-%d %H:%M:%S'))
            except Exception:
                LOG['errors'].append({'phase': ph, 'trace': traceback.format_exc()[-2500:]})
                print(f'phase {ph} ERROR', flush=True)
            C.flush()
            wait(page, 800)
        C.flush()
        b.close()
    with open(os.path.join(WORK, f'run-log-{time.strftime("%H%M%S")}.json'), 'w', encoding='utf-8') as f:
        json.dump({'errors': LOG['errors'], 'notes': LOG['notes'], 'elapsed_sec': round(time.time() - t0, 1),
                   'interfaces': len(C.items)}, f, ensure_ascii=False, indent=1)
    # 控制台摘要
    g = sum(1 for k in C.items if k.startswith('GET '))
    print(f'done elapsed={round(time.time() - t0, 1)}s interfaces={len(C.items)} GET={g} errors={len(LOG["errors"])}')
    for e in LOG['errors'][:20]:
        print('  ERR', e)


if __name__ == '__main__':
    main()

