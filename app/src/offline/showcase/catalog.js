/**
 * 本轮离线教学示例的会话目录。
 *
 * 纪律（总方案 §1）：
 *   - 每条示例是**独立会话 ID**，进入既有历史列表，可搜索/切换/恢复；
 *   - 标题必须是真实任务描述（不用「请分析我上传的文件」这类采证占位）；
 *   - 不新增一级入口、不新增演示控制台、不做第二套聊天界面；
 *   - 原有采证会话列表只 append，不改动既有项（既有历史保留原文字与原来源）。
 *
 * `seeded`: 开场即存在的轮次数量（其余轮次由学生实际操作逐步长出）。
 */

export const SHOWCASE_PREFIX = 'sc-'

export const SHOWCASE_CONVS = [
  {
    id: 'sc-combo',
    key: 'combo',
    title: '导数学习 · 从提问到改错',
    pinned: false,
    minutesAgo: 6,
    // 主持人首选：C1 提问 + AI 回答 + C3 练习邀请已发生，后续按动作长出
    seeded: 3,
  },
  {
    id: 'sc-s1',
    key: 's1',
    title: '拍照解题 · 双曲线离心率',
    pinned: false,
    minutesAgo: 10,
    seeded: 2,
  },
  {
    id: 'sc-s5',
    key: 's5',
    title: '引导式解题 · 双曲线离心率',
    pinned: false,
    minutesAgo: 70,
    seeded: 2,
  },
  {
    id: 'sc-s2',
    key: 's2',
    title: '知识问答 · 导数的几何意义',
    pinned: false,
    minutesAgo: 95,
    seeded: 4,
  },
  {
    id: 'sc-s3',
    key: 's3',
    title: '看图讲解 · 导数与极值',
    pinned: false,
    minutesAgo: 130,
    seeded: 2,
  },
  {
    id: 'sc-s4',
    key: 's4',
    title: '举一反三 · 双曲线离心率',
    pinned: false,
    minutesAgo: 165,
    seeded: 2,
  },
  {
    id: 'sc-s6',
    key: 's6',
    title: '错题复盘 · 把轴比看成离心率',
    pinned: false,
    minutesAgo: 200,
    seeded: 2,
  },
]

export const SHOWCASE_BY_ID = Object.fromEntries(SHOWCASE_CONVS.map((c) => [c.id, c]))
export const SHOWCASE_BY_KEY = Object.fromEntries(SHOWCASE_CONVS.map((c) => [c.key, c]))

export function isShowcaseId(id) {
  return typeof id === 'string' && !!SHOWCASE_BY_ID[id]
}

/** 会话列表项（沿用现役 /api/agent/conversations 的 item 形状） */
export function convItem(c, now = Date.now()) {
  const at = new Date(now - c.minutesAgo * 60_000).toISOString()
  return {
    id: c.id,
    title: c.title,
    created_at: at,
    updated_at: at,
    message_count: c.seeded,
    skill: 'socratic',
    pinned: !!c.pinned,
  }
}
