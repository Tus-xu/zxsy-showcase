/**
 * 把课件/教案里的轻量 LaTeX 转成适合 PPTX/DOCX/PDF 的纯文本公式。
 * 生成物面向 PowerPoint / Word / PDF 阅读器，无法解析 KaTeX，因此统一转为 Unicode 记号。
 */
const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }
const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' }

const CMDS = {
  '\\\\sqrt': '√',
  '\\\\times': '×',
  '\\\\cdot': '·',
  '\\\\div': '÷',
  '\\\\pm': '±',
  '\\\\le': '≤',
  '\\\\leq': '≤',
  '\\\\ge': '≥',
  '\\\\geq': '≥',
  '\\\\ne': '≠',
  '\\\\neq': '≠',
  '\\\\parallel': '∥',
  '\\\\perp': '⊥',
  '\\\\angle': '∠',
  '\\\\triangle': '△',
  '\\\\in': '∈',
  '\\\\notin': '∉',
  '\\\\subset': '⊂',
  '\\\\subseteq': '⊆',
  '\\\\cup': '∪',
  '\\\\cap': '∩',
  '\\\\infty': '∞',
  '\\\\sum': '∑',
  '\\\\prod': '∏',
  '\\\\int': '∫',
  '\\\\Rightarrow': '⇒',
  '\\\\Leftrightarrow': '⇔',
  '\\\\to': '→',
  '\\\\pi': 'π',
  '\\\\alpha': 'α',
  '\\\\beta': 'β',
  '\\\\gamma': 'γ',
  '\\\\theta': 'θ',
  '\\\\lambda': 'λ',
  '\\\\mu': 'μ',
  '\\\\sigma': 'σ',
  '\\\\phi': 'φ',
  '\\\\omega': 'ω',
  '\\\\frac': '',
  '\\\\dfrac': '',
  '\\\\text': '',
  '\\\\mathrm': '',
  '\\\\left': '',
  '\\\\right': '',
  '\\\\quad': ' ',
  '\\\\qquad': '  ',
  '\\\\,': ' ',
  '\\\\;': ' ',
  '\\\\!': '',
  '\\\\(': '',
  '\\\\)': '',
  '\\\\[': '',
  '\\\\]': '',
  '\\\\ ': ' ',
}

/** 极简 LaTeX → 纯文本（覆盖本演示数据中出现的命令；未知命令退化为去掉反斜杠） */
export function plainMath(input) {
  if (input == null) return ''
  let s = String(input)
  if (!s.includes('$') && !s.includes('\\')) return s

  // 处理 \sqrt{...} / \frac{a}{b} / \dfrac{a}{b}（由内向外最多 3 层）
  for (let pass = 0; pass < 3; pass++) {
    s = s.replace(/\\(?:d?frac)\{([^{}]*)\}\{([^{}]*)\}/g, (_, a, b) => `${a}/${b}`)
    s = s.replace(/\\sqrt\{([^{}]*)\}/g, (_, a) => `√(${a})`)
  }
  // 上下标：x^{2} → x²；x_{1} → x₁
  s = s.replace(/\^\{?([0-9])\}?/g, (_, d) => SUP[d] || `^${d}`)
  s = s.replace(/_\{?([0-9])\}?/g, (_, d) => SUB[d] || `_${d}`)
  s = s.replace(/\^\{?([A-Za-zα-ωΑ-Ω]+)\}?/g, (_, t) => `^${t}`)

  // 命令替换
  for (const [cmd, rep] of Object.entries(CMDS)) {
    s = s.split(cmd).join(rep)
  }
  // \text{中文} / \mathrm{...}
  s = s.replace(/\\text\{([^{}]*)\}/g, (_, t) => t)
  s = s.replace(/\\mathrm\{([^{}]*)\}/g, (_, t) => t)
  // 去掉公式定界符
  s = s.replace(/\$\$/g, '').replace(/\$/g, '')
  // 残留反斜杠命令：去掉反斜杠，保留命令名
  s = s.replace(/\\([A-Za-z]+)/g, '$1')
  s = s.replace(/[{}]/g, '')
  return s.replace(/\s{2,}/g, ' ').trim()
}
