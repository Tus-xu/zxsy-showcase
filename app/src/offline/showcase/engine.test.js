/**
 * 引导式解题状态机的行为锁（TDD：先锁行为，再改实现）。
 *
 * 覆盖方案 §7「必验路径」的可自动化部分：
 *   - 主讲路径 A 全通，含首答 A → 订正 C；
 *   - 明确误解触发小课，小课检验通过后回到同一步；
 *   - 「负」单独出现只建立澄清问题，不按误解分流；
 *   - B 路径全通，换路保留已证事实；
 *   - 无关输入留在原步骤，不推进、不假装理解；
 *   - 极限支线可分别从读题与推导进入，并回到各自入口；
 *   - 未作答进入时不做「订正」措辞。
 */
import { describe, it, expect } from 'vitest'
import { step, newNodeState, summaryOf, getNode, norm, matchOption, T, FACT } from './engine'

function run(s, texts) {
  let cur = s
  const replies = []
  for (const t of texts) {
    const out = step(cur, { text: t })
    cur = out.state
    if (out.reply) replies.push(out.reply)
  }
  return { state: cur, replies }
}

const firstA = () => newNodeState('s5', { firstAnswer: 'A' })

describe('主讲路径 A（首答 A → 订正 C）', () => {
  it('走完四主阶段并订正成功', () => {
    let { state } = run(firstA(), ['题目看懂了', '看导数变号'])
    expect(state.node).toBe('a1_candidates')
    expect(state.stage).toBe('derive')
    expect(state.path).toBe('A')

    ;({ state } = run(state, ['−1 和 2']))
    expect(state.node).toBe('a2_diagnose')
    expect(state.facts).toContain(FACT.candidates)

    ;({ state } = run(state, ['x=0 处的切线斜率为负']))
    expect(state.node).toBe('a3_signs')

    ;({ state } = run(state, ['左正右负']))
    expect(state.node).toBe('a3_classify')
    expect(state.lessonPending).toBe(false)

    ;({ state } = run(state, ['局部极大']))
    expect(state.node).toBe('a3_classify2')
    expect(state.facts).toContain(FACT.maxAtMinus1)

    ;({ state } = run(state, ['局部极小']))
    expect(state.node).toBe('a4_correct')
    expect(state.facts).toContain(FACT.minAtTwo)

    ;({ state } = run(state, ['x=2']))
    expect(state.node).toBe('a4_why')

    ;({ state } = run(state, ['它左侧在上升，右侧在下降']))
    expect(state.node).toBe('fix_return')
    expect(state.stage).toBe('fix')

    const r = step(state, { text: '返回题卡订正' })
    expect(r.state.node).toBe('fix_retry')
    // 重选卡带四个真实选项
    const retry = r.reply.cards.find((c) => c.variant === 'retry')
    expect(retry.options.map((o) => o.label)).toEqual(['−1', '1', '2', '−2'])

    const fin = step(r.state, { text: '2' })
    expect(fin.state.node).toBe('done')
    expect(fin.state.corrected).toBe(true)
    expect(fin.state.firstAnswer).toBe('A') // 首答不被覆盖
    const sum = fin.reply.cards.find((c) => c.variant === 'summary')
    expect(sum.corrected).toBe(true)
    expect(sum.lines.join('')).toContain('首答 A')
  })

  it('订正错选 A 时保留在 fix_retry 并给出针对性提示', () => {
    const s = { ...firstA(), node: 'fix_retry', stage: 'fix' }
    const out = step(s, { text: '−1' })
    expect(out.state.node).toBe('fix_retry')
    expect(out.state.corrected).toBe(false)
    expect(out.reply.text).toBe(T.fixWrongA)
  })

  it('未作答进入时不做「订正」措辞，直接收在「回到这题」', () => {
    let { state } = run(newNodeState('s5'), ['题目看懂了', '看导数变号', '−1 和 2', 'x=0 处的切线斜率为负', '左正右负', '局部极大', '局部极小', 'x=2'])
    expect(state.node).toBe('fix_return')
    const card = getNode('fix_return').build(state).cards[1]
    expect(card.actions[0].label).toBe('回到这题')
  })
})

