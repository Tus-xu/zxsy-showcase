# -*- coding: utf-8 -*-
"""把 run-03b 的 30 个会话消息并入 student run03 fixtures（按 messages_url 生成标准 key）。

run-03b conversations/index.json 是「按会话 id 分组」结构：
    { <id>: {title, group, messages_url, status, file, bytes, message_count, ...} }
上一版通用导入错误地把 id 当成了 key（fixtures.js 需要 "GET <path?query>"），本脚本修正。
"""
import json
import os
import shutil

WT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EV = os.path.join(WT, 'evidence', 'live', 'run-03b', 'conversations')
DST = os.path.join(WT, 'app', 'src', 'offline', 'fixtures', 'student', 'run03')
IDX = os.path.join(DST, 'index.txt.json')

idx = json.load(open(IDX, encoding='utf-8'))
data = json.load(open(os.path.join(EV, 'index.json'), encoding='utf-8'))

# 先清掉上一版误导入的「裸 id」键
removed = 0
for k in list(idx.keys()):
    if ' ' not in k and k.count('-') >= 4:
        del idx[k]
        removed += 1

added = updated = skipped = 0
for cid, rec in data.items():
    url = rec.get('messages_url')
    rel = rec.get('file')
    if not url or not rel:
        skipped += 1
        continue
    src = os.path.join(EV, rel.replace('/', os.sep))
    if not os.path.exists(src):
        src = os.path.join(EV, 'bodies', os.path.basename(rel))
    if not os.path.exists(src):
        skipped += 1
        continue
    path = url.split('127.0.0.1:5176', 1)[-1]
    key = f'GET {path}'
    slug = os.path.basename(rel)
    shutil.copyfile(src, os.path.join(DST, slug))
    entry = {
        'key': key,
        'method': 'GET',
        'url': url,
        'status': rec.get('status') or 200,
        'ct': 'application/json',
        'file': slug,
        'bytes': os.path.getsize(os.path.join(DST, slug)),
        'page': '/dialog',
        'trigger': f"conversation messages (group={rec.get('group')}, count={rec.get('message_count')})",
        'source': 'run-03b/conversations',
    }
    if key in idx:
        updated += 1
    else:
        added += 1
    idx[key] = entry

# 会话列表响应若在 baseline 里已有则保留；此处不动
json.dump(idx, open(IDX, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, sort_keys=True)
print(json.dumps({'removed_bad_keys': removed, 'added': added, 'updated': updated,
                  'skipped': skipped, 'total_keys': len(idx)}, ensure_ascii=False, indent=1))