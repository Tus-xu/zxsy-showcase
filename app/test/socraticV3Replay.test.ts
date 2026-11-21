/**
 * sgv3 引导链路 V3 · 思维轨迹回放卡测试（CHAIN-DESIGN §10-W6 / §2.2 reflecting 前端落地）
 *
 * 覆盖（全部离线 jsdom，replay payload 按后端 build_replay_data 产物形状构造，
 * 见 services/api/app/skills/socratic_solver/ix_materials.py:572-627）：
 * 1. 信封归约：socratic_replay 卡经 applySseEvent('card') → mergeCardInto 既有路径入列，
 *    fromHistory envelope.blocks 还原同构（A11 向后兼容）；
 * 2. payload 形状：steps（卡过/一次过/误因中文/脚手架最深处）/ totals / forms_used（中文名）/
 *    tier_path（四档人设文案）逐块渲染；
 * 3. KaTeX：what 裸 LaTeX 经 wrapBareLatex 包装后交 MarkdownView（沿完成卡 tex 纪律）；
 * 4. 无数据不渲染（W6 禁套话）：replay 缺失/全零 → MessageBubble 与组件级均不渲染；
 * 5. FSRS 排期（sgv4 F11）：review_schedule 按后端真实下发形态 dict {"days_until":n}
 *    （ix_materials.py:728）构造 mock——mock 必须跟真实下发走，防「mock 数组+组件认数组」
 *    自洽掩盖断点；图谱点亮仍候选键探测（后端未下发），缺失不渲染、存在即渲染；
 * 6. 旧消息兼容：展示型卡无已用态（markHistoryUsedChoices 零影响），旧 socratic 消息零回归。
 */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MessageBubble from '@/components/chat/MessageBubble.vue'