describe('明确误解触发前置小课', () => {
  it('把导数符号读成图像位置 → 小课 → 检验通过 → 回到同一步', () => {
    let { state } = run(firstA(), ['题目看懂了', '看导数变号', '−1 和 2'])
    const out = step(state, { text: 'g′(0)<0，所以图像在 x 轴下方' })
    expect(out.state.node).toBe('d1_lesson')
    expect(out.state.lesson.check).toBe('pending')
    expect(out.reply.text).toBe(T.a2Misread)
    const lesson = out.reply.cards.find((c) => c.variant === 'lesson')
    expect(lesson.pauseAt).toBe('判断导数符号')
    expect(lesson.figureKey).toBe('lesson_line')

    // 小课中主进度仍是分步推导
    expect(out.state.stage).toBe('derive')

    const chk = step(out.state, { text: '试一小题' })
    expect(chk.state.node).toBe('d2_check')

    const wrong = step(chk.state, { text: '在 x 轴下方，且递减' })
    expect(wrong.state.node).toBe('d2_check')
    expect(wrong.reply.text).toBe(T.d2WrongBelow)

    const right = step(wrong.state, { text: '在 x 轴上方，且递减' })
    expect(right.state.node).toBe('d3_resume')
    expect(right.state.lesson.check).toBe('passed')

    const back = step(right.state, { text: '回到看导数符号' })
    expect(back.state.node).toBe('a3_signs')
    expect(back.state.lesson).toBeNull()
    expect(back.reply.text).toBe(T.resume)
  })

  it('「负」单独出现只建立澄清问题，不触发补课', () => {
    const s = run(firstA(), ['题目看懂了', '看导数变号', '−1 和 2']).state
    const out = step(s, { text: '负' })
    expect(out.state.node).toBe('a2_clarify')
    expect(out.state.lesson).toBeNull()
    expect(out.reply.text).toBe(T.a2Clarify)
  })

  it('澄清为切线斜率后正常继续；澄清为函数值才进小课', () => {
    const s = run(firstA(), ['题目看懂了', '看导数变号', '−1 和 2', '应该是负的吧']).state
    expect(s.node).toBe('a2_clarify')
    const ok = step(s, { text: '导数 g′(0)' })
    expect(ok.state.node).toBe('a3_signs')
    expect(ok.state.lesson).toBeNull()

    const bad = step(s, { text: '函数值 g(0)' })
    expect(bad.state.node).toBe('d1_lesson')
  })

  it('小课里可先回原题，状态记为检验未完成', () => {
    const s = run(firstA(), ['题目看懂了', '看导数变号', '−1 和 2', 'g′(0)<0，所以图像在 x 轴下方']).state
    const out = step(s, { text: '先回原题' })
    expect(out.state.node).toBe('a3_signs')
    expect(out.state.lesson.check).toBe('skipped')
    expect(out.state.lessonPending).toBe(true)
    expect(out.reply.text).toBe(T.resume)
  })
})

describe('B 路径（比较附近函数值）与换路', () => {
  it('走完 B 路径并能订正', () => {
    let { state } = run(firstA(), ['题目看懂了', '比较附近的函数值'])
    expect(state.node).toBe('b1_standard')
    expect(state.path).toBe('B')

    ;({ state } = run(state, ['更小，局部极小']))
    expect(state.node).toBe('b2_minus1')

    ;({ state } = run(state, ['负']))
    expect(state.node).toBe('b3_two')
    expect(state.facts).toContain(FACT.maxAtMinus1)

    ;({ state } = run(state, ['正']))
    expect(state.node).toBe('b4_correct')
    expect(state.facts).toContain(FACT.minAtTwo)

    ;({ state } = run(state, ['x=2']))
    expect(state.node).toBe('fix_return')
    expect(state.stage).toBe('fix')
  })

  it('B → 看一眼 A 时保留已证事实且标记换过路', () => {
    let { state } = run(firstA(), ['题目看懂了', '比较附近的函数值', '更小，局部极小', '负', '正'])
    const before = [...state.facts]
    const out = step(state, { text: '看看另一种方法' })
    expect(out.state.path).toBe('A')
    expect(out.state.switched).toBe(true)
    expect(out.state.facts).toEqual(expect.arrayContaining(before))
    expect(out.state.node).toBe('a1_candidates')
  })

  it('A 路径中途也能切到 B，换路后回看旧结论仍在', () => {
    const s = run(firstA(), ['题目看懂了', '看导数变号', '−1 和 2']).state
    expect(s.node).toBe('a2_diagnose')
    // 卡上给「换一种方法」次动作，学生自主选择
    const out = step(s, { text: '换一种方法' })
    expect(out.state.node).toBe('b1_standard')
    expect(out.state.path).toBe('B')
    expect(out.state.switched).toBe(true)
    // 已确认的候选点在换路后仍然保留，但 A 的符号结论不会被冒充成 B 的证据
    expect(out.state.facts).toContain(FACT.candidates)
    expect(out.state.facts).not.toContain(FACT.maxAtMinus1)
  })
})

