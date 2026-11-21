/**
 * sgv4 引导链路 V4 · 协议与数据面测试（DESIGN §3.2 信封扩展 / §3.4b 卡族 / F8/F10/F11/F16）
 *
 * 覆盖（全部离线 jsdom）：
 * 1. MessageBubble 4 新 card_type 分发可达（F16）：socratic_exit_offer/socratic_confirm/
 *    socratic_nudge → SocraticConfirmCard 三语境默认按钮组；socratic_concept_card →
 *    SocraticConceptCard；act → tutorAction 透传（防 GenericCard 死卡兜底）；
 * 2. SocraticConfirmCard：后端自带 actions 优先；三语境各自默认动作 id（A15 锚点 data-sbj-action）；
 * 3. SocraticConceptCard：讲解内容/出处徽标/降级标签/continue 唯一出口（F7b）；
 * 4. SocraticDetourCard：check_interaction 全形式集合（binary 经分发壳渲染）+ citations
 *    + degraded（F7）；
 * 5. useChat 上行契约：tutor_interaction.edit_count 透传（F10，§3.5 数据飞轮）；
 * 6. SocraticReplayCard：review_schedule dict 形态兼容（F11 第三轮遗留断点）+ 脆弱点行
 *    （§5.6 可见性）；数组形态与旧消息零回退；
 * 7. 向后兼容：旧消息（无 sgv4 新字段）渲染零改动；applySseEvent 对新字段透明透传。
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import MessageBubble from '@/components/chat/MessageBubble.vue'
import SocraticConfirmCard from '@/components/chat/SocraticConfirmCard.vue'
import SocraticConceptCard from '@/components/chat/SocraticConceptCard.vue'
import SocraticDetourCard from '@/components/chat/SocraticDetourCard.vue'
import SocraticReplayCard from '@/components/chat/SocraticReplayCard.vue'
import BinaryJudge from '@/components/chat/interaction/BinaryJudge.vue'
import { applySseEvent, fromHistory, newAssistantMsg } from '@/components/chat/messageModel'
import { useChat } from '@/composables/useChat'
import { streamChat } from '@/api/sse'

vi.mock('@/api', () => ({
  agentApi: {
    features: vi.fn(), conversations: vi.fn(), createConversation: vi.fn(), conversationMessages: vi.fn(),
    deleteConversation: vi.fn(), patchConversation: vi.fn(), feedback: vi.fn(), stopChat: vi.fn(), activateMessage: vi.fn(),
  },
}))
vi.mock('@/api/sse', () => ({ streamChat: vi.fn() }))
vi.mock('@/stores/toast', () => ({
  useToastStore: () => ({ error: vi.fn(), info: vi.fn(), success: vi.fn(), show: vi.fn() }),
}))
vi.mock('@/composables/useConfirm', () => ({ useConfirm: () => ({ confirm: vi.fn() }) }))

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

/* ================= 1. MessageBubble 分发链接线（F16） ================= */
describe('sgv4 MessageBubble 4 新 card_type 分发可达', () => {
  it('socratic_confirm 示范确认卡：默认按钮组 [好，做给我看]/[我再试试] → tutorAction 透传', async () => {
    const w = mountBubble(addCard(socraticMsg(), {
      card_type: 'socratic_confirm',
      lead: '这步试了好几轮，我直接完整做一遍给你看？',
    }))
    expect(w.find('[data-soc-confirm="confirm"]').exists()).toBe(true)
    const btns = w.findAll('[data-sbj-action]')
    expect(btns.map((b) => b.attributes('data-sbj-action'))).toEqual(['demo_confirm', 'demo_retry'])
    await btns[0].trigger('click')
    expect(w.emitted('tutorAction')![0]).toEqual(['demo_confirm'])
  })

  it('socratic_exit_offer 出口确认卡：确认词「好」兼容路径动作 + data 锚点', async () => {
    const w = mountBubble(addCard(socraticMsg(), {
      card_type: 'socratic_exit_offer',
      lead: '这步咱们试了好几轮了，我先完整做一遍给你看，行吗？',
    }))
    expect(w.find('[data-soc-confirm="exit_offer"]').exists()).toBe(true)
    const btns = w.findAll('[data-sbj-action]')
    expect(btns.map((b) => b.attributes('data-sbj-action'))).toEqual(['exit_confirm', 'keep_trying'])
    await btns[0].trigger('click')
    expect(w.emitted('tutorAction')![0]).toEqual(['exit_confirm'])
  })

  it('socratic_nudge 对话回合收尾卡（Z2/Z3/Z5）：默认 [回到这一步]/[给我点提示]', async () => {
    const w = mountBubble(addCard(socraticMsg(), {
      card_type: 'socratic_nudge',
      lead: '刚才是想问什么？说清楚我继续陪你走这一步',
    }))
    expect(w.find('[data-soc-confirm="nudge"]').exists()).toBe(true)
    await w.findAll('[data-sbj-action]')[1].trigger('click')
    expect(w.emitted('tutorAction')![0]).toEqual(['nudge_hint'])
  })

  it('socratic_concept_card L2 概念卡：讲解内容 + continue 唯一出口 → tutorAction', async () => {
    const w = mountBubble(addCard(socraticMsg(), {
      card_type: 'socratic_concept_card',
      kp_name: '导数符号判断',
      content: '在区间 (-∞, -1) 内，f(x) 的三个因式 **都取负**，负负负相乘取负……',
      citations: [{ doc_title: '人教A版 选修二', chunk_id: 'chunk_5_1_2', quote: '导数大于零则单调递增' }],
      degraded: { why: 'kb_no_hit', zh: '未找到教材原文，本讲解由 AI 生成，仅供参考' },
    }))
    const card = w.find('[data-soc-concept-card]')
    expect(card.exists()).toBe(true)
    expect(card.text()).toContain('三个因式')
    expect(card.find('[data-scc-degraded]').text()).toContain('未找到教材原文')
    expect(card.find('[data-soc-citations]').text()).toContain('人教A版 选修二')
    // 无检验题无 resume/skip：唯一出口 continue
    await card.find('[data-scc-continue]').trigger('click')
    expect(w.emitted('tutorAction')![0]).toEqual(['concept_continue'])
  })

  it('socratic_concept_card figure plan JSON：静态 SVG 渲染（可视化小工具）', () => {
    const w = mountBubble(addCard(socraticMsg(), {
      card_type: 'socratic_concept_card',
      content: '看这条曲线在 x 轴下方的部分',
      figure: { type: 'function', params: { curves: [{ expr: 'x**2 - 4' }], x_range: [-4, 4], y_range: [-4, 4] } },
    }))
    expect(w.find('[data-soc-concept-card] svg').exists()).toBe(true)
    expect(w.findAll('.scc-curve').length).toBe(1)
  })

  it('新卡不落 GenericCard 死卡兜底（AGENTS §8 UI Reality）', () => {
    const w = mountBubble(
      addCard(
        addCard(
          addCard(socraticMsg(), { card_type: 'socratic_confirm', lead: '做给你看？' }),
          { card_type: 'socratic_nudge', lead: '回到这一步？' },
        ),
        { card_type: 'socratic_exit_offer', lead: '讲这步？' },
      ),
    )
    expect(w.find('.generic-card').exists()).toBe(false)
    expect(w.findAll('.soc-confirm').length).toBe(3)
  })
})

