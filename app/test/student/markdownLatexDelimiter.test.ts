import { describe, expect, it } from 'vitest'
import { renderMarkdown } from '@/utils/markdown'

describe('学生对话中的 LaTeX 定界符', () => {
  it('保留并渲染 \\(...\\) 内的完整数学内容，而不是显示替换占位符', () => {
    const html = renderMarkdown('定义域需要满足：\\(x^2\\le 1\\)，且 \\(-2\\sqrt{x}\\le 1\\)。')

    expect(html).toContain('katex')
    expect(html).toContain('x^2\\le 1')
    expect(html).toContain('-2\\sqrt{x}\\le 1')
    expect(html).not.toContain('$1$')
  })

  it('把 \\[...\\] 展示公式转成 KaTeX，而不是裸奔成中括号文本', () => {
    const html = renderMarkdown('先看集合 A：\\[\nx^2-(3a+1)x+2a(a+1)<0\n\\]\n再因式分解。')

    expect(html).toContain('katex')
    expect(html).toContain('x^2-(3a+1)x+2a(a+1)&lt;0')
    expect(html).not.toMatch(/\[\s*x\^2/)
  })

  it('把 ```latex 围栏转成展示公式（含 \\big/\\cdot/\\min）', () => {
    const html = renderMarkdown('```latex\nA=\\{x\\mid \\min\\{2a,a+1\\}<x<\\max\\{2a,a+1\\}\\}\n```')

    expect(html).toContain('katex')
    expect(html).toContain('\\min')
    expect(html).not.toContain('<code')
  })

  it('无语言标记但高置信数学围栏也转公式；Python 围栏保持代码块', () => {
    const mathHtml = renderMarkdown('```\n2a\\cdot(a+1)=2a(a+1)\n```')
    expect(mathHtml).toContain('katex')

    const codeHtml = renderMarkdown('```\nprint(sympy.solve(x**2-1))\n```')
    expect(codeHtml).toContain('<code')
    expect(codeHtml).not.toContain('katex')
  })
})