import SocraticReplayCard from '@/components/chat/SocraticReplayCard.vue'
import MarkdownView from '@/components/MarkdownView.vue'
import {
  REPLAY_MISCONCEPTION_ZH, TIER_NAME_ZH, applySseEvent, fromHistory,
  markHistoryUsedChoices, newAssistantMsg,
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

/** §W6 replay 样例（与 ix_materials.py build_replay_data 输出字段一一对应） */
const replayPayload = {
  steps: [
    { no: 1, what: '求出对称轴 x = a', wrong_count: 0, attempts: 1, hints: 0, scaffold_max: 0, misconceptions: [], correct_count: 1 },
    { no: 2, what: '讨论对称轴与区间 [1,3] 的位置关系', wrong_count: 2, attempts: 3, hints: 2, scaffold_max: 3, misconceptions: ['formula', 'calculation'], correct_count: 1 },
  ],
  totals: { rounds: 8, wrong_total: 2, hint_total: 2, hypo_events: 4, detours: 1 },
  forms_used: ['annotate', 'assemble', 'cloze'],
  tier_path: [{ tier: 1, reason: 'streak_up' }, { tier: 2, reason: 'independent_two_steps' }],
}
const replayCard = {
  card_type: 'socratic_replay',
  session_id: 'sess-r1',
  replay: replayPayload,
}

/* ================= 1. 信封归约（SSE card → mergeCardInto 既有路径） ================= */
describe('sgv3 回放卡信封归约与历史同构', () => {
  it('applySseEvent card：socratic_replay 入 msg.cards（归约零改动，通用入列）', () => {
    const msg = socraticMsg()
    addCard(msg, replayCard)
    expect(msg.cards).toHaveLength(1)
    expect(msg.cards[0].card_type).toBe('socratic_replay')
    expect(msg.cards[0].replay.totals.rounds).toBe(8)
  })

  it('fromHistory envelope.blocks 还原：与实时流同构渲染（A11 向后兼容）', () => {
    const msg = fromHistory({
      id: 'h-r1',
      role: 'assistant',
      envelope: {
        meta: { skill: 'socratic_solver' },
        blocks: [
          { type: 'card', data: { ...replayCard } },
          { type: 'markdown', content: '在你提交最终解释前，先看看你这局自己的攀登路线：' },
        ],
      },
    })
    const w = mountBubble(msg)
    expect(w.find('.soc-replay').exists()).toBe(true)
    expect(w.find('[data-soc-replay]').attributes('data-soc-replay')).toBe('sess-r1')
  })
})

/* ================= 2. payload 形状（steps/totals/forms_used/tier_path） ================= */
describe('sgv3 回放卡 payload 形状渲染', () => {
  const w = mount(SocraticReplayCard, { props: { card: replayCard } })

  it('头部：标题 + 本局轮次（totals.rounds）', () => {
    expect(w.find('.sr-title').text()).toContain('思维轨迹回放')
    expect(w.find('.sr-rounds').text()).toContain('本局 8 轮')
  })

  it('总览徽标：纠错/提示/补课/误因四项全渲染（totals 投影）', () => {
    const chips = w.findAll('.sr-totals .sr-chip').map((c) => c.text())
    expect(chips.some((t) => t.includes('纠错 2 次'))).toBe(true)
    expect(chips.some((t) => t.includes('提示救场 2 次'))).toBe(true)
    expect(chips.some((t) => t.includes('绕行补课 1 次'))).toBe(true)
    expect(chips.some((t) => t.includes('误因被你揪出 4 次'))).toBe(true)
  })

  it('攀登柱图：每步一根柱，卡过的步标 stuck（wrong_count+hints>0）', () => {
    const cols = w.findAll('.sr-col')
    expect(cols).toHaveLength(2)
    expect(cols[0].classes()).toContain('clean')
    expect(cols[1].classes()).toContain('stuck')
  })

  it('步骤行：一次过 / 卡过 N 次 + 明细（纠正/提示/脚手架最深处/误因中文）', () => {
    const steps = w.findAll('.sr-step')
    expect(steps).toHaveLength(2)
    // 第 1 步：零错零提示 → 一次过，无明细行
    expect(steps[0].find('.sr-chip.ok').text()).toContain('一次过')
    expect(steps[0].findAll('.sr-mini')).toHaveLength(0)
    // 第 2 步：卡过 2 次 + 明细徽标
    expect(steps[1].find('.sr-chip.warn').text()).toContain('卡过 2 次')
    const minis = steps[1].findAll('.sr-mini').map((m) => m.text())
    expect(minis.some((t) => t.includes('纠正 2 次'))).toBe(true)
    expect(minis.some((t) => t.includes('提示 2 次'))).toBe(true)
    expect(minis.some((t) => t.includes('最深处：工作示例'))).toBe(true) // scaffold_max=3 → SCAFFOLD_LEVEL_ZH
    expect(minis.some((t) => t.includes('公式用错'))).toBe(true) // REPLAY_MISCONCEPTION_ZH.formula
    expect(minis.some((t) => t.includes('计算错误'))).toBe(true)
    expect(steps[1].find('.sr-step-what').text()).toContain('讨论对称轴与区间')
  })

  it('作答形式徽标：forms_used 英文 key → FORM_ZH 中文名（title 留原 key 可观测）', () => {
    const badges = w.findAll('.sr-forms .sr-chip.form')
    expect(badges).toHaveLength(3)
    expect(badges.map((b) => b.text())).toEqual(['圈点标注', '表达式拼装', '填空补全'])
    expect(badges[0].attributes('title')).toBe('annotate')
  })

  it('换挡轨迹：tier_path → 四档人设文案串联，title 带 reason', () => {
    const hops = w.findAll('.sr-tier-hop')
    expect(hops).toHaveLength(2)
    expect(hops[0].text()).toContain('T1 搭手架')
    expect(hops[1].text()).toContain('T2 递工具')
    expect(hops[0].attributes('title')).toBe('streak_up')
  })
})

/* ================= 3. KaTeX（裸 LaTeX 包装后交 MarkdownView） ================= */
describe('sgv3 回放卡 KaTeX 渲染', () => {
  it('what 含裸 LaTeX 命令 → wrapBareLatex 包 $ 定界后交 MarkdownView（沿完成卡 tex 纪律）', () => {
    const card = {
      card_type: 'socratic_replay',
      session_id: 's1',
      replay: {
        steps: [
          { no: 1, what: '顶点横坐标为 \\dfrac{b}{2a}', wrong_count: 1, attempts: 1, hints: 0, scaffold_max: 0, misconceptions: [], correct_count: 1 },
        ],
        totals: { rounds: 3, wrong_total: 1, hint_total: 0, hypo_events: 0, detours: 0 },
        forms_used: [],
        tier_path: [],
      },
    }
    const w = mount(SocraticReplayCard, { props: { card } })
    const md = w.findComponent(MarkdownView)
    expect(md.exists()).toBe(true)
    expect(md.props('text')).toContain('$')
    expect(md.props('text')).toContain('\\dfrac{b}{2a}')
    // 纯文本步不加定界符（wrapBareLatex 纯文本原样返回）
    const plain = mount(SocraticReplayCard, {
      props: { card: { card_type: 'socratic_replay', replay: { steps: [{ no: 1, what: '求对称轴', wrong_count: 1 }], totals: { wrong_total: 1 } } } },
    })
    expect(plain.findComponent(MarkdownView).props('text')).toBe('求对称轴')
  })
})

/* ================= 4. 无数据不渲染（W6 禁套话） ================= */
describe('sgv3 回放卡无数据不渲染', () => {
  it('replay 缺失 / 空对象 / steps 空且 totals 全零 → 组件级渲染空', () => {
    for (const replay of [undefined, {}, { steps: [], totals: {}, forms_used: [], tier_path: [] }]) {
      const w = mount(SocraticReplayCard, { props: { card: { card_type: 'socratic_replay', session_id: 's1', replay } } })
      expect(w.find('.soc-replay').exists()).toBe(false)
    }
  })

  it('MessageBubble 分发守卫：无 replay 的 socratic_replay 卡不渲染（沿 hasProgressData 纪律）', () => {
    const msg = addCard(socraticMsg(), { card_type: 'socratic_replay', session_id: 's1' })
    expect(mountBubble(msg).find('.soc-replay').exists()).toBe(false)
  })
})

/* ================= 5. FSRS 排期（真实下发形态）与图谱点亮容错 ================= */
describe('sgv3 回放卡 FSRS 排期与图谱点亮', () => {
  it('字段缺失（当前后端 build_replay_data 现状）→ 两块均不渲染，其余正常', () => {
    const w = mount(SocraticReplayCard, { props: { card: replayCard } })
    expect(w.find('.sr-fsrs').exists()).toBe(false)
    expect(w.find('.sr-lights').exists()).toBe(false)
    expect(w.find('.sr-map').exists()).toBe(true)
  })

  it('FSRS 排期：review_schedule dict {"days_until":n}（ix_materials.py:728 真实下发形态）→ 「N 天后」渲染', () => {
    const w = mount(SocraticReplayCard, {
      props: {
        card: {
          card_type: 'socratic_replay',
          replay: {
            ...replayPayload,
            review_schedule: { days_until: 5.0 },
          },
        },
      },
    })
    const chips = w.findAll('.sr-fsrs .sr-chip.fsrs').map((c) => c.text())
    expect(chips).toEqual(['5 天后'])
  })

  it('图谱点亮：kp_lights 候选键（字符串项）→ 点亮知识徽标', () => {
    const w = mount(SocraticReplayCard, {
      props: {
        card: {
          card_type: 'socratic_replay',
          replay: { ...replayPayload, kp_lights: ['二次函数图象与性质'] },
        },
      },
    })
    expect(w.find('.sr-lights').exists()).toBe(true)
    expect(w.findAll('.sr-lights .sr-chip.light').map((c) => c.text())).toEqual(['二次函数图象与性质'])
  })

  it('仅 FSRS 字段存在（steps 空）→ 卡仍渲染排期块（hasData 由有效内容决定）', () => {
    const w = mount(SocraticReplayCard, {
      props: {
        card: { card_type: 'socratic_replay', replay: { review_schedule: { days_until: 5.0 } } },
      },
    })
    expect(w.find('.soc-replay').exists()).toBe(true)
    expect(w.find('.sr-fsrs .sr-chip.fsrs').text()).toContain('5 天后')
  })
})

/* ================= 6. 旧消息向后兼容 ================= */
describe('sgv3 回放卡旧消息兼容', () => {
  it('展示型卡无已用态：markHistoryUsedChoices 对 socratic_replay 零置位', () => {
    const assistant = fromHistory({
      id: 'h-r2',
      role: 'assistant',
      envelope: { blocks: [{ type: 'card', data: { ...replayCard } }] },
    })
    const user = fromHistory({ id: 'h-u2', role: 'user', envelope: { blocks: [{ type: 'markdown', content: '关键是对称轴位置' }] } })
    markHistoryUsedChoices([assistant, user])
    expect(assistant.usedChoices).toEqual([])
    expect(assistant.usedInteractions).toEqual([])
  })

  it('旧 socratic 消息（无回放卡）零回归：完成卡仍正常分发渲染', () => {
    const msg = addCard(socraticMsg(), { card_type: 'socratic_complete', outcome: 'guided', steps: [] })
    const w = mountBubble(msg)
    expect(w.find('.soc-replay').exists()).toBe(false)
    expect(w.find('.soc-complete').exists()).toBe(true)
  })

  it('常量对齐：REPLAY_MISCONCEPTION_ZH 五键与后端 MISCONCEPTION_NAMES_ZH 一致；TIER_NAME_ZH 四档', () => {
    expect(REPLAY_MISCONCEPTION_ZH).toEqual({
      concept: '概念不清',
      formula: '公式用错',
      calculation: '计算错误',
      logic: '推理逻辑错误',
      reading: '审题错误',
    })
    expect(TIER_NAME_ZH).toEqual({ 0: '陪拆', 1: '搭手架', 2: '递工具', 3: '当裁判' })
  })
})
