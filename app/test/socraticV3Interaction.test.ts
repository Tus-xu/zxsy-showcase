/**
 * sgv3 引导链路 V3 · 统一交互信封与免打字形态组件测试（CHAIN-DESIGN §5/§6 前端落地）
 *
 * 覆盖（全部离线 jsdom，卡 payload 按 CHAIN-DESIGN §6.1 下行协议构造）：
 * 1. 信封归约：socratic_interaction / socratic_need_problem / socratic_tier_shift 三新卡
 *    经 applySseEvent('card') → mergeCardInto 既有路径入列，fromHistory blocks 还原同构；
 * 2. STAGE_ZH / FORM_ZH / summarizeInteraction（文本化摘要 = message 字段双用途）；
 * 3. SocraticInteractionCard 信封壳：form 分发 / prompt_lead / reason 徽标 / 打字回退 /
 *    跳过 / 已用态置灰；
 * 4. 九种免打字形态组件提交 payload 形状（§5.1-5.9 逐形式）+ ExprAssembler 零键盘拼装；
 * 5. MessageBubble 三新卡分发 + interactionSubmit/needProblem 事件载荷 +
 *    choiceLead 扩 reading/planning 语境（G15 遗留补全）；
 * 6. 已用态：markInteractionUsed + markHistoryUsedChoices 扩展（历史回显确定性还原）；
 * 7. SocraticDetourCard 检验题嵌入 cloze/assemble（打字回退保留）；
 * 8. SocraticCompleteCard 第五出口「出一道考考 AI」（四出口 KEEP）。
 */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import MessageBubble from '@/components/chat/MessageBubble.vue'
import SocraticInteractionCard from '@/components/chat/SocraticInteractionCard.vue'
import SocraticDetourCard from '@/components/chat/SocraticDetourCard.vue'
import SocraticCompleteCard from '@/components/chat/SocraticCompleteCard.vue'
import AnnotateCanvas from '@/components/chat/interaction/AnnotateCanvas.vue'
import TriageBoard from '@/components/chat/interaction/TriageBoard.vue'
import RestateCheck from '@/components/chat/interaction/RestateCheck.vue'
import SequenceBoard from '@/components/chat/interaction/SequenceBoard.vue'
import ExprAssembler from '@/components/chat/interaction/ExprAssembler.vue'
import ClozeFill from '@/components/chat/interaction/ClozeFill.vue'
import ErrorHunter from '@/components/chat/interaction/ErrorHunter.vue'
import SelfexPick from '@/components/chat/interaction/SelfexPick.vue'
import RouteCommit from '@/components/chat/interaction/RouteCommit.vue'
import {
  FORM_ZH, STAGE_ZH, applySseEvent, fromHistory, markHistoryUsedChoices,
  markInteractionUsed, newAssistantMsg, summarizeInteraction,
} from '@/components/chat/messageModel'

type AnyMsg = any

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

/** §6.1 信封样例（assemble 语境，spec 按 §5.6） */
const envelopeCard = {
  card_type: 'socratic_interaction',
  session_id: 'sess-3',
  step_no: 3,
  interaction_id: 'ix_01J8TEST',
  form: 'assemble',
  move: 'elicit',
  stage: 'guiding',
  prompt_lead: '把这一步的变形拼出来',
  spec: { seed_latex: '2x - 3 = 7', slots: [{ id: 's1', kind: 'expr' }], palette: [], structure_hint: '等式两边同时 +3' },
  allow_text_fallback: true,
  allow_skip: true,
  skip_label: '不知道怎么拼',
  interaction_reason: 'guiding×elicit×T1×algebra→assemble[R9]',
}

