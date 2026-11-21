# -*- coding: utf-8 -*-
"""收口复验：B1/B2/M1 消除确认 + 关键页无回归（只读）。
包：release/开始演示.html 2026-11-21 04:54:33 SHA256 A188CA21…E0F5"""
import json
from playwright.sync_api import sync_playwright

URL = 'file:///D:/zxsy-math-arena-showcase/release/index.html'
Q = r'D:\zxsy-math-arena\docs\superpowers\plans\题1.png'
OUT = r'D:\zxsy-math-arena-showcase\qa\review-visual\shots'
res = {'pkg': {'time': '2026-11-21 04:54:33', 'size': 6376184, 'sha256': 'A188CA2149A72076B9DECABC3FAD6D0D7580B9FDFC813355AA3D821EDA66A0F5'}}
errs = []


def shot(page, name):
    page.mouse.move(3, 3); page.wait_for_timeout(220)
    page.evaluate('() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur() }')
    page.wait_for_timeout(50)
    page.screenshot(path=OUT + '\\' + name + '.png')


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, locale='zh-CN', timezone_id='Asia/Shanghai')
    page = ctx.new_page()
    page.on('pageerror', lambda e: errs.append(str(e)[:300]))
    page.on('console', lambda m: errs.append('console:' + m.text[:200]) if m.type == 'error' else None)
    page.goto(URL, wait_until='load'); page.wait_for_timeout(1200)
    page.evaluate('() => localStorage.clear()'); page.reload(wait_until='load'); page.wait_for_timeout(1300)
    page.evaluate('() => { window.__net = 0; const of = window.fetch; window.fetch = function(...a){ window.__net++; return of.apply(this,a) } }')

    # 主持人工具：登录页入口 + 嘉宾页浮标
    res['login_host'] = page.evaluate("""() => ({ hostFab: document.querySelectorAll('.ms-host-fab').length,
        hostLink: [...document.querySelectorAll('button')].filter(b => b.innerText.includes('主持人工具')).length })""")
    shot(page, 'final2-00-login')
    page.locator('.ms-role').nth(0).click(); page.wait_for_timeout(900)
    res['guest_fab'] = page.evaluate("""() => {
      const q = (s) => document.querySelector(s);
      const rect = (s) => { const e = q(s); if (!e) return null; const r = e.getBoundingClientRect(); return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}; };
      return { hostFab: document.querySelectorAll('.ms-host-fab').length, butler: rect('.ms-butler'), hostPanel: document.querySelectorAll('.ms-host').length };
    }""")
    shot(page, 'final2-S01-home')
    # 主持人快捷键打开
    page.keyboard.press('Control+Shift+H'); page.wait_for_timeout(600)
    res['host_hotkey'] = page.evaluate("() => ({ open: document.querySelectorAll('.ms-host').length, title: (document.querySelector('.ms-host__panel h3')||{}).innerText || null })")
    shot(page, 'final2-host-panel')
    page.keyboard.press('Escape'); page.wait_for_timeout(400)
    res['host_closed'] = page.evaluate("() => document.querySelectorAll('.ms-host').length")

    # B1/B2：引导 A 主线
    page.evaluate("() => { location.hash = '#/student/guide/A' }"); page.wait_for_timeout(800)
    page.set_input_files('input[type=file]', Q); page.wait_for_timeout(1200)
    for txt in ['2b=√7·2a，所以 b/a=√7', 'c²=a²+b²', '8', '2√2']:
        page.fill('.guide__input', txt); page.keyboard.press('Enter'); page.wait_for_timeout(450)
    page.locator('.guide__choices .guide__choice').nth(3).click(); page.wait_for_timeout(250)
    page.locator('.guide__choices .ms-btn--primary').click(); page.wait_for_timeout(1100)
    res['B1'] = page.evaluate("""() => {
      const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return {y:Math.round(b.y), bottom:Math.round(b.bottom), h:Math.round(b.height)}; };
      const chat = document.querySelector('.guide__chat');
      const h3 = document.querySelector('.guide__final h3');
      return { scrollH: document.documentElement.scrollHeight, innerH: innerHeight, scrollY: Math.round(scrollY),
               composer: r('.guide__composer-wrap'), final: r('.guide__final'),
               chatInnerScroll: chat ? (chat.scrollHeight > chat.clientHeight + 2) : null,
               chatRect: chat ? (() => { const b = chat.getBoundingClientRect(); return {y:Math.round(b.y), bottom:Math.round(b.bottom)}; })() : null,
               finalTitle: h3 ? h3.innerText : null,
               hasRawDollar: h3 ? h3.innerText.includes('$') : null,
               finalInViewport: (() => { const f = document.querySelector('.guide__final'); if (!f) return null; const b = f.getBoundingClientRect(); return b.top >= 0 && b.bottom <= 941; })() };
    }""")
    shot(page, 'final2-guide-A-final')
    page.evaluate("() => { const c = document.querySelector('.guide__chat'); if (c) c.scrollTop = c.scrollHeight; }")
    page.wait_for_timeout(350)
    shot(page, 'final2-guide-A-final-chatbottom')
    # 结论卡 element 截图（核对标题渲染）
    try:
        page.locator('.guide__final').screenshot(path=OUT + r'\final2-guide-A-final-card.png')
    except Exception as e:  # noqa: BLE001
        res['final_card_shot_err'] = str(e)[:200]

    # 引导 B 多选态（确认同样修复）
    page.evaluate("() => { location.hash = '#/student/guide/B' }"); page.wait_for_timeout(900)
    page.set_input_files('input[type=file]', r'D:\zxsy-math-arena\docs\superpowers\plans\题2.png'); page.wait_for_timeout(1100)
    page.fill('.guide__input', '垂直'); page.keyboard.press('Enter'); page.wait_for_timeout(450)
    page.fill('.guide__input', '垂直'); page.keyboard.press('Enter'); page.wait_for_timeout(450)
    page.locator('.guide__choices .guide__choice').nth(1).click(); page.wait_for_timeout(220)
    page.locator('.guide__choices .ms-btn--primary').click(); page.wait_for_timeout(700)
    res['B1_B'] = page.evaluate("""() => { const c = document.querySelector('.guide__chat');
      return { scrollH: document.documentElement.scrollHeight, composer: (() => { const e = document.querySelector('.guide__composer-wrap'); if (!e) return null; const b = e.getBoundingClientRect(); return {y:Math.round(b.y), bottom:Math.round(b.bottom)}; })(),
               chatInnerScroll: c ? (c.scrollHeight > c.clientHeight + 2) : null }; }""")
    shot(page, 'final2-guide-B-multi')

    # 教师工作台 PPT（无回归 + 嘉宾无主持人浮标）
    page.evaluate("() => { location.hash = '#/login' }"); page.wait_for_timeout(600)
    page.locator('.ms-role').nth(1).click(); page.wait_for_timeout(900)
    res['teacher_fab'] = page.evaluate("() => ({hostFab: document.querySelectorAll('.ms-host-fab').length, butler: document.querySelectorAll('.ms-butler').length})")
    page.evaluate("() => { location.hash = '#/teacher/prep/w/prep-ellipse/ppt' }"); page.wait_for_timeout(1600)
    shot(page, 'final2-T05-wb-ppt')
    # 科研 READ（无回归）
    page.evaluate("() => { location.hash = '#/login' }"); page.wait_for_timeout(600)
    page.locator('.ms-role').nth(2).click(); page.wait_for_timeout(900)
    page.evaluate("() => { location.hash = '#/research/read' }"); page.wait_for_timeout(1600)
    shot(page, 'final2-R04-read')
    res['research'] = page.evaluate("""() => ({ hostFab: document.querySelectorAll('.ms-host-fab').length,
        paper: !!document.querySelector('[data-testid=read-paper]'),
        katex: document.querySelectorAll('.katex').length,
        katexErr: document.querySelectorAll('.katex-error').length,
        inlineUnderscore: (document.querySelector('.paper')||{}).innerText ? document.querySelector('.paper').innerText.includes('V_h') : null })""")

    res['errors'] = errs
    res['net'] = page.evaluate('() => window.__net || 0')
    b.close()

print(json.dumps(res, ensure_ascii=False, indent=1))
