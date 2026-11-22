# -*- coding: utf-8 -*-
"""样板一逐轮一致性改进度量：仅中文字符序列的保留率（KaTeX 会把公式渲染成双份文本，纯中文序列不受影响）。"""
import difflib
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = r'D:\zxsy-math-arena-showcase'
PATH = os.path.join(ROOT, 'qa', 'verify-final', 'template1.json')
d = json.load(open(PATH, encoding='utf-8'))
CN = re.compile(r'[\u4e00-\u9fff]+')


def cn(s):
    return ''.join(CN.findall(s or ''))


def retention(ev, dom):
    a, b = cn(ev), cn(dom)
    if not a:
        return None
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    matched = sum(bl.size for bl in sm.get_matching_blocks())
    return round(matched / len(a), 3), len(a), len(b)


for side in ('off', 'live'):
    print('#####', side)
    steps = d['sides'][side].get('steps', [])
    for st in steps:
        r, la, lb = retention(st['evidence'], st['reply'])
        st['metrics_cn'] = {'retention': r, 'evidence_cn_len': la, 'dom_cn_len': lb}
        print('turn', st['idx'], 'retention', r, 'ev_cn', la, 'dom_cn', lb)
    d['sides'][side]['steps'] = steps

# 用中文保留率重算离线逐轮一致性（阈值 0.92）
summary = []
for i, st in enumerate(d['sides']['off'].get('steps', [])):
    m = st['metrics_cn']
    consistent = m['retention'] is not None and m['retention'] >= 0.92
    summary.append({'idx': i, 'kind': st['kind'], 'how': st['how'],
                    'off_retention_cn': m['retention'],
                    'off_similarity_full': st['metrics']['norm_similarity'],
                    'off_consistent': consistent})
d['round_summary'] = summary
d['off_consistent_rounds'] = sum(1 for s in summary if s['off_consistent'])
d['rounds'] = len(summary)
d['metric_note'] = '主判据=仅中文字符序列的采证保留率（KaTeX 会重复渲染公式与符号，故剔除 ASCII/公式后比较）；辅助=全文归一化相似度。'
with open(PATH, 'w', encoding='utf-8') as f:
    json.dump(d, f, ensure_ascii=False, indent=1)
print('OFF consistent(中文保留率>=0.92):', d['off_consistent_rounds'], '/', d['rounds'])
print(json.dumps(summary, ensure_ascii=False, indent=1))