/**
 * sgv2 引导对话 V2 组件级测试（student-guided-solving-v2 DESIGN §8 前端重构收尾）
 *
 * 覆盖四组新交互（全部离线 jsdom，卡 payload 逐字段取自后端真实下发）：
 * 1. socratic_progress 紧凑进度条（DESIGN §6.2：由不渲染改为渲染；旧卡缺字段隐藏，§6.5.3）
 * 2. socratic_error_analysis 错因分析卡（misconception_zh 后端下发；全字段防御判空，§9）
 * 3. socratic_detour 补课卡 + detour_result 状态条（检验题走 attempt 协议，§3.5）
 * 4. socratic_step_choice 已用态（点选即执行 + 置灰，§3.6 选项单发）与「我没思路」求助入口
 *
 * 契约出处：services/api/app/skills/socratic_solver/main.py
 *   progress=_progress_card(:3696-3733)、error_analysis=_error_analysis_card(:2147-2164)、
 *   detour 卡(:1756-1777)、detour_result(:1926-1935/1954-1963/2035-2041)、
 *   step_choice(:496-506 opener / :550-560 replay)、hint 卡 scaffold_label(:784-793)
 */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import MessageBubble from '@/components/chat/MessageBubble.vue'
import SocraticErrorAnalysisCard from '@/components/chat/SocraticErrorAnalysisCard.vue'
import SocraticDetourCard from '@/components/chat/SocraticDetourCard.vue'
import SocraticCompleteCard from '@/components/chat/SocraticCompleteCard.vue'
import {
  applySseEvent, fromHistory, markChoiceUsed, markHistoryUsedChoices, newAssistantMsg,
} from '@/components/chat/messageModel'

type AnyMsg = any

/** 组装一条可渲染动作行的 socratic 助手消息（动作行要求 status=done + skill=socratic_solver） */
function socraticMsg(): AnyMsg {
  const msg = newAssistantMsg(`cm-${Math.random().toString(36).slice(2)}`)
  msg.status = 'done'
  msg.skill = 'socratic_solver'
  return msg
}
function addCard(msg: AnyMsg, data: any) {
  applySseEvent(msg, 'card', data)
  return msg
}
function mountBubble(msg: AnyMsg) {
  return mount(MessageBubble, { props: { msg } })
}

describe('sgv2 socratic_progress 紧凑进度条（MessageBubble 渲染）', () => {
  const fullProgress = {
    card_type: 'socratic_progress',
    session_id: 's1',
    current_step: 2,
    steps_count: 4,
    hint_level: 1,
    attempts_on_step: 2,
    verdict: 'partial',
    phase: 'guiding',
    scaffold_level: 1,
    scaffold_label: 'focused_scaffold',
    kp_name: '导数概念',
    rounds_used: 3,
    rounds_limit: 8,
    mastery_state: 'weak',
  }

  it('字段齐备：渲染步数/阶段/知识点；内部提示档/掌握档/轮次按 E3-27 隐藏，verdict 着色进度填充', () => {
    const w = mountBubble(addCard(socraticMsg(), fullProgress))
    expect(w.find('.soc-progress').exists()).toBe(true)
    expect(w.text()).toContain('第 2/4 步')
    expect(w.text()).toContain('引导中')
    expect(w.text()).toContain('导数概念')
    // E3-27 / §9-8：学生端隐藏「提示档」「掌握·薄弱」「本轮 x/8」，避免给学生贴内部标签
    expect(w.text()).not.toContain('窄追问')
    expect(w.text()).not.toContain('薄弱')
    expect(w.text()).not.toContain('3/8')
    expect(w.find('.sp-fill.is-partial').exists()).toBe(true)
  })

  it('旧历史 progress 卡缺新字段：不渲染进度条、也不漏进 GenericCard（§6.5.3 防御判空）', () => {
    const w = mountBubble(addCard(socraticMsg(), { card_type: 'socratic_progress', session_id: 's1' }))
    expect(w.find('.soc-progress').exists()).toBe(false)
    expect(w.find('.unknown-block').exists()).toBe(false)
  })

  it('verdict=correct → 绿色填充；phase 缺省 → 阶段 chip 隐藏但其余字段照常', () => {
    const w = mountBubble(addCard(socraticMsg(), { ...fullProgress, verdict: 'correct', phase: undefined }))
    expect(w.find('.sp-fill.is-correct').exists()).toBe(true)
    expect(w.text()).not.toContain('引导中')
    expect(w.text()).toContain('第 2/4 步')
  })
})

