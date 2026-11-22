import { describe, expect, it } from 'vitest'
import {
  applySseEvent,
  fromHistory,
  MASTERY_STATE_ZH,
  markHistoryUsedChoices,
  newAssistantMsg,
  PHASE_ZH,
  SCAFFOLD_LABEL_ZH,
  SCAFFOLD_LEVEL_ZH,
} from '@/components/chat/messageModel'

// messageModel.js 为无类型标注的 JS 模块，测试侧以 any 读取字段
type AnyMsg = any

function makeMsg(): AnyMsg {
  return newAssistantMsg('cm')
}

describe('阶段 6B：搜索来源/降级体验', () => {
  it('degraded SSE 事件 → 消息携带降级提示（error_code + message）', () => {
    const msg = makeMsg()
    applySseEvent(msg, 'degraded', {
      error_code: 'confirmation_required',
      refuse_reason: '本地知识库未检索到相关内容',
    })
    expect(msg.degraded).toEqual({
      error_code: 'confirmation_required',
      message: '本地知识库未检索到相关内容',
    })
  })

  it('degraded 事件缺 message 时回退 refuse_reason', () => {
    const msg = makeMsg()
    applySseEvent(msg, 'degraded', { error_code: 'confirmation_required' })
    expect(msg.degraded?.error_code).toBe('confirmation_required')
    expect(msg.degraded?.message).toBe('')
  })

  it('citation 事件携带 web_search 扩展字段（title/url/snippet/retrieved_at）', () => {
    const msg = makeMsg()
    applySseEvent(msg, 'citation', {
      items: [
        {
          n: 1,
          chunk_id: 'chunk-web-1',
          source: '百度百科',
          loc: '切片 chunk-we',
          title: '导数概念',
          url: 'https://example.com/derivative',
          snippet: '导数是函数的局部变化率……',
          retrieved_at: '2026-08-21T10:00:00+00:00',
        },
      ],
    })
    expect(msg.citations).toHaveLength(1)
    const c = msg.citations[0]
    expect(c.title).toBe('导数概念')
    expect(c.url).toBe('https://example.com/derivative')
    expect(c.snippet).toContain('局部变化率')
    expect(c.retrieved_at).toBe('2026-08-21T10:00:00+00:00')
  })

  it('旧 citation（无扩展字段）不报错，仅保留基础字段', () => {
    const msg = makeMsg()
    applySseEvent(msg, 'citation', { items: [{ n: 1, source: '教材' }] })
    expect(msg.citations[0].source).toBe('教材')
    expect(msg.citations[0].title).toBeUndefined()
  })

  it('历史信封还原 citation 扩展字段与 degraded 块', () => {
    const item = {
      id: 'msg-1',
      role: 'assistant',
      envelope: {
        msg_id: 'msg-1',
        meta: {},
        blocks: [
          { type: 'markdown', content: '根据联网检索结果【1】' },
          {
            type: 'citation',
            items: [
              {
                n: 1,
                chunk_id: 'chunk-web-1',
                source: '百度百科',
                title: '导数概念',
                url: 'https://example.com/derivative',
                snippet: '导数是函数的局部变化率……',
                retrieved_at: '2026-08-21T10:00:00+00:00',
              },
            ],
          },
          {
            type: 'degraded',
            data: { error_code: 'confirmation_required', refuse_reason: '本地知识库未检索到相关内容' },
          },
        ],
      },
    }
    const msg = fromHistory(item) as any
    expect(msg.citations[0].title).toBe('导数概念')
    expect(msg.citations[0].url).toBe('https://example.com/derivative')
    expect(msg.degraded).toEqual({
      error_code: 'confirmation_required',
      message: '本地知识库未检索到相关内容',
    })
  })
})

describe('错题本录入 action 卡（2026-10-21）', () => {
  it('历史 card 块内装 action → 还原为 msg.action，不进 GenericCard 卡片列表', () => {
    const msg = fromHistory({
      id: 'm1',
      role: 'assistant',
      content: '已经帮你把这道题加入错题本。',
      envelope: {
        msg_id: 'm1',
        role: 'assistant',
        blocks: [
          { type: 'markdown', content: '已经帮你把这道题加入错题本。' },
          { type: 'card', data: { type: 'action', kind: 'open_page', to: '/student/error-book', label: '去错题本复习' } },
        ],
      },
    } as any)
    expect(msg.action).toBeTruthy()
    expect((msg.action as any)?.kind).toBe('open_page')
    expect((msg.action as any)?.to).toBe('/student/error-book')
    expect(msg.cards.length).toBe(0)
  })

  it('SSE card 事件内装 action → 同样还原为 msg.action', () => {
    const msg = makeMsg()
    applySseEvent(msg, 'card', { type: 'action', kind: 'open_page', to: '/student/error-book', label: '去错题本复习' })
    expect(msg.action?.kind).toBe('open_page')
    expect(msg.cards.length).toBe(0)
  })
})