/* ================= 2. SocraticConfirmCard 后端 actions 优先 ================= */
describe('sgv4 SocraticConfirmCard 后端自带 actions 优先', () => {
  it('card.actions 存在时按后端下发渲染（文案/顺序/主键定制）', async () => {
    const w = mount(SocraticConfirmCard, {
      props: {
        card: {
          card_type: 'socratic_confirm',
          lead: '我直接做一遍？',
          actions: [{ id: 'demo_confirm', label: '好，示范吧', primary: true }, { id: 'demo_retry', label: '再给我一次机会' }],
        },
      },
    })
    const btns = w.findAll('[data-sbj-action]')
    expect(btns.map((b) => b.text())).toEqual(['好，示范吧', '再给我一次机会'])
    await btns[1].trigger('click')
    expect(w.emitted('act')![0]).toEqual(['demo_retry'])
  })

  it('lead 兼容 text/question 三种字段名（后端字段名未定稿防御）', () => {
    const a = mount(SocraticConfirmCard, { props: { card: { card_type: 'socratic_nudge', text: '换个问法' } } })
    const b = mount(SocraticConfirmCard, { props: { card: { card_type: 'socratic_nudge', question: '换个问法' } } })
    expect(a.find('.scf-lead').text()).toContain('换个问法')
    expect(b.find('.scf-lead').text()).toContain('换个问法')
  })
})

