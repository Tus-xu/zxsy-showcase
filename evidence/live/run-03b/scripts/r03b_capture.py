# -*- coding: utf-8 -*-
"""run-03b 离线包数据缺口补采（现役 UI 实测）。

三个缺口：
  A. /dialog 左侧历史会话 —— 逐条点开，抓 `GET /api/agent/conversations/{id}/messages?...`
  B. /errors 错题详情 —— 逐条点开，抓 detail / butler error-detail / butler error-diagnosis
  C. /resources「按知识点浏览」Tab —— 抓全部 i*.hdslb.com 封面原始字节 + videos 列表响应

纪律：
  * 只通过现役 UI 操作触发请求，不直调业务 API 造数据；
  * 不修改任何产品代码；token / cookie 不落盘（本脚本只保存响应原文与图片字节）；
  * 输出 evidence/live/run-03b/，运行日志写 .work/r03b/。

用法：
  python r03b_capture.py            # 全部三个阶段
  python r03b_capture.py conv       # 只跑 A
  python r03b_capture.py errors     # 只跑 B
  python r03b_capture.py covers     # 只跑 C
"""
import json
import os
import re
import sys
import time
import traceback
import urllib.request
from urllib.parse import urlparse

try:  # 宿主控制台是 GBK：统一 UTF-8，避免 emoji 打印把整段阶段打断
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:  # noqa: BLE001
    pass

HERE = os.path.dirname(os.path.abspath(__file__))
EV = os.path.abspath(os.path.join(HERE, '..'))                 # evidence/live/run-03b
WORK = r'D:\zxsy-math-arena-showcase\.work\r03b'
BASE = 'http://127.0.0.1:5176'

sys.path.insert(0, r'D:\zxsy-math-arena-showcase\.work\scripts')
from playwright.sync_api import sync_playwright  # noqa: E402
from live_login import login, STUDENT  # noqa: E402

D_CONV = os.path.join(EV, 'conversations')
D_CONVB = os.path.join(D_CONV, 'bodies')
D_ERR = os.path.join(EV, 'errors')
D_ERRB = os.path.join(D_ERR, 'bodies')
D_COV = os.path.join(EV, 'covers')
D_COVF = os.path.join(D_COV, 'files')
D_COVB = os.path.join(D_COV, 'bodies')
D_SHOT = os.path.join(EV, 'shots')
D_BASE = os.path.join(EV, 'baseline')
D_BASEB = os.path.join(D_BASE, 'bodies')
for d in (D_CONV, D_CONVB, D_ERR, D_ERRB, D_COV, D_COVF, D_COVB, D_SHOT, D_BASE, D_BASEB, WORK):
    os.makedirs(d, exist_ok=True)

CTX = {'step': ''}
LOG = {'errors': [], 'steps': [], 'notes': []}
RESP = []      # 本次进程内所有 /api/ 响应（按到达顺序）
BYKEY = {}     # "METHOD path?query" -> 首次响应
COVERS = {}    # cover url -> {file, ct, bytes, source}
SHOT_N = 0
CONVS = {}     # conv id -> index entry
ERRS = {}      # record id -> index entry
COV_META = {}  # videos list response info


def step(page, label):
    CTX['step'] = label
    LOG['steps'].append({'t': time.strftime('%H:%M:%S'), 'step': label, 'url': page.url})
    print(f'    [{time.strftime("%H:%M:%S")}] {label}', flush=True)


def shot(page, name, full=False):
    global SHOT_N
    SHOT_N += 1
    fn = f'{SHOT_N:02d}-{name}.png'
    try:
        page.screenshot(path=os.path.join(D_SHOT, fn), full_page=bool(full))
        return 'shots/' + fn
    except Exception as e:  # noqa: BLE001
        LOG['errors'].append({'shot': name, 'err': str(e)})
        return ''


def dump_json(path, obj):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)


def read_json(text):
    try:
        return json.loads(text)
    except Exception:  # noqa: BLE001
        return None


def items_of(payload):
    """响应原文里稳妥地取 items 列表（兼容 {code,data:{items}} / {items} / 顶层数组）。"""
    if payload is None:
        return []
    if isinstance(payload, list):
        return payload
    for k in ('data', 'result', 'payload'):
        v = payload.get(k)
        if isinstance(v, dict):
            for kk in ('items', 'list', 'records'):
                if isinstance(v.get(kk), list):
                    return v[kk]
        if isinstance(v, list):
            return v
    for kk in ('items', 'list', 'records'):
        if isinstance(payload.get(kk), list):
            return payload[kk]
    return []


def data_obj(payload):
    if isinstance(payload, dict) and isinstance(payload.get('data'), dict):
        return payload['data']
    return payload if isinstance(payload, dict) else {}


def data_total(payload):
    return data_obj(payload).get('total')