/* ================= 1. 信封归约（SSE card → mergeCardInto 既有路径） ================= */
describe('sgv3 信封归约：三新卡入列与历史同构', () => {
  it('applySseEvent card：socratic_interaction/need_problem/tier_shift 三卡均入 msg.cards（归约零改动）', () => {
    const msg = socraticMsg()
    addCard(msg, envelopeCard)
    addCard(msg, { card_type: 'socratic_need_problem', entries: [{ kind: 'upload', label: '📷 拍照上传题目', action: 'trigger_upload' }], hint: '把题目给我' })
    addCard(msg, { card_type: 'socratic_tier_shift', direction: 'up', from: 1, to: 2, text: '这两步你独立拿下' })
    expect(msg.cards).toHaveLength(3)
    expect(msg.cards[0].form).toBe('assemble')
  })

  it('fromHistory envelope.blocks 还原：三新卡与实时流同构渲染（A11 向后兼容）', () => {
    const msg = fromHistory({
      id: 'h-1',
      role: 'assistant',
      envelope: {
        meta: { skill: 'socratic_solver' },
        blocks: [
          { type: 'card', data: { ...envelopeCard, step_no: 3 } },
          { type: 'card', data: { card_type: 'socratic_need_problem', entries: [], hint: '把题目给我' } },
          { type: 'card', data: { card_type: 'socratic_tier_shift', direction: 'down', from: 2, to: 1, text: '拆小一点' } },
        ],
      },
    })
    const w = mountBubble(msg)
    expect(w.find('.soc-ix').exists()).toBe(true)
    expect(w.find('.soc-needprob').exists()).toBe(true)
    expect(w.find('.soc-tier-shift.down').exists()).toBe(true)
    // 未知事件静默铁律（messageModel.js:185-186）不受新卡影响
    const m2 = socraticMsg()
    expect(() => applySseEvent(m2, 'future_unknown_event', {})).not.toThrow()
  })
})

/* ================= 2. 常量与摘要纯函数 ================= */
describe('sgv3 STAGE_ZH / FORM_ZH / summarizeInteraction', () => {
  it('STAGE_ZH 四子阶段中文名；FORM_ZH 九形式 + choice/free_text', () => {
    expect(STAGE_ZH.reading).toBe('读题理解')
    expect(STAGE_ZH.planning).toBe('拆解思路')
    expect(STAGE_ZH.reflecting).toBe('复盘反思')
    expect(STAGE_ZH.transfer).toBe('迁移出题')
    for (const f of ['annotate', 'triage', 'restate_check', 'sequence', 'route_commit', 'assemble', 'cloze', 'errorhunt', 'selfex']) {
      expect((FORM_ZH as Record<string, string>)[f]).toBeTruthy()
    }
    expect(FORM_ZH.choice).toBe('思路选择')
  })

  it('summarizeInteraction：assemble 双发 tokens 拼摘要（§6.2 message 字段样例「[拼装] 2x」）', () => {
    expect(summarizeInteraction('assemble', {}, { s1: { tokens: ['2', 'x'], latex: '2x' } })).toBe('[拼装] 2 x')
  })

  it('summarizeInteraction：restate/triage/sequence/errorhunt 摘要含关键作答内容（LLM 兜底判答输入）', () => {
    expect(summarizeInteraction('restate_check', {}, { bad_sentence: 1 })).toBe('[挑错] 第 2 句读错了')
    expect(summarizeInteraction('restate_check', {}, { all_correct: true })).toBe('[挑错] AI 复述全部正确')
    expect(
      summarizeInteraction('triage', { bins: ['已知', '要求', '无关'] }, { assignment: { c1: '已知', c2: '要求', d1: '无关' } }),
    ).toBe('[分拣] 已知1 · 要求1 · 无关1')
    expect(
      summarizeInteraction('sequence', { cards: [{ id: 'k1', text: '先求对称轴' }, { id: 'k2', text: '讨论区间位置' }] }, { order: ['k1', 'k2'], excluded: ['d1'] }),
    ).toBe('[排序] 先求对称轴 → 讨论区间位置')
    expect(
      summarizeInteraction('errorhunt', { lines: [{ id: 'L1' }, { id: 'L2' }], cause_options: [{ text: '漏讨论' }] }, { bad_line: 'L2', cause_choice: 0 }),
    ).toBe('[找错] 第 2 行开始错（漏讨论）')
    expect(summarizeInteraction('unknown_form', {}, {})).toBe('[unknown_form] 已提交')
  })
})

