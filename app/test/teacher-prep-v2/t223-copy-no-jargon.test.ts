/**
 * 对话界面文案治理：**用户可见文案里不得出现内部标识符**。
 *
 * 背景（见 frontend/.impeccable.md）：
 *   目标用户 = 一线高中数学教师（非技术用户，对 AI 胡说高度敏感）
 *   品牌调性 = 温和陪伴（不甩术语、出错给台阶、中文优先）
 *
 * 2026-09-14 实测外露过的内容：
 *   - 文案值里出现 `locator` / `expected_revision` / `SourceLocator` / 端口号 `8100`
 *   - 旧 JobStatus 曾直接渲染 `job_type` 与原始 `last_error`；该组件已退役，
 *     本测试保留 live `MessageItem`/`labels` 的防退化闸门。
 *
 * 本测试是**防退化闸门**：新增文案若带内部标识符，这里会红。
 */

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import MessageItem from '@/features/teacher-prep-v2/surface/MessageItem.vue'
import {
  errorLabelText,
  jobStatusLabel,
  jobTypeLabel,
  runStatusLabel,
} from '@/features/teacher-prep-v2/i18n/labels'
import type { MessageView } from '@/features/teacher-prep-v2/types/workspace'

/** 合法英文：教师本就认识的通用词，不算术语外露。 */
const ENGLISH_WHITELIST = new Set([
  'AI',
  'Enter',
  'Shift',
  'Markdown',
  'PDF',
  'PPTX',
  'Word',
])

/** 内部标识符 / 术语：出现在用户可见文案里即为违规。 */
const FORBIDDEN_TOKENS = [
  'locator',
  'Locator',
  'expected_revision',
  'revision_hash',
  'snapshot_hash',
  'blueprint_id',
  'session_id',
  'context_snapshot',
  'schema_version',
  'LessonPlanSpec',
  'TeachingDeckSpec',
  'EvidenceRail',
  'SourceLocator',
  'IntegrityError',
  'sqlalchemy',
  'asyncpg',
  'validation error',
  '8100',
  '8000',
  '8200',
  '8300',
  'QA',
  'P0',
  'P1',
]