# ------------------------------------------------------------------ 网络采集
def on_response(resp):
    try:
        url = resp.url
        u = urlparse(url)
        host = u.netloc.split(':')[0].lower()
        if host.endswith('hdslb.com'):
            _save_cover_response(resp)
            return
        if '/api/' not in u.path:
            return
        ct = resp.headers.get('content-type') or ''
        if 'event-stream' in ct:
            LOG['notes'].append({'skip_sse': url})
            return
        text = resp.text()
        entry = {
            'url': url,
            'method': resp.request.method.upper(),
            'status': resp.status,
            'ct': ct,
            'text': text,
            't': time.time(),
        }
        try:
            pd = resp.request.post_data
            if pd:
                entry['reqBody'] = pd[:8000]
        except Exception:  # noqa: BLE001
            pass
        RESP.append(entry)
        key = f"{entry['method']} {u.path}" + (('?' + u.query) if u.query else '')
        if key not in BYKEY:
            BYKEY[key] = entry
    except Exception as e:  # noqa: BLE001
        LOG['errors'].append({'handler': str(e)[:300], 'url': getattr(resp, 'url', '?')})


def _cover_ext(ct):
    ct = (ct or '').split(';')[0].strip().lower()
    if 'webp' in ct:
        return '.webp'
    if 'jpeg' in ct or 'jpg' in ct:
        return '.jpg'
    if 'png' in ct:
        return '.png'
    if 'gif' in ct:
        return '.gif'
    if 'avif' in ct:
        return '.avif'
    return '.bin'


def _save_cover_response(resp):
    try:
        ct = resp.headers.get('content-type') or ''
        if not ct.startswith('image'):
            return
        url = resp.url
        if url in COVERS:
            return
        raw = resp.body()
        if not raw:
            return
        fn = f'cover-{len(COVERS) + 1:02d}{_cover_ext(ct)}'
        with open(os.path.join(D_COVF, fn), 'wb') as f:
            f.write(raw)
        COVERS[url] = {'file': 'files/' + fn, 'path': 'covers/files/' + fn,
                       'ct': ct, 'bytes': len(raw), 'source': 'browser-response'}
        print(f'      cover + {fn} {len(raw)}B {url[:110]}', flush=True)
    except Exception as e:  # noqa: BLE001
        LOG['errors'].append({'cover_handler': str(e)[:200], 'url': getattr(resp, 'url', '?')})


def direct_fetch_cover(url, page=None):
    """兜底：直接按 UI 里的 img src 取原始字节（不带 Referer，等价 referrerpolicy=no-referrer）。"""
    if url in COVERS:
        return
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                          '(KHTML, like Gecko) Chrome/124.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/*,*/*;q=0.8',
        })
        with urllib.request.urlopen(req, timeout=25) as r:
            ct = r.headers.get('Content-Type') or ''
            raw = r.read()
        if not raw:
            raise RuntimeError('empty body')
        fn = f'cover-{len(COVERS) + 1:02d}{_cover_ext(ct)}'
        with open(os.path.join(D_COVF, fn), 'wb') as f:
            f.write(raw)
        COVERS[url] = {'file': 'files/' + fn, 'path': 'covers/files/' + fn,
                       'ct': ct, 'bytes': len(raw), 'source': 'direct-fetch'}
        print(f'      cover(fallback) + {fn} {len(raw)}B', flush=True)
    except Exception as e:  # noqa: BLE001
        LOG['errors'].append({'cover_fallback': str(e)[:300], 'url': url})


def wait_new(pred, baseline, page, timeout=12.0):
    t0 = time.time()
    while time.time() - t0 < timeout:
        for e in RESP[baseline:]:
            if pred(e):
                return e
        page.wait_for_timeout(250)
    return None


def save_body(dirpath, name, entry):
    """把响应原文落盘（UTF-8），返回相对 EV 的文件路径与字节数。"""
    if entry is None or entry.get('text') is None:
        return None, 0
    raw = entry['text']
    with open(os.path.join(dirpath, name), 'w', encoding='utf-8', newline='') as f:
        f.write(raw)
    nbytes = len(raw.encode('utf-8'))
    rel = os.path.relpath(os.path.join(dirpath, name), EV).replace('\\', '/')
    return rel, nbytes


def save_resp_any(dirpath, name, entry):
    """保存任意 by_key 命中响应（含 url/status 元信息文件）。"""
    rel, n = save_body(dirpath, name, entry)
    return {'url': entry['url'], 'status': entry['status'], 'ct': entry['ct'],
            'file': rel, 'bytes': n}


# ------------------------------------------------------------------ A. 历史会话
JS_GROUPS = """
() => {
  const out = [];
  for (const g of document.querySelectorAll('.conv-sidebar .cs-group')) {
    const label = (g.querySelector('.cs-group-title')?.innerText || '').trim();
    for (const it of g.querySelectorAll('.cs-item')) {
      out.push({
        group: label,
        title: (it.querySelector('.cs-item-title')?.innerText || '').trim(),
        time: (it.querySelector('.cs-item-time')?.innerText || '').trim(),
      });
    }
  }
  return out;
}
"""