/* ================= 3. 信封壳 SocraticInteractionCard ================= */
describe('sgv3 SocraticInteractionCard 信封壳', () => {
  it('渲染 stage 徽标 + prompt_lead + 形式徽标（title=interaction_reason 可观测）', () => {
    const w = mount(SocraticInteractionCard, { props: { card: envelopeCard } })
    expect(w.find('.si-stage').text()).toBe('引导推导')
    expect(w.find('.si-lead').text()).toBe('把这一步的变形拼出来')
    const badge = w.find('.si-form')
    expect(badge.text()).toBe('表达式拼装')
    expect(badge.attributes('title')).toBe('guiding×elicit×T1×algebra→assemble[R9]')
    expect(w.attributes('data-soc-ix-form')).toBe('assemble')
  })

  it('form 分发：cloze 卡渲染 ClozeFill 子组件；打字回退与跳过均 emit', async () => {
    const card = {
      ...envelopeCard,
      form: 'cloze',
      stage: 'detour',
      prompt_lead: '把公式补全',
      spec: { body_latex: '开口方向由 $a$ 决定：$a$ □_1 0', blanks: [{ id: 'b1', answer_kind: 'relation' }], palette_by_blank: { b1: ['>', '<'] } },
    }
    const w = mount(SocraticInteractionCard, { props: { card } })
    expect(w.findComponent(ClozeFill).exists()).toBe(true)
    // 跳过（allow_skip=true）
    await w.find('.si-skip').trigger('click')
    expect(w.emitted('skip')![0]).toEqual(['不知道怎么拼'])
    // 打字回退（allow_text_fallback 缺省允许）
    await w.find('.si-input').setValue('a 大于 0')
    await w.find('.si-send').trigger('click')
    expect(w.emitted('text')![0]).toEqual(['a 大于 0'])
  })

  it('未知 form → 降级提示 + 打字回退可用，绝不白屏（R21 精神）', () => {
    const w = mount(SocraticInteractionCard, { props: { card: { ...envelopeCard, form: 'future_form' } } })
    expect(w.find('.si-unknown').exists()).toBe(true)
    expect(w.find('.si-input').exists()).toBe(true)
  })

  it('已用态（used）：交互区置灰禁点 + 「已作答 ✓」标记，submit/text 不再 emit', async () => {
    const w = mount(SocraticInteractionCard, { props: { card: envelopeCard, used: true } })
    expect(w.find('.si-body.is-used').exists()).toBe(true)
    expect(w.find('.si-usedmark').text()).toContain('已作答')
    expect(w.find('.si-input').exists()).toBe(false)
  })

  it('提交：emit submit {summary, payload, spentMs≥0}（视图组 tutor_interaction）', async () => {
    const w = mount(SocraticInteractionCard, {
      props: {
        card: {
          ...envelopeCard,
          form: 'restate_check',
          spec: { portrait: ['已知：二次函数', '要求：求参数 a'], flawed: true },
        },
      },
    })
    const sentences = w.findAll('.ix-rs-sent')
    await sentences[1].trigger('click')
    await w.find('.ix-submit').trigger('click')
    const evt = w.emitted('submit')! as any[][]
    expect(evt).toHaveLength(1)
    expect(evt[0][0]).toMatchObject({ summary: '[挑错] 第 2 句读错了', payload: { bad_sentence: 1 } })
    expect(evt[0][0].spentMs).toBeGreaterThanOrEqual(0)
  })
})

