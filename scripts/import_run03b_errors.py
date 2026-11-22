# -*- coding: utf-8 -*-
"""把 run-03b 的错题详情（每错题 3 个端点）并入 student run03 fixtures。

errors/index.json 是「按错题 id 分组」的结构，每个 id 下有
detail_url/detail_file、butler_error_detail_*、butler_error_diagnosis_*、以及可能的原始响应字段。
"""
import json
import os
import shutil

WT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EV = os.path.join(WT, 'evidence', 'live', 'run-03b', 'errors')
DST = os.path.join(WT, 'app', 'src', 'offline', 'fixtures', 'student', 'run03')
IDX = os.path.join(DST, 'index.txt.json')
idx = json.load(open(IDX, encoding='utf-8'))
data = json.load(open(os.path.join(EV, 'index.json'), encoding='utf-8'))

added = updated = skipped = 0
for rid, rec in data.items():
    pairs = [
        ('detail', rec.get('detail_url'), rec.get('detail_file'), rec.get('detail_status')),
        ('butler-detail', rec.get('butler_error_detail_url'), rec.get('butler_error_detail_file'),
         rec.get('butler_error_detail_status')),
        ('butler-diagnosis', rec.get('butler_error_diagnosis_url'), rec.get('butler_error_diagnosis_file'),
         rec.get('butler_error_diagnosis_status')),
    ]
    for kind, url, rel, status in pairs:
        if not url or not rel:
            skipped += 1
            continue
        src = os.path.join(EV, rel.replace('/', os.sep))
        if not os.path.exists(src):
            src = os.path.join(EV, 'bodies', os.path.basename(rel))
        if not os.path.exists(src):
            skipped += 1
            continue
        # /api/student/error-records/{id}/detail 等 → key
        path = url.split('127.0.0.1:5176', 1)[-1]
        key = f'GET {path}'
        slug = os.path.basename(rel)
        shutil.copyfile(src, os.path.join(DST, slug))
        entry = {'key': key, 'method': 'GET', 'url': url, 'status': status or 200,
                 'ct': 'application/json', 'file': slug,
                 'bytes': os.path.getsize(os.path.join(DST, slug)),
                 'page': '/errors', 'trigger': f'error-record detail ({kind})',
                 'source': 'run-03b/errors'}
        if key in idx:
            updated += 1
        else:
            added += 1
        idx[key] = entry

json.dump(idx, open(IDX, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, sort_keys=True)
print(json.dumps({'added': added, 'updated': updated, 'skipped': skipped,
                  'total_keys': len(idx)}, ensure_ascii=False, indent=1))