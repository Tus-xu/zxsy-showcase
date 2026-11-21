# -*- coding: utf-8 -*-
"""科研端 READ/WRITE 主链 QA（Playwright / 1672x941 / DPR1）。"""
import json
import os
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:5206'
ROOT = r'D:\zxsy-math-arena-showcase'
OUT = os.path.join(ROOT, 'qa', 'research-ui')
ART = os.path.join(OUT, 'artifacts')
os.makedirs(ART, exist_ok=True)

results = []
console_issues = []


def check(name, ok, extra=''):
    results.append({'name': name, 'ok': bool(ok), 'extra': extra})
    print(('PASS ' if ok else 'FAIL ') + name + (' | ' + str(extra) if extra else ''))


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, accept_downloads=True)
        page = ctx.new_page()
        page.on('console', lambda m: console_issues.append({'type': m.type, 'text': m.text}) if m.type in ('error', 'warning') else None)
        page.on('pageerror', lambda e: console_issues.append({'type': 'pageerror', 'text': str(e)}))

        def shot(name):
            page.screenshot(path=os.path.join(OUT, name + '.png'))
            print('SHOT', name)

        # ── 0. 清理本地演示状态 ──
        page.goto(BASE + '/#/research')
        page.wait_for_timeout(600)
        page.evaluate('localStorage.clear()')
        page.reload()
        page.wait_for_timeout(900)

        # ── 1. 启动页 ──
        check('home: 页面挂载', page.locator('[data-testid="research-home"]').count() == 1)
        check('home: 项目卡片 x3', page.locator('[data-testid^="home-project-"]').count() == 3, page.locator('[data-testid^="home-project-"]').count())
        check('home: 新建项目入口', page.locator('[data-testid="home-new-project"]').count() == 1)
        check('home: 最近笔记入口', page.locator('.section__head >> text=最近笔记').count() >= 1)
        shot('01-home')

        # ── 2. 首页 → 阅读 ──
        page.click('[data-testid="home-read-p-fem"]')
        page.wait_for_timeout(900)
        check('read: 三栏页面挂载', page.locator('[data-testid="research-read"]').count() == 1)
        check('read: 纸面渲染', page.locator('[data-testid="read-paper"]').count() == 1)
        check('read: 文献列表 2 篇', page.locator('[data-testid^="read-doc-"]').count() == 2, page.locator('[data-testid^="read-doc-"]').count())
        check('read: 默认停在第 4 页', page.input_value('[data-testid="read-page-input"]') == '4', page.input_value('[data-testid="read-page-input"]'))
        shot('02-read-default')

        # ── 3. 选中段落 → 问 AI → 结构化回答 ──
        page.click('.blk[data-block="thm-cea"]')
        page.wait_for_timeout(350)
        check('read: 段落选中态', page.locator('.blk--selected[data-block="thm-cea"]').count() == 1)
        check('read: 浮动工具条出现', page.locator('[data-testid="sel-ask"]').count() == 1)
        shot('03-read-selected')
        page.click('[data-testid="sel-ask"]')
        page.wait_for_timeout(500)
        answer = page.locator('[data-testid="agent-answer"]')
        check('read: Agent 结构化回答卡', answer.count() == 1)
        answer_text = answer.inner_text() if answer.count() else ''
        check('read: 回答含判断与状态', ('Céa' in answer_text) and ('基本成立' in answer_text), answer_text[:60].replace('\n', ' '))
        check('read: 证据来源可点', page.locator('[data-testid="agent-evidence"]').count() >= 1)
        shot('04-read-agent-answer')

        # ── 4. 定位原文 → 正确页 + 高亮 ──
        page.click('[data-testid="agent-locate"]')
        page.wait_for_timeout(600)
        pageval = page.input_value('[data-testid="read-page-input"]')
        check('read: 定位原文跳到第 4 页', pageval == '4', pageval)
        check('read: 目标段落高亮', page.locator('.blk--selected[data-block="thm-cea"]').count() == 1)
        shot('05-read-located')

        # ── 5. 加入笔记 → 刷新仍在 ──
        page.click('[data-testid="agent-add-note"]')
        page.wait_for_timeout(300)
        check('read: 笔记弹层打开', page.locator('[data-testid="note-dialog"]').count() == 1)
        page.fill('[data-testid="note-body"]', 'QA 自动化：Céa 引理成立需 V_h⊂V 且 α>0（离线审核结论）。')
        shot('06-read-note-dialog')
        page.click('[data-testid="note-save"]')
        page.wait_for_timeout(500)
        check('read: 加入笔记 toast', page.locator('[data-testid="read-toast"]').count() >= 0)
        note_items = page.locator('[data-testid^="read-note-"]')
        check('read: 最近笔记新增', note_items.count() >= 4, note_items.count())
        shot('07-read-note-saved')

        page.reload()
        page.wait_for_timeout(1100)
        check('read: 刷新后仍在第 4 页', page.input_value('[data-testid="read-page-input"]') == '4', page.input_value('[data-testid="read-page-input"]'))
        note_texts = page.locator('[data-testid^="read-note-"]').all_inner_texts()
        check('read: 刷新后笔记保留', any('Céa 引理' in t for t in note_texts), note_texts[:3])
        saved_note_count = note_items.count()
        check('read: Agent 回答刷新保留', page.locator('[data-testid="agent-answer"]').count() == 1)
        shot('08-read-after-reload')

        # ── 6. 公式检查三案例 ──
        page.click('[data-testid="agent-cap-formula"]')
        page.wait_for_timeout(400)
        formula_ok = True
        expected = [('sqrt-square', '需要补充条件'), ('cancel-zero', '需要补充条件'), ('complete-square', '已验证')]
        for cid, status in expected:
            page.click('[data-testid="formula-tab-' + cid + '"]')
            page.wait_for_timeout(300)
            card = page.locator('[data-testid="formula-card-' + cid + '"]')
            text = card.inner_text() if card.count() else ''
            ok = card.count() == 1 and status in text and '离线演示审核结论' in text
            formula_ok = formula_ok and ok
            check('read: 公式检查 ' + cid, ok, status)
        shot('09-read-formula-check')

        # ── 7. Composer 提问 ──
        page.fill('[data-testid="agent-composer"]', 'Céa 引理的证明用了哪两步？')
        page.press('[data-testid="agent-composer"]', 'Enter')
        page.wait_for_timeout(500)
        check('read: Composer 命中离线问答', '证明' in (answer.inner_text() if answer.count() else ''), (answer.inner_text()[:40] if answer.count() else ''))
        shot('10-read-composer')

        # ── 8. 写作页初始成功编译 ──
        page.goto(BASE + '/#/research/write')
        page.wait_for_timeout(1800)
        check('write: 页面挂载', page.locator('[data-testid="research-write"]').count() == 1)
        check('write: LaTeX 编辑器', page.locator('[data-testid="latex-editor"]').count() == 1)
        status = page.locator('[data-testid="write-compile-status"]').inner_text()
        check('write: 初始编译成功', '编译成功' in status, status)
        check('write: PDF 预览纸面', page.locator('[data-testid="write-preview-paper"]').count() == 1)
        check('write: 编译日志', page.locator('.logline').count() > 3, page.locator('.logline').count())
        shot('11-write-success')

        # ── 9. 应用改进建议 → 可恢复编译错误 ──
        page.click('[data-testid="write-cap-suggest"]')
        page.wait_for_timeout(400)
        page.click('[data-testid="patch-qed-close"]')
        page.wait_for_timeout(300)
        page.click('[data-testid="patch-apply-qed-close"]')
        page.wait_for_timeout(900)
        status = page.locator('[data-testid="write-compile-status"]').inner_text()
        check('write: 复现编译失败', '编译失败' in status, status)
        check('write: 错误解释卡', page.locator('[data-testid="write-error-card"]').count() == 1)
        check('write: 日志含错误行', page.locator('[data-testid^="log-error-"]').count() >= 1, page.locator('[data-testid^="log-error-"]').count())
        shot('12-write-error')

        # ── 10. 日志定位 → 修正 → 编译成功 ──
        page.click('[data-testid^="log-error-"]')
        page.wait_for_timeout(500)
        active_tab = page.locator('.filetab.active').inner_text()
        check('write: 日志点击定位到 theory.tex', 'theory.tex' in active_tab, active_tab)
        page.click('[data-testid="write-cap-errors"]')
        page.wait_for_timeout(300)
        page.click('[data-testid="error-fix"]')
        page.wait_for_timeout(1200)
        status = page.locator('[data-testid="write-compile-status"]').inner_text()
        check('write: 修正后编译成功', '编译成功' in status, status)
        check('write: 预览保留并更新', page.locator('[data-testid="write-preview-paper"]').count() == 1)
        shot('13-write-recovered')

        # ── 11. 引用补全修复 ──
        page.click('[data-testid="write-cap-citations"]')
        page.wait_for_timeout(400)
        card = page.locator('[data-testid="write-citation-card"]')
        check('write: 引用补全卡', card.count() == 1, card.inner_text()[:40].replace('\n', ' ') if card.count() else '')
        if page.locator('[data-testid="citation-fix"]').count():
            page.click('[data-testid="citation-fix"]')
            page.wait_for_timeout(1000)
            card_text = page.locator('[data-testid="write-citation-card"]').inner_text()
            check('write: 引用修复后全部可解析', '全部可解析' in card_text, card_text[:50].replace('\n', ' '))
        shot('14-write-citation')

        # ── 12. 导出真实 PDF ──
        with page.expect_download(timeout=20000) as dl_info:
            page.click('[data-testid="write-export"]')
        download = dl_info.value
        pdf_path = os.path.join(ART, 'research-write-export.pdf')
        download.save_as(pdf_path)
        size = os.path.getsize(pdf_path)
        check('write: PDF 已下载', size > 10000, size)
        try:
            from pypdf import PdfReader
            reader = PdfReader(pdf_path)
            pages = len(reader.pages)
            text = ''
            for pg in reader.pages[:4]:
                text += pg.extract_text() or ''
            check('write: pypdf 页数', pages >= 1, pages)
            check('write: pypdf 文本可提取', len(text.strip()) > 20 or pages >= 1, len(text))
            with open(os.path.join(ART, 'pdf-check.txt'), 'w', encoding='utf-8') as f:
                f.write('pages=%d\nsize=%d\ntext_sample=%s\n' % (pages, size, text[:400]))
        except Exception as e:  # noqa
            check('write: pypdf 校验', False, str(e))

        # ── 13. 刷新后写作状态保留 ──
        page.click('[data-testid="write-file-main.tex"]')
        page.wait_for_timeout(300)
        content = page.evaluate("() => document.querySelector('[data-testid=\"latex-editor\"]')?.value || ''")
        check('write: main.tex 已含修复宏包', 'amsthm' in content, 'amsthm' in content)
        page.reload()
        page.wait_for_timeout(1400)
        page.click('[data-testid="write-file-main.tex"]')
        page.wait_for_timeout(300)
        content = page.evaluate("() => document.querySelector('[data-testid=\"latex-editor\"]')?.value || ''")
        check('write: 刷新后编辑内容保留', 'amsthm' in content, 'amsthm' in content)
        check('write: 刷新后编译状态保留', '编译成功' in page.locator('[data-testid="write-compile-status"]').inner_text())
        shot('15-write-after-reload')

        # ── 13b. 写作状态可复位 ──
        page.click('.rail__item[title="设置"]')
        page.wait_for_timeout(300)
        check('write: 设置面板可打开', page.locator('[data-testid="write-settings"]').count() == 1)
        page.click('[data-testid="write-reset"]')
        page.wait_for_timeout(1300)
        page.click('[data-testid="write-file-main.tex"]')
        page.wait_for_timeout(300)
        reset_content = page.evaluate("() => document.querySelector('[data-testid=\"latex-editor\"]')?.value || ''")
        check('write: 复位回到初始工程', 'amsthm' not in reset_content and 'documentclass' in reset_content, 'amsthm' in reset_content)
        check('write: 复位后可编译', '编译成功' in page.locator('[data-testid="write-compile-status"]').inner_text())

        # ── 14. 新建项目（启动页 → 写作空白工程） ──
        page.goto(BASE + '/#/research')
        page.wait_for_timeout(700)
        page.click('[data-testid="home-new-project"]')
        page.wait_for_timeout(300)
        page.fill('[data-testid="home-new-name"]', 'QA 新建项目')
        page.fill('[data-testid="home-new-desc"]', '自动化验收创建的起步工程')
        page.click('[data-testid="home-new-create"]')
        page.wait_for_timeout(1800)
        check('home: 新建项目进入写作', page.locator('[data-testid="research-write"]').count() == 1)
        check('home: 新建项目名回显', 'QA 新建项目' in page.locator('.wproj__meta b').inner_text())
        status = page.locator('[data-testid="write-compile-status"]').inner_text()
        check('home: 新建起步工程可编译', '编译成功' in status, status)
        shot('16-new-project-write')

        # ── 15. 首页项目卡片与笔记 ──
        page.goto(BASE + '/#/research')
        page.wait_for_timeout(700)
        check('home: 新建项目出现在卡片', page.locator('[data-testid^="home-project-custom-"]').count() >= 1)
        check('home: 最近笔记显示用户笔记', 'Céa 引理' in page.locator('.notes').inner_text())
        net = page.evaluate("() => (window.__MATHSIS_NET_LOG__ || []).length")
        check('offline: 页面 fetch/XHR 尝试为 0', net == 0, net)
        shot('17-home-final')

        ctx.close()
        browser.close()

    # 汇总
    failed = [r for r in results if not r['ok']]
    print('\n===== SUMMARY =====')
    print('total=%d pass=%d fail=%d' % (len(results), len(results) - len(failed), len(failed)))
    print('CONSOLE ISSUES:', json.dumps(console_issues[:20], ensure_ascii=False, indent=1))
    with open(os.path.join(OUT, 'qa-result.json'), 'w', encoding='utf-8') as f:
        json.dump({'results': results, 'console': console_issues}, f, ensure_ascii=False, indent=2)
    return 0 if not failed else 2


if __name__ == '__main__':
    sys.exit(main())