describe('sgv2 socratic_error_analysis 错因分析卡', () => {
  const errCard = {
    card_type: 'socratic_error_analysis',
    session_id: 's1',
    step_no: 2,
    verdict: 'wrong',
    misconception: 'concept',
    misconception_zh: '概念不清',
    error_move: '把判别式 b²-4ac 整体变号',
    evidence_quote: '所以 x=2',
    kp_name: '一元二次方程',
    probe_question: '代一遍 a=1、b=-3、c=2，算出判别式是多少？',
  }

  it('MessageBubble 分发渲染：错在哪/原话引用/关联知识点/追问逐段可见，wrong 红色系', () => {
    const w = mountBubble(addCard(socraticMsg(), errCard))
    expect(w.find('.soc-err.is-wrong').exists()).toBe(true)
    expect(w.text()).toContain('错因分析')
    expect(w.text()).toContain('概念不清')
    expect(w.text()).toContain('一元二次方程')
    expect(w.text()).toContain('把判别式 b²-4ac 整体变号')
    expect(w.text()).toContain('你的原话')
    expect(w.text()).toContain('所以 x=2')
    expect(w.text()).toContain('想一想')
    expect(w.text()).toContain('代一遍 a=1、b=-3、c=2')
  })

  it('partial → 琥珀色系；misconception_zh 缺失（后端回落路径）→ 徽标隐藏不崩', () => {
    const w = mountBubble(addCard(socraticMsg(), { ...errCard, verdict: 'partial', misconception_zh: undefined }))
    expect(w.find('.soc-err.is-partial').exists()).toBe(true)
    expect(w.find('.se-mis').exists()).toBe(false)
  })

  it('全字段缺失（judge 回落 null）：只渲染卡头，错在哪/原话/追问块全部隐藏，绝不白屏', () => {
    const w = mount(SocraticErrorAnalysisCard, {
      props: { card: { card_type: 'socratic_error_analysis', verdict: 'wrong' } },
    })
    expect(w.find('.se-head').exists()).toBe(true)
    expect(w.find('.se-row').exists()).toBe(false)
    expect(w.find('.se-quote').exists()).toBe(false)
    expect(w.find('.se-probe').exists()).toBe(false)
  })
})

