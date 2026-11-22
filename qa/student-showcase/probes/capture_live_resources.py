# -*- coding: utf-8 -*-
"""现役 /resources 复拍: 延长等待, 记录 recommend/videos 网络结果, 判断列表是否可达。"""
import json
import os
import re
import time

from playwright.sync_api import sync_playwright

WT = r'D:\zxsy-math-arena-showcase-student'
OUT = os.path.join(WT, 'qa', 'student-showcase', 'vqa', 'live')
PROBES = os.path.join(WT, 'qa', 'student-showcase', 'probes')
LIVE = 'http://127.0.0.1:5176'
PHONE = '13800001001'


def main():
    res = {'net': [], 'console': []}
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        ctx = b.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=1,
                            locale='zh-CN')
        page = ctx.new_page()
        page.on('response', lambda r: res['net'].append(
            {'url': r.url[:220], 'status': r.status}) if '/student/videos' in r.url else None)
        page.on('requestfailed', lambda r: res['net'].append(
            {'url': r.url[:220], 'failed': r.failure}) if '/student/videos' in r.url else None)
        page.on('console', lambda m: res['console'].append(m.text[:300]) if m.type in ('error', 'warning') else None)

        page.goto(LIVE + '/', wait_until='load', timeout=30000)
        page.wait_for_timeout(1500)
        if page.locator('header.topbar').count():
            try:
                page.locator('.user-chip').first.click(); page.wait_for_timeout(300)
                page.get_by_role('button', name='退出登录').first.click(); page.wait_for_timeout(1500)
            except Exception:
                pass
        page.select_option('#preferred-role', 'student')
        page.fill('#auth-phone', PHONE)
        page.get_by_role('button', name='获取验证码').click()
        page.wait_for_timeout(900)
        code = ''
        for attempt in range(3):
            note = page.locator('.demo-note')
            if note.count():
                m = re.search(r'(\d{6})', note.first.inner_text())
                if m:
                    code = m.group(1); break
            print('  wait 65s for demo note', flush=True)
            page.wait_for_timeout(65000)
            page.get_by_role('button', name='获取验证码').click()
            page.wait_for_timeout(900)
        print('code', code, flush=True)
        page.get_by_placeholder('6 位验证码').fill(code)
        page.get_by_role('button', name='安全登录').click()
        page.wait_for_selector('header.topbar', timeout=20000)
        page.wait_for_timeout(2000)

        page.goto(LIVE + '/resources', wait_until='load', timeout=30000)
        print('on resources', flush=True)
        t0 = time.time()
        cards = 0
        for i in range(45):
            try:
                cards = page.locator('.rc-card').count()
            except Exception:
                cards = -1
            nstate = page.locator('.rc-state').count()
            print('  t=%2ds cards=%s state=%s' % (int(time.time() - t0), cards, nstate), flush=True)
            if cards > 0:
                break
            if i == 20 or i == 35:
                page.screenshot(path=os.path.join(OUT, 'p04-resources-wait-%ds.png' % int(time.time() - t0)))
            page.wait_for_timeout(1000)
        page.wait_for_timeout(800)
        page.screenshot(path=os.path.join(OUT, 'p04-resources.png'))
        res['cards'] = cards
        res['elapsed'] = round(time.time() - t0, 1)
        res['text'] = page.inner_text('body')[:3000]
        res['state_text'] = page.locator('.rc-state').first.inner_text() if page.locator('.rc-state').count() else ''
        b.close()
    with open(os.path.join(PROBES, 'live-resources-recheck.json'), 'w', encoding='utf-8') as f:
        json.dump(res, f, ensure_ascii=False, indent=1)
    print(json.dumps({k: v for k, v in res.items() if k != 'text'}, ensure_ascii=False, indent=1)[:3000])


if __name__ == '__main__':
    main()