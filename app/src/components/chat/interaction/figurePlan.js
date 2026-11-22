/**
 * sgv4（DESIGN §4.1 figure_probe / figure_slider 共用）：后端图形 plan JSON 归一化与曲线采样。
 * figure plan 形态（figures.py:143）：{type:'function', params:{curves:[{expr,label,color,domain}],
 * x_range, y_range, points}} 或 {params: figure_params, caption} 包装——双形态防御归一。
 * 曲线求值复用 utils/exprEval（GraphBlock 解析器抽出共享，禁平行内核）；
 * 表达式可引用滑块变量（FigureSlider），经 vars 绑定求值。
 */
import { tryCompileExpr } from '@/utils/exprEval'

export const CURVE_COLORS = ['#4F6EF7', '#DC2626', '#059669', '#D97706']

/** figure plan 归一：直取 {type,params} / 拆 {params,caption} 包装 / 缺失给空 plan */
export function normalizeFigure(figure) {
  if (!figure || typeof figure !== 'object') return { type: '', params: {}, caption: '' }
  const inner = figure.params && typeof figure.params === 'object' ? figure.params : figure
  return {
    type: String(figure.type || inner.type || ''),
    params: inner && typeof inner === 'object' ? inner : {},
    caption: String(figure.caption || ''),
  }
}

/** 视窗：params.x_range/y_range（兼容 xmin/xmax 键）→ [x0,x1,y0,y1]；缺失/非法给默认 */
export function figureView(params) {
  const p = params || {}
  const num = (v, def) => (Number.isFinite(Number(v)) ? Number(v) : def)
  let x0 = num(Array.isArray(p.x_range) ? p.x_range[0] : p.xmin, -6)
  let x1 = num(Array.isArray(p.x_range) ? p.x_range[1] : p.xmax, 6)
  let y0 = num(Array.isArray(p.y_range) ? p.y_range[0] : p.ymin, -4)
  let y1 = num(Array.isArray(p.y_range) ? p.y_range[1] : p.ymax, 4)
  if (x1 <= x0) { x0 = -6; x1 = 6 }
  if (y1 <= y0) { y0 = -4; y1 = 4 }
  return [x0, x1, y0, y1]
}

/**
 * 曲线采样：function 类型 curves → [{d, color}] SVG path（viewBox 100×h 坐标系，
 * gx/gy 为数学坐标→视图像素映射）。expr 可引用 vars（滑块绑定）；编译失败断笔降级。
 * @param {object} fig normalizeFigure 产物
 * @param {[number,number,number,number]} view figureView 产物
 * @param {(x:number)=>number} gx 数学 x → 视图 px
 * @param {(y:number)=>number} gy 数学 y → 视图 py
 * @param {number} height 视图高（渐近线断笔阈值按高度比例）
 * @param {Record<string,number>} vars 滑块等额外变量绑定（可选）
 */
export function sampleCurves(fig, view, gx, gy, height, vars = {}) {
  if (fig.type !== 'function') return { paths: [], compiled: 0, total: 0 }
  const curves = Array.isArray(fig.params?.curves) ? fig.params.curves.slice(0, 4) : []
  const paths = []
  let compiled = 0
  for (const c of curves) {
    if (!c || typeof c.expr !== 'string') continue
    const total = (fig.params.curves || []).length
    const fn = tryCompileExpr(c.expr)
    if (!fn) continue
    compiled += 1
    void total
    const lo = Array.isArray(c.domain) && Number.isFinite(Number(c.domain[0])) ? Number(c.domain[0]) : view[0]
    const hi = Array.isArray(c.domain) && Number.isFinite(Number(c.domain[1])) ? Number(c.domain[1]) : view[1]
    const N = 160
    let d = ''
    let pen = false
    let lastPy = 0
    for (let i = 0; i <= N; i++) {
      const x = lo + ((hi - lo) * i) / N
      if (x < view[0] - 0.01 || x > view[1] + 0.01) continue
      const y = fn(x, vars)
      if (!Number.isFinite(y) || Math.abs(y) > 1e5) { pen = false; continue }
      const px = gx(x)
      const py = gy(y)
      if (pen && Math.abs(py - lastPy) > height * 2) pen = false // 纵向跳变→渐近线断笔
      d += `${pen ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)} `
      lastPy = py
      pen = true
    }
    if (d) paths.push({ d: d.trim(), color: c.color || CURVE_COLORS[paths.length % CURVE_COLORS.length] })
  }
  return { paths, compiled, total: curves.length }
}
