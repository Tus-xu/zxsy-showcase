import { describe, expect, it } from 'vitest'
import { humanizeMath } from './latex'

describe('humanizeMath · 错题预览清洗', () => {
  it('带反斜杠的命令', () => {
    expect(humanizeMath('已知集合 A = x \\mid x^2 - 2x - 3 \\le 0')).toContain('|')
    expect(humanizeMath('已知集合 A = x \\mid x^2 - 2x - 3 \\le 0')).toContain('≤')
    expect(humanizeMath('\\triangle ABC')).toBe('△ ABC')
    expect(humanizeMath('\\frac{a}{b}')).toBe('(a)/(b)')
    expect(humanizeMath('x \\in A \\cap B')).toBe('x ∈ A ∩ B')
    expect(humanizeMath('\\sqrt{3}')).toBe('√(3)')
  })

  it('后端剥掉反斜杠后的裸命令', () => {
    expect(humanizeMath('neg p')).toContain('¬')
    expect(humanizeMath('A cap B')).toContain('∩')
    expect(humanizeMath('log_2(x-1)')).toContain('log₂')
    expect(humanizeMath('triangle ABC')).toBe('△ ABC')
    expect(humanizeMath('x^2 + x^3')).toBe('x² + x³')
    expect(humanizeMath('frac{sqrt{x-1}}{x-2}')).not.toContain('frac')
    expect(humanizeMath('frac{sqrt{x-1}}{x-2}')).not.toContain('sqrt')
  })

  it('已带 $ 定界符的文本原样返回；$ 外裸命令仍清洗', () => {
    expect(humanizeMath('$x^2$')).toBe('$x^2$')
    const mixed = humanizeMath('已知 $x^2$ 与 frac{a}{b}')
    expect(mixed).toContain('$x^2$')
    expect(mixed).not.toContain('frac')
  })
})
