# -*- coding: utf-8 -*-
"""最终包补齐：引导 A 结论（新数据：需再答 2√2）、科研 READ 选中/AI 回答、WRITE 默认编译态。"""
import json
import os

from playwright.sync_api import sync_playwright

URL = 'file:///D:/zxsy-math-arena-showcase/release/index.html'
OUT = r'D:\zxsy-math-arena-showcase\qa\review-visual\shots'
Q = {'A': r'D:\zxsy-math-arena\docs\superpowers\plans\题1.png'}

issues = []


def shot(page, name, full=False):
    page.mouse.move(3, 3)
    page.wait_for_timeout(260)
    page.evaluate('() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur() }')
    page.wait_for_timeout(60)
    page.screenshot(path=os.path.join(OUT, name + '.png'), full_page=full)


JS_LAYOUT = r"""() => {
  const b = (s) => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect();
    return { y: Math.round(r.y), h: Math.round(r.height) }; };
  return { scrollH: document.documentElement.scrollHeight, innerH: innerHeight, scrollY: Math.round(scrollY),
    composer: b('.guide__composer-wrap'), chat: b('.guide__chat'), final: b('.guide__final'), guide: b('.guide') };
}"""

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, locale='zh-CN', timezone_id='Asia/Shanghai')
    page = ctx.new_page()
    page.goto(URL, wait_until='load'); page.wait_for_timeout(1200)
    page.evaluate('() => localStorage.clear()'); page.reload(wait_until='load'); page.wait_for_timeout(1300)

    # ============ 学生 A 主线（按最终数据：8 -> 2√2 -> 单选 D） ============
    page.locator('.ms-role').nth(0).click(); page.wait_for_timeout(800)
    page.evaluate("() => { location.hash = '#/student/guide/A' }"); page.wait_for_timeout(900)
    page.set_input_files('input[type=file]', Q['A']); page.wait_for_timeout(1300)
    try:
        page.fill('.guide__input', '2b=√7·2a，所以 b/a=√7'); page.keyboard.press('Enter'); page.wait_for_timeout(700)
        page.fill('.guide__input', 'c²=a²+b²'); page.keyboard.press('Enter'); page.wait_for_timeout(700)
        page.fill('.guide__input', '8'); page.keyboard.press('Enter'); page.wait_for_timeout(700)
        print('after 8:', json.dumps(page.evaluate(JS_LAYOUT), ensure_ascii=False))
        shot(page, 'S04c-guide-A-e2')
        page.fill('.guide__input', '2√2'); page.keyboard.press('Enter'); page.wait_for_timeout(800)
        print('after 2√2:', json.dumps(page.evaluate(JS_LAYOUT), ensure_ascii=False))
        shot(page, 'S04d-guide-A-choice')
        page.locator('.guide__choices .guide__choice').nth(3).click(); page.wait_for_timeout(300)
        page.locator('.guide__choices .ms-btn--primary').click(); page.wait_for_timeout(1300)
        print('final:', json.dumps(page.evaluate(JS_LAYOUT), ensure_ascii=False))
        shot(page, 'S05-guide-A-final')
        # 复核：结论标题是否仍为原始 LaTeX
        h3 = page.locator('.guide__final h3')
        print('final title text:', h3.inner_text() if h3.count() else 'NONE')
        page.evaluate('() => window.scrollTo(0, document.documentElement.scrollHeight)')
        page.wait_for_timeout(400)
        shot(page, 'S05c-guide-A-final-scrolled')
        # 变式
        try:
            page.locator('button:has-text("举一反三")').first.click(); page.wait_for_timeout(900)
            shot(page, 'S05b-guide-A-variant')
        except Exception as e:  # noqa: BLE001
            issues.append('variant: ' + str(e)[:200])
    except Exception as e:  # noqa: BLE001
        issues.append('guide A: ' + str(e)[:400])

    # ============ 科研端 READ 选中段落 + 问 AI ============
    page.evaluate("() => { location.hash = '#/login' }"); page.wait_for_timeout(600)
    page.locator('.ms-role').nth(2).click(); page.wait_for_timeout(900)
    try:
        page.locator('[data-testid="home-goto-read"]').click(); page.wait_for_timeout(1800)
        shot(page, 'R04-read-default')
        # 点选含“定理”的段落
        blk = page.locator('.paper .blk').filter(has_text='定理').first
        print('blocks with 定理:', page.locator('.paper .blk').filter(has_text='定理').count())
        blk.click(); page.wait_for_timeout(600)
        shot(page, 'R05-read-selected')
        page.locator('[data-testid="sel-ask"]').click(); page.wait_for_timeout(1200)
        shot(page, 'R06-read-agent')
    except Exception as e:  # noqa: BLE001
        issues.append('read: ' + str(e)[:400])

    # ============ 科研端 WRITE 默认编译态 ============
    try:
        page.evaluate("() => { location.hash = '#/research' }"); page.wait_for_timeout(900)
        page.locator('[data-testid="home-goto-write"]').click(); page.wait_for_timeout(2600)
        shot(page, 'R07-write-default')
        shot(page, 'R07-write-default-full', full=True)
        print('write status:', page.locator('[data-testid="write-compile-status"]').inner_text())
    except Exception as e:  # noqa: BLE001
        issues.append('write: ' + str(e)[:400])

    # ============ 书库 Tab 检查 + 顶部导航检查（科研启动页） ============
    page.evaluate("() => { location.hash = '#/login' }"); page.wait_for_timeout(600)
    page.locator('.ms-role').nth(0).click(); page.wait_for_timeout(800)
    page.evaluate("() => { location.hash = '#/student/library' }"); page.wait_for_timeout(1200)
    print('library tabs:', page.locator('.lib-tabs .lib-tab').all_inner_texts())
    print('library has 我的题库:', '我的题库' in page.locator('body').inner_text())

    b.close()

print('issues:', json.dumps(issues, ensure_ascii=False)[:2000])