describe('无关输入与边界', () => {
  it('明确拒绝练习时保留邀请，之后仍能选练习', () => {
    const state = newNodeState('combo', { stage: 'method', node: 'c1_invite' })
    const declined = step(state, { text: '先不练' })
    expect(declined.state.node).toBe('c1_invite')
    expect(declined.reply.cards.some((card) => card.type === 'quiz_set')).toBe(false)
    expect(step(declined.state, { text: '可以，出三题' }).state.node).toBe('c_quiz')
  })

  it('未预设的提问即使含有「继续」也不作为继续确认', () => {
    const out = step(firstA(), { text: '先别继续，我想问黎曼曲率张量' })
    expect(out.state.node).toBe('r_read')
    expect(out.reply.text).toBe(T.unknown)
  })

  it('已经订正的题留在完成态，不因新提问回到读题', () => {
    const state = { ...firstA(), node: 'done', stage: 'done', corrected: true }
    const out = step(state, { text: '题目看懂了' })
    expect(out.state.node).toBe('done')
    expect(out.reply.text).toContain('已经完成')
  })

  it('错题复盘遇到无关文本后仍可加入错题本', () => {
    const state = newNodeState('s6', { node: 's6_entry' })
    const out = step(state, { text: '黎曼曲率张量怎么计算？' })
    expect(out.state.node).toBe('s6_entry')
    expect(out.reply.cards[0].actions[0].id).toBe('add_error')
    expect(step(state, { text: '这题我先不要加入错题本' }).state.errorSaved).toBeFalsy()
  })

  it('无关文本留在原步骤，不推进', () => {
    const s = firstA()
    const out = step(s, { text: '今天天气不错' })
    expect(out.state.node).toBe('r_read')
    expect(out.reply.text).toBe(T.unknown)
  })

  it('读题阶段说「导数」不判错，也不推进', () => {
    const out = step(firstA(), { text: '我觉得要用导数' })
    expect(out.state.node).toBe('r_read')
    expect(out.reply.text).toBe(T.unknown)
  })

  it('选方法后可输入等价导数式得到候选点', () => {
    const s = run(firstA(), ['题目看懂了', '看导数变号']).state
    const out = step(s, { text: 'g′(x)=6(x+1)(x−2)，x=−1 或 x=2' })
    expect(out.state.node).toBe('a2_diagnose')
    expect(out.state.facts).toContain(FACT.candidates)
  })

  it('节点状态机不会被未知节点 id 卡死', () => {
    const out = step({ ...firstA(), node: 'no_such_node' }, { text: '题目看懂了' })
    expect(out.state.node).toBe('m_method')
  })

  it('重复提交同一动作不会跨节点串状态', () => {
    const a = step(firstA(), { text: '题目看懂了' })
    const b = step(firstA(), { text: '题目看懂了' })
    expect(a.state.node).toBe(b.state.node)
    expect(a.reply.text).toBe(b.reply.text)
  })
})

