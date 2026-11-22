# -*- coding: utf-8 -*-
"""导出逐屏表行（Markdown）供 REPORT.md 使用。"""
import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = r'D:\zxsy-math-arena-showcase'
d = json.load(open(os.path.join(ROOT, 'qa', 'verify-final', 'verify.json'), encoding='utf-8'))
ROLE = {'student': '学生', 'teacher': '教师', 'researcher': '科研'}
for p in d['pages']:
    l = (p.get('layout') or {}).get('max_delta')
    c = p.get('controls') or {}
    t = p.get('text') or {}
    im = p.get('imgs') or {}
    side = (p.get('side') or {}).get('path', '-')
    extra = {'write': '（两侧同重定向到启动页）', 'write-canonical': '（补充：真实写作页）'}.get(p['slug'], '')
    drift = '数据漂移' if p['verdict'] == '差异' else ''
    print(f"| {ROLE[p['role']]} | `{p['route']}` | **{p['verdict']}** | {p['verdict_kind']}{extra} | "
          f"{l}px | {c.get('live_count')}/{c.get('off_count')} | {c.get('live_disabled')}/{c.get('off_disabled')} | "
          f"{im.get('live', {}).get('broken')}/{im.get('off', {}).get('broken')} | "
          f"{t.get('live_lines')}/{t.get('off_lines')} | {t.get('diff_count')} | {drift} | `{side}` |")
print('\nCOUNTS', json.dumps(d['summary']['verdict_counts'], ensure_ascii=False))
print('SUPPLEMENTARY', json.dumps(d['summary'].get('supplementary'), ensure_ascii=False))
for p in d['pages']:
    if p['verdict'] != '一致':
        print('\n###', p['role'], p['slug'], p['verdict'], '|', p['verdict_reason'])
        for x in (p.get('text') or {}).get('diff', [])[:3]:
            print('  -', x['op'], '| LIVE:', x['live'][:130].replace('\n', ' '), '| OFF:', x['off'][:130].replace('\n', ' '))