def phase_conv(page):
    step(page, '进入 /dialog，等待左侧历史会话列表加载')
    page.goto(BASE + '/dialog', wait_until='load')
    page.wait_for_selector('.conv-sidebar .cs-item', timeout=30000)
    page.wait_for_timeout(2500)

    # 1) 会话列表响应原文
    list_entry = None
    for k, v in BYKEY.items():
        if k.startswith('GET /api/agent/conversations?') and 'limit=30' in k:
            list_entry = v
            break
    if list_entry is None:
        for k, v in BYKEY.items():
            if k == 'GET /api/agent/conversations?limit=30':
                list_entry = v
                break
    payload = read_json(list_entry['text']) if list_entry else None
    list_items = items_of(payload)
    id_meta = {}
    for it in list_items:
        if isinstance(it, dict) and it.get('id'):
            id_meta[it['id']] = it
    list_info = {'found': bool(list_entry), 'item_count': len(list_items)}
    if list_entry:
        info = save_resp_any(D_CONVB, 'conversations_limit30.json', list_entry)
        list_info.update(info)
        list_info['total'] = data_total(payload)
        list_info['hasMore'] = data_obj(payload).get('hasMore')
        dump_json(os.path.join(D_CONV, 'list.json'), list_info)
    dump_json(os.path.join(WORK, 'conv_list_info.json'), list_info)
    print(f'  conv list: items={len(list_items)} total={list_info.get("total")} found={bool(list_entry)}', flush=True)

    # 2) 侧栏分组结构（置顶 / 今天 / 7 天内 / 30 天内 / 更早）
    # JS_GROUPS 返回拍平后的 [{group,title,time}]，与 .cs-item 顺序一一对应
    groups = page.evaluate(JS_GROUPS)
    dom_items = page.evaluate(
        """() => [...document.querySelectorAll('.conv-sidebar .cs-item')].map(e => ({
             title: (e.querySelector('.cs-item-title')?.innerText || '').trim(),
             cls: e.className }))"""
    )
    dump_json(os.path.join(WORK, 'conv_sidebar_groups.json'), {'groups': groups, 'dom_items': dom_items})
    n_items = len(dom_items)
    print(f'  sidebar flat items: {n_items}; group labels={sorted(set(g["group"] for g in groups))}', flush=True)
    shot_name = shot(page, 'dialog-conversation-list')
    dump_json(os.path.join(WORK, 'conv_list_shot.json'), {'shot': shot_name})

    # 3) 逐条点开（最多 30 条；每次等它自己的 messages 响应）
    ids_done = set()
    for idx in range(n_items):
        dom = dom_items[idx] if idx < len(dom_items) else {}
        title = dom.get('title', '')
        ginfo = groups[idx]['group'] if idx < len(groups) else ''
        step(page, f'点开历史会话 #{idx + 1}/{n_items}：「{title or "（空标题）"}」')
        loc = page.locator('.conv-sidebar .cs-item').nth(idx)
        try:
            loc.scroll_into_view_if_needed(timeout=5000)
        except Exception as e:  # noqa: BLE001
            LOG['errors'].append({'conv_scroll': idx, 'err': str(e)[:200]})
        def pred(r):
            m = re.search(r'/api/agent/conversations/([0-9a-fA-F-]{8,})/messages', r.url)
            return bool(m) and m.group(1) not in ids_done
        got = None
        try:
            with page.expect_response(pred, timeout=15000) as ri:
                loc.click(timeout=8000)
            got = ri.value
        except Exception as e:  # noqa: BLE001
            LOG['errors'].append({'conv_click': idx, 'title': title, 'err': str(e)[:300]})
        page.wait_for_timeout(900)
        if got is None:
            # 兜底：从最近响应中找出该次点击产生的 messages
            for e in reversed(RESP):
                m = re.search(r'/api/agent/conversations/([0-9a-fA-F-]{8,})/messages', e['url'])
                if m and m.group(1) not in ids_done:
                    got = type('R', (), {'url': e['url'], 'status': e['status'], 'text': (lambda: e['text'])})()
                    break
        if got is None:
            sc = shot(page, f'conv-{idx + 1:02d}-FAILED')
            dump_json(os.path.join(WORK, f'conv-fail-{idx + 1:02d}.json'),
                      {'idx': idx, 'title': title, 'group': ginfo, 'url': page.url, 'shot': sc})
            continue
        url = got.url
        m = re.search(r'/api/agent/conversations/([0-9a-fA-F-]{8,})/messages', url)
        cid = m.group(1) if m else f'unknown-{idx}'
        ids_done.add(cid)
        try:
            body = got.text()
        except Exception as e:  # noqa: BLE001
            body = ''
            LOG['errors'].append({'conv_body': cid, 'err': str(e)[:200]})
        slug = f'conv-{cid[:8]}'
        rel, nbytes = save_body(D_CONVB, slug + '.json', {'text': body})
        cpayload = read_json(body)
        citems = items_of(cpayload)
        meta = id_meta.get(cid, {})
        sc = shot(page, f'conv-{idx + 1:02d}-{cid[:8]}')
        CONVS[cid] = {
            'title': (meta.get('title') or title or '').strip(),
            'group': ginfo or '',
            'messages_url': url,
            'status': got.status,
            'file': rel,
            'bytes': nbytes,
            'message_count': len(citems),
            'screenshot': sc,
            'dom_title': title,
            'dom_time': dom.get('time', ''),
            'pinned': bool(meta.get('pinned')),
            'list_message_count': meta.get('messageCount'),
            'hasMore': (cpayload or {}).get('hasMore') if isinstance(cpayload, dict) else None,
        }
        print(f'    conv {cid} msgs={len(citems)} {nbytes}B url={url[:130]}', flush=True)
        dump_json(os.path.join(D_CONV, 'index.json'), CONVS)
    step(page, '历史会话采集结束')
    dump_json(os.path.join(D_CONV, 'index.json'), CONVS)