describe('sgv2 引导对话 V2（student-guided-solving-v2 §8）', () => {
  it('newAssistantMsg / fromHistory 均初始化 usedChoices 数组（选项已用态载体）', () => {
    expect(makeMsg().usedChoices).toEqual([])
    const h = fromHistory({ id: 'h1', role: 'assistant', envelope: { meta: {}, blocks: [] } } as any)
    expect(h.usedChoices).toEqual([])
  })

  it('markHistoryUsedChoices：选项卡后紧随的用户消息原文 = 某选项 → 该卡置已用', () => {
    const choiceCard = {
      card_type: 'socratic_step_choice',
      session_id: 's1',
      step_no: 1,
      options: ['设切线斜率为 k，用判别式列方程', '直接对函数求导'],
    }
    const msgs: AnyMsg[] = [
      { key: 'a1', role: 'assistant', text: '这一步怎么入手？', cards: [choiceCard], usedChoices: [] },
      { key: 'u1', role: 'user', text: '选 B', rawText: '直接对函数求导' },
      { key: 'a2', role: 'assistant', text: '好，沿求导方向走…', cards: [] },
    ]
    markHistoryUsedChoices(msgs)
    expect(msgs[0].usedChoices[0]).toBe(true)
  })

  it('markHistoryUsedChoices：后续用户消息与选项不一致 → 全 false 不误标（检验题作答/普通输入）', () => {
    const choiceCard = {
      card_type: 'socratic_step_choice',
      step_no: 2,
      options: ['方向一', '方向二'],
    }
    const msgs: AnyMsg[] = [
      { key: 'a1', role: 'assistant', cards: [choiceCard], usedChoices: [] },
      { key: 'u1', role: 'user', text: 'x=3', rawText: 'x=3' },
    ]
    markHistoryUsedChoices(msgs)
    expect(msgs[0].usedChoices).toEqual([false]) // 数组长度 = cards 数（每卡一个标志）
  })

  it('markHistoryUsedChoices：无选项卡 / 无后续用户消息 → usedChoices 保持原样，幂等可重复执行', () => {
    const msgs: AnyMsg[] = [
      { key: 'a1', role: 'assistant', cards: [{ card_type: 'socratic_hint', level: 2 }], usedChoices: [] },
      { key: 'a2', role: 'assistant', cards: [{ card_type: 'socratic_step_choice', options: ['A'] }], usedChoices: [] },
    ]
    markHistoryUsedChoices(msgs)
    markHistoryUsedChoices(msgs)
    expect(msgs[0].usedChoices).toEqual([]) // 无选项卡：不赋值
    expect(msgs[1].usedChoices).toEqual([]) // 选项卡但无后续用户消息：无法判定，不置位
  })

  it('五档脚手架 / 阶段 / 掌握度中文映射与后端常量对齐（SCAFFOLD_LABELS_ZH / phase / 四态）', () => {
    expect(SCAFFOLD_LEVEL_ZH[0]).toBe('开放追问')
    expect(SCAFFOLD_LEVEL_ZH[4]).toBe('揭示该步')
    expect(SCAFFOLD_LABEL_ZH.worked_example).toBe('工作示例')
    expect(SCAFFOLD_LABEL_ZH.focused_scaffold).toBe('窄追问')
    expect(PHASE_ZH.detour).toBe('补课中')
    expect(PHASE_ZH.opening).toBe('诊断中')
    expect(MASTERY_STATE_ZH.improving).toBe('巩固')
    expect(MASTERY_STATE_ZH.unlearned).toBe('未学')
  })

  it('SSE 进度卡 / 错因卡 / 补课卡照常归约进 cards（新卡类型不被过滤）', () => {
    const msg = makeMsg()
    applySseEvent(msg, 'card', {
      card_type: 'socratic_progress',
      current_step: 2,
      steps_count: 4,
      phase: 'guiding',
      scaffold_level: 1,
      scaffold_label: 'focused_scaffold',
      rounds_used: 3,
      rounds_limit: 8,
    })
    applySseEvent(msg, 'card', { card_type: 'socratic_error_analysis', verdict: 'wrong', misconception_zh: '概念不清' })
    applySseEvent(msg, 'card', { card_type: 'socratic_detour', kp_name: '因式分解', check_question: 'x²-9=?' })
    applySseEvent(msg, 'card', { card_type: 'socratic_detour_result', status: 'passed', bridge_text: '回原题' })
    const types = msg.cards.map((c: AnyMsg) => c.card_type)
    expect(types).toEqual(['socratic_progress', 'socratic_error_analysis', 'socratic_detour', 'socratic_detour_result'])
  })
})
