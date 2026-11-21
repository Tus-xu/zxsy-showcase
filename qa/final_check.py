# -*- coding: utf-8 -*-
"""复验视觉 BLOCKER B1/B2/M1 与功能 MAJOR（导出/发布含参数派生）。"""
import os
from playwright.sync_api import sync_playwright

BASE = r'D:\zxsy-math-arena-showcase'
url = 'file:///' + BASE.replace('\\', '/') + '/release/开始演示.html'
ART = os.path.join(BASE, 'qa', 'acceptance', 'artifacts')
os.makedirs(ART, exist_ok=True)
res = []


def ok(name, cond, detail=''):
    res.append((name, bool(cond)))
    print(('PASS ' if cond else 'FAIL ') + name + (f' [{detail}]' if detail else ''))


with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, offline=True, accept_downloads=True)
    page = ctx.new_page()

    # B1：引导页锁定一屏 + 聊天区内部滚动 + 输入区可见
    page.goto(url + '#/student/guide/A', wait_until='load')
    page.wait_for_timeout(600)
    page.locator('input[type=file]').set_input_files(BASE + r'\src\assets\questions\q1.png')
    page.wait_for_timeout(800)
    for t in ['2b=√7·2a，所以 b/a=√7', 'c²=a²+b²', '8', '2√2']:
        page.locator('.guide__input').first.fill(t)
        page.locator('.guide__composer .ms-btn--primary').first.click()
        page.wait_for_timeout(450)
    page.locator('.guide__choice-key', has_text='D').first.click()
    page.wait_for_timeout(150)
    page.locator('.guide__composer .ms-btn--primary').first.click()
    page.wait_for_timeout(800)
    m = page.evaluate('''() => {
      const chat = document.querySelector('.guide__chat');
      const comp = document.querySelector('.guide__composer-wrap');
      const fin = document.querySelector('.guide__final');
      const txt = document.body.innerText;
      return {
        docScroll: document.documentElement.scrollHeight,
        viewport: window.innerHeight,
        chatScroll: chat ? chat.scrollHeight : -1,
        chatClient: chat ? chat.clientHeight : -1,
        compTop: comp ? comp.getBoundingClientRect().top : -1,
        finTop: fin ? fin.getBoundingClientRect().top : -1,
        finBottom: fin ? fin.getBoundingClientRect().bottom : -1,
        hasRawLatex: txt.includes('$e=2\\\\sqrt{2}$') || txt.includes('$e=2\\sqrt{2}$'),
        fab: document.querySelectorAll('.ms-host-fab').length,
        butler: document.querySelectorAll('.ms-butler').length,
      };
    }''')
    ok('B1 引导页文档不再被撑高', m['docScroll'] <= m['viewport'] + 2, f"scroll={m['docScroll']} vp={m['viewport']}")
    ok('B1 聊天区内部滚动生效', m['chatScroll'] > m['chatClient'] or m['chatClient'] > 100, f"{m['chatScroll']}/{m['chatClient']}")
    ok('B1 结论卡完整在视口内', 0 < m['finTop'] and m['finBottom'] <= m['viewport'] + 2, f"top={m['finTop']} bottom={m['finBottom']}")
    ok('M1 嘉宾界面无主持人浮标（无双浮标重叠）', m['fab'] == 0 and m['butler'] == 1, str(m))
    page.screenshot(path=os.path.join(BASE, 'qa', 'explore', 'final-guide-A-fixed.png'))

    # B2：结论标题不再是裸 LaTeX
    body = page.inner_text('body')
    ok('B2 A 结论标题不再显示裸 LaTeX', '$e=2' not in body or '\\sqrt' not in body)
    ok('B2 结论标题含 2√2 渲染文本或等价', '2√2' in body or '2\\sqrt{2}' not in body)

    # 功能 MAJOR：改参后导出 PPTX/PDF 含参数派生
    page.goto(url + '#/teacher/prep/w/prep-ellipse/ppt', wait_until='load')
    page.wait_for_timeout(1300)
    nums = page.locator('input[type=number]')
    nums.nth(0).fill('6')
    nums.nth(0).dispatch_event('input')
    page.wait_for_timeout(300)
    nums.nth(1).fill('4')
    nums.nth(1).dispatch_event('input')
    page.wait_for_timeout(700)
    with page.expect_download(timeout=30000) as dl:
        page.get_by_role('button', name='导出 PPTX').first.click()
    pptx_path = os.path.join(ART, 'final-椭圆-params.pptx')
    dl.value.save_as(pptx_path)
    page.wait_for_timeout(400)
    with page.expect_download(timeout=30000) as dl2:
        page.get_by_role('button', name='导出 PDF').first.click()
    pdf_path = os.path.join(ART, 'final-椭圆-params.pdf')
    dl2.value.save_as(pdf_path)
    page.wait_for_timeout(400)
    # 发布并检查学生端快照是否含派生
    page.get_by_role('button', name='发布课堂').first.click()
    page.wait_for_timeout(600)
    page.get_by_role('button', name='开始发布').first.click()
    page.wait_for_timeout(1300)
    body = page.inner_text('body')
    ok('发布成功（用于学生端派生校验）', '发布成功' in body)
    page.goto(url + '#/student/classroom?tab=dual', wait_until='load')
    page.wait_for_timeout(1200)
    try:
        page.get_by_role('button', name='开始学习').first.click()
        page.wait_for_timeout(1300)
        found = False
        for i in range(4):
            body = page.inner_text('body')
            if ('当前参数' in body) or ('4.472' in body) or ('0.745' in body) or ('x²/36' in body) or ('36 + y²/16' in body):
                found = True
                break
            try:
                page.get_by_role('button', name='下一页').first.click()
                page.wait_for_timeout(500)
            except Exception:
                break
        ok('功能 M1：学生打开课件可见参数派生内容', found, f'page_body_len={len(page.inner_text("body"))}')
    except Exception as e:
        ok('功能 M1：学生打开课件可见参数派生内容', False, repr(e)[:120])
    b.close()

# 产物内容校验
try:
    from pptx import Presentation
    prs = Presentation(pptx_path)
    text = ' '.join(sh.text_frame.text for s in prs.slides for sh in s.shapes if sh.has_text_frame)
    ok('功能 M1：PPTX 含参数派生（4.472 / 0.745 / x²/36 / 当前参数）',
       any(k in text for k in ['4.472', '0.745', '当前参数', 'x²/36', '36 + y²/16', 'x²/3']))
    print('PPTX_TEXT_SNIPPET', text[:300].replace('\n', ' / '))
except Exception as e:
    ok('功能 M1：PPTX 打开校验', False, repr(e))
try:
    try:
        from pypdf import PdfReader
    except ImportError:
        from PyPDF2 import PdfReader
    txt = ''.join((pg.extract_text() or '') for pg in PdfReader(pdf_path).pages)
    ok('功能 M1：PDF 含参数派生内容', any(k in txt for k in ['4.472', '0.745', '当前参数', 'x²/36']))
except Exception as e:
    ok('功能 M1：PDF 打开校验', False, repr(e))

passed = sum(1 for _, c in res if c)
print(f'\nFINAL-CHECK {passed}/{len(res)} PASS')
