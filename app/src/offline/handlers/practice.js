/**
 * 练题中心离线服务：推荐 / 出题 / 判分 / SmartScore / 总结 / 错题详情。
 * 响应形状严格对齐 PracticeView / ErrorsView 实际读取的字段；
 * 动态 quiz_id 不能靠 fixture，必须在 replay 的 fixture 循环之前拦截。
 */
import { patch, store } from '../state'
import { PRACTICE_SETS, PRACTICE_SET_BY_ID, practiceSetFor } from '../showcase/practiceBank'

let quizSeq = 0
let subSeq = 0

const ok = (data) => ({ status: 200, body: { code: 0, message: 'ok', data } })
const fail = (message, status = 404, code = 40401) => ({ status, body: { code, message, data: null } })

function queryOf(path) {
  const i = String(path).indexOf('?')
  return new URLSearchParams(i >= 0 ? String(path).slice(i + 1) : '')
}

function ensurePractice() {
  if (!store.practice || typeof store.practice !== 'object') {
    patch((s) => {
      s.practice = { quizzes: {}, submissions: {}, answers: {} }
    })
  }
  if (!store.practice.quizzes) store.practice.quizzes = {}
  if (!store.practice.submissions) store.practice.submissions = {}
  if (!store.practice.answers) store.practice.answers = {}
  return store.practice
}

function setQuestions(set, count) {
  const n = Math.max(1, Math.min(Number(count) || 5, set.questions.length))
  return set.questions.slice(0, n)
}

function groupPayload(set, count) {
  const qs = setQuestions(set, count)
  return {
    title: `今日训练组 · ${set.title}`,
    kp_code: set.kp.code,
    kp_name: set.kp.name,
    count: qs.length,
    est_minutes: set.est_minutes,
    mix: set.difficulty_mix,
    mastery_now: 0.04,
    mastery_forecast: 0.18,
    reason: `「${set.kp.name}」是当前演示题组，练完可回到对话继续引导。`,
  }
}

function normalizeChoice(v) {
  return String(v ?? '').trim().toUpperCase().match(/[A-D]/)?.[0] || ''
}

function upsertPracticeError(q, answerText, set) {
  const rec = {
    key: `practice-${q.id}`,
    record_id: `practice-${q.id}`,
    question_preview: q.stem.slice(0, 140),
    question_text: q.stem,
    answer_text: answerText,
    correct_answer: q.answer,
    error_type: 'concept',
    kp_code: q.kp_code,
    kp_name: q.kp_name,
    wrong_count: 1,
    entered_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    next_review_at: new Date(Date.now() + 86400_000).toISOString(),
    memory_stability: 0.5,
    retrievability: 0.5,
    fsrs_level: 'new',
    review_count: 0,
    answer_analysis: q.explain,
    variants_hint: '',
    note: '',
    source: 'practice',
  }
  patch((s) => {
    const list = Array.isArray(s.errorBook) ? s.errorBook : []
    const i = list.findIndex((e) => e && e.record_id === rec.record_id)
    s.errorBook = i >= 0 ? list.map((e, j) => (j === i ? { ...e, ...rec, wrong_count: (e.wrong_count || 0) + 1 } : e)) : [...list, rec]
  })
}

function findErrorRecord(id) {
  const list = Array.isArray(store.errorBook) ? store.errorBook : []
  return list.find((e) => e && (e.record_id === id || e.key === id)) || null
}

function errorDetail(rec) {
  if (!rec) return null
  return {
    ...rec,
    question_text: rec.question_text || rec.question_preview || '',
    answer_text: rec.answer_text || '',
    correct_answer: rec.correct_answer || '',
    generated_answer: rec.answer_analysis || rec.generated_answer || rec.analysis || '',
    review_count: rec.review_count ?? 0,
    analysis: rec.note || '先对照正解，再回到题目重做一遍。',
  }
}