/* ================= 4. 九种形态组件 payload（§5.1-5.9） ================= */
describe('sgv3 形态组件提交 payload 形状', () => {
  it('annotate(tokens)：点选两个 token → selected_tokens 两个单区间；再点取消', async () => {
    const w = mount(AnnotateCanvas, {
      props: {
        spec: {
          mode: 'tokens',
          canvas: { type: 'tokens', text: '已知 f(x)=x²', tokens: ['已知', 'f(x)', '=', 'x²'] },
          targets_hint: ['已知条件', '要求的量'],
          n_expected: 2,
        },
      },
    })
    const toks = w.findAll('.ix-an-tok')
    await toks[0].trigger('pointerdown')
    await toks[0].trigger('pointerup')
    await toks[3].trigger('pointerdown')
    await toks[3].trigger('pointerup')
    await w.find('.ix-submit').trigger('click')
    expect(w.emitted('submit')![0][0]).toEqual({ selected_tokens: [[0, 0], [3, 3]] })
    expect(w.text()).toContain('已圈 2 处')
    expect(w.text()).toContain('圈出：已知条件 / 要求的量')
  })

  it('annotate(figure)：坐标范围可映射 → SVG 命中点点选 picked_regions；范围缺失 → 点选按钮降级', async () => {
    const svg = mount(AnnotateCanvas, {
      props: {
        spec: {
          mode: 'figure',
          canvas: { type: 'figure', figure_params: { x_range: [-1, 5], y_range: [-2, 4] }, hit_regions: [{ id: 'r1', kind: 'point', x: 2, y: 1, radius: 0.3 }, { id: 'r2', kind: 'vertex', x: 0, y: 0 }] },
        },
      },
    })
    await svg.findAll('.ix-an-region')[1].trigger('click')
    await svg.find('.ix-submit').trigger('click')
    expect(svg.emitted('submit')![0][0]).toEqual({ picked_regions: ['r2'] })

    const degraded = mount(AnnotateCanvas, {
      props: { spec: { mode: 'figure', canvas: { type: 'figure', hit_regions: [{ id: 'r1', kind: 'point', x: 2, y: 1, label: '顶点' }] } } },
    })
    expect(degraded.find('.ix-an-regionlist').exists()).toBe(true)
    await degraded.find('.ix-an-regionbtn').trigger('click')
    await degraded.find('.ix-submit').trigger('click')
    expect(degraded.emitted('submit')![0][0]).toEqual({ picked_regions: ['r1'] })
  })

  it('triage：点卡→点栏分拣全部卡片 → assignment；pre_sorted 示范卡锁定不可移', async () => {
    const w = mount(TriageBoard, {
      props: {
        spec: {
          cards: [
            { id: 'c1', text: 'AB ⊥ AD' },
            { id: 'c2', text: '求三棱锥体积' },
            { id: 'd1', text: '今天天气很好' },
          ],
          bins: ['已知', '要求', '无关'],
          pre_sorted: ['c1'],
        },
      },
    })
    // c1 示范卡已预放「已知」且锁定
    expect(w.find('.ix-tr-bincard.locked').text()).toContain('AB ⊥ AD')
    const poolCards = () => w.findAll('.ix-tr-card')
    const bins = w.findAll('.ix-tr-bin')
    // c2 → 要求；d1 → 无关（点卡 → 点栏）
    await poolCards()[0].trigger('click')
    await bins[1].trigger('click')
    await poolCards()[0].trigger('click')
    await bins[2].trigger('click')
    await w.find('.ix-submit').trigger('click')
    expect(w.emitted('submit')![0][0]).toEqual({
      assignment: { c1: '已知', c2: '要求', d1: '无关' },
    })
  })

  it('sequence：排 2 步 + 干扰卡弃置 → {order, excluded}（点选降级不依赖 DnD）', async () => {
    const w = mount(SequenceBoard, {
      props: {
        spec: {
          cards: [
            { id: 'k1', text: '求对称轴' },
            { id: 'k2', text: '讨论区间位置' },
            { id: 'd1', text: '直接套顶点公式' },
          ],
          slots: 2,
          note: '有 1 张卡是弯路',
        },
      },
    })
    expect(w.text()).toContain('有 1 张卡是弯路')
    // 第一张池卡（k1）→ 放入下一步
    await w.findAll('.ix-sq-card')[0].trigger('click')
    await w.find('.ix-sq-mini.primary').trigger('click')
    // 剩余池卡（k2）→ 放入
    await w.findAll('.ix-sq-card')[0].trigger('click')
    await w.find('.ix-sq-mini.primary').trigger('click')
    // 最后一张（d1 干扰）→ 标为弯路
    await w.findAll('.ix-sq-card')[0].trigger('click')
    await w.find('.ix-sq-mini.warn').trigger('click')
    expect(w.find('.ix-sq-dcard').text()).toContain('直接套顶点公式')
    await w.find('.ix-submit').trigger('click')
    expect(w.emitted('submit')![0][0]).toEqual({ order: ['k1', 'k2'], excluded: ['d1'] })
  })

  it('assemble：纯点选零键盘完成拼装「2x」→ {s1:{tokens, latex}} 双发；>12 token 锁面板', async () => {
    const w = mount(ExprAssembler, {
      props: { spec: { seed_latex: '2x - 3 = 7', slots: [{ id: 's1', kind: 'expr' }], palette: [{ t: 'num', v: '2' }, { t: 'var', v: 'x' }, { t: 'op', v: '=' }, { t: 'tmpl', v: 'frac' }], structure_hint: '两边同时 +3' } },
    })
    expect(w.find('input').exists()).toBe(false) // 零键盘：无 input 元素
    const keys = w.findAll('.ix-as-key')
    const keyOf = (v: string) => keys.find((k) => k.text() === v)!
    await keyOf('2').trigger('click')
    await keyOf('x').trigger('click')
    await w.find('.ix-submit').trigger('click')
    const payload = w.emitted('submit')![0][0] as any
    expect(payload.s1.tokens).toEqual(['2', 'x'])
    expect(payload.s1.latex).toBe('2x')
    // 上限锁定：点到 12 个原子后面板禁用（R21 防「打字模拟器」）
    const limited = mount(ExprAssembler, { props: { spec: {} } })
    for (let i = 0; i < 12; i++) await limited.findAll('.ix-as-key')[0].trigger('click')
    expect(limited.find('.ix-as-palette.locked').exists()).toBe(true)
    expect(limited.text()).toContain('直接用打字')
  })

  it('cloze：$□_1$ 归一 + 逐空点选 → {blanks:{b1,b2}}（faded worked example）', async () => {
    const w = mount(ClozeFill, {
      props: {
        spec: {
          body_latex: '开口方向由 $a$ 的符号决定：$a$ $□_1$ 0 时开口向 $□_2$',
          blanks: [{ id: 'b1', answer_kind: 'relation' }, { id: 'b2', answer_kind: 'word' }],
          palette_by_blank: { b1: ['>', '<', '≥', '≤', '='], b2: ['上', '下'] },
        },
      },
    })
    const blanks = w.findAll('.ix-cz-blank')
    expect(blanks).toHaveLength(2)
    await blanks[0].trigger('click')
    await w.findAll('.ix-cz-opt')[0].trigger('click') // '>'
    await w.findAll('.ix-cz-blank')[1].trigger('click')
    const opts2 = w.findAll('.ix-cz-opt')
    await opts2[opts2.length - 1].trigger('click') // '下'
    await w.find('.ix-submit').trigger('click')
    expect(w.emitted('submit')![0][0]).toEqual({ blanks: { b1: '>', b2: '下' } })
  })

  it('errorhunt：行点选 + 错因点选 → {bad_line, cause_choice} 双确定性判定输入', async () => {
    const w = mount(ErrorHunter, {
      props: {
        spec: {
          lines: [
            { id: 'L1', latex: '由 $a>0$，开口向上' },
            { id: 'L2', latex: '对称轴 $x=a$，故最大值在 $x=a$ 处' },
          ],
          ask: '我从哪一步开始走错了？',
          cause_options: [{ text: '漏了对称轴是否在区间内的讨论' }, { text: '顶点公式记错' }],
        },
      },
    })
    // 未选行时无错因面板、不可提交
    expect(w.find('.ix-eh-causes').exists()).toBe(false)
    expect((w.find('.ix-submit').element as HTMLButtonElement).disabled).toBe(true)
    await w.findAll('.ix-eh-line')[1].trigger('click')
    await w.findAll('.ix-eh-cause')[0].trigger('click')
    await w.find('.ix-submit').trigger('click')
    expect(w.emitted('submit')![0][0]).toEqual({ bad_line: 'L2', cause_choice: 0 })
  })

  it('selfex：理由选择 + 依据二次点击（require_evidence）→ {chosen, evidence}', async () => {
    const w = mount(SelfexPick, {
      props: {
        spec: {
          stem: '为什么先讨论对称轴与区间的位置关系？',
          options: [{ text: '最值取在端点还是顶点取决于对称轴位置' }, { text: '顶点公式更简单' }],
          require_evidence: true,
          evidence_options: [{ text: '题目给了闭区间 [1,3]' }, { text: 'a>0' }],
        },
      },
    })
    await w.findAll('.ix-sx-opt')[0].trigger('click')
    expect(w.find('.ix-sx-evi').exists()).toBe(true) // 二次点击依据层出现
    expect((w.find('.ix-submit').element as HTMLButtonElement).disabled).toBe(true) // 依据未选不可提交
    await w.findAll('.ix-sx-eopt')[0].trigger('click')
    await w.find('.ix-submit').trigger('click')
    expect(w.emitted('submit')![0][0]).toEqual({ chosen: 0, evidence: 0 })
  })

  it('route_commit：押注 + 必跟理由点选（R8）→ {wager, reason}', async () => {
    const w = mount(RouteCommit, {
      props: {
        spec: {
          routes: [{ id: 'A', text: '先画草图看对称轴位置' }, { id: 'B', text: '直接分三类代端点与顶点' }],
          require_reason: true,
          reason_options: [{ text: '对称轴位置决定最值位置' }, { text: '分类讨论是通法' }],
        },
      },
    })
    await w.findAll('.ix-rt-route')[1].trigger('click')
    await w.findAll('.ix-rt-reason')[0].trigger('click')
    await w.find('.ix-submit').trigger('click')
    expect(w.emitted('submit')![0][0]).toEqual({ wager: 'B', reason: 0 })
  })
})