# ------------------------------------------------------------------ B. 错题详情
# 列表行：.errors-right 内 cursor:pointer 的行（Vue 会把静态 style 重序列化为带空格，故用计算样式判断）
JS_ERR_ROWS = """
() => {
  const root = document.querySelector('.errors-right');
  if (!root) return [];
  return [...root.querySelectorAll('div')]
    .filter(el => {
      try { if (getComputedStyle(el).cursor !== 'pointer') return false; } catch (e) { return false; }
      const t = (el.innerText || '').trim();
      return t.length > 8 && el.children.length >= 3;
    })
    .map((el, i) => ({ idx: i, text: (el.innerText || '').trim().slice(0, 200) }));
}
"""

JS_CLICK_ERR_ROW = """
(i) => {
  const root = document.querySelector('.errors-right');
  if (!root) return false;
  const rows = [...root.querySelectorAll('div')]
    .filter(el => {
      try { if (getComputedStyle(el).cursor !== 'pointer') return false; } catch (e) { return false; }
      const t = (el.innerText || '').trim();
      return t.length > 8 && el.children.length >= 3;
    });
  const row = rows[i];
  if (!row) return false;
  row.scrollIntoView({ block: 'center' });
  row.click();
  return true;
}
"""


def close_err_modal(page):
    try:
        btn = page.get_by_title('关闭详情')
        if btn.count():
            btn.first.click(timeout=4000)
            page.wait_for_timeout(500)
            return True
    except Exception as e:  # noqa: BLE001
        LOG['errors'].append({'close_modal': str(e)[:200]})
    return False


