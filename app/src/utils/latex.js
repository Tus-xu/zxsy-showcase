/**
 * 裸 LaTeX 智能包装：后端部分字段（如 socratic_complete 的 final_answer）
 * 给的是无 $ 定界符的 LaTeX 源码（如 \dfrac{\sqrt{3}}{3}）。
 * 含 LaTeX 命令且不含 $ 时裹定界符，交给 MarkdownView 的 KaTeX 渲染；
 * 已含 $ 或纯文本则原样返回。
 * inline=true 用 $...$（行内，适合选项等短文本），否则 $$...$$（展示模式）。
 */
export function wrapBareLatex(text, { inline = false } = {}) {
  const s = String(text ?? '').trim()
  if (!s) return ''
  if (s.includes('$')) return s
  if (/\\[a-zA-Z]+/.test(s)) return inline ? `$${s}$` : `$$${s}$$`
  return s
}

/**
 * 嵌套/碎片化 $ 定界符归一化（题库 AGIEval/GAOKAO-Bench 原始语料治理）。
 * 病灶样例（DB 实拍）：
 *   $(x $\sqrt{y}$-y $\sqrt{x}$)^{4}$          → $(x \sqrt{y}-y \sqrt{x})^{4}$
 *   $\left($\frac{x}{$\sqrt{y}$$}-$\frac{y}{$\sqrt{x}$$}\right)^{8}$
 *     → $\left(\frac{x}{\sqrt{y}}-\frac{y}{\sqrt{x}}\right)^{8}$
 * 规则：从单 $ 起始扫描，括号（圆/花/方）未平衡时遇到的 $ 视为内层碎片剥掉，
 * 平衡时的 $ 才是闭合。找不到平衡闭合则回退到下一个 $（保持原解析行为）。
 * 不误伤：独立多段 $a$ 和 $b$、$$ 展示数学、半开区间 $[0,1)$（负深度回退）。
 */
export function mergeNestedMath(text) {
  const s = String(text ?? '')
  if (!s.includes('$')) return s
  let out = ''
  let i = 0
  const n = s.length
  while (i < n) {
    if (s[i] === '\\' && s[i + 1] === '$') { out += '\\$'; i += 2; continue }
    if (s[i] !== '$') { out += s[i]; i++; continue }
    if (s[i + 1] === '$') {
      const close = s.indexOf('$$', i + 2)
      if (close === -1) { out += s.slice(i); break }
      out += s.slice(i, close + 2)
      i = close + 2
      continue
    }
    const span = findBalancedClose(s, i + 1)
    if (!span) { out += '$'; i++; continue }
    out += '$' + span.content + '$'
    i = span.end + 1
  }
  return out
}

function findBalancedClose(s, start) {
  let paren = 0, brace = 0, bracket = 0
  let content = ''
  let firstDollar = -1
  let j = start
  const n = s.length
  while (j < n) {
    const ch = s[j]
    if (ch === '\\') {
      const nx = s[j + 1]
      if (nx === '$') { content += '\\$'; j += 2; continue }
      content += nx === undefined ? ch : ch + nx // 转义整体复制，\{ \( 等不计括号
      j += 2
      continue
    }
    if (ch === '$') {
      if (firstDollar === -1) firstDollar = j
      if (paren === 0 && brace === 0 && bracket === 0) return { content, end: j }
      j++ // 未平衡：内层碎片 $，剥掉继续
      continue
    }
    if (ch === '(') paren++
    else if (ch === ')') paren--
    else if (ch === '{') brace++
    else if (ch === '}') brace--
    else if (ch === '[') bracket++
    else if (ch === ']') bracket--
    if (paren < 0 || brace < 0 || bracket < 0) break // 负深度：本段非嵌套语料，回退
    content += ch
    j++
  }
  if (firstDollar === -1) return null
  return { content: s.slice(start, firstDollar), end: firstDollar } // 回退原行为
}

/**
 * 混合文本里的裸 LaTeX 降级为可读 Unicode（仅用于列表预览/无 $ 定界符的旧数据）。
 * 不追求排版，只保证学生看不到 \mid、\le、\frac 这类源码。
 */
