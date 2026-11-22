# -*- coding: utf-8 -*-
"""把样板/交互的单侧截图拼成并排图（LIVE/OFFLINE 标题条）。"""
import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = r'D:\zxsy-math-arena-showcase'
sys.path.insert(0, os.path.join(ROOT, 'qa', 'verify-final', 'tools'))
import run_parity as rp  # noqa: E402

OUT = os.path.join(ROOT, 'qa', 'verify-final')
S = os.path.join(OUT, 'shots')
T2 = os.path.join(S, 'template2')
T1 = os.path.join(S, 'template1')
PAIRS = [
    (os.path.join(T1, 'live-01-uploaded.png'), os.path.join(T1, 'offclean-01-uploaded.png'),
     'template1', 'upload-attachment', 'sample1-upload'),
    (os.path.join(T1, 'live-99-terminal.png'), os.path.join(T1, 'offclean-99-terminal.png'),
     'template1', 'terminal-remediation', 'sample1-terminal'),
    (os.path.join(T2, 'live-03-retry-result.png'), os.path.join(T2, 'off-03-retry-result.png'),
     'template2', 'retry-409-parity', 'template2-retry'),
    (os.path.join(T2, 'live-09-immersive-retry.png'), os.path.join(T2, 'off-09-immersive-retry.png'),
     'template2', 'conflict-card-parity', 'template2-conflict'),
    (os.path.join(T1, 'live-98-after-refresh.png'), os.path.join(T1, 'offclean-98-after-refresh.png'),
     'template1', 'refresh-restore', 'sample1-refresh'),
    (os.path.join(T2, 'live-05-ppt-zero.png'), os.path.join(T2, 'off-05-ppt-zero.png'),
     'template2', 'ppt-zero-7-disabled', 'template2-ppt'),
    (os.path.join(T2, 'live-06-export-dialog.png'), os.path.join(T2, 'off-06-export-dialog.png'),
     'template2', 'export-3-disabled', 'template2-export'),
    (os.path.join(S, 'live-student-me.png'), os.path.join(S, 'off-student-me.png'),
     'student', 'me', 'student-me'),
]
made = []
for lp, op, role, slug, name in PAIRS:
    if not (os.path.exists(lp) and os.path.exists(op)):
        print('SKIP missing', name, os.path.exists(lp), os.path.exists(op))
        continue
    out = os.path.join(S, f'side-{name}.png')
    try:
        info = rp.side_by_side(lp, op, out, slug, name, role)
        made.append({'path': info['path'], 'from': (lp, op)})
        print('MADE', out, info['width'], info['height'])
    except Exception as e:
        print('FAIL', name, repr(e)[:200])
with open(os.path.join(OUT, 'side_extra.json'), 'w', encoding='utf-8') as f:
    json.dump(made, f, ensure_ascii=False, indent=1)
print('total', len(made))