/* ================= 5. MessageBubble 分发与事件载荷 ================= */
describe('sgv3 MessageBubble 三新卡分发', () => {
  it('socratic_interaction：子组件提交 → interactionSubmit 载荷含 interaction_id/form/session_id/cardIndex/msgKey', async () => {
    const msg = addCard(socraticMsg(), {
      ...envelopeCard,
      form: 'route_commit',
      step_no: 0,
      spec: { routes: [{ id: 'A', text: '先画草图' }, { id: 'B', text: '分类代入' }], require_reason: false },
    })
    const w = mountBubble(msg)
    await w.findAll('.ix-rt-route')[0].trigger('click')
    await w.find('.ix-submit').trigger('click')
    const evt = w.emitted('interactionSubmit')! as any[][]
    expect(evt).toHaveLength(1)
    expect(evt[0][0]).toMatchObject({
      interactionId: 'ix_01J8TEST',
      form: 'route_commit',
      sessionId: 'sess-3',
      stepNo: null, // step_no=0（reading/planning）→ 不带步号
      cardIndex: 0,
      msgKey: msg.key,
    })
    expect(evt[0][0].payload).toEqual({ wager: 'A' })
    expect(evt[0][0].summary).toContain('先画草图')
  })

  it('打字回退/跳过 → socraticChoice（attempt 兜底，sessionId/stepNo 透传）', async () => {
    const msg = addCard(socraticMsg(), envelopeCard)
    const w = mountBubble(msg)
    await w.find('.si-input').setValue('=10 右边')
    await w.find('.si-send').trigger('click')
    expect(w.emitted('socraticChoice')![0][0]).toMatchObject({ text: '=10 右边', sessionId: 'sess-3', stepNo: 3 })
    await w.find('.si-skip').trigger('click')
    expect(w.emitted('socraticChoice')![1][0]).toMatchObject({ text: '不知道怎么拼', stepNo: 3 })
  })

  it('socratic_need_problem 门禁卡：四入口按钮 → needProblem emit（data 属性可断言）', async () => {
    const msg = addCard(socraticMsg(), {
      card_type: 'socratic_need_problem',
      entries: [
        { kind: 'upload', label: '📷 拍照上传题目', action: 'trigger_upload' },
        { kind: 'type', label: '⌨️ 把题目打出来', action: 'focus_input' },
        { kind: 'pick', label: '📚 从题库挑一道', action: 'open_kp_picker' },
        { kind: 'quiz', label: '🎲 让 AI 出一道再带我解', action: 'route_quiz' },
      ],
      hint: '把题目给我，我才能带你解——拍照、贴题、选题、AI 出题都行',
    })
    const w = mountBubble(msg)
    expect(w.find('[data-soc-need-problem]').exists()).toBe(true)
    const btns = w.findAll('.np-btn')
    expect(btns).toHaveLength(4)
    await btns[3].trigger('click')
    expect(w.emitted('needProblem')![0]).toEqual(['route_quiz'])
  })

  it('socratic_tier_shift：up/down 换挡宣告（四档人设文案 陪拆/搭手架/递工具/当裁判）', () => {
    const up = mountBubble(addCard(socraticMsg(), { card_type: 'socratic_tier_shift', direction: 'up', from: 1, to: 2, text: '这两步你独立拿下，我把架子撤了' }))
    expect(up.find('.soc-tier-shift.up').exists()).toBe(true)
    expect(up.text()).toContain('搭手架 → 递工具')
    expect(up.text()).toContain('我把架子撤了')
    const down = mountBubble(addCard(socraticMsg(), { card_type: 'socratic_tier_shift', direction: 'down', from: 2, to: 1, text: '这步有点难，我陪你拆小一点' }))
    expect(down.find('.soc-tier-shift.down').exists()).toBe(true)
    expect(down.text()).toContain('递工具 → 搭手架')
  })

  it('choiceLead 扩 reading/planning 语境：同消息 interaction 卡 stage 带动选项卡引导语（G15 遗留）', () => {
    const readingMsg = socraticMsg()
    addCard(readingMsg, { card_type: 'socratic_start', steps_count: 4, stage: 'reading' })
    addCard(readingMsg, { card_type: 'socratic_step_choice', session_id: 's1', step_no: 0, options: ['二次函数最值', '数列求和'], kind: 'opener' })
    const reading = mountBubble(readingMsg)
    expect(reading.find('.soc-choices-title').text()).toContain('最像哪一类')

    const planningMsg = socraticMsg()
    addCard(planningMsg, { card_type: 'socratic_progress', current_step: 1, steps_count: 4, phase: 'opening', stage: 'planning', verdict: 'correct', rounds_used: 1, rounds_limit: 8 })
    addCard(planningMsg, { card_type: 'socratic_step_choice', session_id: 's1', step_no: 0, options: ['路线甲', '路线乙'], kind: 'opener' })
    const planning = mountBubble(planningMsg)
    expect(planning.find('.soc-choices-title').text()).toContain('押一条')

    // 后端 lead 下发仍最高优先（不回归 G15 既有行为）
    const leadMsg = socraticMsg()
    addCard(leadMsg, { card_type: 'socratic_start', steps_count: 4, stage: 'reading' })
    addCard(leadMsg, { card_type: 'socratic_step_choice', session_id: 's1', step_no: 0, options: ['甲', '乙'], lead: '结合判别式选个突破口' })
    expect(mountBubble(leadMsg).find('.soc-choices-title').text()).toBe('结合判别式选个突破口')
  })
})