/* ================= 3. SocraticDetourCard 全形式检验 + 溯源（F7） ================= */
describe('sgv4 SocraticDetourCard check_interaction 全形式 + citations/degraded', () => {
  const baseDetour = {
    card_type: 'socratic_detour',
    session_id: 'sess-9',
    detour_id: 'd1',
    kp_name: '因式分解',
    check_question: 'x = -1 左边 f\'(x) 取正还是取负？',
    origin_step: 2,
    check_interaction: {
      interaction_id: 'ix_detour_v4',
      form: 'binary',
      spec: { question: '判断符号', options: [{ id: 'pos', label: '取正' }, { id: 'neg', label: '取负' }] },
    },
  }

  it('binary 检验题经统一分发壳渲染（V4 删 tier→free_text 直返后全形式集合）', async () => {
    const w = mount(SocraticDetourCard, { props: { card: baseDetour } })
    expect(w.findComponent(BinaryJudge).exists()).toBe(true)
    expect(w.findAll('[data-sbj-option]').length).toBe(2)
    // 打字回退 input 保留（旧协议 attempt 零回退）
    expect(w.find('.sd-input').exists()).toBe(true)
    // 子组件提交 → check-interaction（含 sgv4 editCount）
    await w.findAll('[data-sbj-option]')[1].trigger('click')
    await w.find('.ix-submit').trigger('click')
    const evt = w.emitted('check-interaction')! as any[][]
    expect(evt[0][0]).toMatchObject({ interactionId: 'ix_detour_v4', form: 'binary', payload: { choice: 'neg' }, editCount: 0 })
    expect(evt[0][0].summary).toBe('[判断] 「取负」')
  })

  it('teach 讲解带 citations 出处徽标与 degraded 降级声明（R7/A4/A5）', () => {
    const w = mount(SocraticDetourCard, {
      props: {
        card: {
          ...baseDetour,
          worked_example: '先看符号表……',
          citations: [{ doc_title: '人教A版 选修一', chunk_id: 'chunk_3_2_1', quote: '二次函数的对称轴公式……' }],
          degraded: { why: 'kb_no_hit', zh: '未关联到教材原文，本讲解由 AI 生成，仅供参考' },
        },
      },
    })
    expect(w.find('[data-sd-degraded]').text()).toContain('未关联到教材原文')
    expect(w.find('[data-soc-citations]').text()).toContain('人教A版 选修一')
  })

  it('free_text 形态 check_interaction 回落本卡文本输入（防双输入框，历史零回退）', () => {
    const w = mount(SocraticDetourCard, {
      props: { card: { ...baseDetour, check_interaction: { interaction_id: 'ix_ft', form: 'free_text', spec: {} } } },
    })
    expect(w.findComponent(BinaryJudge).exists()).toBe(false)
    expect(w.find('.sd-input').exists()).toBe(true)
  })
})

/* ================= 4. useChat 上行契约：edit_count 透传（F10） ================= */
describe('sgv4 useChat tutor_interaction.edit_count 透传', () => {
  const streamChatMock = vi.mocked(streamChat)
  beforeEach(() => {
    vi.clearAllMocks()
    streamChatMock.mockReturnValue({ abort: vi.fn(), finished: Promise.resolve() } as any)
  })

  it('交互提交带 editCount → context.tutor_interaction.edit_count 原值透传', async () => {
    const chat = useChat({ workspace: 'student' })
    await chat.doSend('[判断] 「取负」', {
      tutorAction: 'interact',
      tutorSessionId: 'sess-4',
      tutorStepNo: 2,
      tutorInteraction: { interactionId: 'ix_1', form: 'binary', payload: { choice: 'neg' }, spentMs: 8200, editCount: 2 },
      skillKeys: ['socratic'],
    } as any)
    const payload = streamChatMock.mock.calls[0][0] as any
    expect(payload.context.tutor_action).toBe('interact')
    expect(payload.context.tutor_interaction).toEqual({
      interaction_id: 'ix_1',
      form: 'binary',
      payload: { choice: 'neg' },
      spent_ms: 8200,
      edit_count: 2,
    })
  })

  it('旧组件不报 editCount → edit_count 缺省 0（向后兼容）', async () => {
    const chat = useChat({ workspace: 'student' })
    await chat.doSend('[填空] -', {
      tutorAction: 'interact',
      tutorInteraction: { interactionId: 'ix_2', form: 'cloze', payload: {}, spentMs: 3000 },
      skillKeys: ['socratic'],
    } as any)
    const payload = streamChatMock.mock.calls[0][0] as any
    expect(payload.context.tutor_interaction.edit_count).toBe(0)
  })
})

