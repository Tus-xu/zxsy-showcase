import { describe, expect, it } from 'vitest'
import { classroomEvents, handleClassroom } from './classroom'
import { CLASSROOM_DECKS } from '../showcase/classroomDecks'

describe('offline classroom handler', () => {
  it('三套真实课件都可以创建并返回 ready 详情', () => {
    for (const key of Object.keys(CLASSROOM_DECKS)) {
      const created = handleClassroom('POST', '/api/classroom/sessions', { topic: CLASSROOM_DECKS[key].topic })
      expect(created.body.data.session_id).toContain(`sc-dual-${key}`)
      const seeded = handleClassroom('GET', `/api/classroom/sessions/sc-dual-${key}`)
      expect(seeded.body.data.status).toBe('ready')
      expect(seeded.body.data.slides.length).toBe(CLASSROOM_DECKS[key].slideCount)
      expect(seeded.body.data.outlines.length).toBe(seeded.body.data.slides.length)
      expect(seeded.body.data.slides[0].deck_slide.elements.length).toBeGreaterThan(0)
      expect(seeded.body.data.slides[0].narration).not.toContain('$')
    }
  })

  it('最近课堂列表返回 3 套，SSE 逐页推进', () => {
    const list = handleClassroom('GET', '/api/classroom/sessions?limit=5')
    expect(list.body.data.items.length).toBeGreaterThanOrEqual(3)
    const evs = classroomEvents('sc-dual-line-full')
    const slideEvents = evs.filter((e) => e.event === 'slide')
    expect(slideEvents.length).toBe(CLASSROOM_DECKS['line-full'].slideCount)
    expect(evs[evs.length - 1].event).toBe('done')
  })
})
