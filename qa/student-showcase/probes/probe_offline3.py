# -*- coding: utf-8 -*-
"""探针 3：会话 30 条 + 错题 26/详情 + 封面内联 + 课件续播页码（run-03b 导入后）。"""
import json
import os
import re

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
    page.wait_for_timeout(2400)


with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=1, offline=True)
    page = ctx.new_page()
    errs, http = [], []
    page.on('pageerror', lambda e: errs.append(str(e)[:120]))
    page.on('request', lambda r: http.append(r.url) if r.url.startswith(('http://', 'https://')) else None)
    page.goto(ENTRY, wait_until='load')
    page.wait_for_timeout(1200)
    login(page)

    # 会话列表条数
    convs = page.evaluate("""() => Array.from(document.querySelectorAll('.sb-item, .conv-item, [class*=conv]')).map(e=>(e.innerText||'').trim().split('\\n')[0]).filter(Boolean)""")
    res['conversations'] = {'count': len(convs), 'sample': convs[:5]}
    # 点 3 个会话看消息
    opened = []
    items = page.locator('.sb-item, .conv-item')
    for i in range(min(4, items.count())):
        try:
            items.nth(i).click()
            page.wait_for_timeout(2200)
            n = page.locator('.msg-row').count()
            opened.append({'idx': i, 'msgs': n})
        except Exception as e:
            opened.append({'idx': i, 'err': str(e)[:60]})
    res['conv_messages'] = opened
    page.screenshot(path=os.path.join(OUT, 'p3-conversations.png'))

    # 错题
    page.evaluate("() => { location.hash = '#/errors' }")
    page.wait_for_timeout(3000)
    txt = page.inner_text('body')
    m = re.search(r'(\d+)\s*/\s*(\d+)', txt)
    res['errors'] = {'first_pair': m.group(0) if m else None, 'text_len': len(txt)}
    page.screenshot(path=os.path.join(OUT, 'p3-errors.png'))

    # 封面（按知识点浏览）
    page.evaluate("() => { location.hash = '#/resources' }")
    page.wait_for_timeout(2500)
    try:
        page.get_by_text('按知识点浏览', exact=False).first.click()
        page.wait_for_timeout(3000)
    except Exception:
        pass
    imgs = page.evaluate("""() => Array.from(document.querySelectorAll('img')).map(i=>({ok: i.complete && i.naturalWidth>0, w: i.naturalWidth, src: (i.getAttribute('src')||'').slice(0,24)}))""")
    broken = [i for i in imgs if not i['ok']]
    res['resources_kp'] = {'imgs': len(imgs), 'broken': len(broken), 'sample_src': [i['src'] for i in imgs[:3]]}
    page.screenshot(path=os.path.join(OUT, 'p3-resources-kp.png'))

    # 课件续播
    page.evaluate("() => { location.hash = '#/classroom' }")
    page.wait_for_timeout(2200)
    page.get_by_text('双师课堂', exact=False).first.click()
    page.wait_for_timeout(2200)
    cls = page.inner_text('body')
    res['classroom'] = {'has_100': '100%' in cls, 'snippet': cls[-200:].replace('\n', ' | ')}
    clicked=False
    for label in ('继续学习','再看一遍','复习课件','开始学习','进入课堂'):
        try:
            el=page.get_by_text(label, exact=False)
            if el.count():
                el.first.click(); clicked=True; break
        except Exception:
            continue
    page.wait_for_timeout(4000)
    dt = page.inner_text('body')
    mm = re.search(r'(\d+)\s*/\s*5', dt)
    res['deck'] = {'indicator': mm.group(0) if mm else None, 'url': page.url.split('#')[-1], 'clicked': clicked}
    page.screenshot(path=os.path.join(OUT, 'p3-deck.png'))

    res['network'] = {'http': len(http), 'sample': http[:2], 'errors': errs[:3]}
    b.close()

json.dump(res, open(os.path.join(OUT, 'probe3.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps(res, ensure_ascii=False, indent=1))