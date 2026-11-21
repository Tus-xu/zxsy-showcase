"""教师端 · 批改 / 课堂监测 / 学情 / 题库 / 资源 / 作业发布 验收脚本。

运行：先启动 `pnpm exec vite --port 5204`，再执行
    python qa/teacher-grading/acceptance.py
截图输出：qa/teacher-grading/*.png（1672x941，DPR 1）
"""
import json
import os
import pathlib
import re
import sys
import time
from datetime import datetime

from playwright.sync_api import sync_playwright

try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:  # noqa: BLE001
    pass

BASE = os.environ.get('QA_BASE', 'http://127.0.0.1:5204')
OUT = pathlib.Path(__file__).resolve().parent
STORE_KEY = 'mathesis-showcase-v1'

checks = []
failures = []


def check(name, cond, detail=''):
    cond = bool(cond)
    checks.append((name, cond, detail))
    line = ('PASS ' if cond else 'FAIL ') + name
    if detail:
        line += ' :: ' + str(detail)[:400]
    print(line)
    if not cond:
        failures.append(name)


def read_store(page):
    raw = page.evaluate("(key) => localStorage.getItem(key)", STORE_KEY)
    return json.loads(raw) if raw else None


def wait_store(page, predicate, desc, timeout_ms=4000):
    deadline = time.time() + timeout_ms / 1000
    last = None
    while time.time() < deadline:
        last = read_store(page)
        if last is not None:
            try:
                if predicate(last):
                    return last
            except Exception as exc:  # noqa: BLE001
                last = {'_error': str(exc)}
        page.wait_for_timeout(120)
    raise AssertionError(f'等待本地状态超时：{desc}，最后状态片段：{str(last)[:300]}')


def write_store(page, state):
    page.evaluate(
        "([key, raw]) => localStorage.setItem(key, raw)",
        [STORE_KEY, json.dumps(state, ensure_ascii=False)],
    )

def shot(page, name):
    path = OUT / name
    page.screenshot(path=str(path), full_page=False)
    print('SHOT', path.name)


def iso_ok(value):
    if not isinstance(value, str):
        return False
    try:
        datetime.fromisoformat(value.replace('Z', '+00:00'))
        return True
    except ValueError:
        return False


def boot(context, page):
    page.goto(BASE + '/#/login')
    page.wait_for_timeout(350)
    page.evaluate("(key) => localStorage.removeItem(key)", STORE_KEY)
    page.reload()
    page.wait_for_selector('.ms-role')
    page.locator('.ms-role', has_text='教师').click()
    page.wait_for_function("() => location.hash.includes('/teacher/prep')")
    wait_store(page, lambda s: True, '初始状态持久化')
    # 等待防抖持久化落盘
    page.wait_for_timeout(400)