/* ================= 6. 已用态（模型层契约） ================= */
describe('sgv3 交互卡已用态（markInteractionUsed + 历史还原）', () => {
  it('markInteractionUsed：置位 usedInteractions[cardIndex]，幂等、非法参数静默', () => {
    const m: AnyMsg = { key: 'a_t', usedInteractions: [], cards: [{ card_type: 'socratic_interaction', form: 'cloze' }] }
    markInteractionUsed([m], 'a_t', 0)
    markInteractionUsed([m], 'a_t', 0)
    expect(m.usedInteractions).toEqual([true])
    expect(() => markInteractionUsed([m], 'missing', 0)).not.toThrow()
    expect(() => markInteractionUsed([m], 'a_t', -1)).not.toThrow()
    expect(() => markInteractionUsed(undefined as any, 'a_t', 0)).not.toThrow()
  })

  it('置位后 MessageBubble 渲染已用态：交互区置灰 + 提交不再 emit', async () => {
    const msg = addCard(socraticMsg(), {
      ...envelopeCard,
      form: 'cloze',
      spec: { body_latex: '$a$ □_1 0', blanks: [{ id: 'b1' }], palette_by_blank: { b1: ['>', '<'] } },
    })
    msg.usedInteractions = [true]
    const w = mountBubble(msg)
    await nextTick()
    expect(w.find('.si-body.is-used').exists()).toBe(true)
    expect(w.find('.si-usedmark').exists()).toBe(true)
  })

  it('markHistoryUsedChoices 扩展：交互卡之后存在用户消息 → usedInteractions 全置（提交/打字/跳过都产生用户消息）', () => {
    const assistant = fromHistory({
      id: 'h-1',
      role: 'assistant',
      envelope: {
        blocks: [
          { type: 'card', data: { ...envelopeCard } },
          { type: 'card', data: { card_type: 'socratic_step_choice', session_id: 's1', step_no: 3, options: ['方向甲'], kind: 'opener' } },
        ],
      },
    })
    const user = fromHistory({ id: 'h-0', role: 'user', envelope: { blocks: [{ type: 'markdown', content: '[拼装] 2 x' }] } })
    markHistoryUsedChoices([assistant, user])
    // 按卡下标：interaction 卡（0）置用；choice 卡（1）文本不匹配 → 未用（数组长度=卡数，与既有实现一致）
    expect(assistant.usedInteractions).toEqual([true, false])
    expect(assistant.usedChoices).toEqual([false, false])
  })

  it('交互卡后无用户消息（流式中途刷新）→ 不置灰，可继续作答', () => {
    const assistant = fromHistory({
      id: 'h-1',
      role: 'assistant',
      envelope: { blocks: [{ type: 'card', data: { ...envelopeCard } }] },
    })
    markHistoryUsedChoices([assistant])
    expect(assistant.usedInteractions).toEqual([])
  })
})