describe('极限支线', () => {
  it('从读题主动问极限，看完回到读题', () => {
    const s = newNodeState('s5', { firstAnswer: 'A' })
    expect(s.node).toBe('r_read')
    const out = step(s, { text: '我不懂极限是什么' })
    expect(out.state.node).toBe('limit_intro')
    expect(out.state.limitReturn).toBe('r_read')
    const limit = out.reply.cards.find((c) => c.variant === 'limit')
    expect(limit.figureKey).toBe('limit_secant')

    const chk = step(out.state, { text: '做一个小检验' })
    expect(chk.state.node).toBe('limit_check')
    const wrong = step(chk.state, { text: '0' })
    expect(wrong.reply.text).toBe(T.limitCheckWrong)
    const right = step(wrong.state, { text: '4' })
    expect(right.state.node).toBe('r_read')
    expect(right.state.limitDone).toBe(true)
  })

  it('从推导问极限，先继续原题回到同一节点', () => {
    const s = run(firstA(), ['题目看懂了', '看导数变号', '−1 和 2']).state
    const out = step(s, { text: '极限到底是啥' })
    expect(out.state.node).toBe('limit_intro')
    expect(out.state.limitReturn).toBe('a2_diagnose')
    const back = step(out.state, { text: '先继续原题' })
    expect(back.state.node).toBe('a2_diagnose')
    expect(back.reply.text).toBe(T.limitSkip)
  })
})

describe('文案与数学校对', () => {
  it('g′(x) 的因式分解与两处候选一致', () => {
    const g = (x) => 2 * x ** 3 - 3 * x ** 2 - 12 * x + 1
    const dg = (x) => 6 * x ** 2 - 6 * x - 12
    expect(dg(-1)).toBe(0)
    expect(dg(2)).toBe(0)
    expect(g(-1)).toBe(8)
    expect(g(2)).toBe(-19)
    expect(dg(-2)).toBe(24)
    expect(dg(0)).toBe(-12)
    expect(dg(3)).toBe(24)
  })

  it('两个差值的因式分解恒等', () => {
    for (const x of [-2.5, -1.2, -1, 0, 1.5, 2, 2.7, 4]) {
      const g = 2 * x ** 3 - 3 * x ** 2 - 12 * x + 1
      expect(g - 8).toBeCloseTo((x + 1) ** 2 * (2 * x - 7), 9)
      expect(g + 19).toBeCloseTo((x - 2) ** 2 * (2 * x + 5), 9)
    }
  })

  it('小课例子 r(x)=5−2x 在 0<x<2 上为正且递减', () => {
    const r = (x) => 5 - 2 * x
    expect(r(1)).toBe(3)
    expect(r(0)).toBe(5)
    expect(r(2)).toBe(1)
    for (const x of [0.1, 0.5, 1, 1.5, 1.9]) expect(r(x)).toBeGreaterThan(0)
    expect(r(1.1)).toBeLessThan(r(1))
  })

  it('极限例子的差商数值正确', () => {
    const q = (a, h) => ((a + h) ** 2 - a ** 2) / h
    expect(q(1, -0.1)).toBeCloseTo(1.9, 9)
    expect(q(1, 0.1)).toBeCloseTo(2.1, 9)
    expect(q(2, 0.001)).toBeCloseTo(4.001, 9)
  })

  it('小结只写实际发生的事件', () => {
    const cold = summaryOf(newNodeState('s5'))
    expect(cold.lines.join('')).not.toContain('候选点')
    const warm = summaryOf({
      ...newNodeState('s5'),
      facts: [FACT.candidates, FACT.minAtTwo],
      path: 'A',
      corrected: true,
    })
    expect(warm.corrected).toBe(true)
    expect(warm.lines.join('')).toContain('候选点')
    expect(warm.lines.join('')).toContain('确认了选项 C')

    const revised = summaryOf({ ...newNodeState('s5'), corrected: true, firstAnswer: 'A' })
    expect(revised.lines.join('')).toContain('改选了 C，首答 A 仍然保留')
  })

  it('归一化能吃下等价写法', () => {
    expect(norm(' 左正右负 ')).toBe('左正右负')
    expect(norm('−1 和 2')).toBe('-1和2')
    const opts = [{ id: 'a', label: '左正右负', aliases: ['先正后负'] }]
    expect(matchOption(opts, '先正后负')?.id).toBe('a')
    expect(matchOption(opts, '左正右负。')?.id).toBe('a')
  })
})