def phase_errors(page):
    step(page, '进入 /errors（列表 + 到期队列 + 自动详情浮窗）')
    page.goto(BASE + '/errors', wait_until='load')
    page.wait_for_selector('.errors-right', timeout=30000)
    page.wait_for_timeout(7000)

    # 自动浮窗（loadDue 自动打开首题）：先截图再关掉
    auto_shot = ''
    if page.get_by_title('关闭详情').count():
        auto_shot = shot(page, 'errors-auto-detail-modal')
        close_err_modal(page)
        page.wait_for_timeout(1500)
    else:
        close_err_modal(page)
        page.wait_for_timeout(800)

    # 列表响应
    flt = BYKEY.get('GET /api/student/error-records/filter?page=1&size=50')
    list_info = {'found': bool(flt)}
    if flt:
        list_info.update(save_resp_any(D_ERRB, 'error-records_filter_page1_size50.json', flt))
        fp = read_json(flt['text']) or {}
        list_info['total'] = data_total(fp)
        list_info['items'] = len(items_of(fp))
        list_info['data_keys'] = sorted(data_obj(fp).keys())
        dump_json(os.path.join(D_ERR, 'list.json'), list_info)
    # 其它列表类响应（due-queue / memory-heatmap）一并记录，便于离线对齐
    extra = {}
    for k in ('GET /api/student/error-records/due-queue', 'GET /api/student/error-records/memory-heatmap'):
        if k in BYKEY:
            extra[k] = save_resp_any(D_ERRB, k.split(' ')[1].replace('/', '-').strip('-') + '.json', BYKEY[k])
    dump_json(os.path.join(WORK, 'errors_list_info.json'), {'filter': list_info, 'extra': extra})

    rows = page.evaluate(JS_ERR_ROWS)
    for _ in range(4):
        if rows:
            break
        page.evaluate("() => { const el = document.querySelector('.errors-right'); if (el) el.scrollIntoView({block:'start'}); }")
        page.wait_for_timeout(1500)
        rows = page.evaluate(JS_ERR_ROWS)
    print(f'  error rows={len(rows)} list_total={list_info.get("total")}', flush=True)
    list_shot = shot(page, 'errors-list', full=True)
    dump_json(os.path.join(WORK, 'errors_rows.json'), {'rows': rows, 'shot': list_shot,
                                                       'auto_modal_shot': auto_shot})

    # 逐条打开（目标 >=6，取 7 行留余量）
    n = min(7, len(rows))
    detail_done = set()
    for i in range(n):
        preview = rows[i]['text'].replace('\n', ' ')[:80]
        step(page, f'打开错题列表第 {i + 1} 条：{preview}')
        baseline = len(RESP)
        ok = page.evaluate(JS_CLICK_ERR_ROW, i)
        if not ok:
            LOG['errors'].append({'err_row_click': i})
            continue
        # 等 detail
        det = wait_new(lambda e: '/api/student/error-records/' in e['url'] and e['url'].endswith('/detail'), baseline, page, 15)
        if det is None:
            LOG['errors'].append({'err_detail_missing': i, 'preview': preview})
            shot(page, f'errors-detail-{i + 1:02d}-FAILED')
            close_err_modal(page)
            continue
        rid = re.search(r'/student/error-records/([0-9a-fA-F-]{8,})/detail', det['url']).group(1)
        # 等 butler 两路（best-effort，最多 10s）
        but_detail = wait_new(lambda e: f'/api/butler/error-detail/{rid}' in e['url'], baseline, page, 10)
        but_diag = wait_new(lambda e: f'/api/butler/error-diagnosis/{rid}' in e['url'], baseline, page, 10)
        page.wait_for_timeout(1200)  # 渲染 AI 诊断/正解
        sc = shot(page, f'errors-detail-{i + 1:02d}-{rid[:8]}')
        slug = f'e{i + 1:02d}-{rid[:8]}'
        ent = {
            'row_index': i,
            'row_preview': preview,
            'detail_url': det['url'],
            'detail_status': det['status'],
            'detail_file': save_body(D_ERRB, slug + '_detail.json', det)[0],
            'detail_bytes': save_body(D_ERRB, slug + '_detail.json', det)[1],
            'screenshot': sc,
        }
        if but_detail is not None:
            f, b = save_body(D_ERRB, slug + '_butler_error-detail.json', but_detail)
            ent.update({'butler_error_detail_url': but_detail['url'], 'butler_error_detail_file': f,
                        'butler_error_detail_bytes': b, 'butler_error_detail_status': but_detail['status']})
        else:
            ent['butler_error_detail_url'] = ''
        if but_diag is not None:
            f, b = save_body(D_ERRB, slug + '_butler_error-diagnosis.json', but_diag)
            ent.update({'butler_error_diagnosis_url': but_diag['url'], 'butler_error_diagnosis_file': f,
                        'butler_error_diagnosis_bytes': b, 'butler_error_diagnosis_status': but_diag['status']})
        else:
            ent['butler_error_diagnosis_url'] = ''
        dpayload = read_json(det['text']) or {}
        ddata = dpayload.get('data') if isinstance(dpayload, dict) and isinstance(dpayload.get('data'), dict) else dpayload
        if isinstance(ddata, dict):
            ent['question_preview'] = str(ddata.get('question_text') or '')[:160]
            ent['kp_code'] = ddata.get('kp_code')
            ent['kp_name'] = ddata.get('kp_name')
            ent['error_type'] = ddata.get('error_type')
        ERRS[rid] = ent
        detail_done.add(rid)
        print(f'    error {rid} detail={ent["detail_bytes"]}B '
              f'butler_detail={ent.get("butler_error_detail_bytes")}B '
              f'diag={ent.get("butler_error_diagnosis_bytes")}B', flush=True)
        dump_json(os.path.join(D_ERR, 'index.json'), ERRS)
        close_err_modal(page)
        page.wait_for_timeout(900)
    dump_json(os.path.join(D_ERR, 'index.json'), ERRS)


