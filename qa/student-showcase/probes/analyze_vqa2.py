# -*- coding: utf-8 -*-
"""逐页关键断言提取 + 行级 diff (UTF-8)。"""
import json
import re
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

WT = r'D:\zxsy-math-arena-showcase-student'
P = WT + r'\qa\student-showcase\probes'

live = json.load(open(P + r'\vqa-meta-live.json', encoding='utf-8'))
off = json.load(open(P + r'\vqa-meta-offline.json', encoding='utf-8'))
try:
    extra = json.load(open(P + r'\vqa-meta-offline-p07p10.json', encoding='utf-8'))
    for k, v in extra['pages'].items():
        if k not in off['pages'] or not off['pages'][k].get('body_text'):
            off['pages'][k] = v
except Exception as e:
    print('merge skip', e)
# p04 现役补拍文本
try:
    rc = json.load(open(P + r'\live-resources-recheck.json', encoding='utf-8'))
    if rc.get('text'):
        live['pages']['p04-resources']['body_text'] = rc['text']
except Exception as e:
    print('p04 recapture skip', e)


def norm(t):
    return [re.sub(r'\s+', ' ', ln).strip() for ln in (t or '').split('\n') if ln.strip()]


for page in live['pages']:
    lv = live['pages'][page]
    of = off['pages'].get(page, {})
    lt, ot = norm(lv.get('body_text')), norm(of.get('body_text'))
    lset, oset = set(lt), set(ot)
    only_l = [x for x in lt if x not in oset]
    only_o = [x for x in ot if x not in lset]
    print('\n' + '#' * 24, page, '#' * 24)
    print('LIVE lines=%d  OFF lines=%d  onlyLIVE=%d  onlyOFF=%d' % (len(lt), len(ot), len(only_l), len(only_o)))
    if only_l:
        print(' -- ONLY-LIVE:')
        for x in only_l[:18]:
            print('   L|', x[:170])
    if only_o:
        print(' -- ONLY-OFFLINE:')
        for x in only_o[:18]:
            print('   O|', x[:170])
    m = re.search(r'(\d+)\s*/\s*(\d+)', ' '.join(lt[:40]))
    if page == 'p05-errors':
        ml = re.search(r'第\s*(\d+)\s*题|(\d+)\s*/\s*(\d+)', ' '.join(lt[:30]))
        print('  errors head LIVE first30:', ' | '.join(lt[:12]))
        print('  errors head OFF  first30:', ' | '.join(ot[:12]))
    if page == 'p06-classroom-tasks':
        print('  LIVE task head:', ' | '.join(lt[:20]))
        print('  OFF  task head:', ' | '.join(ot[:20]))
    if page == 'p04-resources':
        cards_l = [x for x in lt if len(x) > 12][:20]
        cards_o = [x for x in ot if len(x) > 12][:20]
        print('  LIVE long-lines(%d):' % len(cards_l), cards_l[:6])
        print('  OFF  long-lines(%d):' % len(cards_o), cards_o[:6])