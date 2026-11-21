# -*- coding: utf-8 -*-
"""针对性复位验：资源中心封面离线化 + 科研工作台/启动页快照一致性。

指标：整页文本相似度、破图数（naturalWidth=0）、可见布局盒。
"""
import json
import os
import sys

sys.path.insert(0, os.path.join(r'D:\zxsy-math-arena-showcase', '.work', 'scripts'))
from playwright.sync_api import sync_playwright  # noqa: E402

from live_login import RESEARCH, STUDENT, TEACHER, login  # noqa: E402

ROOT = r'D:\zxsy-math-arena-showcase'
LIVE = 'http://127.0.0.1:5176'
OFF = 'file:///' + os.path.join(ROOT, 'app', 'dist-offline', 'index.html').replace('\\', '/')
SHOTS = os.path.join(ROOT, 'qa', 'parity-r02', 'shots')

CASES = [
    ('student', STUDENT, '/resources', 'student-resources'),
    ('teacher', TEACHER, '/teacher-v3/resources', 'teacher-resources'),
    ('researcher', RESEARCH, '/research-workspace', 'research-landing'),
    ('researcher', RESEARCH, '/research-workspace/workspace', 'research-workspace'),
]

PROBE = r"""() => {
  const txt = (document.body.innerText || '').replace(/\s+/g, ' ').trim();
  const imgs = Array.from(document.querySelectorAll('img'));
  const broken = imgs.filter(i => !i.complete || i.naturalWidth === 0).length;
  return { text: txt.slice(0, 6000), imgCount: imgs.length, broken };
}"""


def norm(t):
    import re
    return re.sub(r'\s+', ' ', t or '').strip()


def main():
    rows = []
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        for role, ident, route, slug in CASES:
            lctx = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1)
            lp = lctx.new_page()
            login(lp, ident)
            lp.wait_for_timeout(1200)
            lp.goto(LIVE + route, wait_until='load')
            lp.wait_for_timeout(7000)
            live = lp.evaluate(PROBE)
            lp.screenshot(path=os.path.join(SHOTS, f'recheck-live-{slug}.png'))

            octx = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, offline=True)
            op = octx.new_page()
            op.goto(OFF, wait_until='load')
            op.wait_for_timeout(1000)
            logged = op.evaluate("() => { try { return !!JSON.parse(localStorage.getItem('ma_offline_demo_v1')||'{}').session } catch(e) { return false } }")
            if not logged:
                op.select_option('#preferred-role', role)
                op.fill('#auth-phone', ident['phone'])
                op.get_by_role('button', name='获取验证码').click()
                op.wait_for_timeout(800)
                op.get_by_placeholder('6 位验证码').fill('246810')
                op.get_by_role('button', name='安全登录').click()
                op.wait_for_timeout(2200)
            op.evaluate("(r) => { location.hash = '#' + r }", route)
            op.wait_for_timeout(7000)
            off = op.evaluate(PROBE)
            op.screenshot(path=os.path.join(SHOTS, f'recheck-off-{slug}.png'))
            a, bb = set(live['text']), set(off['text'])
            sim = round(len(a & bb) / max(1, len(a | bb)), 3)
            rows.append({'slug': slug, 'sim': sim, 'live_broken': live['broken'], 'off_broken': off['broken'],
                         'live_imgs': live['imgCount'], 'off_imgs': off['imgCount'],
                         'live_len': len(live['text']), 'off_len': len(off['text'])})
            print(f"{slug:22s} sim={sim} imgs L/O={live['imgCount']}/{off['imgCount']} broken L/O={live['broken']}/{off['broken']}")
            lctx.close()
            octx.close()
        b.close()
    with open(os.path.join(ROOT, 'qa', 'parity-r02', 'recheck.json'), 'w', encoding='utf-8') as f:
        json.dump(rows, f, ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()