# ------------------------------------------------------------------ C. 资源中心封面
def phase_covers(page):
    step(page, '进入 /resources（默认「为你推荐」）')
    page.goto(BASE + '/resources', wait_until='load')
    page.wait_for_selector('.rc-card, .rc-state', timeout=30000)
    page.wait_for_timeout(5000)
    shot(page, 'resources-reco')

    # 首屏 videos 响应（只取分类 chips 的 page_size=1）
    for k, v in BYKEY.items():
        if k.startswith('GET /api/student/videos?') and 'page_size=1' in k:
            COV_META['videos_probe'] = save_resp_any(D_COVB, 'videos_page_size1.json', v)
    probe = COV_META.get('videos_probe')
    if probe:
        pp = read_json(open(os.path.join(EV, probe['file']), encoding='utf-8').read())
        topics = (pp or {}).get('topics')
        if isinstance(topics, list):
            dump_json(os.path.join(D_COVB, 'topics.json'), topics)

    step(page, '点击「🧭 按知识点浏览」Tab')
    try:
        page.locator('.rc-modes button').filter(has_text='按知识点浏览').first.click(timeout=8000)
    except Exception as e:  # noqa: BLE001
        LOG['errors'].append({'rc_topic_tab': str(e)[:300]})
    page.wait_for_timeout(3000)
    # 清掉「为你推荐」模式已捕获的封面，只保留「按知识点浏览」Tab 的封面
    COVERS.clear()
    for fn in os.listdir(D_COVF):
        try:
            os.remove(os.path.join(D_COVF, fn))
        except Exception as e:  # noqa: BLE001
            LOG['errors'].append({'cover_clean': fn, 'err': str(e)[:150]})
    page.wait_for_selector('.rc-grid .rc-card', timeout=25000)
    page.wait_for_timeout(3000)
    shot(page, 'resources-topic-mode')

    # videos 列表响应原文（topic=featured&page_size=12，取本次切 Tab 触发的那条=最新）
    vids = None
    for e in reversed(RESP):
        if '/api/student/videos' in e['url'] and 'topic=' in e['url']:
            vids = e
            break
    if vids is None:
        vids = wait_new(lambda e: '/api/student/videos' in e['url'] and 'topic=' in e['url'], 0, page, 12)
    if vids is None:
        LOG['errors'].append({'videos_topic_featured': 'missing response'})
    else:
        info = save_resp_any(D_COVB, 'videos_topic_featured_page_size12.json', vids)
        vp = read_json(vids['text']) or {}
        info['items'] = len(items_of(vp))
        info['topics'] = min(len(vp.get('topics') or []), 99) if isinstance(vp, dict) else None
        first = items_of(vp)[0] if items_of(vp) else {}
        info['item0_keys'] = sorted(first.keys()) if isinstance(first, dict) else []
        info['cover_field'] = 'cover'
        COV_META['videos_topic_featured'] = info
        dump_json(os.path.join(D_COV, 'videos.json'), info)
        print(f'  videos topic featured: items={info["items"]} keys={info["item0_keys"]}', flush=True)

    # 触发懒加载：把每张卡片滚进视口
    n_cards = page.locator('.rc-grid .rc-card').count()
    for i in range(n_cards):
        try:
            page.evaluate(
                """(i) => { const c = document.querySelectorAll('.rc-grid .rc-card')[i];
                           if (c) c.scrollIntoView({ block: 'center' }); }""", i)
            page.wait_for_timeout(450)
        except Exception as e:  # noqa: BLE001
            LOG['errors'].append({'rc_scroll': i, 'err': str(e)[:200]})
    page.wait_for_timeout(2500)

    # DOM 中的封面 src（逐张核对是否都有字节文件）
    imgs = page.evaluate(
        """() => [...document.querySelectorAll('.rc-grid .rc-card')].map(a => {
             const img = a.querySelector('.rc-cover img');
             return { title: (a.getAttribute('title') || '').trim(),
                      cover: img ? (img.getAttribute('src') || '') : '',
                      complete: img ? !!img.complete : false,
                      naturalWidth: img ? (img.naturalWidth || 0) : 0 };
           })""")
    covers_dom = []
    for it in imgs:
        if not it.get('cover'):
            continue
        if it['cover'] not in COVERS:
            direct_fetch_cover(it['cover'], page)
        covers_dom.append(it)
    # 仍没拿到的封面：再给一次直接下载机会
    for it in covers_dom:
        if it['cover'] not in COVERS:
            direct_fetch_cover(it['cover'], page)
    try:
        page.evaluate("() => window.scrollTo(0, 0)")
    except Exception:
        pass
    page.wait_for_timeout(800)
    dump_json(os.path.join(WORK, 'covers_dom.json'), imgs)
    shot_more = shot(page, 'resources-topic-covers', full=True)

    dom_urls = [it['cover'] for it in covers_dom]
    dump_json(os.path.join(D_COV, 'index.json'), COVERS)
    dump_json(os.path.join(D_COV, 'meta.json'), {
        'tab': '按知识点浏览', 'active_topic': 'featured',
        'dom_cards': len(imgs), 'covers_dom': covers_dom,
        'videos': COV_META, 'shot': shot_more,
        'cover_urls_in_dom': dom_urls,
        'dom_urls_with_file': [u for u in dom_urls if u in COVERS],
        'dom_urls_missing_file': [u for u in dom_urls if u not in COVERS],
    })
    print(f'  covers saved: {len(COVERS)} files, cards={len(imgs)}, '
          f'dom-missing={len([u for u in dom_urls if u not in COVERS])}', flush=True)


