# -*- coding: utf-8 -*-
"""复采：科研 e49/read 页（首次并排采集时现役概览尚在加载；复检 20s 后与离线一致）。"""
import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = r'D:\zxsy-math-arena-showcase'
sys.path.insert(0, os.path.join(ROOT, 'qa', 'verify-final', 'tools'))
import run_parity as rp  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

PROJ = 'e49b27e2-b05f-45c3-ac99-dd0792d9ab80'
PATH = os.path.join(ROOT, 'qa', 'verify-final', 'verify.json')
d = json.load(open(PATH, encoding='utf-8'))
page_rec = next(p for p in d['pages'] if p['role'] == 'researcher' and p['slug'] == 'read')

with sync_playwright() as pw:
    b = pw.chromium.launch(headless=True)
    cfg = rp.PAGES['researcher']
    ls = rp.Side(b, 'live', cfg, False)
    ls.login_live(cfg['ident'])
    ls.goto(f'/research-workspace/{PROJ}/read')
    ls.page.wait_for_timeout(14000)   # 概览异步生成，给足 14s
    ls.page.evaluate('() => window.scrollTo(0,0)')
    ls.page.mouse.move(1, 1)
    ls.page.wait_for_timeout(400)
    m = ls.measure()
    lf = os.path.join(rp.SHOTS, 'live-researcher-read.png')
    ls.screenshot(lf)
    live = {'url': m['url'], 'scroll': m['scroll'], 'boxes': m['boxes'], 'imgs': m['imgs'],
            'buttons': m['buttons'], 'inputs': m['inputs'], 'hostHits': m['hostHits'],
            'hostWords': m['hostWords'], 'fixedCorner': m['fixedCorner'], 'text': m['text'],
            'requests': ls.requests[:10], 'request_count': len(ls.requests),
            'pageerrors': ls.pageerrors[:5],
            'console_errors': [c for c in ls.consoles if c['type'] == 'error'][:6],
            'responses_4xx': [r for r in ls.responses if r['status'] >= 400][:6],
            'screenshot': 'shots/live-researcher-read.png',
            'recaptured_at': __import__('datetime').datetime.now().astimezone().isoformat(timespec='seconds'),
            'recapture_note': '首采在 SPA 稳定 5.5s 时概览尚未渲染；本图等待 14s，概览/计数已与离线一致'}
    page_rec['live'] = live
    # 重新比对
    page_rec['text'] = None
    rec = rp.compare_page(live, page_rec['off'], {'role': page_rec['role'], 'slug': 'read', 'kind': page_rec['kind']})
    page_rec['text'] = rec['text']; page_rec['layout'] = rec['layout']; page_rec['controls'] = rec['controls']
    page_rec['numbers'] = rec['numbers']; page_rec['imgs'] = rec['imgs']; page_rec['host'] = rec['host']
    page_rec['forbidden_hits'] = rec['forbidden_hits']
    of = os.path.join(rp.SHOTS, 'off-researcher-read.png')
    page_rec['side'] = rp.side_by_side(lf, of, os.path.join(rp.SHOTS, 'side-researcher-read.png'),
                                      f'/research-workspace/{PROJ}/read', 'read', 'researcher')
    page_rec['pixel'] = rp.pixel_diff(lf, of)
    page_rec['verdict_original'] = {'verdict': page_rec['verdict'], 'kind': page_rec['verdict_kind'],
                                     'reason': page_rec['verdict_reason']}
    page_rec['verdict'], page_rec['verdict_kind'], page_rec['verdict_reason'] = rp.judge(page_rec)
    ls.ctx.close(); b.close()

with open(PATH, 'w', encoding='utf-8') as f:
    json.dump(d, f, ensure_ascii=False, indent=1)
print('RECAPTURED read:', page_rec['verdict'], page_rec['verdict_kind'],
      'diff_count', page_rec['text']['diff_count'], 'drift', page_rec['text']['number_time_drift_only'])
for x in page_rec['text']['diff'][:4]:
    print(' ', x['op'], '| LIVE:', x['live'][:160], '| OFF:', x['off'][:160])
print('numbers diff', page_rec['numbers']['diff'][:10])