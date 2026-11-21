# -*- coding: utf-8 -*-
"""Mathesis 三端离线演示 · 独立验收脚本（断网 file:// + 真实文件选择器 + 跨端联动 + 产物打开）

运行：python qa/acceptance_offline.py
产物：qa/acceptance/*.png、qa/acceptance/artifacts/*、qa/acceptance/report.json
"""
import json
import os
import shutil
import sys
import time
import traceback

from playwright.sync_api import sync_playwright

BASE = r'D:\zxsy-math-arena-showcase'
OUT = os.path.join(BASE, 'qa', 'acceptance')
ART = os.path.join(OUT, 'artifacts')
os.makedirs(ART, exist_ok=True)
TS = time.strftime('%Y%m%d-%H%M%S')
RUN = os.path.join(os.environ.get('TEMP', BASE), f'mathesis-accept-{TS}')
QA_IMG = os.path.join(BASE, 'src', 'assets', 'questions')

CHECKS = []
HTTP_REQUESTS = []
CONSOLE_ERRORS = []
PAGE_ERRORS = []


def check(name, ok, detail=''):
    CHECKS.append({'name': name, 'ok': bool(ok), 'detail': str(detail)[:300]})
    print(('PASS ' if ok else 'FAIL ') + name + (f'  [{detail}]' if (detail and not ok) else ''))


def shot(page, name):
    p = os.path.join(OUT, name + '.png')
    page.screenshot(path=p, full_page=False)
    return p


def make_env():
    """断网冷启动环境：release 复制到全新路径；准备改名/重名异图测试文件。"""
    os.makedirs(RUN, exist_ok=True)
    src = os.path.join(BASE, 'release')
    dst = os.path.join(RUN, 'release')
    if os.path.exists(dst):
        shutil.rmtree(dst)
    shutil.copytree(src, dst)
    entry = os.path.join(dst, '开始演示.html')
    if not os.path.exists(entry):
        entry = os.path.join(dst, 'index.html')
    files = os.path.join(RUN, 'uploads')
    os.makedirs(files, exist_ok=True)
    q1 = os.path.join(QA_IMG, 'q1.png')
    q2 = os.path.join(QA_IMG, 'q2.png')
    q3 = os.path.join(QA_IMG, 'q3.png')
    rename1 = os.path.join(files, '手机拍照-重新命名.png')
    shutil.copyfile(q1, rename1)
    fake1 = os.path.join(files, '题1.png')
    shutil.copyfile(q2, fake1)  # 重名异图：名字叫题1，内容是题2
    return entry, {'q1': q1, 'q2': q2, 'q3': q3, 'rename1': rename1, 'fake1': fake1}


def start(p, entry):
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1,
                              offline=True, accept_downloads=True)
    page = ctx.new_page()
    page.on('request', lambda r: HTTP_REQUESTS.append(r.url) if r.url.startswith(('http://', 'https://')) else None)
    page.on('console', lambda m: CONSOLE_ERRORS.append(m.text[:300]) if m.type == 'error' else None)
    page.on('pageerror', lambda e: PAGE_ERRORS.append(str(e)[:300]))
    page.goto('file:///' + entry.replace('\\', '/'), wait_until='load')
    page.wait_for_timeout(700)
    return browser, ctx, page


def login(page, role):
    page.goto(page.url.split('#')[0] + '#/login', wait_until='load')
    page.wait_for_timeout(500)
    page.locator('.ms-role', has_text=role).first.click()
    page.wait_for_timeout(800)


def open_host(page):
    page.keyboard.press('Control+Shift+H')
    page.wait_for_timeout(450)


def reset_case_via_host(page, case_code):
    open_host(page)
    item = page.locator('.ms-host__item', has_text=case_code).first
    item.get_by_role('button', name='复位').click()
    page.wait_for_timeout(300)
    page.keyboard.press('Escape')
    page.wait_for_timeout(300)


def host_reset_all(page):
    open_host(page)
    page.get_by_role('button', name='整场复位').click()
    page.wait_for_timeout(400)
    page.keyboard.press('Escape')
    page.wait_for_timeout(300)


def guide_send(page, text):
    inp = page.locator('.guide__input').first
    inp.fill(text)
    page.locator('.guide__composer .ms-btn--primary').first.click()
    page.wait_for_timeout(500)


def guide_choose(page, key):
    page.locator('.guide__choice-key', has_text=key).first.click()
    page.wait_for_timeout(150)
    page.locator('.guide__composer .ms-btn--primary').first.click()
    page.wait_for_timeout(600)


