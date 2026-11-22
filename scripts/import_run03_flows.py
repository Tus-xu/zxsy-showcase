# -*- coding: utf-8 -*-
"""把 run-03 三题导学采证装成离线回放 fixture（flow-A/B/C.json + uploads.json 更新）。

用法：
    python scripts/import_run03_flows.py <src_dir> [--dry]

<src_dir> 里应含 flow-A.json / flow-B.json / flow-C.json：
    {case, image, upload, parse, file_content, file_id, turns[{idx,input,attachment,sse}], final_state}
缺哪个 case 就跳过哪个（允许只交部分）。
"""
import json
import os
import shutil
import sys

WT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIX = os.path.join(WT, 'app', 'src', 'offline', 'fixtures', 'student')
_args = [a for a in sys.argv[1:] if not a.startswith('--')]
SRC = _args[0] if _args else os.path.join(
    WT, 'evidence', 'live', 'run-03', 'guide', 'api', 'flows')
DRY = '--dry' in sys.argv

UPLOADS = os.path.join(FIX, 'uploads.json')


def norm_turn(t, i):
    sse = t.get('sse') or ''
    if isinstance(sse, dict):
        sse = json.dumps(sse, ensure_ascii=False)
    out = {
        'idx': t.get('idx', i),
        'input': t.get('input') or '',
        'attachment': bool(t.get('attachment', i == 0)),
        'sse': sse,
    }
    for k in ('prompt_seen', 'card_type', 'req'):
        if t.get(k) is not None:
            out[k] = t[k]
    return out


def pick(d, *names, default=None):
    for n in names:
        if isinstance(d, dict) and d.get(n) is not None:
            return d[n]
    return default


def main():
    if not os.path.isdir(SRC):
        raise SystemExit(f'src dir not found: {SRC}')
    uploads = json.load(open(UPLOADS, encoding='utf-8')) if os.path.exists(UPLOADS) else {}
    report = {}
    for case in ('A', 'B', 'C'):
        p = os.path.join(SRC, f'flow-{case}.json')
        if not os.path.exists(p):
            report[case] = 'missing'
            continue
        f = json.load(open(p, encoding='utf-8'))
        turns = f.get('turns') or []
        if not turns:
            report[case] = 'empty turns'
            continue
        img = f.get('image') or {}
        upload_resp = pick(f, 'upload_resp', 'upload')
        parse_resp = pick(f, 'parse_resp', 'parse')
        content = pick(f, 'file_content', 'content')
        file_id = pick(f, 'file_id', 'upload_file_id') or ''
        if not file_id and isinstance(upload_resp, str):
            try:
                file_id = json.loads(upload_resp)['data']['file_id']
            except Exception:
                file_id = ''
        if not file_id and isinstance(upload_resp, dict):
            file_id = ((upload_resp.get('data') or {}).get('file_id')) or ''
        fixture = {
            'case': case,
            'collector_account': f.get('collector_account'),
            'image': {'src': img.get('src'), 'sha256': img.get('sha256'), 'bytes': img.get('bytes'),
                      'name': os.path.basename(img.get('src') or f'题{case}.png')},
            'entry': f.get('entry'),
            'file_id': file_id,
            'upload': upload_resp,
            'parse': parse_resp,
            'file_content': content,
            'turns': [norm_turn(t, i) for i, t in enumerate(turns)],
            'final_state': f.get('final_state') or {},
            'source': 'run-03',
        }
        out = os.path.join(FIX, f'flow-{case}.json')
        if DRY:
            report[case] = {'turns': len(fixture['turns']), 'file_id': file_id,
                            'upload': bool(upload_resp), 'parse': bool(parse_resp),
                            'concluded': (fixture['final_state'] or {}).get('concluded')}
            continue
        shutil.copyfile(p, os.path.join(FIX, f'flow-{case}.run03.json'))
        json.dump(fixture, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

        # 同步 uploads.json（回放层按 sha256/文件名匹配上传，需要新的 file_id 与响应原文）
        if img.get('sha256'):
            entry = uploads.get(case) or {}
            entry.update({
                'case': case,
                'image': fixture['image']['name'],
                'raw_sha256': img.get('sha256'),
                'upload_resp': json.dumps(upload_resp, ensure_ascii=False) if not isinstance(upload_resp, str) else upload_resp,
                'parse_resp': json.dumps(parse_resp, ensure_ascii=False) if not isinstance(parse_resp, str) else parse_resp,
                'file_id': file_id,
                'source': 'run-03',
            })
            if content:
                entry['content_resp'] = json.dumps(content, ensure_ascii=False) if not isinstance(content, str) else content
            uploads[case] = entry
        report[case] = {'turns': len(fixture['turns']), 'file_id': file_id,
                        'concluded': (fixture['final_state'] or {}).get('concluded')}
    if not DRY:
        json.dump(uploads, open(UPLOADS, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(json.dumps(report, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()