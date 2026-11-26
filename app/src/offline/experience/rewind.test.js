import { describe, expect, it } from 'vitest'
import { getKnowledgeRewind, hasKnowledgeRewind } from './rewind'
import t1 from './scripts/t1'

describe('knowledge rewind', () => {
  it('离心率回溯有两层，每层三步，且第二次仍不懂只停在 floor', () => {
    const r = getKnowledgeRewind('hyperbola-eccentricity')
    expect(r).toBeTruthy()
    expect(r.levels).toHaveLength(2)
    expect(r.levels.every((l) => l.steps.length === 3)).toBe(true)
    expect(r.stillStuck.cta).toBeTruthy()
    expect(hasKnowledgeRewind('nope')).toBe(false)
    expect(getKnowledgeRewind('line-plane-perpendicular')?.levels).toHaveLength(2)
    expect(getKnowledgeRewind('expected-value-indicator')?.levels).toHaveLength(2)
    expect(getKnowledgeRewind('expected-value-indicator')?.citations?.length).toBeGreaterThan(0)
  })

  it('题1 第 2 步答错才挂载回溯入口，第 1 步不挂', () => {
    const ex = t1['exp-t1-guided'].exchanges
    expect(ex[0].ai.check.review).toBeUndefined()
    expect(ex[1].ai.check.review.id).toBe('hyperbola-eccentricity')
    expect(ex[1].ai.check.review.title).toContain('离心率')
  })
})
