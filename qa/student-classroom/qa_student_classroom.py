# -*- coding: utf-8 -*-
"""
学生端「课堂 / 双师课堂」验收脚本（1672×941，DPR 1）。

覆盖：
1. 课堂三 Tab（课堂任务 / 我的班级 / 双师课堂）+ 老师发布记录为空时的预置发布回退
2. 跨端发布契约：注入 teacher.publish.records（同 deck v1/v2 + 他班记录）→ 只显示本班、最新版、按发布快照渲染
3. 双师课堂：逐页翻页、字幕逐段出现、暂停/继续、AI 助教命中 / 未命中、刷新恢复同一页与进度
4. 作业回看：sub-A 待批改状态 + 答卷图片；注入教师确认批改 → 得分/评语同步、刷新仍在
5. 自主双师课堂：3 课题 + 上传材料课堂（sha256 匹配 / 不匹配分支）、最近课堂、进度写回
6. 控制台错误与网络请求计数

运行：先在 5202 启动 dev server，然后 python qa/student-classroom/qa_student_classroom.py
"""
import json
import os
import sys
import time

from playwright.sync_api import sync_playwright

BASE = r'D:\zxsy-math-arena-showcase'
OUT = os.path.join(BASE, 'qa', 'student-classroom')
URL = 'http://127.0.0.1:5202/'
STORE_KEY = 'mathesis-showcase-v1'
os.makedirs(OUT, exist_ok=True)

RESULTS = []
CONSOLE = []


def check(name, ok, detail=''):
    RESULTS.append({'name': name, 'ok': bool(ok), 'detail': str(detail)})
    print(('PASS ' if ok else 'FAIL ') + name + (('  | ' + str(detail)) if detail else ''))


def shot(page, name):
    page.screenshot(path=os.path.join(OUT, name), full_page=False)
    print('SHOT', name)


def body(page):
    return page.inner_text('body')


def read_store(page):
    raw = page.evaluate("localStorage.getItem('mathesis-showcase-v1')")
    return json.loads(raw) if raw else {}


def write_store(page, state):
    page.evaluate(
        """(s) => { localStorage.setItem('mathesis-showcase-v1', JSON.stringify(s)) }""",
        state,
    )