describe('sgv2 socratic_detour 补课卡与 detour_result', () => {
  const detourCard = {
    card_type: 'socratic_detour',
    session_id: 'sess-9',
    detour_id: 'd1',
    kp_code: 'MATH-X1',
    kp_name: '因式分解',
    worked_example: '**例**：x²-9=(x-3)(x+3)',
    check_question: '把 x²-16 分解因式',
    origin_step: 2,
    reason: '前置缺口（掌握度 30%）',
  }

  it('渲染知识点/缺口原因/工作示例/检验题；回原题与跳过按钮经 tutorAction 白名单值透传', async () => {
    const w = mountBubble(addCard(socraticMsg(), detourCard))
    expect(w.find('.soc-detour').exists()).toBe(true)
    expect(w.text()).toContain('因式分解')
    expect(w.text()).toContain('前置缺口（掌握度 30%）')
    expect(w.text()).toContain('把 x²-16 分解因式')

    const acts = w.findAll('.sd-act')
    expect(acts).toHaveLength(2)
    await acts[0].trigger('click')
    expect(w.emitted('tutorAction')![0]).toEqual(['resume'])
    await acts[1].trigger('click')
    expect(w.emitted('tutorAction')![1]).toEqual(['detour_skip'])
  })

  it('检验题作答：提交 → socraticChoice 载荷为 { text, sessionId, stepNo: null }（走 attempt 判答分流）', async () => {
    const w = mountBubble(addCard(socraticMsg(), detourCard))
    const input = w.find('.sd-input')
    const submit = w.find('.sd-submit')
    expect((submit.element as HTMLButtonElement).disabled).toBe(true) // 空答案禁提交
    await input.setValue('(x-4)(x+4)')
    expect((submit.element as HTMLButtonElement).disabled).toBe(false)
    await submit.trigger('click')
    const evt = w.emitted('socraticChoice')!
    expect(evt).toHaveLength(1)
    expect(evt[0][0]).toMatchObject({ text: '(x-4)(x+4)', sessionId: 'sess-9', stepNo: null })
    expect(w.text()).toContain('已提交')
  })

  it('detour_result 状态条：passed 绿色 / skipped 灰色文案（bridge_text 由相邻文本消息承载不重复）', () => {
    const passed = mountBubble(addCard(socraticMsg(), { card_type: 'socratic_detour_result', status: 'passed' }))
    expect(passed.find('.soc-tag.green').exists()).toBe(true)
    expect(passed.text()).toContain('补课检验通过')

    const skipped = mountBubble(addCard(socraticMsg(), { card_type: 'socratic_detour_result', status: 'skipped' }))
    expect(skipped.text()).toContain('已跳过补课')
  })

  it('补课卡单独 mount：缺 worked_example/check_question 字段时对应块隐藏不崩（历史数据防御）', () => {
    const w = mount(SocraticDetourCard, {
      props: { card: { card_type: 'socratic_detour', session_id: 's', kp_name: '数列', detour_id: 'd2' } },
    })
    expect(w.text()).toContain('数列')
    expect(w.find('.sd-example').exists()).toBe(false)
    expect(w.find('.sd-check').exists()).toBe(false)
    expect(w.findAll('.sd-act')).toHaveLength(2)
  })
})

describe('sgv2 socratic_step_choice 已用态与「我没思路」求助入口', () => {
  const choiceCard = {
    card_type: 'socratic_step_choice',
    session_id: 's1',
    step_no: 1,
    options: ['先确定定义域', '先分别求分子分母的导数'],
    single_issue: true,
    kind: 'opener',
  }

  it('未用态：可点击，emit 载荷带 cardIndex/msgKey（DialogView 在真实发送时置位已用态）', async () => {
    const msg = addCard(socraticMsg(), choiceCard)
    const w = mountBubble(msg)
    const btns = w.findAll('.soc-choice')
    expect(btns).toHaveLength(2)
    expect((btns[0].element as HTMLButtonElement).disabled).toBe(false)
    await btns[1].trigger('click')
    const evt = w.emitted('socraticChoice')!
    expect(evt[0][0]).toMatchObject({
      text: '先分别求分子分母的导数',
      sessionId: 's1',
      stepNo: 1,
      cardIndex: 0,
      msgKey: msg.key,
    })
  })

  it('已用态（DialogView 置位 msg.usedChoices 后）：按钮禁用 + 「已选 ✓」标记，点击不再 emit', async () => {
    const msg = addCard(socraticMsg(), choiceCard)
    msg.usedChoices = [true] // 模拟 DialogView.onSocraticChoice 真实发送后的置位
    const w = mountBubble(msg)
    await nextTick()
    const btns = w.findAll('.soc-choice')
    expect((btns[0].element as HTMLButtonElement).disabled).toBe(true)
    expect(w.find('.soc-choice-used').exists()).toBe(true)
    expect(w.text()).toContain('方向已选')
    await btns[0].trigger('click')
    expect(w.emitted('socraticChoice')).toBeUndefined()
  })

  it('「我没思路」低评判求助入口：emit tutorAction stuck（后端 HELP_REQUEST_RE 强信号直触发 gap 门控）', async () => {
    const w = mountBubble(socraticMsg())
    const stuck = w.findAll('.act.hint').find((b) => b.text() === '我没思路')
    expect(stuck).toBeTruthy()
    expect(stuck!.attributes('title')).toContain('不计入任何评价')
    await stuck!.trigger('click')
    expect(w.emitted('tutorAction')![0]).toEqual(['stuck'])
  })

  it('会话已结束（含完成卡）：求助/提示/答案按钮全部隐藏（防结束后动作掉状态机）', () => {
    const msg = addCard(socraticMsg(), { card_type: 'socratic_complete', outcome: 'guided' })
    const w = mountBubble(msg)
    expect(w.findAll('.act.hint')).toHaveLength(0)
  })
})

