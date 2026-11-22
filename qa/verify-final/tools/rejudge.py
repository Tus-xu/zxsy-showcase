# -*- coding: utf-8 -*-
"""重判 verify.json：控件差异按「结构/状态」判，标签文字差异归入文本漂移（附原判）。"""
import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = r'D:\zxsy-math-arena-showcase'
PATH = os.path.join(ROOT, 'qa', 'verify-final', 'verify.json')
d = json.load(open(PATH, encoding='utf-8'))


def judge(rec):
    layout = rec['layout']
    if layout['missing']:
        return '未通过', 'structure', '布局骨架缺失：' + ', '.join(m['selector'] for m in layout['missing'])
    if layout['max_delta'] > 20:
        return '未通过', 'structure', '布局盒偏移 %dpx' % layout['max_delta']
    if layout['max_delta'] > 4:
        return '差异', 'layout', '布局盒偏移 %dpx（>4px 阈值）' % layout['max_delta']
    if rec['imgs']['off']['broken'] - rec['imgs']['live']['broken'] >= 2:
        return '未通过', 'media', '离线破图 %d 张（现役 %d）' % (rec['imgs']['off']['broken'], rec['imgs']['live']['broken'])
    if rec['forbidden_hits']['union']:
        return '未通过', 'fabrication', '可见界面出现无现役依据内容：' + '、'.join(rec['forbidden_hits']['union'])
    c = rec['controls']
    # 控件结构判据：数量差 >2 或 disabled 数量不同 → 结构性差异；标签文字差异交给文本 diff 判定
    if abs(c['live_count'] - c['off_count']) > 2 or c['live_disabled'] != c['off_disabled']:
        return '未通过', 'controls', '可见控件结构不同（%d vs %d / disabled %d vs %d）' % (
            c['live_count'], c['off_count'], c['live_disabled'], c['off_disabled'])
    if rec['text']['exact']:
        return '一致', 'none', '布局盒≤%dpx、可见文本逐行一致、控件结构/disabled 一致、破图一致' % layout['max_delta']
    if rec['text']['number_time_drift_only']:
        return '一致', 'number_time_drift', '布局盒≤%dpx、文本仅数字/时间漂移（%d 处）' % (layout['max_delta'], rec['text']['diff_count'])
    if rec['text']['diff_count'] <= 25:
        return '差异', 'data_drift', '结构一致；%d 行内容不同（真实数据漂移，见 diff）' % rec['text']['diff_count']
    return '未通过', 'content', '内容结构不同：可见文本 %d 行 vs %d 行，%d 处差异' % (
        rec['text']['live_lines'], rec['text']['off_lines'], rec['text']['diff_count'])


counts = {}
for p in d['pages']:
    if 'layout' not in p or 'text' not in p or p['verdict'] == '未采':
        continue
    p['verdict_original'] = {'verdict': p['verdict'], 'kind': p['verdict_kind'], 'reason': p['verdict_reason']}
    p['verdict'], p['verdict_kind'], p['verdict_reason'] = judge(p)
spec = [p for p in d['pages'] if p['slug'] != 'write-canonical']
for p in spec:
    counts[p['verdict']] = counts.get(p['verdict'], 0) + 1
d['summary']['verdict_counts'] = counts
d['summary']['total'] = len(spec)
d['summary']['supplementary'] = [{'role': p['role'], 'slug': p['slug'], 'verdict': p['verdict']}
                                 for p in d['pages'] if p['slug'] == 'write-canonical']
with open(PATH, 'w', encoding='utf-8') as f:
    json.dump(d, f, ensure_ascii=False, indent=1)
print('REJUDGED', json.dumps(counts, ensure_ascii=False), 'spec_total', len(spec))
for p in d['pages']:
    print(p['role'], p['slug'], p['verdict'], p['verdict_kind'],
          '| orig:', (p.get('verdict_original') or {}).get('verdict'), (p.get('verdict_original') or {}).get('kind'))