/** 解析 COPY_ZH_CN 的 `'key': 'value',` 对；先剥掉行注释，避免注释误伤。 */
function readCopyPairs(): Array<{ key: string; value: string }> {
  const raw = readFileSync('src/features/teacher-prep-v2/i18n/copy.ts', 'utf8')
  const withoutComments = raw
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n')
  const start = withoutComments.indexOf('COPY_ZH_CN')
  const block = withoutComments.slice(start)
  const pairs: Array<{ key: string; value: string }> = []
  const re = /'([^']+)':\s*'([^']*)'/g
  let m: RegExpExecArray | null
  while ((m = re.exec(block)) !== null) {
    pairs.push({ key: m[1], value: m[2] })
  }
  return pairs
}

describe('文案治理 · 不得出现内部标识符', () => {
  const pairs = readCopyPairs()

  it('能解析到文案（防止解析失效导致测试空转）', () => {
    expect(pairs.length).toBeGreaterThan(300)
  })

  it.each(FORBIDDEN_TOKENS)('文案值中不出现 %s', (token) => {
    const hits = pairs.filter((p) => p.value.includes(token)).map((p) => `${p.key} = ${p.value}`)
    expect(hits).toEqual([])
  })

  it('文案值中的英文 token 只允许通用词白名单', () => {
    const offenders: string[] = []
    for (const { key, value } of pairs) {
      const tokens = value.match(/[A-Za-z][A-Za-z0-9_.]{1,}/g) ?? []
      for (const token of tokens) {
        if (!ENGLISH_WHITELIST.has(token)) offenders.push(`${key} = ${value} → ${token}`)
      }
    }
    expect(offenders).toEqual([])
  })
})

describe('i18n/labels · 唯一映射层：未收录一律兜底，绝不回显原码', () => {
  it('jobStatusLabel：已知状态走文案，未知状态不露原码', () => {
    expect(jobStatusLabel('PENDING')).toBe('排队中')
    expect(jobStatusLabel('SUCCEEDED')).toBe('已完成')
    const unknown = jobStatusLabel('WEIRD_STATE')
    expect(unknown).toBe('处理中')
    expect(unknown).not.toContain('WEIRD')
  })

  it('jobTypeLabel：conversation.run → 中文，未知类型不露原码', () => {
    expect(jobTypeLabel('conversation.run')).toBe('备课对话处理')
    const unknown = jobTypeLabel('internal.weird_job')
    expect(unknown).toBe('备课处理')
    expect(unknown).not.toContain('weird')
  })

  it('runStatusLabel：大小写不统一也能归一，未知不露原码', () => {
    expect(runStatusLabel('RUNNING')).toBe('正在生成…')
    expect(runStatusLabel('running')).toBe('正在生成…')
    expect(runStatusLabel('PENDING')).toBe('排队中')
    expect(runStatusLabel('pending')).toBe('排队中')
    expect(runStatusLabel('BASIC_MODE')).toBe('AI 没接上，已转手工填写')
    expect(runStatusLabel(null)).toBe('')
    const unknown = runStatusLabel('TOTALLY_NEW')
    expect(unknown).toBe('处理中')
    expect(unknown).not.toContain('TOTALLY_NEW')
  })

  it('errorLabelText：9 个后端机器标签全部有中文，未知不露原码', () => {
    const labels = [
      'provider_timeout',
      'provider_unavailable',
      'grounding_violation',
      'proposal_invalid',
      'scope_violation',
      'context_budget_exceeded',
      'unknown_provider_error',
      'section_unavailable',
      'section_no_authorized_content',
    ]
    for (const label of labels) {
      const text = errorLabelText(label)
      expect(text, `${label} 应有中文文案`).not.toBe(label)
      expect(text).not.toContain('_')
    }
    const unknown = errorLabelText('brand_new_machine_label')
    expect(unknown).toBe('这一步没能完成，可以重试。')
    expect(unknown).not.toContain('brand_new')
    expect(errorLabelText(null)).toBe('')
  })
})

function message(over: Partial<MessageView> = {}): MessageView {
  return {
    message_id: 'm-1',
    seq: 1,
    role: 'assistant',
    kind: 'assistant_text',
    component: null,
    text: '这一节暂无可用于备课的授权内容。',
    intent: null,
    context_snapshot_id: null,
    blueprint_id: null,
    run_status: null,
    error_label: null,
    error_code: null,
    editable: false,
    created_at: '2026-09-14T10:00:00Z',
    ...over,
  } as MessageView
}

const CHILD_STUBS = {
  'n-icon': { template: '<i><slot /></i>' },
  BasicModeCard: { template: '<div data-testid="stub-basic-mode" />' },
  StructuredCard: { template: '<div data-testid="stub-structured" />' },
  ArtifactReadyCard: { template: '<div data-testid="stub-artifact-ready" />' },
}

describe('MessageItem · 消息内错误与运行状态不露内部码', () => {
  it('error_label = section_no_authorized_content 渲染中文，不显示原码', () => {
    const wrapper = mount(MessageItem, {
      props: {
        message: message({ error_label: 'section_no_authorized_content' }),
        actions: [],
        activeArtifact: null,
      },
      global: { stubs: CHILD_STUBS },
    })
    const text = wrapper.text()
    expect(text).toContain('这一节暂无可用于备课的授权内容')
    expect(text).not.toContain('section_no_authorized_content')
  })

  it('未知 error_label 走通用文案，不回显原码', () => {
    const wrapper = mount(MessageItem, {
      props: {
        message: message({ error_label: 'some_new_machine_code' }),
        actions: [],
        activeArtifact: null,
      },
      global: { stubs: CHILD_STUBS },
    })
    expect(wrapper.text()).toContain('这一步没能完成，可以重试。')
    expect(wrapper.text()).not.toContain('some_new_machine_code')
  })

  it('未知 run_status 不回显原码', () => {
    const wrapper = mount(MessageItem, {
      props: {
        message: message({ run_status: 'BRAND_NEW_STATUS' }),
        actions: [],
        activeArtifact: null,
      },
      global: { stubs: CHILD_STUBS },
    })
    expect(wrapper.text()).not.toContain('BRAND_NEW_STATUS')
    expect(wrapper.text()).toContain('处理中')
  })

  it('basic_mode_card 的 error-label 也走映射', () => {
    const wrapper = mount(MessageItem, {
      props: {
        message: message({
          error_label: 'provider_timeout',
          component: { type: 'basic_mode_card', props: {} } as MessageView['component'],
        }),
        actions: [],
        activeArtifact: null,
      },
      global: { stubs: CHILD_STUBS },
    })
    const stub = wrapper.find('[data-testid="stub-basic-mode"]')
    expect(stub.exists()).toBe(true)
    expect(stub.attributes('error-label')).toBe('AI 这次响应太慢，已先停下。可以重试。')
  })
})
