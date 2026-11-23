# -*- coding: utf-8 -*-
"""离线探针：题库搜索/筛选参数匹配；课堂 5 页播放；作业查看作答（批改结果）。"""
import json
import os

from playwright.sync_api import sync_playwright

WT = r'D:\zxsy-math-arena-showcase-student'
ENTRY = 'file:///' + os.path.join(WT, 'app', 'dist-offline', 'index.html').replace('\\', '/')
OUT = os.path.join(WT, 'qa', 'student-showcase', 'probes')
res = {}


def login(page):
    page.select_option('#preferred-role', 'student')
    page.fill('#auth-phone', '13800001001')
    page.get_by_role('button', name='获取验证码').click()
    page.wait_for_timeout(700)
    page.get_by_placeholder('6 位验证码').fill('246810')
    page.get_by_role('button', name='安全登录').click()
    page.wait_for_timeout(2000)


with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=1, offline=True)
    page = ctx.new_page()
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)[:150]))
    page.goto(ENTRY, wait_until='load')
    page.wait_for_timeout(1200)
    login(page)

    # ── 1) 题库搜索 ──
    page.evaluate("() => { location.hash = '#/library' }")
    page.wait_for_timeout(2200)
    page.get_by_text('我的题库', exact=False).first.click()
    page.wait_for_timeout(2500)
    before = page.inner_text('body')
    res['lib_all'] = {'shown': '已显示 24 / 24' in before}
    box = page.locator("input[placeholder*='搜索'], input[type=search]")
    res['search_inputs'] = box.count()
    if box.count():
        box.first.fill('函数')
        page.wait_for_timeout(2500)
        after = page.inner_text('body')
        import re
        m = re.search(r'已显示\s*(\d+)\s*/\s*(\d+)', after)
        res['lib_search'] = {'matched': m.group(0) if m else None,
                             'text_len': len(after), 'differs_from_all': after != before}
        page.screenshot(path=os.path.join(OUT, 'library-search-1440.png'))

    # ── 2) 课堂 → 双师课堂 → 打开 5 页课件 ──
    page.evaluate("() => { location.hash = '#/classroom' }")
    page.wait_for_timeout(2500)
    try:
        page.get_by_text('双师课堂', exact=False).first.click()
        page.wait_for_timeout(2500)
    except Exception as e:
        res['dual_tab_err'] = str(e)[:100]
    body = page.inner_text('body')
    res['dual_tab'] = {'has_deck_title': '函数的单调性' in body,
                       'snippet': body[-320:].replace('\n', ' | ')}
    page.screenshot(path=os.path.join(OUT, 'classroom-dual-1440.png'))
    opened = False
    for name in ['函数的单调性', '开始学习', '进入课堂', '播放']:
        try:
            el = page.get_by_text(name, exact=False)
            if el.count():
                el.first.click()
                opened = True
                break
        except Exception:
            continue
    page.wait_for_timeout(4000)
    deck = page.inner_text('body')
    import re as _re
    pg = _re.search(r'第\s*(\d+)\s*/\s*(\d+)\s*页', deck)
    res['deck'] = {'opened': opened, 'url': page.url.split('#')[-1],
                   'page_indicator': pg.group(0) if pg else None,
                   'has_controls': all(k in deck for k in ('下一页', '上一页')),
                   'text_len': len(deck)}
    page.screenshot(path=os.path.join(OUT, 'deck-page1-1440.png'))
    if pg:
        for i in range(4):
            try:
                page.get_by_text('下一页', exact=False).first.click()
                page.wait_for_timeout(1200)
            except Exception:
                break
        deck2 = page.inner_text('body')
        pg2 = _re.search(r'第\s*(\d+)\s*/\s*(\d+)\s*页', deck2)
        res['deck_after_flip'] = {'page_indicator': pg2.group(0) if pg2 else None,
                                  'next_disabled': bool(page.locator("button:has-text('下一页')[disabled]").count())}
        page.screenshot(path=os.path.join(OUT, 'deck-page5-1440.png'))

    # ── 3) 课堂任务 → 已完成 → 查看作答 ──
    page.evaluate("() => { location.hash = '#/classroom' }")
    page.wait_for_timeout(2200)
    try:
        page.get_by_text('已完成', exact=False).first.click()
        page.wait_for_timeout(1800)
        page.get_by_text('查看作答', exact=False).first.click()
        page.wait_for_timeout(3000)
        fb = page.inner_text('body')
        res['feedback'] = {'url': page.url.split('#')[-1], 'text_len': len(fb),
                           'has_score': '30' in fb, 'has_graded': '已批改' in fb or '批改' in fb,
                           'snippet': fb[:260].replace('\n', ' | ')}
        page.screenshot(path=os.path.join(OUT, 'assignment-feedback-1440.png'))
    except Exception as e:
        res['feedback_err'] = str(e)[:150]

    res['page_errors'] = errs[:3]
    b.close()

with open(os.path.join(OUT, 'probe-offline-2.json'), 'w', encoding='utf-8') as f:
    json.dump(res, f, ensure_ascii=False, indent=1)
print(json.dumps(res, ensure_ascii=False, indent=1))