describe('sgv2 提示卡五档脚手架名（兼容旧 1-3 级标签）', () => {
  it('scaffold_label=completion → 显示五档名「补全」；旧卡仅 level=2 → 回退「第 2 级（思路方向）」', () => {
    const v2 = mountBubble(addCard(socraticMsg(), { card_type: 'socratic_hint', level: 2, scaffold_label: 'completion' }))
    expect(v2.text()).toContain('补全')

    const legacy = mountBubble(addCard(socraticMsg(), { card_type: 'socratic_hint', level: 2 }))
    expect(legacy.text()).toContain('第 2 级')
    expect(legacy.text()).toContain('思路方向')
  })
})

/**
 * G15（DESIGN §10.4.1）：选项组引导语差异化——消除固定文案「这一步可以从哪儿入手？」复读感。
 * 阶段来源：同消息内更早的 progress 卡 phase > start 卡（opening）> doneMeta.socratic.phase。
 */
describe('sgv2 G15 选项组引导语按 kind/阶段差异化', () => {
  const choice = (extra: Record<string, unknown> = {}) => ({
    card_type: 'socratic_step_choice',
    session_id: 's1',
    step_no: 1,
    options: ['方向甲', '方向乙'],
    single_issue: true,
    kind: 'opener',
    ...extra,
  })

  it('opening 轮（同消息 socratic_start）：「先选个方向试试」', () => {
    const msg = socraticMsg()
    addCard(msg, { card_type: 'socratic_start', steps_count: 4, difficulty: 'medium' })
    addCard(msg, choice())
    const w = mountBubble(msg)
    expect(w.find('.soc-choices-title').text()).toContain('先选个方向试试')
  })

  it('guiding 答错纠偏轮（同消息 progress verdict=wrong）：设计指定文案「换个思路？」', () => {
    const msg = socraticMsg()
    addCard(msg, { card_type: 'socratic_progress', current_step: 2, steps_count: 4, verdict: 'wrong', phase: 'guiding', rounds_used: 3, rounds_limit: 8 })
    addCard(msg, choice({ step_no: 2 }))
    const w = mountBubble(msg)
    expect(w.find('.soc-choices-title').text()).toContain('换个思路')
  })

  it('guiding 答对进新步轮（同消息 progress verdict=correct）：步入语而非「换个思路」', () => {
    const msg = socraticMsg()
    addCard(msg, { card_type: 'socratic_progress', current_step: 3, steps_count: 4, verdict: 'correct', phase: 'guiding', rounds_used: 1, rounds_limit: 8 })
    addCard(msg, choice({ step_no: 3 }))
    const w = mountBubble(msg)
    expect(w.find('.soc-choices-title').text()).toContain('进入下一步')
    expect(w.find('.soc-choices-title').text()).not.toContain('换个思路')
  })

  it('replay（历史步回点）：「回到这一步」区分保留', () => {
    const w = mountBubble(addCard(socraticMsg(), choice({ kind: 'replay' })))
    expect(w.find('.soc-choices-title').text()).toContain('回到这一步')
  })

  it('后端随卡下发自定义引导语（lead 字段）：原样展示优先于阶段默认文案', () => {
    const w = mountBubble(addCard(socraticMsg(), choice({ lead: '结合判别式想想，选个突破口' })))
    expect(w.find('.soc-choices-title').text()).toBe('结合判别式想想，选个突破口')
  })

  it('lead 缺失回退 guide_text 字段（防御两种字段名）；两字段均空走默认', () => {
    const byGuide = mountBubble(addCard(socraticMsg(), choice({ guide_text: '先审题，再选' })))
    expect(byGuide.find('.soc-choices-title').text()).toBe('先审题，再选')

    const fallback = mountBubble(addCard(socraticMsg(), choice()))
    expect(fallback.find('.soc-choices-title').text()).toContain('换个思路')
  })
})

