# -*- coding: utf-8 -*-
"""对比 live/offline 元数据: 每页正文行级 diff + 关键计数提取 + 数字集合 diff。"""
import json
import re

WT = r'D:\zxsy-math-arena-showcase-student'
P = WT + r'\qa\student-showcase\probes'

live = json.load(open(P + r'\vqa-meta-live.json', encoding='utf-8'))
off = json.load(open(P + r'\vqa-meta-offline.json', encoding='utf-8'))
# 离线 p07-p10 补拍元数据合并(如与主文件冲突以主文件为准)
try:
    extra = json.load(open(P + r'\vqa-meta-offline-p07p10.json', encoding='utf-8'))
    for k, v in extra['pages'].items():
        if k not in off['pages'] or not off['pages'][k].get('body_text'):
            off['pages'][k] = v
except Exception as e:
    print('merge skip', e)


def norm(t):
    return [re.sub(r'\s+', ' ', ln).strip() for ln in (t or '').split('\n') if ln.strip()]


def nums(t):
    return sorted(set(re.findall(r'\d+(?:\.\d+)?%?', t or '')))


for page in live['pages']:
    lv = live['pages'][page]
    of = off['pages'].get(page, {})
    lt, ot = norm(lv.get('body_text')), norm(of.get('body_text'))
    lset, oset = set(lt), set(ot)
    only_l = [x for x in lt if x not in oset]
    only_o = [x for x in ot if x not in lset]
    print('\n' + '=' * 30, page, '=' * 30)
    print('live url:', lv.get('url'), '| off url:', of.get('url'))
    print('live lines=%d off lines=%d | onlyLIVE=%d onlyOFF=%d' % (len(lt), len(ot), len(only_l), len(only_o)))
    print('katex live=%s off=%s | broken live=%s off=%s' % (lv.get('katex'), of.get('katex'),
                                                            len(lv.get('broken_imgs') or []), len(of.get('broken_imgs') or [])))
    if only_l:
        print('  ONLY-LIVE(%d):' % len(only_l))
        for x in only_l[:14]:
            print('    L|', x[:160])
    if only_o:
        print('  ONLY-OFFLINE(%d):' % len(only_o))
        for x in only_o[:14]:
            print('    O|', x[:160])
    n_l, n_o = nums(lv.get('body_text')), nums(of.get('body_text'))
    print('  num-only-live:', [x for x in n_l if x not in n_o][:25])
    print('  num-only-off :', [x for x in n_o if x not in n_l][:25])