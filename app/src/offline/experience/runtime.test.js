import { beforeEach, describe, expect, it } from 'vitest'
import {
  experienceChatTurn,
  experienceMessages,
  experiencePrefill,
  experienceState,
  gradeCheck,
  resetExperience,
} from './runtime'

const EXP = 'exp-t1-guided'

function send(text, extra = {}) {
  return experienceChatTurn({
    conversation_id: EXP,
    message: text,
    attachments: [{ file_id: 'exp-t1-img', kind: 'image', name: '题1.png' }],
    ...extra,
  })
}

function eventsOf(evs) {
  return (evs || []).map((e) => e.event)
}

function cardOf(evs, cardType) {
  return (evs || []).find((e) => e.event === 'card' && e.data?.card_type === cardType)?.data
}

describe('experience runtime · 题1 引导式', () => {
  beforeEach(() => {
    resetExperience(EXP)
  })

  it('进入时有封面首条预填，首次发送后真实流式并停在交互卡', () => {
    const p = experiencePrefill(EXP)
    expect(p.text).toContain('虚轴长')
    expect(p.attachment?.kind).toBe('image')
    const evs = send(p.text)
    expect(eventsOf(evs)).toContain('token')
    expect(eventsOf(evs)).toContain('card')
    expect(eventsOf(evs)).not.toContain('prefill') // 有交互卡，等用户作答
    const card = cardOf(evs, 'socratic_interaction')
    expect(card.form).toBe('binary')
    expect(experienceState(EXP).pending).toBeTruthy()
  })

  it('答对后推进并预填下一条；答错给错因且不推进', () => {
    send(experiencePrefill(EXP).text)
    const wrong = send('b/a=7', {
      context: { tutor_interaction: { payload: { choice: 'b' } } },
    })
    expect(eventsOf(wrong)).toContain('card')
    expect(cardOf(wrong, 'socratic_error_analysis')?.misconception_zh).toBeTruthy()
    expect(cardOf(wrong, 'socratic_error_analysis')?.citations?.length).toBeGreaterThan(0)
    expect(eventsOf(wrong)).not.toContain('prefill')

    const right = send('b/a=√7', {
      context: { tutor_interaction: { payload: { choice: 'a' } } },
    })
    expect(cardOf(right, 'socratic_progress')?.current_step).toBe(1)
    const pre = (right || []).find((e) => e.event === 'prefill')
    expect(pre?.data?.text).toContain('把 c² 写成 a² 的倍数吗')
    expect(eventsOf(right)).toContain('citation')
    expect(cardOf(right, 'socratic_progress')?.current_step).toBe(1)
    const aiText = (right || []).filter((e) => e.event === 'token').map((e) => e.data?.text || '').join('')
    expect(aiText).toContain('下一句已经放在输入框里')
    expect(experienceState(EXP).exchange).toBe(1)
  })

  it('完整三步走完后标 done，并返回知识追溯卡', () => {
    send(experiencePrefill(EXP).text)
    send('b/a=√7', { context: { tutor_interaction: { payload: { choice: 'a' } } } })
    send(experiencePrefill(EXP).text)
    send('c²=8a²', {
      context: {
        tutor_interaction: {
          payload: { blanks: { b1: '$a^2+b^2$', b2: '8a^2' } },
        },
      },
    })
    send(experiencePrefill(EXP).text)
    const final = send('选 D', {
      context: { tutor_interaction: { payload: { choice: 'd' } } },
    })
    expect(experienceState(EXP).done).toBe(true)
    expect(eventsOf(final)).toContain('complete')
    expect(cardOf(final, 'knowledge_trace')).toBeTruthy()
    expect(cardOf(final, 'socratic_complete')).toBeTruthy()
    expect(experienceMessages(EXP).length).toBeGreaterThan(5)
  })

  it('本地判分支持 choice / binary / cloze / expr', () => {
    expect(gradeCheck({ form: 'choice', accept: ['b/a=√7'] }, { message: 'b/a=√7' })).toBe(true)
    expect(gradeCheck({ form: 'binary', accept: ['d'] }, { context: { tutor_interaction: { payload: { choice: 'd' } } } })).toBe(true)
    expect(gradeCheck({ form: 'cloze', accept: { b1: ['4'] } }, { context: { tutor_interaction: { payload: { blanks: { b1: '4' } } } } })).toBe(true)
    expect(gradeCheck({ form: 'expr', accept: ['c^2=a^2+b^2'] }, { context: { tutor_interaction: { payload: { latex: 'c²=a²+b²' } } } })).toBe(true)
  })
})