/**
 * G8（main.py:_start_placement）：placement 微评估复用 socratic_detour 卡（kind="placement"），
 * 动作值协议不变（resume/detour_skip），按钮语义翻转——文案必须随语境切换。
 */
describe('sgv2 G8 placement 微评估卡语义翻转', () => {
  const placementCard = {
    card_type: 'socratic_detour',
    kind: 'placement',
    session_id: 's1',
    detour_id: 'placement-abc',
    kp_code: 'MATH-G2-1',
    kp_name: '因式分解',
    worked_example: '',
    check_question: '把 x²-16 分解因式',
    origin_step: 1,
    reason: '开前测小题（不是考试，看看基础在不在）',
  }

  it('标题/检验语/按钮文案全部切换为评估语境；不渲染空工作示例', () => {
    const w = mountBubble(addCard(socraticMsg(), placementCard))
    expect(w.find('.soc-detour.is-placement').exists()).toBe(true)
    expect(w.text()).toContain('先花 30 秒测一下：因式分解')
    expect(w.text()).toContain('不是考试')
    expect(w.text()).toContain('不测了，直接开始做题')
    expect(w.text()).toContain('跳过测试，直接看 5 分钟补课')
    expect(w.text()).not.toContain('先补 5 分钟')
    expect(w.find('.sd-example').exists()).toBe(false)
  })

  it('动作值协议不变：resume/detour_skip 原样透传（后端 main.py:679-693 按语义分流）', async () => {
    const w = mountBubble(addCard(socraticMsg(), placementCard))
    const acts = w.findAll('.sd-act')
    await acts[0].trigger('click')
    await acts[1].trigger('click')
    expect(w.emitted('tutorAction')![0]).toEqual(['resume'])
    expect(w.emitted('tutorAction')![1]).toEqual(['detour_skip'])
  })

  it('正式补课卡（无 kind）维持既有「先补 5 分钟」文案', () => {
    const w = mountBubble(addCard(socraticMsg(), {
      ...placementCard, kind: undefined, worked_example: '**例**：x²-9=(x-3)(x+3)', reason: '前置缺口',
    }))
    expect(w.find('.soc-detour.is-placement').exists()).toBe(false)
    expect(w.text()).toContain('先补 5 分钟：因式分解')
    expect(w.text()).toContain('跳过补课，看这步怎么做')
  })
})

/**
 * G9/G13 配套（DESIGN §10.4.2）：完成卡补课记录回显 + blocked 缺口推导
 * （与后端 policy.detour_blocked_kps 同口径：同 kp failed/skipped ≥2 → 不再绕行）。
 */
describe('sgv2 完成卡 blocked 缺口回显', () => {
  const complete = (detourSummary: any[]) =>
    mount(SocraticCompleteCard, {
      props: { card: { card_type: 'socratic_complete', outcome: 'guided', detour_summary: detourSummary } },
    })

  it('同 kp 两次 skipped → 显示「不再绕行」blocked 行（后端 plan.detour_blocked 语义）', () => {
    const w = complete([
      { kp_name: '因式分解', status: 'skipped', rounds: 1 },
      { kp_name: '因式分解', status: 'failed', rounds: 2 },
    ])
    expect(w.find('.sc-detour-blocked').exists()).toBe(true)
    expect(w.text()).toContain('因式分解')
    expect(w.text()).toContain('不再绕行')
  })

  it('单次 failed/skipped 或 passed → 不显示 blocked 行（未达阈值不预警）', () => {
    const w = complete([
      { kp_name: '因式分解', status: 'failed', rounds: 1 },
      { kp_name: '配方法', status: 'passed', rounds: 1 },
      { kp_name: '配方法', status: 'passed', rounds: 1 },
    ])
    expect(w.find('.sc-detour-blocked').exists()).toBe(false)
    expect(w.text()).toContain('检验通过')
  })

  it('无补课记录 → 摘要与 blocked 行都不渲染', () => {
    const w = complete([])
    expect(w.find('.sc-detours').exists()).toBe(false)
    expect(w.find('.sc-detour-blocked').exists()).toBe(false)
  })
})

