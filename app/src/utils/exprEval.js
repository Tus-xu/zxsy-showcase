/**
 * 安全表达式解析与求值（禁 eval）：递归下降 → AST → 求值函数。
 *
 * sgv4（DESIGN §4.1 figure_probe/figure_slider 渲染底座）：从 GraphBlock.vue 的
 * parseExpression 原样抽出为共享 util（单一能力源，GraphBlock 改为 import 复用；
 * 禁止平行内核——仓库内已有该能力，ADAPT 而非重写）。语法面：
 *   四则 + 幂（^ 与 ** 等价、右结合）+ 隐式乘法（2x、2(x+1)、x sin(x)）
 *   + 函数白名单 FUNCS + π/pi/e 常量；全角 ×÷ 归一；大小写不敏感。
 * sgv4 扩展（FigureSlider 滑块参数曲线）：求值函数签名为 (x, vars)——vars 提供
 * 滑块等额外标识符绑定（如曲线式 "a*x^2" 的 a），未绑定标识符求值为 NaN（不抛错，
 * 采样断笔处理）。GraphBlock 的 f(x) 用法签名不变（第二参缺省即纯 x）。
 */

const FUNCS = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sqrt: Math.sqrt, abs: Math.abs, exp: Math.exp,
  ln: Math.log, log: Math.log10, lg: Math.log10,
}

export function parseExpression(src) {
  const s = String(src).replace(/\s+/g, '').toLowerCase().replace(/×/g, '*').replace(/÷/g, '/')
  let i = 0
  const peek = () => s[i]
  function parseExpr() {
    let node = parseTerm()
    while (peek() === '+' || peek() === '-') {
      const op = s[i++]
      node = { op, l: node, r: parseTerm() }
    }
    return node
  }
  function parseTerm() {
    let node = parsePow()
    for (;;) {
      const c = peek()
      if (c === '*' || c === '/') {
        i++
        node = { op: c, l: node, r: parsePow() }
      } else if (c !== undefined && /[0-9a-z(π]/.test(c)) {
        node = { op: '*', l: node, r: parsePow() } // 隐式乘法：2x、2(x+1)、x sin(x)
      } else break
    }
    return node
  }
  function parsePow() {
    const base = parseUnary()
    if (peek() === '^') {
      i++
      return { op: '^', l: base, r: parsePow() } // 右结合
    }
    if (s.startsWith('**', i)) {
      i += 2
      return { op: '^', l: base, r: parsePow() }
    }
    return base
  }
  function parseUnary() {
    if (peek() === '-') { i++; return { op: 'neg', r: parseUnary() } }
    if (peek() === '+') { i++; return parseUnary() }
    return parsePrimary()
  }
  function parsePrimary() {
    const c = peek()
    if (c === '(') {
      i++
      const n = parseExpr()
      if (peek() === ')') i++
      return n
    }
    if (c !== undefined && /[0-9.]/.test(c)) {
      const m = /^[0-9]*\.?[0-9]+/.exec(s.slice(i))
      if (!m) throw new Error('数字语法错误')
      i += m[0].length
      return { num: parseFloat(m[0]) }
    }
    if (c === 'π') { i++; return { num: Math.PI } }
    if (c !== undefined && /[a-z]/.test(c)) {
      const m = /^[a-z]+/.exec(s.slice(i))[0]
      i += m.length
      if (m === 'x') return { v: 'x' }
      if (m === 'pi') return { num: Math.PI }
      if (m === 'e') return { num: Math.E }
      if (FUNCS[m] && peek() === '(') {
        i++
        const arg = parseExpr()
        if (peek() === ')') i++
        return { op: 'fn', fn: m, arg }
      }
      // sgv4：其余标识符按变量绑定（FigureSlider 滑块变量，如 "a*x^2" 的 a）；
      // 未绑定求值为 NaN（采样断笔/跳过），不再抛错——graph schema 原对未知标识符
      // 整条曲线编译失败，现行为等价（无有限点即无 path），且滑块曲线成为可能
      return { v: m }
    }
    throw new Error(`语法错误 @${i}`)
  }
  const tree = parseExpr()
  if (i < s.length) throw new Error('表达式存在多余字符')
  const ev = (n, x, vars) => {
    if (n.num !== undefined) return n.num
    if (n.v) {
      if (x !== undefined && n.v === 'x') return x
      const bound = vars ? vars[n.v] : undefined
      return Number.isFinite(bound) ? bound : NaN
    }
    if (n.op === 'neg') return -ev(n.r, x, vars)
    if (n.op === 'fn') return FUNCS[n.fn](ev(n.arg, x, vars))
    const l = ev(n.l, x, vars)
    const r = ev(n.r, x, vars)
    if (n.op === '+') return l + r
    if (n.op === '-') return l - r
    if (n.op === '*') return l * r
    if (n.op === '/') return r === 0 ? NaN : l / r
    if (n.op === '^') return Math.pow(l, r)
    return NaN
  }
  return (x, vars) => ev(tree, x, vars || {})
}

/** 便捷封装：编译失败返回 null（调用方降级断笔，不白屏） */
export function tryCompileExpr(src) {
  try {
    return parseExpression(src)
  } catch {
    return null
  }
}