/* ================= 7. 补课卡检验题嵌入（F9） ================= */
describe('sgv3 SocraticDetourCard 检验题嵌入 cloze/assemble', () => {
  const detourCard = {
    card_type: 'socratic_detour',
    session_id: 'sess-9',
    detour_id: 'd1',
    kp_name: '因式分解',
    worked_example: '**例**：x²-9=(x-3)(x+3)',
    check_question: '把 x²-16 分解因式',
    origin_step: 2,
    check_interaction: {
      interaction_id: 'ix_detour_1',
      form: 'cloze',
      spec: {
        body_latex: 'x²-16 = (x □_1 4)(x + 4)',
        blanks: [{ id: 'b1', answer_kind: 'op' }],
        palette_by_blank: { b1: ['-', '+', '×'] },
      },
    },
  }

  it('check_interaction 存在：渲染 ClozeFill 子组件，打字回退 input 保留', () => {
    const w = mount(SocraticDetourCard, { props: { card: detourCard } })
    expect(w.findComponent(ClozeFill).exists()).toBe(true)
    expect(w.find('.sd-input').exists()).toBe(true)
    expect(w.find('.sd-input').attributes('placeholder')).toContain('直接打字')
  })

  it('子组件提交 → check-interaction emit {interactionId, form, summary, payload}', async () => {
    const w = mount(SocraticDetourCard, { props: { card: detourCard } })
    await w.find('.ix-cz-blank').trigger('click')
    await w.find('.ix-cz-opt').trigger('click') // '-'
    await w.find('.ix-submit').trigger('click')
    const evt = w.emitted('check-interaction')! as any[][]
    expect(evt).toHaveLength(1)
    expect(evt[0][0]).toMatchObject({ interactionId: 'ix_detour_1', form: 'cloze', payload: { blanks: { b1: '-' } } })
    expect(evt[0][0].summary).toBe('[填空] -')
    expect(evt[0][0].spentMs).toBeGreaterThanOrEqual(0)
  })

  it('旧 detour 卡（无 check_interaction）：input 打字作答协议不变（历史行为零回退）', async () => {
    const w = mount(SocraticDetourCard, { props: { card: { ...detourCard, check_interaction: undefined } } })
    expect(w.findComponent(ClozeFill).exists()).toBe(false)
    await w.find('.sd-input').setValue('(x-4)(x+4)')
    await w.find('.sd-submit').trigger('click')
    expect(w.emitted('check')![0]).toEqual(['(x-4)(x+4)'])
  })

  it('MessageBubble 分发：check-interaction → interactionSubmit（sessionId=detour 会话，stepNo=null）', async () => {
    const msg = addCard(socraticMsg(), detourCard)
    const w = mountBubble(msg)
    await w.find('.ix-cz-blank').trigger('click')
    await w.find('.ix-cz-opt').trigger('click')
    await w.find('.ix-submit').trigger('click')
    const evt = w.emitted('interactionSubmit')!
    expect(evt[0][0]).toMatchObject({
      interactionId: 'ix_detour_1',
      form: 'cloze',
      sessionId: 'sess-9',
      stepNo: null,
      msgKey: msg.key,
    })
  })
})

/* ================= 8. 完成卡第五出口（F8） ================= */
describe('sgv3 SocraticCompleteCard 第五出口「出一道考考 AI」', () => {
  it('五出口齐备：variant/quiz_ai/errorBook/mastery/finish（四出口 KEEP，transfer 纯增量）', async () => {
    const w = mount(SocraticCompleteCard, {
      props: { card: { card_type: 'socratic_complete', outcome: 'guided' } },
    })
    const acts = w.findAll('.sc-act')
    expect(acts).toHaveLength(5)
    const labels = acts.map((b) => b.text())
    expect(labels.some((t) => t.includes('考考 AI'))).toBe(true)
    expect(labels.some((t) => t.includes('举一反三'))).toBe(true)
    await acts[1].trigger('click')
    expect(w.emitted('act')![0]).toEqual(['quiz_ai'])
  })
})