/**
 * sgv2（DESIGN §6.5/§8.2，A10）：历史回显同构——V2 卡族经 envelope.blocks 落库
 * （GET /conversations/{id}/messages）还原后必须与实时流渲染同构，且选项已用态由
 * markHistoryUsedChoices 从「紧随的用户消息 rawText/text == 选项原文」确定性还原。
 */
describe('sgv2 V2 卡族历史回显同构（fromHistory + markHistoryUsedChoices）', () => {
  const historyAssistant = {
    id: 'h-1',
    role: 'assistant',
    envelope: {
      msg_id: 'm-1',
      meta: { skill: 'socratic_solver' },
      blocks: [
        { type: 'markdown', content: '你写「先随便代入几个 x 看函数值」——极值点两侧真正改变符号的是哪一个量？' },
        { type: 'card', data: { card_type: 'socratic_progress', current_step: 1, steps_count: 4, verdict: 'wrong', phase: 'guiding', scaffold_level: 1, scaffold_label: 'focused_scaffold', kp_name: '导数与极值', mastery_state: 'weak', rounds_used: 1, rounds_limit: 8 } },
        { type: 'card', data: { card_type: 'socratic_error_analysis', verdict: 'wrong', misconception_zh: '思路逻辑问题', error_move: '没先求导，想靠代点找极值', evidence_quote: '先随便代入几个 x 看函数值', kp_name: '导数与极值', probe_question: '极值点两侧真正改变符号的是哪一个量？' } },
        { type: 'card', data: { card_type: 'socratic_step_choice', session_id: 's1', step_no: 1, options: ['先求导数，找驻点', '先随便代入几个 x 看函数值', '先画一个大概的图象'], single_issue: true, kind: 'opener' } },
      ],
    },
  }
  const historyUser = {
    id: 'h-0',
    role: 'user',
    envelope: { blocks: [{ type: 'markdown', content: '先随便代入几个 x 看函数值' }] },
  }

  it('envelope.blocks 还原：progress/error_analysis/step_choice 三卡齐全且可渲染（与实时流同构）', () => {
    const msg = fromHistory(historyAssistant)
    const w = mount(MessageBubble, { props: { msg } })
    expect(w.find('.soc-progress').exists()).toBe(true)
    expect(w.text()).toContain('第 1/4 步')
    expect(w.find('.soc-err.is-wrong').exists()).toBe(true)
    expect(w.text()).toContain('没先求导，想靠代点找极值')
    const btns = w.findAll('.soc-choice')
    expect(btns).toHaveLength(3)
    // 旧历史缺 usedChoices：未用态可点击（防御，不误置灰）
    expect((btns[0].element as HTMLButtonElement).disabled).toBe(false)
  })

  it('markHistoryUsedChoices：紧随用户消息文本 == 选项原文 → 该卡置灰 + 「已选 ✓」（刷新后仍在）', () => {
    const items = [historyAssistant, historyUser].map(fromHistory)
    markHistoryUsedChoices(items)
    const w = mount(MessageBubble, { props: { msg: items[0] } })
    const btns = w.findAll('.soc-choice')
    expect((btns[1].element as HTMLButtonElement).disabled).toBe(true)
    expect(w.find('.soc-choice-used').exists()).toBe(true)
    expect(w.find('.soc-choices-title').text()).toContain('方向已选')
    // G15：已用态引导语切换（模型层还原 → 渲染层联动）
  })

  it('历史用户消息文本与选项不一致 → 不误标已用态（检验题作答/普通输入不触发）', () => {
    const items = [historyAssistant, { ...historyUser, envelope: { blocks: [{ type: 'markdown', content: '(x-4)(x+4)' }] } }].map(fromHistory)
    markHistoryUsedChoices(items)
    const w = mount(MessageBubble, { props: { msg: items[0] } })
    expect(w.find('.soc-choice-used').exists()).toBe(false)
  })

  it('detour/detour_result/complete 卡族历史还原同构渲染', () => {
    const msg = fromHistory({
      id: 'h-2',
      role: 'assistant',
      envelope: {
        meta: { skill: 'socratic_solver' },
        blocks: [
          { type: 'card', data: { card_type: 'socratic_detour', kind: 'detour', detour_id: 'd1', kp_name: '因式分解', worked_example: '**例**：x²-9=(x-3)(x+3)', check_question: '把 x²-16 分解因式。', origin_step: 1, reason: '前置缺口' } },
          { type: 'card', data: { card_type: 'socratic_detour_result', detour_id: 'd1', status: 'passed' } },
          { type: 'card', data: { card_type: 'socratic_complete', outcome: 'guided', mastery_delta: [{ kp_code: 'K1', kp_name: '导数与极值', before: 0.35, after: 0.62 }], detour_summary: [{ kp_name: '因式分解', status: 'passed', rounds: 1 }], misconceptions: { logic: 1 } } },
        ],
      },
    })
    const w = mount(MessageBubble, { props: { msg } })
    expect(w.find('.soc-detour').exists()).toBe(true)
    expect(w.find('.soc-tag.green').exists()).toBe(true)
    expect(w.find('.soc-complete').exists()).toBe(true)
    expect(w.text()).toContain('62%')
    expect(w.text()).toContain('检验通过')
    // 会话结束：求助/提示/答案按钮隐藏（历史回显同构，防结束后动作掉状态机）
    expect(w.findAll('.act.hint')).toHaveLength(0)
  })
})