# ------------------------------------------------------------------ D. 重新基线化（lead 追加：快照后现役数据已过期）
def _key_of(e):
    u = urlparse(e['url'])
    return f"{e['method']} {u.path}" + (('?' + u.query) if u.query else '')


def _latest(pred):
    for e in reversed(RESP):
        if pred(e):
            return e
    return None


def _slug_key(key):
    method, _, rest = key.partition(' ')
    s = re.sub(r'[^A-Za-z0-9._~-]+', '_', rest).replace('/', '-').strip('_-')
    return (method.lower() + '_' + s)[:110]


def phase_baseline(page):
    idx = {}

    def take(key_or_pred, page_name, trigger):
        if isinstance(key_or_pred, str):
            pred = lambda x: _key_of(x) == key_or_pred  # noqa: E731
        else:
            pred = key_or_pred
        e = _latest(pred)
        if e is None:
            LOG['errors'].append({'baseline_missing': str(key_or_pred)})
            return None
        key = _key_of(e)
        rel, n = save_body(D_BASEB, _slug_key(key) + '.json', e)
        idx[key] = {'url': e['url'], 'status': e['status'], 'ct': e['ct'],
                    'file': rel, 'bytes': n, 'page': page_name, 'trigger': trigger}
        print(f'    baseline {key} -> {n}B', flush=True)
        return e

    step(page, '[baseline] 进入 /dialog（error-records?limit=1 / assignments todo / classroom-coursewares）')
    page.goto(BASE + '/dialog', wait_until='load')
    page.wait_for_timeout(4000)
    take('GET /api/student/error-records?limit=1', 'dialog', '/dialog 首屏自动请求（当前态）')
    take('GET /api/student/assignments?status=todo&size=1', 'dialog', '/dialog 首屏待办角标（当前态）')
    take('GET /api/student/classroom-coursewares', 'dialog', '/dialog 首屏老师课件探针')

    step(page, '[baseline] 进入 /errors（当前错题筛选列表）')
    page.goto(BASE + '/errors', wait_until='load')
    page.wait_for_selector('.errors-right', timeout=30000)
    page.wait_for_timeout(7000)
    take('GET /api/student/error-records/filter?page=1&size=50', 'errors',
         '进入 /errors 自动请求（当前错题列表）')
    close_err_modal(page)
    page.wait_for_timeout(600)

    step(page, '[baseline] 进入 /classroom（课堂任务当前态）')
    page.goto(BASE + '/classroom', wait_until='load')
    page.wait_for_timeout(7000)
    take('GET /api/student/assignments?status=all&page=1&size=50', 'classroom',
         '进入 /classroom 默认「课堂任务」Tab（当前态）')
    take('GET /api/student/classroom-coursewares', 'classroom', '进入 /classroom 老师课堂探针')

    step(page, '[baseline] 点击「🎬 双师课堂」Tab（老师课件当前进度 + 最近课堂）')
    try:
        page.locator('.cls-tabs button').filter(has_text='双师课堂').first.click(timeout=8000)
    except Exception as e:  # noqa: BLE001
        LOG['errors'].append({'baseline_dual_tab': str(e)[:300]})
    page.wait_for_timeout(7000)
    cw_e = take('GET /api/student/classroom-coursewares', 'classroom',
                '点击「🎬 双师课堂」Tab 刷新老师课件（当前进度）')
    take('GET /api/classroom/sessions?limit=5', 'classroom', '点击「🎬 双师课堂」Tab → 最近课堂')
    shot(page, 'baseline-classroom-dual')

    courseware = {}
    if cw_e is not None:
        cwp = read_json(cw_e['text']) or {}
        citems = items_of(cwp)
        if citems:
            c0 = citems[0]
            courseware = {
                'courseware_id': c0.get('courseware_id'),
                'title': c0.get('title'),
                'class_name': c0.get('class_name'),
                'page_count': c0.get('page_count'),
                'progress_pct': c0.get('progress_pct'),
                'last_session_id': c0.get('last_session_id'),
                'item_keys': sorted(c0.keys()),
            }

    # 打开课件：双师课堂 → 老师课件卡 → POST open → /dual/<sid> → GET session
    card_text = ''
    base_n = len(RESP)
    sid = ''
    try:
        card = page.locator('.tc-card').first
        card.wait_for(state='visible', timeout=20000)
        card_text = card.inner_text().replace('\n', ' | ')
        shot(page, 'baseline-courseware-card')
        page.evaluate("""() => { const c = document.querySelector('.tc-card'); if (c) c.scrollIntoView({block:'center'}); }""")
        page.wait_for_timeout(500)
        card.click(timeout=10000)
        page.wait_for_url(re.compile(r'/dual/'), timeout=30000)
        page.wait_for_timeout(7000)
        sid = page.url.split('/dual/')[-1].split('?')[0]
    except Exception as e:  # noqa: BLE001
        LOG['errors'].append({'baseline_open_courseware': str(e)[:400]})

    open_e = _latest(lambda x: x['method'] == 'POST'
                     and '/api/student/classroom-coursewares/' in x['url'] and x['url'].endswith('/open'))
    if open_e is not None:
        key = _key_of(open_e)
        rel, n = save_body(D_BASEB, _slug_key(key) + '.json', open_e)
        idx[key] = {'url': open_e['url'], 'status': open_e['status'], 'ct': open_e['ct'],
                    'file': rel, 'bytes': n, 'page': 'classroom',
                    'trigger': '双师课堂 → 点击老师课件卡 → POST open 建课堂会话',
                    'reqBody': (open_e.get('reqBody') or '')}
        print(f'    baseline POST open -> {n}B {open_e["url"]}', flush=True)
    else:
        LOG['errors'].append({'baseline_missing': 'POST /api/student/classroom-coursewares/{id}/open'})

    sess_e = None
    if sid:
        sess_e = _latest(lambda x: '/api/classroom/sessions/' in x['url'] and sid in x['url'])
        if sess_e is not None:
            take(lambda x, s=sid: '/api/classroom/sessions/' in x['url'] and s in x['url'],
                 'dual', f'进入 /dual/{sid} 播放页 → GET 课件会话详情（当前进度/页码）')
    # 页码/进度（播放页 DOM 原话 + session 响应里的 progress）
    chip = {}
    try:
        chip = page.evaluate("""() => ({
            pagechip: (document.querySelector('.dcx-pagechip')?.innerText || '').trim(),
            ctl_page: (document.querySelector('.dcx-ctl-page')?.innerText || '').trim(),
        })""")
    except Exception:  # noqa: BLE001
        pass
    shot_player = shot(page, 'baseline-dual-player')
    dump_json(os.path.join(D_BASE, 'context.json'), {
        'courseware_card_text': card_text,
        'courseware_item': courseware,
        'player_url': page.url,
        'session_id': sid,
        'player_page_indicator': chip,
        'session_detail_file': (sess_e and idx.get(_key_of(sess_e), {})),
        'shot_player': shot_player,
        'note': '只读操作：未翻页/未改进度，页码=打开时的续播位置',
    })
    dump_json(os.path.join(D_BASE, 'index.json'), idx)
    print(f'  baseline keys={len(idx)}', flush=True)


