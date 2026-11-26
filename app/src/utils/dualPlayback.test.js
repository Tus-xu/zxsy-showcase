import { describe, expect, it } from 'vitest'
import { buildTimeline, splitSentences } from './dualPlayback'

describe('dualPlayback / splitSentences', () => {
  it('按句末标点切句，不把完整句子切成一惊一乍的碎片', () => {
    const text =
      '下面把刚才的思路写成完整步骤。设点 P 是直线上异于 P 一的任意一点，由斜率公式得到 k 等于 y 减 y 一，除以 x 减 x 一。两边同乘 x 减 x 一，就得到 y 减 y 一等于 k 乘 x 减 x 一。'
    const segs = splitSentences(text)
    expect(segs).toHaveLength(3)
    expect(segs.every((s) => s.length >= 12)).toBe(true)
    expect(segs[1]).toContain('除以 x 减 x 一')
  })

  it('不切 $...$ 里的句读', () => {
    const segs = splitSentences('在 $y-y_1=k(x-x_1)$ 中，$x$ 是自变量；当 $x=x_1$ 时，$y=y_1$。')
    expect(segs).toHaveLength(2)
    expect(segs[0]).toContain('$y-y_1=k(x-x_1)$')
    expect(segs[1]).toContain('$x=x_1$')
  })

  it('超长句按逗号切分时，尾片不会碎成几个字', () => {
    const long = '这是一段很长的讲稿，' + '用来检查切句是否稳定，'.repeat(8) + '最后收尾。'
    const segs = splitSentences(long)
    expect(segs.length).toBeGreaterThan(1)
    expect(segs.every((s) => s.length >= 24 || s === segs[0])).toBe(true)
  })

  it('空文本返回空数组', () => {
    expect(splitSentences('')).toEqual([])
    expect(buildTimeline('', 3)).toEqual([])
  })
})
