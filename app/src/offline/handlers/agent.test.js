/**
 * 离线会话供应层的行为锁。
 *
 * 本轮修的历史缺陷（`未通过项.md` 第 58 行）：
 *   刷新或切换会话后，历史用户消息的 attachments 被硬编码成 []，
 *   题图消失。现役组件在缺 URL 时会提示「原图已丢失（存储缺失）」，
 *   那是把"离线没有对象存储"误报成"学生文件丢了"，必须修掉。
 *
 * 修法：历史里给附件带上本地快照（data URI 写进 localUrl），
 * AttachmentThumb 优先读 localUrl，因此不触发任何网络请求也不误报。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { conversationMessages, FLOWS, listConversations, pickChatTurn } from './agent'
import { patch, store } from '../state'
import { fromHistory } from '../../components/chat/messageModel'
import { FLOW_IMAGE } from '../showcase/flowAssets'

function seedChat(convId, caseName, turn) {
  patch((s) => {
    s.chat = { ...(s.chat || {}), [convId]: { case: caseName, turn, lastInput: '测试' } }
  })
}

describe('离线采录对话的输入边界', () => {
  beforeEach(() => patch((s) => { s.chat = {} }))

  it('无关提问保留当前轮次，随后仍能播放既有答复', () => {
    seedChat('conv-a', 'A', 1)
    const notCovered = pickChatTurn({ conversation_id: 'conv-a', message: '黎曼曲率张量怎么计算？' })
    expect(notCovered.events).toBeNull()
    expect(store.chat['conv-a'].turn).toBe(1)
    expect(pickChatTurn({ conversation_id: 'conv-a', message: FLOWS.A.turns[1].input }).events).toBeTruthy()
  })

  it('录制的点击操作可继续播放，其它正文留在原轮次', () => {
    seedChat('conv-c', 'C', 2)
    expect(pickChatTurn({ conversation_id: 'conv-c', message: '我想跳到下一章' }).events).toBeNull()
    expect(store.chat['conv-c'].turn).toBe(2)
    expect(pickChatTurn({
      conversation_id: 'conv-c', message: '我读完了，直接开始', context: { tutor_action: 'skip' },
    }).events).toBeTruthy()
  })
})

describe('历史用户消息的附件', () => {
  beforeEach(() => {
    patch((s) => {
      s.chat = {}
    })
  })

  it('采证流程的历史用户消息带题图快照，且不是空数组', () => {
    seedChat('conv-a', 'A', 1)
    const d = conversationMessages('conv-a')
    expect(d).toBeTruthy()
    const user = d.data.items.find((x) => x.role === 'user')
    expect(user, '历史里应当有用户消息').toBeTruthy()
    expect(user.attachments.length).toBe(1)
    const a = user.attachments[0]
    expect(a.kind).toBe('image')
    expect(a.name).toBe(FLOW_IMAGE.A.name)
    expect(a.mime).toBe('image/png')
    expect(a.localUrl, 'localUrl 必须可用于离线渲染（data URI 或站内资源）').toBeTruthy()
    expect(a.file_id).toBeTruthy()
  })

  it('经 fromHistory 映射后附件仍然保留（渲染层拿得到）', () => {
    seedChat('conv-b', 'B', 1)
    const d = conversationMessages('conv-b')
    const user = d.data.items.find((x) => x.role === 'user')
    const msg = fromHistory(user)
    expect(msg.attachments.length).toBe(1)
    expect(msg.attachments[0].name).toBe(FLOW_IMAGE.B.name)
    expect(msg.attachments[0].localUrl).toBeTruthy()
  })

  it('三个采证案例各自的题图不串号', () => {
    seedChat('conv-a', 'A', 1)
    seedChat('conv-b', 'B', 1)
    seedChat('conv-c', 'C', 1)
    const nameOf = (id) =>
      conversationMessages(id).data.items.find((x) => x.role === 'user').attachments[0].name
    expect(nameOf('conv-a')).toBe(FLOW_IMAGE.A.name)
    expect(nameOf('conv-b')).toBe(FLOW_IMAGE.B.name)
    expect(nameOf('conv-c')).toBe(FLOW_IMAGE.C.name)
  })

  it('多轮会话每一轮的用户消息都带同一张题图', () => {
    seedChat('conv-a3', 'A', 3)
    const items = conversationMessages('conv-a3').data.items.filter((x) => x.role === 'user')
    expect(items.length).toBe(3)
    for (const it of items) {
      expect(it.attachments.length).toBe(1)
      expect(it.attachments[0].localUrl).toBeTruthy()
    }
  })

  it('离线新建的空会话返回空列表，不报错', () => {
    const d = conversationMessages('offline-123')
    expect(d.data.items).toEqual([])
  })
})

describe('会话列表', () => {
  beforeEach(() => {
    patch((s) => {
      s.chat = {}
    })
  })

  it('采证会话原样保留，不被示例数据改写', () => {
    const base = JSON.stringify({
      code: 0,
      message: 'ok',
      data: { items: [{ id: 'real-1', title: '原采证会话', updated_at: null }] },
    })
    const out = listConversations(base)
    const real = out.data.items.find((x) => x.id === 'real-1')
    expect(real).toBeTruthy()
    expect(real.title).toBe('原采证会话')
  })

  it('离线游标会话的标题能区分不同案例，不再是同一句占位', () => {
    seedChat('conv-a', 'A', 2)
    seedChat('conv-b', 'B', 2)
    const out = listConversations(JSON.stringify({ code: 0, data: { items: [] } }))
    const ta = out.data.items.find((x) => x.id === 'conv-a')
    const tb = out.data.items.find((x) => x.id === 'conv-b')
    expect(ta).toBeTruthy()
    expect(tb).toBeTruthy()
    // 采证里图片上传的首轮没有文字输入，标题用题图名——真实且可区分
    expect(ta.title).toContain(FLOW_IMAGE.A.name)
    expect(tb.title).toContain(FLOW_IMAGE.B.name)
    expect(ta.title).not.toBe(tb.title)
  })
})
