# -*- coding: utf-8 -*-
"""复验 review-math R2 的 4 项残留修复（F1-F4）+ 关键 RISK。"""
from playwright.sync_api import sync_playwright

BASE = r'D:\zxsy-math-arena-showcase'
url = 'file:///' + BASE.replace('\\', '/') + '/release/开始演示.html'
res = []


def ok(name, cond, detail=''):
    res.append((name, bool(cond), detail))
    print(('PASS ' if cond else 'FAIL ') + name + (f' [{detail}]' if detail else ''))


with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, offline=True)
    page = ctx.new_page()

    # F1: 二次函数参数页公式不得出现 "y = y ="
    page.goto(url + '#/teacher/prep/w/prep-quadratic/ppt', wait_until='load')
    page.wait_for_timeout(1400)
    body = page.inner_text('body')
    ok('F1 二次函数参数页无 "y = y =" 重复', 'y = y =' not in body)
    ok('F1 二次函数参数页含规范顶点式', ('y = 2(x + 2)² − 3' in body) or ('2(x + 2)' in body))

    # F2: 椭圆 s5 改参后派生与标注一致（改 a=10,b=6 → e=0.8 且标注焦点 ±8）
    page.goto(url + '#/teacher/prep/w/prep-ellipse/ppt', wait_until='load')
    page.wait_for_timeout(1400)
    num_inputs = page.locator('input[type=number]')
    if num_inputs.count() >= 2:
        num_inputs.nth(0).fill('10')
        num_inputs.nth(0).dispatch_event('input')
        page.wait_for_timeout(400)
        num_inputs.nth(1).fill('6')
        num_inputs.nth(1).dispatch_event('input')
        page.wait_for_timeout(800)
        body = page.inner_text('body')
        ok('F2 椭圆改参后 e 显示 0.8', '0.8' in body)
        ok('F2 椭圆改参后焦点/半焦距显示 ±8', ('(±8, 0)' in body) or ('8, 0' in body) or ('4.472' not in body and '8' in body))
        ok('F2 椭圆改参后不再显示旧静态式 c=4 作为当前参数', '⇒  c=4' not in body)
    else:
        ok('F2 椭圆参数输入存在', False)

    # F3: B 否定式判错（不垂直/不是垂直/并非垂直 都不应推进）
    for phrase in ['AD 与 BC 不是垂直', 'AD 不垂直于 BC', '并不是垂直']:
        c2 = b.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, offline=True)
        pg = c2.new_page()
        pg.goto(url + '#/student/guide/B', wait_until='load')
        pg.wait_for_timeout(400)
        pg.locator('input[type=file]').set_input_files(BASE + r'\src\assets\questions\q2.png')
        pg.wait_for_timeout(700)
        pg.locator('.guide__input').first.fill(phrase)
        pg.locator('.guide__composer .ms-btn--primary').first.click()
        pg.wait_for_timeout(500)
        body = pg.inner_text('body')
        still = pg.locator('.guide__input').count() == 1
        ok(f'F3 B 否定式判错：{phrase}', still and ('再想一下' in body or '注意' in body or '不是不垂直' in body))
        c2.close()

    # F4: sub-B 评分细则可由 1 分重算
    import subprocess, json
    out = subprocess.run(['node', '-e', '''
import('file:///' + process.env.BASE + '/src/data/submissions.js').then(m => {
  const s = m.submissions.find(x => x.id === 'sub-B')
  console.log(JSON.stringify({ score: s.systemScore, sum: s.rubric.reduce((a, r) => a + r.points, 0), items: s.rubric.length }))
})'''], capture_output=True, text=True, env={**__import__('os').environ, 'BASE': BASE.replace('\\', '/')})
    try:
        d = json.loads(out.stdout.strip().splitlines()[-1])
        ok('F4 sub-B 建议分 1 可由细则重算（细则含 1 分项、合计 5）', d['score'] == 1 and d['sum'] == 5 and d['items'] == 4, str(d))
    except Exception as e:
        ok('F4 sub-B 评分细则校验', False, out.stderr[-120:] if out.stderr else str(e))

    # RISK：变式句末标点不再误判（B-v1 "不成立。" 应判对）
    page.goto(url + '#/student/guide/B', wait_until='load')
    page.wait_for_timeout(400)
    page.locator('input[type=file]').set_input_files(BASE + r'\src\assets\questions\q2.png')
    page.wait_for_timeout(700)
    # 走完 B 主线到结论
    for text in ['底面是正三角形，AD⊥BC', '过 D 平行侧棱的直线垂直于底面，也垂直于 BC']:
        page.locator('.guide__input').first.fill(text)
        page.locator('.guide__composer .ms-btn--primary').first.click()
        page.wait_for_timeout(400)
    for key in ['B']:
        page.locator('.guide__choice-key', has_text=key).first.click()
    page.locator('.guide__composer .ms-btn--primary').first.click()
    page.wait_for_timeout(500)
    for key in ['B', 'D']:
        page.locator('.guide__choice-key', has_text=key).first.click()
    page.locator('.guide__composer .ms-btn--primary').first.click()
    page.wait_for_timeout(700)
    body = page.inner_text('body')
    if '已完成本题' in body:
        page.get_by_role('button', name='举一反三').first.click()
        page.wait_for_timeout(400)
        page.locator('.guide__variant .guide__input').first.fill('不成立。')
        page.get_by_role('button', name='判分').first.click()
        page.wait_for_timeout(500)
        body = page.inner_text('body')
        ok('RISK 变式句末标点：B-v1 答“不成立。”判对', '✔ 回答正确' in body)
    else:
        ok('RISK 变式句末标点（需先到结论）', False, '主线未到结论')
    b.close()

passed = sum(1 for _, c, _ in res if c)
print(f'\nRECHECK {passed}/{len(res)} PASS')
