/**
 * fixtures 匹配的单元测试（TDD：先写失败测试，再实现参数敏感匹配）。
 *
 * 覆盖本轮返工的核心缺陷：
 *   - /api/v1/questions 必须按 query 精确回放（limit=1 ≠ limit=30 ≠ 各筛选组合）
 *   - videos / error-records 同理按参数区分
 *   - 未知端点不得误配（无前缀退化）
 */
import { describe, it, expect } from 'vitest'
import { findFixture, FIXTURES } from './fixtures'

const R = 'student'

describe('findFixture 参数敏感匹配（student）', () => {
  it('questions: limit=1 与 limit=30 返回不同数据', () => {
    const a = findFixture(R, 'GET', '/api/v1/questions?limit=1')
    const b = findFixture(R, 'GET', '/api/v1/questions?limit=30&offset=0')
    expect(a, 'limit=1 fixture 缺失（需 run-03 采证）').toBeTruthy()
    expect(b, 'limit=30 fixture 缺失（需 run-03 采证）').toBeTruthy()
    const pa = JSON.parse(a.text)
    const pb = JSON.parse(b.text)
    expect(pa.data.items.length).toBe(1)
    expect(pb.data.items.length).toBe(24)
    expect(pa.data.total).toBe(24)
    expect(pb.data.total).toBe(24)
  })

  it('questions: 不同筛选返回不同集合', () => {
    const choice = JSON.parse(findFixture(R, 'GET', '/api/v1/questions?limit=30&offset=0&q_type=choice').text)
    const hard = JSON.parse(findFixture(R, 'GET', '/api/v1/questions?limit=30&offset=0&difficulty=hard').text)
    const combo = JSON.parse(findFixture(R, 'GET', '/api/v1/questions?limit=30&offset=0&q_type=choice&difficulty=easy').text)
    expect(choice.data.items.every((q) => q.q_type === 'choice')).toBe(true)
    expect(hard.data.items.every((q) => q.difficulty === 'hard')).toBe(true)
    expect(combo.data.items.every((q) => q.q_type === 'choice' && q.difficulty === 'easy')).toBe(true)
    expect(choice.data.items.length).not.toBe(hard.data.items.length)
  })

  it('questions: 关键词搜索各自命中', () => {
    const fn = JSON.parse(findFixture(R, 'GET', '/api/v1/questions?limit=30&offset=0&q=%E5%87%BD%E6%95%B0').text)
    const ds = JSON.parse(findFixture(R, 'GET', '/api/v1/questions?limit=30&offset=0&q=%E5%AF%BC%E6%95%B0').text)
    expect(fn.data.items.length).toBe(14)
    expect(ds.data.items.length).toBe(6)
  })

  it('videos: page_size=1 与 topic=featured 不同', () => {
    const probe = findFixture(R, 'GET', '/api/student/videos?page_size=1')
    const feat = findFixture(R, 'GET', '/api/student/videos?topic=featured&page_size=12')
    expect(probe).toBeTruthy()
    expect(feat).toBeTruthy()
    expect(probe.text).not.toBe(feat.text)
  })

  it('videos: 不同 topic 互不串数据', () => {
    const fr = findFixture(R, 'GET', '/api/student/videos?topic=function&page_size=12')
    const tr = findFixture(R, 'GET', '/api/student/videos?topic=trig&page_size=12')
    const f = JSON.parse(fr.text)
    const t = JSON.parse(tr.text)
    expect(f.data.items.length).toBeGreaterThan(0)
    expect(t.data.items.length).toBeGreaterThan(0)
    expect(fr.text).not.toBe(tr.text)
  })

  it('未知端点返回 null（无前缀退化，不再误配短信/其它响应）', () => {
    expect(findFixture(R, 'POST', '/api/agent/conversations/xyz/actions')).toBeNull()
    expect(findFixture(R, 'POST', '/api/foo/bar')).toBeNull()
    expect(findFixture(R, 'GET', '/api/nonexistent/path')).toBeNull()
  })

  it('error-records: limit=1（端点忽略 limit，实返 20 条）与 filter?size=50 分开落库', () => {
    const probe = findFixture(R, 'GET', '/api/student/error-records?limit=1')
    const filtered = findFixture(R, 'GET', '/api/student/error-records/filter?page=1&size=50&error_type=concept')
    expect(probe).toBeTruthy()
    expect(filtered).toBeTruthy()
    const pp = JSON.parse(probe.text)
    expect(pp.data.items.length).toBe(20)
    expect(probe.text).not.toBe(filtered.text)
  })

  it('会话消息按 id 区分（采证会话可回放）', () => {
    const m = findFixture(R, 'GET', '/api/agent/conversations/986d06b9-cde8-4289-958f-2fb914395a0c/messages?limit=20')
    expect(m).toBeTruthy()
  })
})

describe('fixtures 装载完整性（run-03 采证接入后）', () => {
  it('student 角色至少装载 60 个端点', () => {
    expect(Object.keys(FIXTURES[R] || {}).length).toBeGreaterThanOrEqual(60)
  })
})