/** 返回 {status, body}；非本域返回 null */
export function handlePractice(method, path, body = {}) {
  const p = String(path).split('?')[0]
  const st = ensurePractice()

  if (method === 'GET' && p === '/api/student/practice/group-recommend') {
    const qs = queryOf(path)
    const set = practiceSetFor(qs.get('kp_code') || '')
    return ok(groupPayload(set, qs.get('count')))
  }

  if (method === 'GET' && p === '/api/student/practice/difficulty-mix') {
    return ok({
      items: [
        { level: 'easy', count: 2, ratio: 0.4 },
        { level: 'medium', count: 2, ratio: 0.4 },
        { level: 'hard', count: 1, ratio: 0.2 },
      ],
      explanation: '离线演示题组按 2:2:1 配比，覆盖概念、运算与综合。',
    })
  }

  if (method === 'GET' && p === '/api/student/practice/kp-catalog') {
    return ok({
      items: PRACTICE_SETS.map((s) => ({ code: s.kp.code, name: s.kp.name, bank_count: s.questions.length })),
    })
  }

  if (method === 'POST' && p === '/api/student/practice/start') {
    const set = PRACTICE_SET_BY_ID[body.kp_code ? practiceSetFor(body.kp_code).id : 'set-hyp-ecc'] || PRACTICE_SETS[0]
    const qs = setQuestions(set, body.count)
    const quizId = `offline-quiz-${set.id}-${++quizSeq}`
    st.quizzes[quizId] = {
      quizId,
      setId: set.id,
      mode: body.mode || 'special',
      startedAt: Date.now(),
      items: qs.map((x) => ({ item_no: x.item_no, questionId: x.id, answer: x.answer })),
    }
    patch((s) => { s.practice = st })
    return ok({
      quiz_id: quizId,
      mode: body.mode || 'special',
      items: qs.map((x) => ({
        item_no: x.item_no,
        interaction_type: 'choice',
        q_type: 'choice',
        question_text: x.stem,
        options: x.options,
        kp_code: x.kp_code,
        difficulty: x.difficulty,
        image: [],
        answer: x.answer,
        answer_analysis: x.explain,
        ai_generated: false,
        source: x.source,
      })),
      bank_count: qs.length,
      ai_count: 0,
      daily_cap: { limit: 20, used: 0, scope: 'ai_only' },
    })
  }

  if (method === 'POST' && p === '/api/student/practice/submit') {
    const quiz = st.quizzes[body.quiz_id]
    const set = quiz ? PRACTICE_SET_BY_ID[quiz.setId] : null
    if (!quiz || !set) return fail('这份离线题组已失效，请重新开始训练。')
    const submitted = Array.isArray(body.items) ? body.items : []
    const results = []
    for (const item of submitted) {
      const qq = set.questions.find((x) => x.item_no === Number(item.item_no))
      if (!qq) continue
      const got = normalizeChoice(item.answer_text)
      const correct = got === qq.answer
      results.push({
        item_no: qq.item_no,
        verdict: correct ? 'correct' : 'wrong',
        score: correct ? 10 : 0,
        correct_answer: qq.answer,
        explain: qq.explain,
      })
      if (!correct) upsertPracticeError(qq, String(item.answer_text || ''), set)
    }
    const submissionId = `offline-sub-${++subSeq}`
    st.submissions[submissionId] = {
      submissionId,
      quizId: quiz.quizId,
      results,
      correct: results.filter((r) => r.verdict === 'correct').length,
      total: results.length,
      at: Date.now(),
    }
    st.answers[quiz.quizId] = { ...(st.answers[quiz.quizId] || {}), ...Object.fromEntries(submitted.map((x) => [x.item_no, x.answer_text])) }
    patch((s) => { s.practice = st })
    return ok({ submission_id: submissionId, results, mastery_updated: false })
  }

  if (method === 'GET' && p === '/api/student/practice/smart-score') {
    const id = queryOf(path).get('submission_id')
    const sub = st.submissions[id]
    if (!sub) return ok({ smart_score: 60, breakdown: { accuracy: 0.5, speed: 0.8, independence: 0.8 } })
    const accuracy = sub.total ? sub.correct / sub.total : 0
    return ok({
      smart_score: Math.round(accuracy * 100),
      breakdown: { accuracy, speed: 0.9, independence: 0.85 },
    })
  }

  if (method === 'GET' && p === '/api/student/practice/summary') {
    const id = queryOf(path).get('quiz_id')
    const quiz = st.quizzes[id]
    const set = quiz ? PRACTICE_SET_BY_ID[quiz.setId] : null
    const subs = Object.values(st.submissions).filter((s) => s.quizId === id)
    const total = subs.reduce((n, s) => n + s.total, 0)
    const correct = subs.reduce((n, s) => n + s.correct, 0)
    const accuracy = total ? correct / total : 0
    const kp = set?.kp || { code: '', name: '本次训练' }
    const row = { kp_code: kp.code, kp_name: kp.name, from: 0.04, to: Number((0.04 + accuracy * 0.12).toFixed(3)) }
    return ok({
      upgraded: accuracy >= 0.6 ? [row] : [],
      flat: accuracy >= 0.6 ? [] : [row],
      downgraded: [],
      recommendation: accuracy >= 0.8
        ? '本轮正确率不错，明天可以推进相邻知识点。'
        : '先把错题的正解重做一遍，再回到练题中心继续。',
    })
  }

  // 练习错题的详情 / 诊断（ErrorsView 打开练习错题时不再 404）
  const detailM = p.match(/^\/api\/student\/error-records\/([^/]+)\/detail$/)
  if (method === 'GET' && detailM) {
    const rec = findErrorRecord(detailM[1])
    return rec ? ok(errorDetail(rec)) : fail('这条错题不在离线记录里。')
  }
  const butlerDetail = p.match(/^\/api\/butler\/error-detail\/([^/]+)$/)
  if (method === 'GET' && butlerDetail) {
    const rec = findErrorRecord(butlerDetail[1])
    return rec ? ok(errorDetail(rec)) : fail('这条错题不在离线记录里。')
  }
  const butlerDiag = p.match(/^\/api\/butler\/error-diagnosis\/([^/]+)$/)
  if (method === 'GET' && butlerDiag) {
    const rec = findErrorRecord(butlerDiag[1])
    return rec ? ok({
      diagnosis: rec.note || '概念或运算环节有缺口。',
      cause: rec.error_type || 'concept',
      suggestion: '先看正解，再把同一题独立重做一遍；需要时回到对话让 AI 一步步带。',
    }) : fail('这条错题不在离线记录里。')
  }

  const reviewM = p.match(/^\/api\/student\/error-records\/([^/]+)\/review$/)
  if (method === 'POST' && reviewM) {
    const rec = findErrorRecord(reviewM[1])
    if (!rec) return fail('这条错题不在离线记录里。')
    return ok({ ok: true, next_review_at: new Date(Date.now() + 2 * 86400_000).toISOString() })
  }

  return null
}