# ------------------------------------------------------------------ main
def main():
    phases = sys.argv[1:] or ['conv', 'errors', 'covers', 'baseline']
    t0 = time.time()
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True, args=[
            '--disable-gpu', '--disable-dev-shm-usage', '--disable-software-rasterizer',
            '--disable-backgrounding-occluded-windows', '--js-flags=--max-old-space-size=2048',
        ])
        c = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1)
        page = c.new_page()
        page.on('response', on_response)
        page.on('pageerror', lambda e: LOG['errors'].append({'pageerror': str(e)[:300]}))
        page.on('crash', lambda pg: LOG['errors'].append({'page_crash': (pg.url if pg else '')}))
        print('login ...', flush=True)
        res = login(page, STUDENT)
        LOG['notes'].append({'login': {'url': page.url, 'demo_code': res.get('code')}})
        print('login ok ->', page.url, flush=True)
        fn = {'conv': phase_conv, 'errors': phase_errors, 'covers': phase_covers,
              'baseline': phase_baseline}
        for ph in phases:
            print(f'--- phase {ph} ---', flush=True)
            try:
                fn[ph](page)
            except Exception:  # noqa: BLE001
                LOG['errors'].append({'phase': ph, 'trace': traceback.format_exc()[-3000:]})
                print(f'phase {ph} ERROR', flush=True)
            try:
                dump_json(os.path.join(WORK, f'phase-{ph}.json'),
                          {'ok': True, 't': time.strftime('%H:%M:%S')})
            except Exception:
                pass
        b.close()
    try:
        bidx = json.load(open(os.path.join(D_BASE, 'index.json'), encoding='utf-8'))
    except Exception:  # noqa: BLE001
        bidx = {}
    dump_json(os.path.join(WORK, 'run-log.json'), {
        'errors': LOG['errors'], 'steps': LOG['steps'], 'notes': LOG['notes'],
        'elapsed_sec': round(time.time() - t0, 1),
        'convs': len(CONVS), 'errors_indexed': len(ERRS), 'covers': len(COVERS),
        'baseline': len(bidx), 'resp_count': len(RESP),
    })
    print(f'done elapsed={round(time.time() - t0, 1)}s convs={len(CONVS)} '
          f'errors={len(ERRS)} covers={len(COVERS)} baseline={len(bidx)} resp={len(RESP)} '
          f'log_errors={len(LOG["errors"])}', flush=True)


if __name__ == '__main__':
    main()