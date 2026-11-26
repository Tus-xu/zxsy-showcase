import { beforeEach, describe, expect, it } from 'vitest'
import { patch } from '../state'
import { handlePractice } from './practice'
import { PRACTICE_SETS } from '../showcase/practiceBank'

const set = PRACTICE_SETS[0]

function call(method, path, body) {
  return handlePractice(method, path, body)
}

describe('offline practice handler', () => {
  beforeEach(() => {
    patch((s) => {
      s.practice = { quizzes: {}, submissions: {}, answers: {} }
      s.errorBook = []
    })
  })

  it('推荐 / 知识点目录返回三套题', () => {
    const g = call('GET', '/api/student/practice/group-recommend?count=5')
    expect(g.body.data.kp_code).toBe(set.kp.code)
    expect(g.body.data.count).toBe(5)
    const c = call('GET', '/api/student/practice/kp-catalog')
    expect(c.body.data.items).toHaveLength(3)
  })

  it('开始 → 答对 → SmartScore → 总结', () => {
    const start = call('POST', '/api/student/practice/start', {
      mode: 'special',
      kp_code: set.kp.code,
      count: 5,
    })
    expect(start.status).toBe(200)
    const quizId = start.body.data.quiz_id
    expect(start.body.data.items).toHaveLength(5)
    expect(start.body.data.items[0].answer).toBe('D')
    expect(start.body.data.items[0].answer_analysis).toContain('2√2')

    const submit = call('POST', '/api/student/practice/submit', {
      quiz_id: quizId,
      client_submit_id: `${quizId}:1`,
      items: [{ item_no: 1, q_type: 'choice', answer_text: 'D' }],
    })
    expect(submit.body.data.results[0].verdict).toBe('correct')
    const subId = submit.body.data.submission_id

    const score = call('GET', `/api/student/practice/smart-score?submission_id=${subId}`)
    expect(score.body.data.smart_score).toBeGreaterThan(60)

    const summary = call('GET', `/api/student/practice/summary?quiz_id=${quizId}`)
    expect(summary.body.data.recommendation).toBeTruthy()
  })

  it('答错写真实错题记录，详情可从本地查到', () => {
    const start = call('POST', '/api/student/practice/start', {
      mode: 'special',
      kp_code: set.kp.code,
      count: 5,
    })
    const quizId = start.body.data.quiz_id
    call('POST', '/api/student/practice/submit', {
      quiz_id: quizId,
      client_submit_id: `${quizId}:1`,
      items: [{ item_no: 1, q_type: 'choice', answer_text: 'A' }],
    })
    const detail = call('GET', '/api/student/error-records/practice-hyp-01/detail')
    expect(detail.status).toBe(200)
    expect(detail.body.data.correct_answer).toBe('D')
    expect(detail.body.data.question_text).toContain('虚轴长')
  })
})