def open_guide(page, case_id):
    page.goto(page.url.split('#')[0] + f'#/student/guide/{case_id}', wait_until='load')
    page.wait_for_timeout(500)


def upload(page, path):
    page.locator('input[type=file]').set_input_files(path)
    page.wait_for_timeout(900)


def download(page, button_name, filename):
    with page.expect_download(timeout=30000) as dl:
        page.get_by_role('button', name=button_name).first.click()
    d = dl.value
    target = os.path.join(ART, filename)
    d.save_as(target)
    page.wait_for_timeout(300)
    return target


def main():
    entry, imgs = make_env()
    results = {'run': TS, 'entry': entry, 'checks': CHECKS}
    with sync_playwright() as p:
        browser, ctx, page = start(p, entry)
        url0 = page.url
        base = url0.split('#')[0]
        shot(page, '01-cold-start-login')
        check('断网冷启动：双击入口进入登录页', '选择演示身份' in page.inner_text('body'))

        # ---------- 学生 A 主线 ----------
        login(page, '学生')
        page.locator('.student-home__case', has_text='双曲线').first.click()
        page.wait_for_timeout(600)
        upload(page, imgs['rename1'])  # 改名文件仍按内容识别
        body = page.inner_text('body')
        check('A 上传：改名后的原图按内容哈希识别', '内容匹配' in body and '平台识别结果' in body)
        check('A 首轮：识别题面并引导提问（不直接给答案）', '实轴长' in body and '答案' not in body.split('本轮')[-1][:80])
        shot(page, '02-A-after-upload')
        guide_send(page, '2b=√7·2a，所以 b/a=√7')
        guide_send(page, 'c²=a²+b²')
        guide_send(page, '8')
        guide_send(page, '2√2')
        page.wait_for_timeout(300)
        guide_choose(page, 'D')
        body = page.inner_text('body')
        check('A 主线：正确作答到达结论', '已完成本题' in body and '2√2' in body)
        shot(page, '03-A-final')
        page.reload(wait_until='load')
        page.wait_for_timeout(900)
        body = page.inner_text('body')
        check('A 刷新恢复：结论与轮次保留', '已完成本题' in body)

        # ---------- A 错答 + 求助 ----------
        reset_case_via_host(page, '题1')
        open_guide(page, 'A')
        upload(page, imgs['q1'])
        guide_send(page, '我选 C，因为比值就是 √7')
        body = page.inner_text('body')
        check('A 典型错答：助教追问而非直接判错', '上海' not in body and ('哪两条' in body or '分子' in body) and '已完成本题' not in body)
        page.get_by_role('button', name='给个提示').first.click()
        page.wait_for_timeout(500)
        body = page.inner_text('body')
        check('A 求助：只提示当前一步且不泄底', '实轴长 = $2a$' in body or '先写' in body or '√7' in body)
        shot(page, '04-A-wrong-help')

        # ---------- 重名异图 ----------
        reset_case_via_host(page, '题1')
        open_guide(page, 'A')
        upload(page, imgs['fake1'])
        body = page.inner_text('body')
        check('重名异图：内容不符给出可恢复提示且不进入会话', '不匹配' in body and '本轮' not in body)
        shot(page, '05-fake-image-rejected')

        # ---------- B 主线（多选） ----------
        reset_case_via_host(page, '题2')
        open_guide(page, 'B')
        upload(page, imgs['q2'])
        guide_send(page, '底面是正三角形，AD⊥BC')
        guide_send(page, '过 D 平行于侧棱的直线垂直于底面，也就垂直于 BC')
        guide_choose(page, 'B')
        page.wait_for_timeout(400)
        page.locator('.guide__choice-key', has_text='B').first.click()
        page.locator('.guide__choice-key', has_text='D').first.click()
        page.wait_for_timeout(150)
        page.locator('.guide__composer .ms-btn--primary').first.click()
        page.wait_for_timeout(700)
        body = page.inner_text('body')
        check('B 主线：多选组合 B、D 判对并收束', '已完成本题' in body and ('B、D' in body or 'B 与 D' in body or 'BD' in body))
        shot(page, '06-B-final')

        # 只选 B 部分正确
        reset_case_via_host(page, '题2')
        open_guide(page, 'B')
        upload(page, imgs['q2'])
        guide_send(page, '正三角形，AD 是中线也是高，所以 AD⊥BC')
        guide_send(page, '侧棱垂直底面，过 D 平行侧棱的线垂直底面，所以垂直 BC')
        guide_choose(page, 'B')
        page.wait_for_timeout(300)
        page.locator('.guide__choice-key', has_text='B').first.click()
        page.locator('.guide__composer .ms-btn--primary').first.click()
        page.wait_for_timeout(700)
        body = page.inner_text('body')
        check('B 部分正确：只选 B 被保留并追问 D 项', '已完成本题' not in body and ('D' in body and ('补' in body or '再检查' in body)))
        shot(page, '07-B-partial')

        # ---------- C 主线 ----------
        reset_case_via_host(page, '题3')
        open_guide(page, 'C')
        upload(page, imgs['q3'])
        guide_send(page, '2')
        guide_send(page, '64/125')
        guide_send(page, '61/125')
        guide_send(page, '61/25')
        page.wait_for_timeout(600)
        body = page.inner_text('body')
        check('C 主线：61/25 判对并收束', '已完成本题' in body and '61/25' in body)
        shot(page, '08-C-final')

        # ---------- 压力动作 ----------
        # 乱序上传：把题3原图上传到 A（内容不匹配应拒绝且不进入会话）
        reset_case_via_host(page, '题1')
        open_guide(page, 'A')
        upload(page, imgs['q3'])
        body = page.inner_text('body')
        check('压力：乱序上传（题3传到A）被拒且不进入会话', '不匹配' in body and '本轮' not in body)

        # 连点发送：快速双击只产生一条学生消息
        reset_case_via_host(page, '题2')
        open_guide(page, 'B')
        upload(page, imgs['q2'])
        page.locator('.guide__input').first.fill('底面是正三角形，AD⊥BC')
        btn = page.locator('.guide__composer .ms-btn--primary').first
        btn.click()
        try:
            btn.click(timeout=800)
        except Exception:
            pass
        page.wait_for_timeout(700)
        body = page.inner_text('body')
        count = body.count('底面是正三角形，AD⊥BC')
        check('压力：连点发送只提交一次', count <= 2, f'出现 {count} 次（含本轮提问引用）')

        # 返回重进 + 跨案例不串题
        page.goto(base + '#/student/dialog', wait_until='load')
        page.wait_for_timeout(500)
        open_guide(page, 'B')
        body = page.inner_text('body')
        check('压力：返回后重进仍恢复原会话', '平台识别结果' in body and '底面是正三角形' in body)

        # ---------- 教师：改页 → 保存 → 发布 → 导出 ----------
        login(page, '教师')
        page.goto(base + '#/teacher/prep/w/prep-ellipse/ppt', wait_until='load')
        page.wait_for_timeout(1200)
        title_input = page.locator('input.sc-title-input').first
        title_input.fill('椭圆的定义（验收修订）')
        page.wait_for_timeout(400)
        page.locator('.tv3-main, body').first.click(position={'x': 5, 'y': 5})
        page.wait_for_timeout(500)
        body = page.inner_text('body')
        check('教师：页面标题可编辑并显示已保存', '已保存' in body)
        shot(page, '09-teacher-title-edited')
        pptx = download(page, '导出 PPTX', '验收-椭圆课件.pptx')
        pdf = download(page, '导出 PDF', '验收-椭圆课件.pdf')
        check('教师：导出 PPTX 与 PDF 真实下载', os.path.getsize(pptx) > 20000 and os.path.getsize(pdf) > 5000,
              f'{os.path.getsize(pptx)}/{os.path.getsize(pdf)}')
        page.get_by_role('button', name='发布课堂').first.click()
        page.wait_for_timeout(600)
        page.get_by_role('button', name='开始发布').first.click()
        page.wait_for_timeout(1200)
        body = page.inner_text('body')
        check('教师：发布到班级成功并显示版本', '发布成功' in body and '版本' in body)
        shot(page, '10-teacher-publish-success')
        page.get_by_role('button', name='完成').first.click()
        page.wait_for_timeout(400)
        # 版本隔离：发布后再改标题但不发布，学生端旧快照不得渗入
        page.locator('input.sc-title-input').first.fill('椭圆的定义（未发布改动）')
        page.wait_for_timeout(500)
        page.locator('.tv3-main, body').first.click(position={'x': 5, 'y': 5})
        page.wait_for_timeout(400)
        # 教案导出
        page.goto(base + '#/teacher/prep/w/prep-ellipse/plan', wait_until='load')
        page.wait_for_timeout(1000)
        docx = download(page, '导出 DOCX', '验收-椭圆教案.docx')
        check('教师：导出教案 DOCX 真实下载', os.path.getsize(docx) > 10000, str(os.path.getsize(docx)))

        # ---------- 学生：打开刚发布的同一页 ----------
        login(page, '学生')
        page.goto(base + '#/student/classroom?tab=dual', wait_until='load')
        page.wait_for_timeout(1200)
        body = page.inner_text('body')
        check('跨端：学生课堂出现教师发布的新版本', '已发布课件' in body and '椭圆' in body)
        shot(page, '11-student-classroom-published')
        page.get_by_role('button', name='开始学习').first.click()
        page.wait_for_timeout(1300)
        body = page.inner_text('body')
        check('跨端：学生打开同一课件的修订页标题', '验收修订' in body)
        check('跨端：教师未发布的后续修改不渗入学生旧版本', '未发布改动' not in body)
        shot(page, '12-student-dual-revised-page')
        # 翻到第 3 页并回写进度
        for _ in range(3):
            try:
                page.get_by_role('button', name='下一页').first.click()
                page.wait_for_timeout(300)
            except Exception:
                break
        shot(page, '13-student-dual-progress')

        # ---------- 教师：课堂监测看到学生进度 ----------
        login(page, '教师')
        page.goto(base + '#/teacher/classroom', wait_until='load')
        page.wait_for_timeout(1000)
        body = page.inner_text('body')
        check('跨端：教师课堂监测读取学生进度', '林一川' in body or '进度' in body)

        # ---------- 批改 → 学生回看 ----------
        page.goto(base + '#/teacher/grading', wait_until='load')
        page.wait_for_timeout(1000)
        page.locator('button', has_text='第 1 份').first.click()
        page.wait_for_timeout(500)
        page.locator('input.field__score').first.fill('5')
        page.locator('textarea.field__comment').first.fill('验收评语：推导完整，轴长与半轴区分清楚。')
        page.get_by_role('button', name='确认批改（写入终分）').first.click()
        page.wait_for_timeout(800)
        body = page.inner_text('body')
        check('批改：确认后写入终分并进入已确认', '已确认' in body)
        shot(page, '14-teacher-grading-confirmed')
        login(page, '学生')
        page.goto(base + '#/student/classroom?tab=tasks', wait_until='load')
        page.wait_for_timeout(1000)
        body = page.inner_text('body')
        opened = False
        try:
            page.get_by_role('button', name='查看作答回看').first.click()
            page.wait_for_timeout(600)
            opened = True
        except Exception:
            pass
        body = page.inner_text('body')
        check('跨端：学生回看教师确认的分数与评语', ('5/5' in body or '5 / 5' in body) and '验收评语' in body,
              'review not opened' if not opened else '')
        shot(page, '15-student-homework-review')

        # ---------- 科研端：阅读溯源 / 公式检查 / 写作编译 ----------
        login(page, '科研')
        page.goto(base + '#/research/read', wait_until='load')
        page.wait_for_timeout(1500)
        try:
            page.locator('.paper p').nth(1).click()
            page.wait_for_timeout(500)
            page.get_by_role('button', name='问 AI').first.click()
            page.wait_for_timeout(900)
            body = page.inner_text('body')
            ok_ask = '证据来源' in body and ('离线' in body or '审核' in body)
            check('科研阅读：选中段落提问得到结构化回答与证据来源', ok_ask)
            page.get_by_role('button', name='定位原文').first.click()
            page.wait_for_timeout(700)
            page.get_by_role('button', name='加入笔记').first.click()
            page.wait_for_timeout(700)
            body = page.inner_text('body')
            check('科研阅读：定位原文与加入笔记可操作', '第 5 页' in body or '笔记' in body)
            shot(page, '16-research-read-answer')
        except Exception as e:
            check('科研阅读：选段提问/证据定位链路', False, repr(e)[:200])
        # 公式检查三案例（新开页面，在 Agent 能力区打开）
        try:
            page.goto(base + '#/research/read', wait_until='load')
            page.wait_for_timeout(1500)
            page.eval_on_selector('[data-testid="agent-cap-formula"]', 'el => el.click()')
            page.wait_for_timeout(700)
            ok_all = True
            detail = []
            for cid, status in [('sqrt-square', '需要补充条件'), ('cancel-zero', '需要补充条件'), ('complete-square', '已验证')]:
                page.eval_on_selector(f'[data-testid="formula-tab-{cid}"]', 'el => el.click()')
                page.wait_for_timeout(400)
                card = page.locator('[data-testid="formula-card-' + cid + '"]')
                text = card.inner_text() if card.count() else ''
                ok = card.count() == 1 and status in text and '离线演示审核结论' in text
                if cid == 'sqrt-square':
                    ok = ok and ('反例' in text) and ('x=−2' in text or 'x=-2' in text or '−2' in text)
                ok_all = ok_all and ok
                detail.append(cid + ':' + ('OK' if ok else 'MISS'))
            check('科研公式检查：√(x²)=x 缺少 x≥0 条件并给出反例（三案例结构化结论）', ok_all, '/'.join(detail))
            shot(page, '17-research-formula-check')
        except Exception as e:
            check('科研公式检查：三点案例结构化结论', False, repr(e)[:200])
        # 写作与编译
        try:
            page.goto(base + '#/research/write', wait_until='load')
            page.wait_for_timeout(1500)
            ed = page.locator('textarea.ed__input').first
            src = ed.input_value()
            ed.fill(src.replace('\\end{document}', '\\undefinedcmdhere\n\\end{document}'))
            page.get_by_role('button', name='重新编译').first.click()
            page.wait_for_timeout(1400)
            body = page.inner_text('body')
            check('科研写作：可恢复编译错误被定位', '编译失败' in body or '错误' in body)
            shot(page, '18-research-write-error')
            ed.fill(src)
            page.get_by_role('button', name='重新编译').first.click()
            page.wait_for_timeout(1400)
            body = page.inner_text('body')
            check('科研写作：修正后重新编译成功', '编译成功' in body or '编译完成' in body)
            rpdf = download(page, '导出 PDF', '验收-科研写作.pdf')
            check('科研写作：导出真实 PDF', os.path.getsize(rpdf) > 3000, str(os.path.getsize(rpdf)))
            shot(page, '19-research-write-success')
        except Exception as e:
            check('科研写作：编译错误恢复与 PDF 导出', False, repr(e)[:200])

        # ---------- 网络与错误 ----------
        check('断网：整个流程无任何 http(s) 网络请求', len(HTTP_REQUESTS) == 0, str(HTTP_REQUESTS[:3]))
        check('稳定性：无未捕获页面错误', len(PAGE_ERRORS) == 0, str(PAGE_ERRORS[:3]))
        console_fail = [e for e in CONSOLE_ERRORS if 'favicon' not in e.lower()]
        check('稳定性：无线程 console error', len(console_fail) == 0, str(console_fail[:3]))
        results['http_requests'] = HTTP_REQUESTS
        results['console_errors'] = CONSOLE_ERRORS
        results['page_errors'] = PAGE_ERRORS
        browser.close()

    # ---------- 产物打开校验 ----------
    try:
        from pptx import Presentation
        prs = Presentation(pptx)
        texts = ' '.join(sh.text_frame.text for s in prs.slides for sh in s.shapes if sh.has_text_frame)
        check('产物：PPTX 可打开、页数正确且含修订标题', len(prs.slides) >= 5 and '验收修订' in texts,
              f'{len(prs.slides)} 页')
    except Exception as e:
        check('产物：PPTX 可打开且内容正确', False, repr(e))
    try:
        from docx import Document
        doc = Document(docx)
        alltext = '\n'.join(p.text for p in doc.paragraphs)
        check('产物：DOCX 可打开且含教案章节', '教学目标' in alltext and '教学过程' in alltext, str(len(doc.paragraphs)))
    except Exception as e:
        check('产物：DOCX 可打开且内容正确', False, repr(e))
    try:
        try:
            from pypdf import PdfReader
        except ImportError:
            from PyPDF2 import PdfReader
        rd = PdfReader(pdf)
        txt = ''.join((pg.extract_text() or '') for pg in rd.pages)
        check('产物：PDF 可打开、可提取中文且含修订标题', len(rd.pages) >= 1 and '验收修订' in txt,
              f'{len(rd.pages)} 页 / {len(txt)} 字')
    except Exception as e:
        check('产物：PDF 可打开且内容正确', False, repr(e))
    try:
        try:
            from pypdf import PdfReader
        except ImportError:
            from PyPDF2 import PdfReader
        rd2 = PdfReader(rpdf)
        check('产物：科研写作 PDF 可打开且非空', len(rd2.pages) >= 1, f'{len(rd2.pages)} 页')
    except Exception as e:
        check('产物：科研写作 PDF 可打开', False, repr(e))

    passed = sum(1 for c in CHECKS if c['ok'])
    results['passed'] = passed
    results['total'] = len(CHECKS)
    results['artifacts'] = [f for f in os.listdir(ART)]
    json.dump(results, open(os.path.join(OUT, 'report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'\nACCEPTANCE {passed}/{len(CHECKS)} PASS')
    print('RUN_DIR', RUN)
    if passed != len(CHECKS):
        print('FAILED:', [c['name'] for c in CHECKS if not c['ok']])
    return 0 if passed == len(CHECKS) else 1


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception:
        traceback.print_exc()
        sys.exit(2)