/**
 * sgv2（DESIGN §8.2）：markChoiceUsed——DialogView/DualView 共用的已用态置位契约
 * （模型层单一事实源）。真实发送（流式守卫通过）时调用；幂等、防御非法参数。
 */
describe('sgv2 markChoiceUsed 已用态置位契约（双视图共用）', () => {
  const msg = (): AnyMsg => {
    const m: AnyMsg = newAssistantMsg('cm-x')
    m.key = 'a_test'
    m.cards = [{ card_type: 'socratic_step_choice', options: ['甲', '乙'] }, { card_type: 'socratic_progress' }]
    return m
  }

  it('置位后 isChoiceUsed 生效形状：usedChoices[cardIndex]=true，可重复调用（幂等）', () => {
    const messages = [msg()]
    markChoiceUsed(messages, 'a_test', 0)
    markChoiceUsed(messages, 'a_test', 0)
    expect(messages[0].usedChoices).toEqual([true])
  })

  it('消息不存在 / 非法 cardIndex / 非数组入参：静默不抛', () => {
    expect(() => markChoiceUsed([msg()], 'missing', 0)).not.toThrow()
    expect(() => markChoiceUsed([msg()], 'a_test', -1)).not.toThrow()
    expect(() => markChoiceUsed([msg()], 'a_test', 1.5)).not.toThrow()
    expect(() => markChoiceUsed(undefined as any, 'a_test', 0)).not.toThrow()
    const messages = [msg()]
    expect(messages[0].usedChoices).toEqual([])
  })

  it('usedChoices 缺失（旧消息对象）时补建数组再置位', () => {
    const m = msg()
    delete (m as any).usedChoices
    const messages = [m]
    markChoiceUsed(messages, 'a_test', 1)
    expect(messages[0].usedChoices).toEqual([undefined, true])
  })
})
