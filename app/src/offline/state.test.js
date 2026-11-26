import { describe, expect, it } from 'vitest'
import { migrate, SCHEMA_VERSION } from './state'

describe('offline state migration', () => {
  it('v1 → v2：清掉旧示例进度与 sc-v1 三次函数错题，保留双曲线错题', () => {
    const old = {
      schemaVersion: 1,
      showcase: { 'sc-s6': { turns: [{ text: 'g(x)=2x³−3x²−12x+1' }] } },
      errorBook: [
        { key: 'sc-v1', record_id: 'sc-err-sc-v1', question_preview: '三次函数' },
        { key: 'sc-hyp1', record_id: 'sc-err-sc-hyp1', question_preview: '双曲线' },
      ],
      free: { 'free-1': { turns: [] } },
    }
    const next = migrate(old)
    expect(next.schemaVersion).toBe(SCHEMA_VERSION)
    expect(next.showcase).toEqual({})
    expect(next.errorBook.map((e) => e.key)).toEqual(['sc-hyp1'])
    expect(next.practice).toEqual({ quizzes: {}, submissions: {}, answers: {} })
    expect(next.classrooms).toBeTruthy()
    expect(next.free).toEqual(old.free)
  })

  it('v2 原样返回，不重复清空', () => {
    const v2 = { schemaVersion: SCHEMA_VERSION, showcase: { a: 1 } }
    expect(migrate(v2)).toBe(v2)
  })
})