/* ================= 5. SocraticReplayCard dict 兼容 + 脆弱点（F11/§5.6） ================= */
describe('sgv4 SocraticReplayCard review_schedule dict 兼容与脆弱点行', () => {
  it('dict 形态 {"days_until":n}（ix_materials.py:728 真实下发形态）→ 「N 天后」渲染', () => {
    const w = mount(SocraticReplayCard, {
      props: {
        card: {
          card_type: 'socratic_replay',
          session_id: 's1',
          replay: { totals: { wrong_total: 1 }, steps: [{ no: 1, what: '求定义域', wrong_count: 1 }], review_schedule: { days_until: 3.5 } },
        },
      },
    })
    const chips = w.findAll('.sr-fsrs .sr-chip.fsrs').map((c) => c.text())
    expect(chips).toEqual(['3.5 天后'])
  })

  it('数组形态 {kp_name, days_until} 行为不变（未来扩展零回退）', () => {
    const w = mount(SocraticReplayCard, {
      props: {
        card: {
          card_type: 'socratic_replay',
          replay: { totals: {}, steps: [{ no: 1, what: 'x', wrong_count: 1 }], review_schedule: [{ kp_name: '函数最值', days_until: 8 }] },
        },
      },
    })
    expect(w.findAll('.sr-fsrs .sr-chip.fsrs').map((c) => c.text())).toEqual(['函数最值 · 8 天后'])
  })

  it('脆弱点行：fragile_kps 列表（字符串/对象项容错）→ 「🌱 脆弱点」chips；无字段不渲染', () => {
    const withFragile = mount(SocraticReplayCard, {
      props: {
        card: {
          card_type: 'socratic_replay',
          replay: {
            totals: {},
            steps: [{ no: 1, what: 'x', wrong_count: 1 }],
            fragile_kps: [{ kp_name: '导数符号判断', reason: '用时偏长后答对' }, '因式分解'],
          },
        },
      },
    })
    const chips = withFragile.findAll('.sr-fragile .sr-chip.fragile')
    expect(chips.map((c) => c.text())).toEqual(['导数符号判断', '因式分解'])
    expect(chips[0].attributes('title')).toContain('用时偏长')

    const without = mount(SocraticReplayCard, {
      props: { card: { card_type: 'socratic_replay', replay: { totals: {}, steps: [{ no: 1, what: 'x', wrong_count: 1 }] } } },
    })
    expect(without.find('.sr-fragile').exists()).toBe(false)
  })
})

/* ================= 6. 向后兼容（R6/A13） ================= */
describe('sgv4 旧消息向后兼容', () => {
  it('旧交互卡（无 sgv4 新字段）渲染零改动；SSE card 对新字段透明透传', () => {
    // 历史回显：v3 信封无新字段 → fromHistory + 渲染不报错、无新徽标
    const msg = fromHistory({
      id: 'h-9',
      role: 'assistant',
      envelope: {
        meta: { skill: 'socratic_solver' },
        blocks: [
          { type: 'card', data: { card_type: 'socratic_interaction', interaction_id: 'ix_old', form: 'cloze', spec: { body_latex: 'a □_1 0', blanks: [{ id: 'b1' }], palette_by_blank: { b1: ['>', '<'] } } } },
        ],
      },
    })
    const w = mountBubble(msg)
    expect(w.find('.soc-ix').exists()).toBe(true)
    expect(w.find('[data-soc-ix-last-resort]').exists()).toBe(false)
    expect(w.find('[data-soc-ix-degraded]').exists()).toBe(false)
    expect(w.find('[data-soc-citations]').exists()).toBe(false)

    // 新字段经 applySseEvent card → mergeCardInto 透明入列（mergeCardInto 零改动验证）
    const m = socraticMsg()
    addCard(m, { card_type: 'socratic_interaction', form: 'binary', hints: { level: 1, text: 'x' }, last_resort: { reason_code: 'x', reason_zh: 'y', keypad: [] } })
    expect(m.cards[0].hints).toEqual({ level: 1, text: 'x' })
    expect(m.cards[0].last_resort.reason_code).toBe('x')
  })

  it('未知事件/未知 form 兜底不变（永不白屏铁律不回归）', () => {
    const m = socraticMsg()
    expect(() => applySseEvent(m, 'sgv4_future_event', {})).not.toThrow()
    const w = mountBubble(addCard(socraticMsg(), { card_type: 'socratic_interaction', form: 'sgv4_unknown', spec: {} }))
    expect(w.find('.si-unknown').exists()).toBe(true)
    expect(w.find('.si-input').exists()).toBe(true) // 打字回退仍在
  })
})
