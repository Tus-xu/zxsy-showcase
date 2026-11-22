# -*- coding: utf-8 -*-
"""把 run-03b 的会话/错题/基线化响应并入 student 回放 fixtures（覆盖同 key 的旧副本）。

来源：
  evidence/live/run-03b/conversations/index.json + bodies/
  evidence/live/run-03b/errors/index.json + bodies/
  evidence/live/run-03b/baseline/index.json + bodies/
目标：
  app/src/offline/fixtures/student/run03/<slug>.txt.json + index.txt.json（同 key 覆盖）
"""
import json
import os
import shutil

WT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EV = os.path.join(WT, 'evidence', 'live', 'run-03b')
DST = os.path.join(WT, 'app', 'src', 'offline', 'fixtures', 'student', 'run03')
IDX = os.path.join(DST, 'index.txt.json')
os.makedirs(DST, exist_ok=True)

idx = json.load(open(IDX, encoding='utf-8')) if os.path.exists(IDX) else {}
stats = {}


def ingest(name, src_dir, body_subdir='bodies'):
    ip = os.path.join(src_dir, 'index.json')
    if not os.path.exists(ip):
        stats[name] = 'missing index'
        return
    meta_all = json.load(open(ip, encoding='utf-8'))
    added = updated = skipped = 0
    for key, meta in meta_all.items():
        if isinstance(meta, dict) and meta.get('method') is None and meta.get('status') is None:
            continue
        body = (meta or {}).get('file')
        if not body:
            skipped += 1
            continue
        src_body = os.path.join(src_dir, body_subdir, body)
        if not os.path.exists(src_body):
            alt = os.path.join(src_dir, 'bodies', os.path.basename(body))
            src_body = alt if os.path.exists(alt) else src_body
        if not os.path.exists(src_body):
            skipped += 1
            continue
        # 统一成 .json 后缀（fixtures.js 只 glob *.json）
        slug = os.path.basename(body)
        if not slug.endswith('.json'):
            slug = slug + '.json'
        shutil.copyfile(src_body, os.path.join(DST, slug))
        entry = {
            'key': key,
            'method': (meta or {}).get('method', 'GET'),
            'url': (meta or {}).get('url'),
            'status': (meta or {}).get('status', 200),
            'ct': (meta or {}).get('ct'),
            'file': slug,
            'bytes': (meta or {}).get('bytes') or os.path.getsize(os.path.join(DST, slug)),
            'page': (meta or {}).get('page'),
            'trigger': (meta or {}).get('trigger'),
            'source': f'run-03b/{name}',
        }
        if key in idx:
            updated += 1
        else:
            added += 1
        idx[key] = entry
    stats[name] = {'added': added, 'updated': updated, 'skipped': skipped, 'total_index': len(meta_all)}


for name, sub in (('conversations', 'conversations'), ('errors', 'errors'), ('baseline', 'baseline')):
    ingest(name, os.path.join(EV, sub))

json.dump(idx, open(IDX, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, sort_keys=True)
stats['total_keys_after'] = len(idx)
print(json.dumps(stats, ensure_ascii=False, indent=1))