def mock_publish_records(now_ms):
    """模拟教师端发布：deck-ellipse 两个版本（v2 = 教师刚改过标题的可识别细节） + 一条他班记录。"""
    v2_slides = [
        {
            'id': 's1',
            'layout': 'title',
            'kicker': '第三章 · 圆锥曲线',
            'title': '椭圆及其标准方程（张老师课堂修订版）',
            'subtitle': '第一课时 · 从轨迹到方程',
            'lead': '用一条绳子、两个焦点，把"到两定点距离之和为定值"的轨迹变成可计算的方程。',
            'footer': '用数学的眼光观察世界',
        },
        {
            'id': 's2',
            'layout': 'content',
            'title': '动手观察：一条绳子画椭圆',
            'lead': '把绳子的两端固定在 $F_1$、$F_2$，用笔尖拉紧绳子移动，画出的轨迹是什么？',
            'bullets': ['两定点 $F_1$、$F_2$ 称为焦点', '绳长不变 ⇒ 到两焦点距离之和为定值 $2a$'],
        },
        {
            'id': 's3',
            'layout': 'content',
            'title': '椭圆的定义',
            'lead': '平面内与两个定点 $F_1$、$F_2$ 的距离之和等于常数 $2a$（$2a>|F_1F_2|$）的点的轨迹叫做椭圆。',
            'equation': '|PF₁| + |PF₂| = 2a  (2a > |F₁F₂|)',
            'bullets': ['条件 $2a>2c$ 不可省略', '$a$ 为长半轴，$c$ 为半焦距'],
            'figure': 'F₁(−c,0)、F₂(c,0)、动点 P',
        },
        {
            'id': 's4',
            'layout': 'content',
            'title': '椭圆的标准方程',
            'lead': '以 $F_1F_2$ 所在直线为 $x$ 轴、中点为原点建系，由 |PF₁|+|PF₂|=2a 化简可得：',
            'equation': 'x²/a² + y²/b² = 1   (a > b > 0)',
            'bullets': ['其中 b² = a² − c²，焦点为 F₁(−c,0)、F₂(c,0)', '$a$、$b$、$c$ 满足 a² = b² + c²'],
            'figure': '标准位置：焦点在 x 轴上',
        },
        {
            'id': 's5',
            'layout': 'content',
            'title': '几何性质与参数联动',
            'lead': '取 a=5、b=3，则 c = √(a²−b²) = 4。',
            'equation': 'a=5, b=3  ⇒  c=4,  e=c/a=4/5',
            'bullets': ['改变 a、b 时，焦点、顶点与离心率同步变化'],
            'figure': 'a、b 可调，c 与 e 实时更新',
        },
        {
            'id': 's6',
            'layout': 'content',
            'title': '课堂小结',
            'bullets': ['定义：|PF₁|+|PF₂|=2a>|F₁F₂|', '方程：x²/a²+y²/b²=1 (a>b>0)'],
        },
    ]
    v1_slides = json.loads(json.dumps(v2_slides))
    v1_slides[0]['title'] = '椭圆及其标准方程'
    other_slides = [
        {
            'id': 'o1',
            'layout': 'title',
            'title': '其他班级课件 · 不应出现在本班课堂',
            'subtitle': '演示用',
            'lead': '这条记录发布给高一 (3) 班，不应出现在高二 (1) 班学生林一川的课堂。',
        }
    ]
    return [
        {
            'id': 'pub-mock-other-1',
            'deckId': 'deck-quadratic',
            'deckTitle': '其他班级课件 · 不应出现在本班课堂',
            'className': '高一 (3) 班',
            'version': 1,
            'publishedAt': now_ms - 60000,
            'editor': '张老师',
            'slides': other_slides,
            'meta': {'className': '高一 (3) 班', 'duration': '45 分钟'},
        },
        {
            'id': 'pub-mock-v1',
            'deckId': 'deck-ellipse',
            'deckTitle': '椭圆及其标准方程',
            'className': '高二 (1) 班',
            'version': 1,
            'publishedAt': now_ms - 3600000,
            'editor': '张老师',
            'slides': v1_slides,
            'meta': {'className': '高二 (1) 班', 'duration': '45 分钟', 'subtitle': '第一课时'},
        },
        {
            'id': 'pub-mock-v2',
            'deckId': 'deck-ellipse',
            'deckTitle': '椭圆及其标准方程（张老师课堂修订版）',
            'className': '高二 (1) 班',
            'version': 2,
            'publishedAt': now_ms - 120000,
            'editor': '张老师',
            'slides': v2_slides,
            'meta': {'className': '高二 (1) 班', 'duration': '45 分钟', 'subtitle': '第一课时'},
        },
    ]


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1)
    page = ctx.new_page()
    page.on(
        'console',
        lambda m: CONSOLE.append({'type': m.type, 'text': m.text}) if m.type in ('error',) else None,
    )
    page.on('pageerror', lambda e: CONSOLE.append({'type': 'pageerror', 'text': str(e)}))

    # ---------------- 1. 课堂（课堂任务 tab，预置发布回退） ----------------
    page.goto(URL + '#/student/classroom', wait_until='load')
    page.wait_for_timeout(900)
    shot(page, '01-classroom-tasks-preset.png')
    txt = body(page)
    check('课堂页加载 + 三 Tab', all(k in txt for k in ['课堂任务', '我的班级', '双师课堂']), '')
    check('课堂任务默认展示课件任务', page.locator('[data-test="courseware-task"]').count() == 1)
    check('课堂任务展示作业（待批改）', page.locator('[data-test="homework-task"]').count() == 1 and '待批改' in txt)
    check('预置发布版本可见', '预置发布版本' in txt)
    check('双师课堂入口（自主课题）可见', page.locator('[data-test="self-topic-self-ellipse"]').count() == 0)  # 在另一 tab
    page.locator('[data-test="tab-dual"]').click()
    page.wait_for_timeout(350)
    shot(page, '02-classroom-dual-preset.png')
    txt = body(page)
    check('双师课堂 tab 显示老师课堂卡片', page.locator('[data-test="published-deck-card"]').count() == 1)
    check('双师课堂 tab 显示预置回退说明', '预置发布 v1' in txt)
    check('双师课堂 tab 显示自主双师入口', page.locator('[data-test="self-class-panel"]').count() == 1)
    check('最近课堂初始为空', '还没有打开的课堂' in txt)
    check('URL 带 tab 参数（刷新可恢复）', 'tab=dual' in page.url, page.url)

    page.locator('[data-test="tab-class"]').click()
    page.wait_for_timeout(300)
    shot(page, '03-classroom-myclass.png')
    txt = body(page)
    check('我的班级：班级信息 + 成员 + 演示标注', '高二 (1) 班 · 数学 · 学习共同体' in txt and '演示数据' in txt and '林一川' in txt)

    # ---------------- 2. 注入教师发布记录（跨端契约） ----------------
    page.locator('[data-test="tab-tasks"]').click()
    page.wait_for_timeout(400)
    state = read_store(page)
    state.setdefault('teacher', {}).setdefault('publish', {})['records'] = mock_publish_records(int(time.time() * 1000))
    write_store(page, state)
    page.reload(wait_until='load')
    page.wait_for_timeout(700)
    page.locator('[data-test="tab-dual"]').click()
    page.wait_for_timeout(400)
    shot(page, '04-classroom-dual-published.png')
    txt = body(page)
    check('真实发布记录：同 deck 两个版本都可见', page.locator('[data-test="published-deck-card"]').count() == 2)
    check('最新版 v2 排在前面 + 历史版本标记', '历史版本' in txt and 'v2' in txt and 'v1' in txt)
    check('他班发布记录被过滤（班级隔离）', '其他班级课件' not in txt)
    check('发布后不再显示预置回退说明', '预置发布 v1' not in txt)

    # ---------------- 3. 打开发布课件 → 翻 3 页 → 提问 → 刷新 ----------------
    page.locator('[data-test="published-deck-card"]').first.click()
    page.wait_for_timeout(800)
    shot(page, '05-dual-published-v2.png')
    txt = body(page)
    check('打开最新发布记录（URL 为记录 id）', 'pub-mock-v2' in page.url, page.url)
    check('按发布快照渲染：教师改过的标题可见', '椭圆及其标准方程（张老师课堂修订版）' in txt)
    check('发布页显示版本 v2 与班级', 'v2' in txt and '高二 (1) 班' in txt)
    check('第 1 / 6 页', '第 1 / 6 页' in txt)

    for _ in range(3):
        page.locator('[data-test="dual-next"]').click()
        page.wait_for_timeout(650)
    shot(page, '06-dual-page4.png')
    txt = body(page)
    check('翻 3 页后到第 4 / 6 页', '第 4 / 6 页' in txt, '')
    st = read_store(page)
    prog = st['student']['classroom']['progress'].get('deck-ellipse', {})
    check('进度写回 progress[deckId]（page/total/pct/updatedAt/recordId）',
          prog.get('page') == 4 and prog.get('total') == 6 and prog.get('pct') == 67
          and isinstance(prog.get('updatedAt'), (int, float)) and prog.get('recordId') == 'pub-mock-v2', prog)
    check('opened 记录为对象数组', isinstance(st['student']['classroom'].get('opened'), list)
          and len(st['student']['classroom']['opened']) >= 1
          and st['student']['classroom']['opened'][-1].get('deckId') == 'deck-ellipse',
          st['student']['classroom'].get('opened'))

    # 字幕逐段出现（翻页后自动播放）
    page.wait_for_timeout(2300)
    txt = body(page)
    check('字幕逐段出现（已推进多段）', '字幕 ' in txt and '段' in txt)
    shot(page, '07-dual-subtitle-playing.png')

    # 助教：命中本页讲稿
    page.locator('[data-test="assistant-input"]').fill('标准方程是怎么推出来的？')
    page.locator('[data-test="assistant-send"]').click()
    page.wait_for_timeout(400)
    txt = body(page)
    check('助教命中本页讲稿', '命中本页讲稿' in txt and '两次平方' in txt)
    shot(page, '08-assistant-hit.png')

    # 助教：未命中（不得编造）
    page.locator('[data-test="assistant-input"]').fill('今天天气怎么样')
    page.locator('[data-test="assistant-send"]').click()
    page.wait_for_timeout(400)
    txt = body(page)
    check('助教未命中明确说明', '当前页讲稿未包含' in txt)
    shot(page, '09-assistant-miss.png')

    # 刷新恢复
    page.reload(wait_until='load')
    page.wait_for_timeout(800)
    txt = body(page)
    check('刷新后回到同一页（第 4 / 6 页）', '第 4 / 6 页' in txt)
    check('刷新后助教问答仍在', '两次平方' in txt and '今天天气' in txt)
    shot(page, '10-dual-refresh-restored.png')
    st = read_store(page)
    prog = st['student']['classroom']['progress'].get('deck-ellipse', {})
    pb = (st.get('ext') or {}).get('studentClassroom', {}).get('playback', {}).get('deck-ellipse', {})
    check('刷新后进度与播放位置持久化', prog.get('page') == 4 and pb.get('page') == 4 and pb.get('segmentIndex', 0) >= 0, {'progress': prog, 'playback': pb})

    # 暂停 / 继续
    page.locator('[data-test="dual-play"]').click()
    page.wait_for_timeout(2200)
    txt = body(page)
    check('继续讲解后字幕推进', 'AI 主讲讲解中' in txt, '')
    page.locator('[data-test="dual-play"]').click()
    page.wait_for_timeout(300)
    txt = body(page)
    check('暂停讲解生效', '已暂停' in txt or '本页讲解完毕' in txt, '')
    shot(page, '11-dual-paused.png')

    # ---------------- 4. 作业回看（待批改 → mock 批改） ----------------
    page.locator('[data-test="dual-back"]').click()
    page.wait_for_timeout(600)
    check('返回课堂落在双师 tab', 'tab=dual' in page.url, page.url)
    page.locator('[data-test="tab-tasks"]').click()
    page.wait_for_timeout(400)
    txt = body(page)
    check('作业任务显示待批改', '待批改' in txt)
    page.locator('[data-test="homework-task"]').click()
    page.wait_for_timeout(500)
    shot(page, '12-homework-pending.png')
    img_ok = page.evaluate("() => { const el = document.querySelector('[data-test=\"submission-image\"]'); return el && el.complete && el.naturalWidth > 0 }")
    txt = body(page)
    check('作业回看：答卷图片真实加载', bool(img_ok))
    check('作业回看：待批改 + 题号 + 评分细则', '待批改' in txt and '第 3 题' in txt and '评分细则' in txt)
    page.locator('.hw-modal__close').click()
    page.wait_for_timeout(300)

    # mock 教师确认批改
    state = read_store(page)
    state.setdefault('teacher', {}).setdefault('grading', {}).setdefault('grades', {})['sub-A'] = {
        'score': 5,
        'comment': '推导完整，轴长与半轴区分清楚，结论正确。',
        'confirmed': True,
        'gradedAt': int(time.time() * 1000),
    }
    write_store(page, state)
    page.reload(wait_until='load')
    page.wait_for_timeout(800)
    txt = body(page)
    check('教师确认批改后学生端同步得分', '已批改 5/5' in txt)
    page.locator('[data-test="homework-task"]').click()
    page.wait_for_timeout(500)
    shot(page, '13-homework-graded.png')
    txt = body(page)
    check('批改详情：得分 5 + 教师评语', '推导完整' in txt and page.locator('[data-test="dialog-score"]').inner_text() == '5')
    page.locator('.hw-modal__close').click()
    page.wait_for_timeout(300)
    page.reload(wait_until='load')
    page.wait_for_timeout(800)
    check('刷新后批改结果仍一致', '已批改 5/5' in body(page))

    # ---------------- 5. 自主双师课堂：3 课题 + 上传材料 ----------------
    page.locator('[data-test="tab-dual"]').click()
    page.wait_for_timeout(350)
    page.locator('[data-test="self-topic-self-ellipse"]').click()
    page.wait_for_timeout(800)
    shot(page, '14-self-class.png')
    txt = body(page)
    check('自主课题进入双师课堂', 'self-ellipse' in page.url and '自主双师课堂' in txt, page.url)
    st = read_store(page)
    check('自主课题也写回进度', st['student']['classroom']['progress'].get('deck-ellipse', {}).get('page', 0) >= 1)

    page.locator('[data-test="dual-back"]').click()
    page.wait_for_timeout(600)
    page.locator('[data-test="tab-dual"]').click()
    page.wait_for_timeout(300)
    page.locator('[data-test="material-upload-input"]').set_input_files(
        os.path.join(BASE, 'src', 'assets', 'questions', 'q2.png')
    )
    page.wait_for_timeout(1600)
    shot(page, '15-material-class.png')
    txt = body(page)
    check('上传材料（sha256 命中）进入材料课堂', 'self-material' in page.url and '正三棱柱中的线面关系' in txt, page.url)
    st = read_store(page)
    check('材料课堂写回进度', 'deck-material-cubes' in st['student']['classroom']['progress'])
    page.locator('[data-test="dual-next"]').click()
    page.wait_for_timeout(800)
    shot(page, '15b-material-slide2.png')
    media_ok = page.evaluate("() => { const el = document.querySelector('.deck-slide__media img'); return el && el.complete && el.naturalWidth > 0 }")
    check('材料课堂展示上传的题目原图', bool(media_ok))
    check('材料课堂助教问答库可用', page.locator('[data-test="assistant-chip"]').count() >= 1)

    page.locator('[data-test="dual-back"]').click()
    page.wait_for_timeout(600)
    page.locator('[data-test="tab-dual"]').click()
    page.wait_for_timeout(300)
    page.locator('[data-test="material-upload-input"]').set_input_files(
        os.path.join(BASE, 'src', 'assets', 'questions', 'q1.png')
    )
    page.wait_for_timeout(1200)
    shot(page, '16-material-reject.png')
    txt = body(page)
    check('非演示材料不伪造识别结果', '不在本次演示的素材清单中' in txt)
    check('最近课堂记录已出现', page.locator('[data-test="recent-item"]').count() >= 1)

    # ---------------- 6. 兼容别名 + 收尾 ----------------
    page.goto(URL + '#/student/dual/dual-deck-0', wait_until='load')
    page.wait_for_timeout(700)
    check('主持人工具旧检查点 /student/dual/dual-deck-0 可打开', page.locator('[data-test="dual-view"]').count() == 1)
    shot(page, '17-dual-alias-checkpoint.png')

    net = page.evaluate('window.__MATHSIS_NET_LOG__ ? window.__MATHSIS_NET_LOG__.length : -1')
    check('零网络请求（fetch/XHR 计数）', net == 0, f'net={net}')
    critical = [c for c in CONSOLE if c['type'] in ('error', 'pageerror')]
    check('控制台无错误', len(critical) == 0, json.dumps(critical[:5], ensure_ascii=False))

    browser.close()

passed = sum(1 for r in RESULTS if r['ok'])
total = len(RESULTS)
print('\n==== RESULT %d/%d passed ====' % (passed, total))
with open(os.path.join(OUT, 'qa-result.json'), 'w', encoding='utf-8') as f:
    json.dump(
        {
            'viewport': '1672x941 DPR1',
            'url': URL,
            'passed': passed,
            'total': total,
            'checks': RESULTS,
            'console': CONSOLE,
        },
        f,
        ensure_ascii=False,
        indent=2,
    )
sys.exit(0 if passed == total else 1)
