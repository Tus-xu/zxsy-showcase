/**
 * sgv2 引导 V2 · useChat 传输契约测试（DESIGN §6.1 请求契约的前端落地验证）
 *
 * 后端契约（agent_router 三层透传 + tutor_action 白名单扩值）：
 *   context.tutor_action ∈ attempt/hint/answer/answer_confirm/detour_skip/resume
 *   context.tutor_session_id / tutor_step_no / client_msg_id 随请求透传；
 *   skills 为已解析的 skill_id 数组（视图经 hooks.resolveSkills 做 key→id 映射）。
 * 前端 api/ 封装与 stores 无 tutor 契约触点（grep 零命中）——契约面就是
 * useChat.doSend 的 payload 组装，本文件逐字段锁定，防止后续重构丢字段。
 *
 * mock 模式与 useChat-webSearch.test.ts 一致；messageModel 用真实实现
 * （纯函数零副作用），顺带覆盖 user 消息 rawText/usedChoices 形状。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { agentApi } from '@/api'
import { streamChat } from '@/api/sse'
import { useChat } from '@/composables/useChat'
import { SKILL_ID_BY_KEY } from '@/config/skills'

vi.mock('@/api', () => ({
  agentApi: {
    features: vi.fn(),
    conversations: vi.fn(),
    createConversation: vi.fn(),
    conversationMessages: vi.fn(),
    deleteConversation: vi.fn(),
    patchConversation: vi.fn(),
    feedback: vi.fn(),
    stopChat: vi.fn(),
    activateMessage: vi.fn(),
  },
}))

vi.mock('@/api/sse', () => ({
  streamChat: vi.fn(),
}))

vi.mock('@/stores/toast', () => ({
  useToastStore: () => ({ error: vi.fn(), info: vi.fn(), success: vi.fn(), show: vi.fn() }),
}))

vi.mock('@/composables/useConfirm', () => ({
  useConfirm: () => ({ confirm: vi.fn() }),
}))

const streamChatMock = vi.mocked(streamChat)

function mockStream() {
  streamChatMock.mockReturnValue({ abort: vi.fn(), finished: Promise.resolve() })
}

function lastPayload() {
  expect(streamChatMock.mock.calls.length).toBeGreaterThan(0)
  return streamChatMock.mock.calls[streamChatMock.mock.calls.length - 1][0] as any
}

describe('sgv2 useChat 传输契约：tutor 契约字段透传（DESIGN §6.1）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStream()
  })

  it('attempt + 会话/步骤透传：context 带 tutor_action/tutor_session_id/tutor_step_no/client_msg_id', async () => {
    // 与 DialogView.vue:183 同款注入：skillKeys → skill_id 经真实 config 映射（store 集成面）
    const chat = useChat({
      workspace: 'student',
      hooks: {
        resolveSkills: (keys: string[]) =>
          keys.map((k) => (SKILL_ID_BY_KEY as Record<string, string>)[k]).filter(Boolean),
      },
    })
    await chat.doSend('先求导数，找驻点', {
      tutorAction: 'attempt',
      tutorSessionId: 'sess-1',
      tutorStepNo: 2,
      skillKeys: ['socratic'],
    } as any)
    const payload = lastPayload()
    expect(payload.context.tutor_action).toBe('attempt')
    expect(payload.context.tutor_session_id).toBe('sess-1')
    expect(payload.context.tutor_step_no).toBe(2)
    expect(String(payload.context.client_msg_id)).toBeTruthy()
    expect(payload.context.workspace).toBe('student')
    // socratic key → skill_id 映射（config/skills SKILL_ID_BY_KEY 经 hooks.resolveSkills）
    expect(payload.context.skills).toEqual(['socratic_solver'])
  })

  it.each(['detour_skip', 'resume'] as const)(
    'tutor_action 白名单新值 %s 原样透传（前端无白名单，后端 agent_router 两处分流）',
    async (action) => {
      const chat = useChat()
      await chat.doSend('跳过补课，看这步怎么做', { tutorAction: action })
      expect(lastPayload().context.tutor_action).toBe(action)
    }
  )

  it('普通自由对话：context 不含任何 tutor_* 字段', async () => {
    const chat = useChat()
    await chat.doSend('你好')
    const ctx = lastPayload().context
    expect(ctx.tutor_action).toBeUndefined()
    expect(ctx.tutor_session_id).toBeUndefined()
    expect(ctx.tutor_step_no).toBeUndefined()
  })

  it('tutorStepNo=null（补课卡检验题作答）：不带 tutor_step_no 键', async () => {
    const chat = useChat()
    await chat.doSend('(x-4)(x+4)', { tutorAction: 'attempt', tutorSessionId: 's9', tutorStepNo: null } as any)
    const ctx = lastPayload().context
    expect(ctx.tutor_session_id).toBe('s9')
    expect('tutor_step_no' in ctx).toBe(false)
  })

  /* ===== sgv3（CHAIN-DESIGN §6.2 上行）：tutor_interaction 结构化作答透传 ===== */

  it('interact + tutorInteraction：context.tutor_interaction 五字段原样组装（interaction_id/form/payload/spent_ms + sgv4 edit_count）', async () => {
    const chat = useChat()
    await chat.doSend('[拼装] 2 x', {
      tutorAction: 'interact',
      tutorSessionId: 'sess-3',
      tutorStepNo: 3,
      tutorInteraction: {
        interactionId: 'ix_01J8TEST',
        form: 'assemble',
        payload: { s1: { tokens: ['2', 'x'], latex: '2x' } },
        spentMs: 18400,
        editCount: 2, // sgv4（DESIGN §3.5/R5）：改选/编辑次数（脆弱掌握判据）
      },
    } as any)
    const ctx = lastPayload().context
    expect(ctx.tutor_action).toBe('interact') // 白名单新值（agent_router 两处同步加）
    expect(ctx.tutor_session_id).toBe('sess-3')
    expect(ctx.tutor_step_no).toBe(3)
    expect(ctx.tutor_interaction).toEqual({
      interaction_id: 'ix_01J8TEST',
      form: 'assemble',
      payload: { s1: { tokens: ['2', 'x'], latex: '2x' } },
      spent_ms: 18400,
      edit_count: 2,
    })
    // message 字段是文本化摘要（历史回显 + LLM 判答兜底双用途）
    expect(lastPayload().message).toBe('[拼装] 2 x')
  })

  it('tutorInteraction=null / 缺省：context 不含 tutor_interaction 键（旧路径零变化）', async () => {
    const chat = useChat()
    await chat.doSend('自由作答', { tutorAction: 'attempt' })
    expect('tutor_interaction' in lastPayload().context).toBe(false)
  })

  it('tutorInteraction 蛇形字段名兼容（interaction_id 直传也归一）+ spentMs 非数字归 0 + edit_count 缺省 0', async () => {
    const chat = useChat()
    await chat.doSend('[填空] -', {
      tutorAction: 'interact',
      tutorInteraction: { interaction_id: 'ix_raw', form: 'cloze', payload: { blanks: { b1: '-' } }, spentMs: 'x' },
    } as any)
    expect(lastPayload().context.tutor_interaction).toEqual({
      interaction_id: 'ix_raw',
      form: 'cloze',
      payload: { blanks: { b1: '-' } },
      spent_ms: 0,
      edit_count: 0, // sgv4：旧组件不报 editCount → 缺省 0（向后兼容）
    })
  })

  it('client_msg_id 与用户气泡一致（学情事件幂等键依赖 client_msg_id 透传）', async () => {
    const chat = useChat()
    await chat.doSend('我的作答', {})
    const payload = lastPayload()
    const userMsg = chat.messages.value.find((m: any) => m?.role === 'user') as any
    expect(payload.context.client_msg_id).toBe(userMsg?.clientMsgId)
  })

  it('流式中再点选项：守卫拒绝，不发第二条请求（防重复作答）', async () => {
    let release!: () => void
    const gate = new Promise<void>((r) => { release = r })
    streamChatMock.mockReturnValue({ abort: vi.fn(), finished: gate })
    const chat = useChat()
    const first = chat.doSend('第一次作答', { tutorAction: 'attempt' })
    await chat.doSend('流式中点击的选项', { tutorAction: 'attempt' })
    expect(streamChatMock.mock.calls).toHaveLength(1) // 第二次被拒
    release()
    await first
  })

  it('rawText 契约：displayText 仅展示，rawText 存真实文本（历史已用态还原依赖）', async () => {
    const chat = useChat()
    await chat.doSend('先随便代入几个 x 看函数值', { displayText: '🔄 我选这个方向' })
    const userMsg = chat.messages.value.find((m: any) => m?.role === 'user') as any
    expect(userMsg.text).toBe('🔄 我选这个方向')
    expect(userMsg.rawText).toBe('先随便代入几个 x 看函数值')
  })
})
