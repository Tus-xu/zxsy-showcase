# -*- coding: utf-8 -*-
"""离线补拍 p07-p10(含元数据)。针对 graph 页主线程阻塞做防护: 先截图后取文本, 每步带超时。"""
import json
import os
import re
import sys
import time

from playwright.sync_api import sync_playwright

WT = r'D:\zxsy-math-arena-showcase-student'
OUT = os.path.join(WT, 'qa', 'student-showcase', 'vqa', 'offline')
PROBES = os.path.join(WT, 'qa', 'student-showcase', 'probes')
OFFLINE_ENTRY = 'file:///' + os.path.join(WT, 'app', 'dist-offline', 'index.html').replace('\\', '/')
OFF_DUAL = '5304e914-edb1-47d2-b0db-7cbb804bcd86'
OFF_TASK = 'a9107e51-d407-4299-8791-0d1b22cb3ca6'
pages_wanted = sys.argv[1:] or ['p07-dual-player', 'p08-task-graded', 'p09-me-report', 'p10-me-map']


def safe_eval(page, js, default=None, label=''):
    try:
        return page.evaluate(js)
    except Exception as e:
        print('   eval fail(%s): %r' % (label, repr(e)[:100]), flush=True)
        return default


def main():
    meta = {'side': 'offline', 'started': time.strftime('%Y-%m-%dT%H:%M:%S'), 'pages': {}}
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        ctx = b.new_context(viewport={'width': 1440, 'height': 900},
                            device_scale_factor=1, offline=True, locale='zh-CN')
        page = ctx.new_page()
        page.set_default_timeout(12000)

        page.goto(OFFLINE_ENTRY, wait_until='load', timeout=30000)
        page.wait_for_timeout(1500)
        page.select_option('#preferred-role', 'student')
        page.fill('#auth-phone', '13800001001')
        page.get_by_role('button', name='获取验证码').click()
        page.wait_for_timeout(800)
        page.get_by_placeholder('6 位验证码').fill('246810')
        page.get_by_role('button', name='安全登录').click()
        page.wait_for_selector('header.topbar', timeout=20000)
        page.wait_for_timeout(2500)
        print('login ok', page.url, flush=True)

        targets = {
            'p07-dual-player': '/dual/' + OFF_DUAL,
            'p08-task-graded': '/tasks/' + OFF_TASK,
            'p09-me-report': '/me?tab=report',
            'p10-me-map': '/me?tab=graph',
        }
        for key in pages_wanted:
            print('==', key, flush=True)
            rec = {}
            t0 = time.time()
            try:
                page.evaluate("(r) => { location.hash = '#' + r }", targets[key])
                page.wait_for_timeout(1500)
                extra = {'p07-dual-player': 3500, 'p08-task-graded': 2000,
                         'p09-me-report': 800, 'p10-me-map': 4000}[key]
                page.wait_for_timeout(800 + extra)
                safe_eval(page, '() => window.scrollTo(0,0)', label='scroll')
                page.wait_for_timeout(250)
                shot = os.path.join(OUT, key + '.png')
                page.screenshot(path=shot)   # 先截图(不等主线程)
                rec['url'] = page.url
                rec['elapsed'] = round(time.time() - t0, 1)
                txt = safe_eval(page, '() => document.body && document.body.innerText', '', 'text')
                rec['body_text'] = (txt or '')[:6000]
                rec['katex'] = safe_eval(page, "() => document.querySelectorAll('.katex').length", -1, 'katex')
                rec['images'] = safe_eval(
                    page, "() => Array.from(document.images).map(i=>({src:i.src.slice(0,120),w:i.naturalWidth,ok:i.complete}))", [], 'imgs')
                print('   shot', key, 'elapsed=%ss' % rec['elapsed'], 'katex=%s' % rec['katex'], flush=True)
            except Exception as e:
                rec['error'] = repr(e)[:300]
                print('   ERROR:', repr(e)[:200], flush=True)
            meta['pages'][key] = rec

        b.close()
    meta['finished'] = time.strftime('%Y-%m-%dT%H:%M:%S')
    with open(os.path.join(PROBES, 'vqa-meta-offline-p07p10.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
    print(json.dumps({k: {kk: vv for kk, vv in v.items() if kk != 'body_text'}
                      for k, v in meta['pages'].items()}, ensure_ascii=False, indent=1)[:2000])


if __name__ == '__main__':
    main()