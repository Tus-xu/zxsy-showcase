# -*- coding: utf-8 -*-
"""把 run-03b 采到的外链封面装成 fixtures/student/images/*.json（回放层会内联成 data URI）。

输入：evidence/live/run-03b/covers/index.json + files/*
输出：app/src/offline/fixtures/student/images/<sha1前16>.json  {url, ct, b64, bytes}
"""
import base64
import hashlib
import json
import os

WT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(WT, 'evidence', 'live', 'run-03b', 'covers')
DST = os.path.join(WT, 'app', 'src', 'offline', 'fixtures', 'student', 'images')
os.makedirs(DST, exist_ok=True)

idx_path = os.path.join(SRC, 'index.json')
if not os.path.exists(idx_path):
    raise SystemExit(f'missing {idx_path}')
idx = json.load(open(idx_path, encoding='utf-8'))

added = 0
skipped = 0
for url, meta in idx.items():
    f = meta.get('file') or meta.get('path')
    if not f:
        continue
    p = f if os.path.isabs(f) else os.path.join(SRC, 'files', os.path.basename(f))
    if not os.path.exists(p):
        p = os.path.join(SRC, 'files', os.path.basename(f))
    if not os.path.exists(p):
        skipped += 1
        continue
    raw = open(p, 'rb').read()
    sha = hashlib.sha1(url.encode()).hexdigest()[:16]
    rec = {
        'url': url,
        'ct': meta.get('ct') or ('image/jpeg' if p.lower().endswith(('.jpg', '.jpeg')) else 'image/png'),
        'b64': base64.b64encode(raw).decode('ascii'),
        'bytes': len(raw),
        'source': 'run-03b',
    }
    json.dump(rec, open(os.path.join(DST, sha + '.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    added += 1

print(json.dumps({'added': added, 'skipped': skipped, 'total_index': len(idx),
                  'images_dir': DST}, ensure_ascii=False, indent=1))