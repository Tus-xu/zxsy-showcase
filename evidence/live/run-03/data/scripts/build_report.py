# -*- coding: utf-8 -*-
"""把 evidence/live/run-03/data/api/index.json + bodies 汇总成报告表格片段。"""
import json
import os
import re
from urllib.parse import urlparse

ROOT = r'D:\zxsy-math-arena-showcase\evidence\live\run-03\data'
API = os.path.join(ROOT, 'api')
BODY = os.path.join(API, 'bodies')
WORK = r'D:\zxsy-math-arena-showcase\.work\r03-data'
OUT = os.path.join(WORK, 'report_tables.md')

PAGE_ORDER = ['login', 'dialog', 'library', 'resources', 'errors', 'classroom', 'classroom-play', 'me']
PAGE_LABEL = {
    'login': '登录页 /login',
    'dialog': '登录后落地 /dialog',
    'library': '知识库 /library',
    'resources': '资源中心 /resources',
    'errors': '错题 /errors',
    'classroom': '课堂 /classroom',
    'classroom-play': '双师课堂播放页 /dual/<sid>',
    'me': '我的 /me',
}


def norm_page(entry):
    page = (entry.get('page') or '').strip()
    if page:
        return page
    key = entry.get('_key', '')
    if 'auth/challenges/sms' in key or 'auth/login/sms' in key:
        return 'login'
    return 'dialog'


def summarize(body):
    """返回（条数, 关键字段）描述。"""
    if body is None:
        return '—', '（无响应体）'
    t = body.strip()
    if not t:
        return '0', '空响应体'
    try:
        j = json.loads(t)
    except Exception:
        return str(len(t.splitlines())), '非 JSON（%d 字节）%s' % (len(t), t[:60].replace('\n', ' '))
    if not isinstance(j, dict):
        return str(len(j)) if isinstance(j, list) else '1', type(j).__name__
    code = j.get('code')
    d = j.get('data', j)
    bits = []
    cnt = ''
    if isinstance(d, dict):
        for k in ('items', 'cells', 'topics', 'slides', 'outlines', 'sessions', 'events', 'members'):
            v = d.get(k)
            if isinstance(v, list):
                bits.append(f'{k}={len(v)}')
                if k in ('items', 'sessions', 'topics'):
                    cnt = cnt or str(len(v))
        for k in ('total', 'slide_count', 'status', 'score', 'total_score', 'count', 'due_total'):
            if k in d and d[k] is not None:
                bits.append(f'{k}={d[k]}')
        if isinstance(d.get('items'), list) and d['items'] and isinstance(d['items'][0], dict):
            fk = list(d['items'][0].keys())[:6]
            bits.append('item[0]键=' + ','.join(fk))
        if not bits:
            bits = ['键=' + ','.join(list(d.keys())[:8])]
    elif isinstance(d, list):
        cnt = str(len(d))
        bits = [f'list={len(d)}']
    if code is not None:
        bits.insert(0, f'code={code}')
    if isinstance(d, dict) and d.get('total') is not None:
        cnt = str(d.get('total'))
    return (cnt or '—'), '；'.join(bits)


def main():
    with open(os.path.join(API, 'index.json'), encoding='utf-8') as f:
        idx = json.load(f)
    rows = []
    for key, ent in idx.items():
        ent['_key'] = key
        u = urlparse(ent['url'])
        path = u.path
        query = u.query
        body = None
        if ent.get('file'):
            fp = os.path.join(BODY, ent['file'])
            if os.path.exists(fp):
                with open(fp, encoding='utf-8') as f:
                    body = f.read()
        cnt, fields = summarize(body)
        page = norm_page(ent)
        rows.append({
            'key': key, 'method': key.split(' ')[0], 'path': path, 'query': query,
            'url': ent['url'], 'status': ent['status'], 'page': page,
            'trigger': ent.get('trigger') or ('登录（获取验证码 / 安全登录）' if page == 'login' else '登录后首屏自动请求'),
            'file': ent.get('file'), 'bytes': ent.get('bytes'), 'cnt': cnt, 'fields': fields,
            'seenIn': ent.get('seenIn') or [], 'ct': ent.get('ct'),
        })

    lines = []
    for p in PAGE_ORDER:
        sel = [r for r in rows if r['page'] == p]
        if not sel:
            continue
        lines.append(f'\n### {PAGE_LABEL[p]}（{len(sel)} 个接口）\n')
        lines.append('| 操作（触发） | 请求 | HTTP | 响应条数 | 关键字段 | 原文文件 |')
        lines.append('|---|---|---|---|---|---|')
        for r in sel:
            q = r['query']
            req = f"`{r['method']} {r['path']}" + (f'?{q}' if q else '') + '`'
            seen = f"（×{len(r['seenIn']) + 1}）" if r['seenIn'] else ''
            lines.append(f"| {r['trigger']} | {req}{seen} | {r['status']} | {r['cnt']} | {r['fields']} | `{r['file'] or '—'}` |")

    # GET 参数清单
    gets = [r for r in rows if r['method'] == 'GET']
    lines.append('\n### GET /api/... 去重清单（method + path + query）\n')
    lines.append('| # | 请求 | 页面 | 触发操作 | HTTP |')
    lines.append('|---|---|---|---|---|')
    for i, r in enumerate(sorted(gets, key=lambda x: (PAGE_ORDER.index(x['page']) if x['page'] in PAGE_ORDER else 99, x['path'])), 1):
        q = r['query']
        req = f"`GET {r['path']}" + (f'?{q}' if q else '') + '`'
        lines.append(f"| {i} | {req} | {r['page']} | {r['trigger']} | {r['status']} |")

    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

    # 摘要
    pages = {}
    for r in rows:
        pages.setdefault(r['page'], 0)
        pages[r['page']] += 1
    print('interfaces =', len(rows), '| GET =', len(gets))
    for p in PAGE_ORDER:
        if p in pages:
            print(f'  {p:16s} {pages[p]}')
    bad = [r for r in rows if not (200 <= int(r['status']) < 300)]
    print('non-2xx:', [(r['key'], r['status']) for r in bad])
    print('wrote', OUT)


if __name__ == '__main__':
    main()