def goto(page, route, testid):
    page.goto(BASE + '/#' + route)
    page.wait_for_selector(f'[data-testid="{testid}"]')
    page.wait_for_timeout(350)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1)
        page = context.new_page()

        console_errors = []
        page_errors = []
        requests = []
        page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
        page.on('pageerror', lambda exc: page_errors.append(str(exc)))
        page.on('request', lambda req: requests.append(req.url))

        boot(context, page)

        # ================= 1. 批改工作台 =================
        goto(page, '/teacher/grading', 'grading-page')
        check('批改页加载', page.locator('[data-testid="grading-page"]').count() == 1)
        check('队列含 3 份提交', page.locator('.queue__item').count() == 3)
        check('初始无已确认', '0' in page.locator('.grad__stat').first.inner_text())

        page.get_by_test_id('queue-item-sub-B').click()
        page.wait_for_timeout(250)
        suggestion = page.get_by_test_id('grading-suggestion-score').inner_text().strip()
        check('sub-B 系统建议为 2 分', suggestion == '2', suggestion)
        review_text = page.get_by_test_id('grading-review').inner_text()
        check('sub-B 建议明确结论错误，不暗示满分', '结论错误' in review_text or '存在缺陷' in review_text)
        check('sub-B 满分 5', '/ 5' in page.get_by_test_id('grading-suggestion').inner_text())
        score_input = page.get_by_test_id('grading-score-input')
        check('终评输入默认取系统建议 2', score_input.input_value() == '2', score_input.input_value())
        shot(page, '01-grading-sub-b-draft.png')

        score_input.fill('2.5')
        page.get_by_test_id('grading-comment-input').fill(
            '第 2 步没有把“出现过的号码种数”转化为指示变量；结论 3 是抽取次数而不是 E(X)。给 2.5 分部分分，讲评时重讲 X 的含义。'
        )
        shot(page, '02-grading-sub-b-filled.png')
        page.get_by_test_id('grading-confirm').click()
        page.wait_for_selector('[data-testid="grading-confirmed-state"]')
        check('sub-B 确认后出现已确认状态', '已确认' in page.get_by_test_id('grading-confirmed-state').inner_text())

        st = wait_store(page, lambda s: 'sub-B' in s.get('teacher', {}).get('grading', {}).get('grades', {}), 'sub-B 批改写入')
        grade = st['teacher']['grading']['grades']['sub-B']
        check(
            'sub-B grade 契约字段完整',
            set(grade.keys()) == {'score', 'comment', 'confirmed', 'gradedAt'},
            list(grade.keys()),
        )
        check('sub-B 终评 2.5', grade.get('score') == 2.5, grade.get('score'))
        check('sub-B confirmed === true', grade.get('confirmed') is True)
        check('sub-B 评语已写入', bool(grade.get('comment')) and '指示变量' in grade.get('comment', ''))
        check('sub-B gradedAt 为 ISO 字符串', iso_ok(grade.get('gradedAt')), grade.get('gradedAt'))
        check('sub-B 队列状态已确认', '已确认' in page.get_by_test_id('queue-item-sub-B').inner_text())

        page.reload()
        page.wait_for_selector('[data-testid="grading-page"]')
        page.wait_for_timeout(400)
        check('刷新后 sub-B 队列仍为已确认', '已确认' in page.get_by_test_id('queue-item-sub-B').inner_text())
        page.get_by_test_id('queue-item-sub-B').click()
        page.wait_for_timeout(250)
        check('刷新后 sub-B 终评回显 2.5', page.get_by_test_id('grading-score-input').input_value() == '2.5')
        check('刷新后已确认状态仍在', page.locator('[data-testid="grading-confirmed-state"]').count() == 1)
        shot(page, '03-grading-sub-b-after-reload.png')

        # 覆盖另外两份：完整正确 / 漏条件
        page.get_by_test_id('queue-item-sub-A').click()
        page.wait_for_timeout(250)
        check('sub-A 系统建议 5 分', page.get_by_test_id('grading-suggestion-score').inner_text().strip() == '5')
        page.get_by_test_id('grading-comment-input').fill('推导完整，轴长与半轴区分清楚，e=2√2 选 D，满分。')
        page.get_by_test_id('grading-confirm').click()
        page.wait_for_timeout(200)
        page.get_by_test_id('queue-item-sub-C').click()
        page.wait_for_timeout(250)
        check('sub-C 系统建议 2 分', page.get_by_test_id('grading-suggestion-score').inner_text().strip() == '2')
        page.get_by_test_id('grading-comment-input').fill('B 项判定正确；D 项漏判“面内平行线 + 线不在面内”两步，A 项不能凭图判断。')
        page.get_by_test_id('grading-confirm').click()
        page.wait_for_timeout(250)
        st = wait_store(
            page,
            lambda s: all(k in s['teacher']['grading']['grades'] for k in ('sub-A', 'sub-B', 'sub-C')),
            '三份批改写入',
        )
        grades = st['teacher']['grading']['grades']
        check('三份全部已确认', all(g.get('confirmed') is True for g in grades.values()))
        check('sub-A 满分 5', grades['sub-A']['score'] == 5, grades['sub-A']['score'])
        check('sub-C 终评 2（仅 B 项分）', grades['sub-C']['score'] == 2, grades['sub-C']['score'])
        check('三份均无未确认键', set(grades.keys()) == {'sub-A', 'sub-B', 'sub-C'})
        check('已确认计数 = 3', '3' in page.locator('.grad__stat').first.inner_text())
        shot(page, '04-grading-all-confirmed.png')

        # 模拟学生端读取：同一浏览器上下文另开页面（共享 localStorage）
        student_page = context.new_page()
        student_page.goto(BASE + '/#/student/dialog')
        student_page.wait_for_timeout(600)
        student_grades = student_page.evaluate(
            "(key) => JSON.parse(localStorage.getItem(key)).teacher.grading.grades", STORE_KEY
        )
        check('另开学生页读到 sub-A 分数与评语', student_grades['sub-A']['score'] == 5 and '推导完整' in student_grades['sub-A']['comment'])
        check('学生端读取形状为 {score, comment, confirmed, gradedAt}', set(student_grades['sub-B'].keys()) == {'score', 'comment', 'confirmed', 'gradedAt'})
        student_page.screenshot(path=str(OUT / '05-student-page-after-grading.png'))
        print('SHOT 05-student-page-after-grading.png')
        student_page.close()

        # ================= 2. 课堂监测 =================
        goto(page, '/teacher/classroom', 'teacher-classroom')
        check('课堂页加载', page.locator('[data-testid="teacher-classroom"]').count() == 1)
        check('空态明确显示“暂无学生打开”', page.get_by_test_id('classroom-no-student-opened').inner_text().find('暂无学生打开') >= 0)
        check('无发布记录显示“暂无已发布课件”', page.get_by_test_id('classroom-no-publish').inner_text().find('暂无已发布课件') >= 0)
        shot(page, '06-classroom-empty.png')

        page.wait_for_timeout(400)
        state = read_store(page)
        now = int(time.time() * 1000)
        state['teacher']['publish']['records'] = [
            {
                'id': 'pub-demo-ellipse',
                'deckId': 'deck-ellipse',
                'deckTitle': '椭圆及其标准方程',
                'className': '高二 (1) 班',
                'version': 2,
                'publishedAt': now - 3600 * 1000,
                'editor': '张老师',
                'slides': [{'id': f's{i}', 'title': f'第 {i} 页'} for i in range(1, 7)],
                'meta': {
                    'sessionId': 'prep-ellipse',
                    'textbook': '人教A版 · 选择性必修第二册',
                    'className': '高二 (1) 班',
                    'duration': '45 分钟',
                    'versionLabel': 'v2',
                },
            },
            {
                'id': 'pub-demo-quadratic',
                'deckId': 'deck-quadratic',
                'deckTitle': '二次函数与配方法',
                'className': '高一 (3) 班',
                'version': 1,
                'publishedAt': now - 7200 * 1000,
                'editor': '张老师',
                'slides': [{'id': f's{i}', 'title': f'第 {i} 页'} for i in range(1, 6)],
                'meta': {'sessionId': 'prep-quadratic', 'className': '高一 (3) 班', 'versionLabel': 'v1'},
            },
        ]
        state['student']['classroom'] = {
            'opened': [
                {
                    'recordId': 'pub-demo-ellipse',
                    'deckId': 'deck-ellipse',
                    'deckTitle': '椭圆及其标准方程',
                    'className': '高二 (1) 班',
                    'version': 'v2',
                    'source': 'published',
                    'at': now - 300 * 1000,
                }
            ],
            'progress': {
                'deck-ellipse': {
                    'page': 4,
                    'total': 6,
                    'pct': 67,
                    'updatedAt': now - 60 * 1000,
                    'openedAt': now - 300 * 1000,
                    'recordId': 'pub-demo-ellipse',
                    'title': '椭圆及其标准方程',
                    'status': 'opened',
                }
            },
        }
        write_store(page, state)
        page.reload()
        page.wait_for_selector('[data-testid="teacher-classroom"]')
        page.wait_for_timeout(500)
        card = page.get_by_test_id('classroom-card-deck-ellipse').inner_text()
        check('课堂卡片显示已发布课件标题', '椭圆及其标准方程' in card)
        check('课堂卡片显示学生打开状态', '学生已打开' in card or '已打开' in card, card.replace('\n', ' | '))
        check('课堂卡片回显真实页码/进度', '第 4 / 6 页' in card and '67%' in card)
        quad = page.get_by_test_id('classroom-card-deck-quadratic').inner_text()
        check('未打开课件显示未打开', '未打开' in quad and '暂无学生打开' in quad)
        prog = page.get_by_test_id('classroom-progress-deck-ellipse').inner_text()
        check('进度回流明细含页码与百分比', '第 4 / 6 页' in prog and '67%' in prog)
        stats_text = ' '.join(page.locator('.cls__stat').all_inner_texts())
        check('统计显示学生已打开 1 / 2', '1 / 2' in stats_text.replace('\n', ' '), stats_text.replace('\n', ' '))
        check('统计平均进度 67%', '67%' in stats_text)
        check('有进度时不再显示“暂无学生打开”空态', page.locator('[data-testid="classroom-no-student-opened"]').count() == 0)
        shot(page, '07-classroom-progress.png')

        # ================= 3. 学情洞察 =================
        page.wait_for_timeout(400)
        state = read_store(page)
        state['student']['errors'] = [
            {'caseId': 'B', 'wrongInput': '选 A', 'stepId': 's3', 'at': now - 5000, 'mastered': False},
            {'caseId': 'C', 'wrongInput': 'E(X)=3', 'stepId': 's4', 'at': now - 4000, 'mastered': False},
        ]
        write_store(page, state)
        page.goto(BASE + '/#/teacher/insights')
        page.reload()
        page.wait_for_selector('[data-testid="teacher-insights"]')
        page.wait_for_timeout(500)

        kpi_confirmed = page.get_by_test_id('insight-kpi-confirmed').inner_text().replace('\n', ' ')
        kpi_avg = page.get_by_test_id('insight-kpi-avg').inner_text().replace('\n', ' ')
        kpi_evidence = page.get_by_test_id('insight-kpi-evidence').inner_text().replace('\n', ' ')
        check('学情：已确认 3 / 3', '3 / 3' in kpi_confirmed, kpi_confirmed)
        check('学情：平均分按已确认终评计算（3.2 / 15）', '3.2' in kpi_avg and '15' in kpi_avg, kpi_avg)
        check('学情：错答证据 4 条（2 提交缺陷 + 2 学生错答）', re.search(r'\b4\b', kpi_evidence) is not None, kpi_evidence)

        cell = lambda case_id, cause: page.get_by_test_id(f'insight-cell-{case_id}-{cause}').inner_text().strip()
        check('热力图：题14 × 概念理解 = 2（sub-B + 学生错答）', cell('C', 'concept') == '2', cell('C', 'concept'))
        check('热力图：题9 × 条件遗漏 = 1（sub-C 漏条件）', cell('B', 'condition') == '1', cell('B', 'condition'))
        check('热力图：题9 × 概念理解 = 1（学生错答 s3）', cell('B', 'concept') == '1', cell('B', 'concept'))
        check('热力图：题3 未录错答 = 0', cell('A', 'concept') == '0')
        check('错因构成含结论文本', '最高频错因' in page.get_by_test_id('insights-causes').inner_text())
        evidence_text = page.get_by_test_id('insights-evidence').inner_text()
        check('证据明细含 sub-B 缺陷原文', 'sub-B' in evidence_text and '误当抽取次数' in evidence_text)
        check('证据明细含学生端录入错答', 'err-1' in evidence_text and '选 A' in evidence_text)
        page.get_by_test_id('insight-cell-C-concept').click()
        page.wait_for_timeout(250)
        filtered_text = page.get_by_test_id('insights-evidence').inner_text()
        check('点击热力单元格后按题×错因过滤', '题14' in filtered_text and '概念理解' in filtered_text)
        check('过滤后证据条数为 2', page.locator('.evidence').count() == 2, page.locator('.evidence').count())
        shot(page, '08-insights-filtered.png')
        page.reload()
        page.wait_for_selector('[data-testid="teacher-insights"]')
        page.wait_for_timeout(400)
        check('刷新后热力图数字仍来自录入数据', page.get_by_test_id('insight-cell-C-concept').inner_text().strip() == '2')
        shot(page, '09-insights.png')

        # ================= 4. 题库与组卷 =================
        goto(page, '/teacher/bank', 'teacher-bank')
        hero = page.locator('.bank__hero').inner_text()
        check('题库初始为空（0 / 3）', '题库 0 / 3 题' in hero.replace('\n', ' '), hero.replace('\n', ' '))
        check('三道指定题可入库', page.get_by_test_id('bank-add-all').is_visible())
        shot(page, '10-bank-before.png')

        page.get_by_test_id('bank-add-all').click()
        page.wait_for_timeout(300)
        check('入库后题库 3 / 3', '题库 3 / 3 题' in page.locator('.bank__hero').inner_text().replace('\n', ' '))
        st = wait_store(page, lambda s: len(s.get('ext', {}).get('teacherGrading', {}).get('bank', {}).get('items', [])) == 3, '题库入库持久化')
        check('题库 items 写入 ext.teacherGrading.bank', len(st['ext']['teacherGrading']['bank']['items']) == 3)

        page.get_by_test_id('bank-select-A').check()
        page.get_by_test_id('bank-select-B').check()
        page.wait_for_timeout(250)
        check('勾选 2 题后显示已选 2', '已选 2 题' in page.locator('.bank__hero').inner_text().replace('\n', ' '))
        page.get_by_test_id('bank-generate').click()
        page.wait_for_selector('[data-testid="bank-a4-preview"]')
        preview_text = page.get_by_test_id('bank-a4-preview').inner_text()
        check('A4 预览含题1 题干', '若双曲线' in preview_text)
        check('A4 预览含题2 题干', '正三棱柱' in preview_text)
        check('A4 预览含选项与卷面信息', 'D．' in preview_text.replace('D.', 'D．') or '2√2' in preview_text)
        check('A4 预览含“演示自撰素材”来源标注', '演示自撰素材' in preview_text)
        check('A4 预览内 KaTeX 已本地渲染', page.locator('[data-testid="bank-a4-preview"] .katex').count() > 0)
        shot(page, '11-bank-a4-preview.png')
        page.get_by_role('button', name='关闭预览').click()
        page.wait_for_timeout(250)

        page.reload()
        page.wait_for_selector('[data-testid="teacher-bank"]')
        page.wait_for_timeout(400)
        check('刷新后题库仍为 3 / 3', '题库 3 / 3 题' in page.locator('.bank__hero').inner_text().replace('\n', ' '))
        check('刷新后已选题目仍保留 2 题', '已选 2 题' in page.locator('.bank__hero').inner_text().replace('\n', ' '))
        shot(page, '12-bank-after-reload.png')

        # ================= 5. 作业发布 =================
        goto(page, '/teacher/assign', 'teacher-assign')
        check('作业发布四步第一步加载', page.get_by_test_id('assign-pane-questions').count() == 1)
        check('步骤条含四个步骤', page.locator('.asg__step').count() == 4)
        check('默认全选三道指定题', '已选 3 题' in page.locator('.asg__steps').inner_text())
        shot(page, '13-assign-step1.png')

        page.get_by_test_id('assign-next-1').click()
        page.wait_for_selector('[data-testid="assign-pane-class"]')
        page.locator('.asg__classcard', has_text='高二 (1) 班').click()
        page.wait_for_timeout(200)
        page.get_by_test_id('assign-next-2').click()
        page.wait_for_selector('[data-testid="assign-pane-settings"]')
        title_value = page.get_by_test_id('assign-title').input_value()
        check('进入设置步骤自动带出作业标题', bool(title_value), title_value)
        check('截止时间默认已设置', bool(page.get_by_test_id('assign-due').input_value()))
        page.get_by_test_id('assign-title').fill('第 3、9、14 题 · 课后针对性练习')
        page.get_by_test_id('assign-next-3').click()
        page.wait_for_selector('[data-testid="assign-pane-publish"]')
        shot(page, '14-assign-review.png')
        page.get_by_test_id('assign-publish').click()
        page.wait_for_selector('[data-testid="assign-published"]')
        check('发布成功出现已发布状态', '作业已发布' in page.get_by_test_id('assign-published').inner_text())
        st = wait_store(page, lambda s: len(s.get('ext', {}).get('teacherGrading', {}).get('assignments', [])) == 1, '作业发布写入')
        asg = st['ext']['teacherGrading']['assignments'][0]
        check(
            'assignments 契约字段精确',
            set(asg.keys()) == {'id', 'title', 'className', 'questionIds', 'dueAt', 'publishedAt'},
            list(asg.keys()),
        )
        check('assignments.className 正确', asg['className'] == '高二 (1) 班', asg['className'])
        check('assignments.questionIds 为三道题', asg['questionIds'] == ['A', 'B', 'C'], asg['questionIds'])
        check('assignments.id 形如 assign-*', str(asg['id']).startswith('assign-'), asg['id'])
        check('assignments.dueAt 为 ISO', iso_ok(asg['dueAt']), asg['dueAt'])
        check('assignments.publishedAt 为 ISO', iso_ok(asg['publishedAt']), asg['publishedAt'])
        shot(page, '15-assign-published.png')

        page.reload()
        page.wait_for_selector('[data-testid="assign-published-list"]')
        page.wait_for_timeout(400)
        list_text = page.get_by_test_id('assign-published-list').inner_text()
        check('刷新后已发布列表可回看', '第 3、9、14 题 · 课后针对性练习' in list_text and '已发布' in list_text)
        page.get_by_test_id('assign-published-list').get_by_role('button', name=re.compile('查看题目')).click()
        page.wait_for_timeout(200)
        check('已发布列表可展开题目回看', page.get_by_test_id('assign-list-detail').count() == 1)
        shot(page, '16-assign-list-after-reload.png')

        # ================= 6. 资源中心 =================
        goto(page, '/teacher/resources', 'teacher-resources')
        missing = page.get_by_test_id('resources-missing-source').inner_text()
        check('资源中心明确标注教材切片缺源', '授权教材切片未挂载，本演示使用自撰素材' in missing)
        check('缺源提示包含真实源目录', 'D:\\知识库\\AC切片' in missing, missing[:80])
        check('缺源卡片存在且不可伪造原文', page.get_by_test_id('resource-card-textbook-slice').count() == 1)
        check('本地资源卡片 ≥ 10 份', page.locator('.res__card').count() >= 10)
        shot(page, '17-resources.png')

        page.get_by_test_id('resources-filter-courseware').click()
        page.wait_for_timeout(250)
        check('课件筛选仅显示 3 份课件', page.locator('.res__card:not(.res__card--missing)').count() == 3, page.locator('.res__card').count())
        page.get_by_test_id('resource-open-deck-deck-ellipse').click()
        page.wait_for_selector('[data-testid="resource-preview"]')
        preview_text = page.get_by_test_id('resource-preview').inner_text()
        check('课件预览渲染真实课件内容', '椭圆及其标准方程' in preview_text and '动手观察' in preview_text)
        shot(page, '18-resources-preview.png')
        page.get_by_role('button', name='关闭').click()
        page.wait_for_timeout(200)
        page.get_by_test_id('resources-filter-rubric').click()
        page.wait_for_timeout(200)
        page.get_by_test_id('resource-open-rubric-submissions').click()
        page.wait_for_selector('[data-testid="grading-page"]')
        check('评分细则卡片跳转批改工作台', '/teacher/grading' in page.url)

        # ================= 7. 网络 / 控制台 =================
        external = [
            u
            for u in requests
            if not (
                u.startswith(BASE)
                or u.startswith('http://127.0.0.1:5204')
                or u.startswith('http://localhost:5204')
                or u.startswith('data:')
                or u.startswith('blob:')
                or u.startswith('ws://127.0.0.1:5204')
            )
        ]
        check('无外部网络请求', len(external) == 0, external[:5])
        check('无页面 JS 异常', len(page_errors) == 0, page_errors[:3])
        check('无 console error', len(console_errors) == 0, console_errors[:5])

        passed = sum(1 for _, ok, _ in checks if ok)
        print('\n================ SUMMARY ================')
        print(f'checks: {passed}/{len(checks)} passed')
        if failures:
            print('FAILED:', failures)
        print('screenshots: qa/teacher-grading/*.png')
        browser.close()
        sys.exit(0 if not failures else 1)


if __name__ == '__main__':
    main()
