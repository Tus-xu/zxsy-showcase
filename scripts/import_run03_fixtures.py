# -*- coding: utf-8 -*-
"""把 run-03 学生端补采的响应装进 app/src/offline/fixtures/student/run03/。

输入：evidence/live/run-03/data/api/index.json + api/bodies/*.txt
输出：fixtures/student/run03/index.json + <slug>.json（同 run-02 目录结构，供 fixtures.js 双目录装载）
"""
import json
import os
import shutil

ROOT = r'D:\zxsy-math-arena-showcase-student'
SRC = os.path.join(ROOT, 'evidence', 'live', 'run-03', 'data', 'api')
DST = os.path.join(ROOT, 'app', 'src', 'offline', 'fixtures', 'student', 'run03')
os.makedirs(DST, exist_ok=True)

idx = json.load(open(os.path.join(SRC, 'index.json'), encoding='utf-8'))
saved = 0
copied_index = {}
for key, meta in idx.items():
    body = meta.get('file')
    if not body:
        continue
    src_body = os.path.join(SRC, 'bodies', body)
    if not os.path.exists(src_body):
        continue
    text = open(src_body, encoding='utf-8', errors='replace').read()
    shutil.copyfile(src_body, os.path.join(DST, body))
    copied_index[key] = {
        'key': key,
        'method': meta.get('method', 'GET'),
        'url': meta.get('url'),
        'status': meta.get('status', 200),
        'ct': meta.get('ct'),
        'file': body,
        'bytes': meta.get('bytes') or len(text.encode()),
        'page': meta.get('page'),
        'trigger': meta.get('trigger'),
        'source': 'run-03',
    }
    saved += 1

with open(os.path.join(DST, 'index.json'), 'w', encoding='utf-8') as f:
    json.dump(copied_index, f, ensure_ascii=False, indent=1, sort_keys=True)
print('saved', saved, 'endpoints ->', DST)

# 冲突检查：与 run-02 目录同 key 但内容不同的端点
r2 = os.path.join(ROOT, 'app', 'src', 'offline', 'fixtures', 'student', 'index.json')
if os.path.exists(r2):
    old = json.load(open(r2, encoding='utf-8'))
    clash = []
    for key, m in copied_index.items():
        o = old.get(key)
        if not o:
            continue
        p_old = os.path.join(os.path.dirname(r2), o.get('file') or '')
        p_new = os.path.join(DST, m['file'])
        if os.path.exists(p_old) and os.path.exists(p_new):
            a = open(p_old, encoding='utf-8', errors='replace').read()
            b = open(p_new, encoding='utf-8', errors='replace').read()
            if a != b:
                clash.append(key)
    print('content-clash keys (run-02 vs run-03):', len(clash))
    for k in clash[:10]:
        print('  ', k)