export function humanizeMath(text) {
  let s = String(text ?? '')
  if (!s) return s
  // 混合文本：只清洗 $ 外的裸命令，$ 内的公式留给 KaTeX
  if (s.includes('$')) {
    return s.split('$').map((part, i) => (i % 2 ? part : humanizeMath(part))).join('$')
  }
  // 带反斜杠的 LaTeX 命令
  s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, '√($1)')
  s = s.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)')
  s = s.replace(/\\log_\s*\{([^{}]*)\}/g, 'log_$1')
  s = s.replace(/\\log/g, 'log')
  s = s.replace(/\\mathrm\s*\{([^{}]*)\}/g, '$1')
  s = s.replace(/\\text\s*\{([^{}]*)\}/g, '$1')
  s = s.replace(/\\left|\\right/g, '')
  s = s.replace(/\\mid/g, '|')
  s = s.replace(/\\leq?/g, '≤')
  s = s.replace(/\\geq?/g, '≥')
  s = s.replace(/\\neq/g, '≠')
  s = s.replace(/\\times/g, '×')
  s = s.replace(/\\cdot/g, '·')
  s = s.replace(/\\pm/g, '±')
  s = s.replace(/\\in\b/g, '∈')
  s = s.replace(/\\notin\b/g, '∉')
  s = s.replace(/\\cap\b/g, '∩')
  s = s.replace(/\\cup\b/g, '∪')
  s = s.replace(/\\triangle/g, '△')
  s = s.replace(/\\angle/g, '∠')
  s = s.replace(/\\perp/g, '⊥')
  s = s.replace(/\\parallel/g, '∥')
  s = s.replace(/\\infty/g, '∞')
  s = s.replace(/\\mathbb\s*\{R\}/g, 'ℝ')
  s = s.replace(/\\quad|\\qquad/g, ' ')
  s = s.replace(/\\[,;!]/g, ' ')
  // 后端有时会删掉反斜杠，只剩裸命令名（neg/cap/log_2/triangle…）
  s = s.replace(/\bneg\b/g, '¬')
  s = s.replace(/\bcap\b/g, '∩')
  s = s.replace(/\bcup\b/g, '∪')
  s = s.replace(/\btriangle\b/g, '△')
  s = s.replace(/\blog_([0-9])\b/g, (_, d) => `log${'₀₁₂₃₄₅₆₇₈₉'[Number(d)] || d}`)
  s = s.replace(/\bmid\b/g, '|')
  s = s.replace(/\b(le|leq)\b/g, '≤')
  s = s.replace(/\b(ge|geq)\b/g, '≥')
  s = s.replace(/\bneq\b/g, '≠')
  // 后端剥掉反斜杠后仍带花括号的 frac/sqrt（如 frac{\sqrt{x-1}}{x-2}）
  s = s.replace(/\bsqrt\s*\{([^{}]*)\}/g, '√($1)')
  s = s.replace(/\bfrac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)')
  s = s.replace(/\bvec\s*\{([^{}]*)\}/g, '$1')
  s = s.replace(/\bmathbb\s*\{?R\}?/g, 'ℝ')
  s = s.replace(/\bfrac\b/g, '分数')
  s = s.replace(/\bsqrt\b/g, '√')
  // 剩余未知命令直接去掉，避免 \foo 源码上屏
  s = s.replace(/\\[a-zA-Z]+/g, '')
  s = s.replace(/[{}]/g, '')
  // 上标：x^2 / x^{2} / x^n
  const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', n: 'ⁿ' }
  s = s.replace(/\^\{([0-9n])\}/g, (_, c) => SUP[c] || c)
  s = s.replace(/\^([0-9n])/g, (_, c) => SUP[c] || c)
  s = s.replace(/_\{([^{}]*)\}/g, '_$1')
  // 孤立反斜杠
  s = s.replace(/\\\s/g, ' ')
  s = s.replace(/\\/g, '')
  return s
}
