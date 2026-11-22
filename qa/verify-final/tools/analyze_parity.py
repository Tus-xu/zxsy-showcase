# -*- coding: utf-8 -*-
"""分析 verify.json：逐页差异摘要 / 交互态 / 页面元信息。输出到 stdout（调用方重定向到日志）。"""
import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = r'D:\zxsy-math-arena-showcase'
d = json.load(open(os.path.join(ROOT, 'qa', 'verify-final', 'verify.json'), encoding='utf-8'))
print('SUMMARY', json.dumps(d['summary'], ensure_ascii=False))
for p in d['pages']:
    print('\n=== %s/%s %s | %s | %s' % (p['role'], p['slug'], p['verdict'], p['verdict_kind'], p['verdict_reason']))
    if p.get('layout'):
        print(' layout', p['layout']['max_delta'], p['layout']['deltas'])
    if p.get('controls'):
        c = p['controls']
        print(' controls live=%d/%d disabled=%d/%d only_live=%s only_off=%s' % (
            c['live_count'], c['off_count'], c['live_disabled'], c['off_disabled'], c['only_live'], c['only_off']))
    if p.get('text'):
        t = p['text']
        print(' text lines %d/%d diff=%d drift=%s exact=%s' % (t['live_lines'], t['off_lines'], t['diff_count'],
                                                               t['number_time_drift_only'], t['exact']))
        for x in t['diff'][:4]:
            print('   -', x['op'], '| LIVE:', x['live'][:140], '| OFF:', x['off'][:140])
    if p.get('numbers'):
        print(' numbers diff', p['numbers']['diff'][:12])
    print(' imgs', p['imgs'], 'url_off', (p['off'].get('url') or '')[-70:])
    print(' forbidden', p.get('forbidden_hits'))
    print(' host_off', p.get('host', {}).get('off', {}).get('hostHits'), p.get('host', {}).get('off', {}).get('hostWords'),
          'fixedCorner_off', p.get('host', {}).get('off', {}).get('fixedCorner'))
print('\n\n### INTERACTIONS')
for it in d.get('interactions', []):
    print(json.dumps(it, ensure_ascii=False)[:2500])
print('\n### GUEST')
for side in ('live', 'off'):
    g = d['guest_login'].get(side, {})
    print(side, 'hostHits', g.get('hostHits'), 'hostWords', g.get('hostWords'), 'fixedCorner', g.get('fixedCorner'),
          'forbidden', g.get('forbidden'), 'console', len(g.get('console_errors') or []))
print('### AUDIT', json.dumps({k: v for k, v in d['offline_audit'].items() if k != 'per_page'}, ensure_ascii=False))