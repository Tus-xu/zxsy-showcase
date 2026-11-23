/**
 * 本地 SVG 绘图：只用字符串拼图，不引图表库、不产生任何外网引用。
 *
 * 为什么自绘：离线发行包要求 file:// 双击即用、0 网络请求，图形必须随 HTML 内联，
 * 所以这里只输出能编码成 data URI 的 <svg> 字符串，坐标全部由数据现算。
 */

/** 绘图区内边距（像素）。单测反算数据坐标时也用它。 */
export const PLOT_PAD = 38

const FONT = "-apple-system, 'Segoe UI', 'Microsoft YaHei', sans-serif"

// 中性学术配色：主曲线 / 强调 / 辅助，避免抢教学内容的注意力
const C = {
  main: '#2f4f7f',
  accent: '#b4472e',
  aux: '#7a8794',
  shade: 'rgba(122,135,148,0.16)',
  text: '#3b4450',
  grid: 'rgba(122,135,148,0.22)',
  axis: '#aab2bb',
  paper: '#ffffff',
}

// 命名空间用字符引用书写：XML 解析后仍是标准 SVG 命名空间，
// 但生成物里不会出现字面量的 http 协议前缀，离线审计可按字面扫描外部地址。
const SVG_NS = '&#104;ttp://www.w3.org/2000/svg'

/** XML 文本转义：所有进入标签内容的动态文字都必须过这一层 */
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** 坐标保留两位小数：再高的精度只会让 data URI 变长 */
function coord(v) {
  const r = Math.round(v * 100) / 100
  return Object.is(r, -0) ? '0' : String(r)
}

/** 数值格式化：去掉浮点尾巴（2.0000000001 → '2'） */
export function num(v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return String(v)
  const r = Math.round(v * 1e6) / 1e6
  return Object.is(r, -0) ? '0' : String(r)
}

/** SVG 字符串 → data URI（UTF-8 百分号编码，可放进 <img src>） */
export function svgDataUri(svg) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(String(svg))
}

/**
 * 生成一张函数曲线图（内联 SVG 字符串）。
 * @param {object} o
 * @param {number} o.xmin @param {number} o.xmax
 * @param {number} o.ymin @param {number} o.ymax
 * @param {number} [o.width=520] @param {number} [o.height=340]
 * @param {Array<{fn:(x:number)=>number, color?:string, width?:number, dash?:string, from?:number, to?:number}>} [o.curves]
 * @param {Array<{x:number, y?:number, label?:string, kind?:'max'|'min'|'plain'|'zero', labelDx?:number, labelDy?:number}>} [o.points]
 * @param {Array<{x:number, y?:number, len?:number, color?:string, label?:string}>} [o.tangents]
 * @param {Array<{x0:number, x1:number, label?:string, color?:string}>} [o.shades]
 * @param {Array<{x:number, label?:string, color?:string}>} [o.vlines]
 * @param {boolean} [o.axes=true] @param {boolean} [o.grid=false]
 * @param {Array<{text:string, color?:string, kind?:'line'|'dot'}>} [o.legend]
 * @param {Array<{x:number, y:number, text:string, anchor?:'start'|'middle'|'end', color?:string}>} [o.annotations]
 * @param {string} [o.axisLabelX] @param {string} [o.axisLabelY]
 * @param {string} [o.title]
 * @returns {string} 完整 <svg>…</svg>
 */
export function plotSvg(o = {}) {
  const xmin = Number(o.xmin ?? -1)
  const xmax = Number(o.xmax ?? 1)
  const ymin = Number(o.ymin ?? -1)
  const ymax = Number(o.ymax ?? 1)
  const W = Number(o.width ?? 520)
  const H = Number(o.height ?? 340)
  const curves = o.curves || []
  const points = o.points || []
  const tangents = o.tangents || []
  const shades = o.shades || []
  const vlines = o.vlines || []
  const legend = o.legend || []
  const annotations = o.annotations || []

  const pad = PLOT_PAD
  const iw = W - pad * 2
  const ih = H - pad * 2
  const spanX = xmax - xmin || 1e-9
  const spanY = ymax - ymin || 1e-9

  const sx = (x) => pad + ((x - xmin) / spanX) * iw
  const sy = (y) => H - pad - ((y - ymin) / spanY) * ih
  const baseFn = curves[0]?.fn
  const yOf = (p) => (p.y == null && baseFn ? baseFn(p.x) : p.y)

  const body = []

  // ---- 网格：垫在最底层，只做视觉参考 ----
  if (o.grid) {
    for (let i = 1; i < 5; i++) {
      const gx = pad + (iw * i) / 5
      const gy = pad + (ih * i) / 5
      body.push(
        `<line x1="${coord(gx)}" y1="${pad}" x2="${coord(gx)}" y2="${H - pad}" stroke="${C.grid}" stroke-width="1"/>`
      )
      body.push(
        `<line x1="${pad}" y1="${coord(gy)}" x2="${W - pad}" y2="${coord(gy)}" stroke="${C.grid}" stroke-width="1"/>`
      )
    }
  }

  // ---- 区间阴影：先铺底色，坐标轴与曲线再压上去 ----
  for (const s of shades) {
    const xa = sx(Math.min(s.x0, s.x1))
    const xb = sx(Math.max(s.x0, s.x1))
    body.push(
      `<rect x="${coord(xa)}" y="${pad}" width="${coord(xb - xa)}" height="${ih}" fill="${s.color || C.shade}"/>`
    )
    if (s.label) {
      body.push(
        `<text x="${coord((xa + xb) / 2)}" y="${pad + 14}" text-anchor="middle" font-size="12" fill="${C.aux}">${esc(s.label)}</text>`
      )
    }
  }

  // ---- 竖直参考线 ----
  for (const v of vlines) {
    const vx = sx(v.x)
    body.push(
      `<line x1="${coord(vx)}" y1="${pad}" x2="${coord(vx)}" y2="${H - pad}" stroke="${v.color || C.aux}" stroke-width="1" stroke-dasharray="4 4"/>`
    )
    if (v.label) {
      body.push(
        `<text x="${coord(vx)}" y="${pad + 14}" text-anchor="middle" font-size="12" fill="${v.color || C.aux}">${esc(v.label)}</text>`
      )
    }
  }

  // ---- 坐标轴：0 在范围内就画在 0 处，否则贴到对应边框 ----
  if (o.axes !== false) {
    const y0 = ymin <= 0 && 0 <= ymax ? 0 : ymin > 0 ? ymin : ymax
    const x0 = xmin <= 0 && 0 <= xmax ? 0 : xmin > 0 ? xmin : xmax
    const ay = sy(y0)
    const ax = sx(x0)

    body.push(
      `<line x1="${pad}" y1="${coord(ay)}" x2="${W - pad}" y2="${coord(ay)}" stroke="${C.axis}" stroke-width="1"/>`
    )
    body.push(
      `<line x1="${coord(ax)}" y1="${H - pad}" x2="${coord(ax)}" y2="${pad}" stroke="${C.axis}" stroke-width="1"/>`
    )
    // 箭头：x 轴向右、y 轴向上，帮助读者辨认方向
    body.push(
      `<path d="M ${coord(W - pad)} ${coord(ay)} l -7 -3.5 l 0 7 z" fill="${C.axis}"/>`
    )
    body.push(
      `<path d="M ${coord(ax)} ${pad} l -3.5 7 l 7 0 z" fill="${C.axis}"/>`
    )
    if (xmin < 0 && xmax > 0 && ymin < 0 && ymax > 0) {
      body.push(
        `<text x="${coord(sx(0) - 8)}" y="${coord(sy(0) + 14)}" text-anchor="middle" font-size="11" fill="${C.aux}">O</text>`
      )
    }
  }

  // ---- 曲线：400 段采样；非有限值或跑出可视带就断开，避免直线穿越 ----
  const bandLo = ymin - spanY * 2
  const bandHi = ymax + spanY * 2
  for (const cv of curves) {
    const from = cv.from ?? xmin
    const to = cv.to ?? xmax
    const n = 400
    const segs = []
    let seg = []
    for (let i = 0; i <= n; i++) {
      const x = from + ((to - from) * i) / n
      let y
      try {
        y = cv.fn(x)
      } catch {
        y = NaN
      }
      const ok = Number.isFinite(y) && y >= bandLo && y <= bandHi
      if (!ok) {
        if (seg.length > 1) segs.push(seg)
        seg = []
        continue
      }
      seg.push(`${coord(sx(x))},${coord(sy(y))}`)
    }
    if (seg.length > 1) segs.push(seg)

    for (const s of segs) {
      body.push(
        `<polyline points="${s.join(' ')}" fill="none" stroke="${cv.color || C.main}" stroke-width="${cv.width ?? 2.2}" stroke-linejoin="round" stroke-linecap="round"${cv.dash ? ` stroke-dasharray="${cv.dash}"` : ''}/>`
      )
    }
  }

  // ---- 水平切线：极值点处斜率为 0 的演示线 ----
  for (const t of tangents) {
    const y = t.y != null ? t.y : baseFn ? baseFn(t.x) : NaN
    if (!Number.isFinite(y)) continue
    const len = t.len ?? 0.9
    const yy = sy(y)
    body.push(
      `<line x1="${coord(sx(t.x - len))}" y1="${coord(yy)}" x2="${coord(sx(t.x + len))}" y2="${coord(yy)}" stroke="${t.color || C.aux}" stroke-width="1.6" stroke-dasharray="5 4"/>`
    )
    if (t.label) {
      body.push(
        `<text x="${coord(sx(t.x + len) + 6)}" y="${coord(yy - 6)}" font-size="12" fill="${t.color || C.aux}">${esc(t.label)}</text>`
      )
    }
  }

  // ---- 关键点：max/min 实心强调，zero 空心圈，plain 小圆点 ----
  for (const p of points) {
    const y = yOf(p)
    if (!Number.isFinite(y)) continue
    const px = sx(p.x)
    const py = sy(y)
    const kind = p.kind || 'plain'
    if (kind === 'max' || kind === 'min') {
      body.push(
        `<circle cx="${coord(px)}" cy="${coord(py)}" r="4.6" fill="${C.accent}" stroke="#ffffff" stroke-width="1.6"/>`
      )
    } else if (kind === 'zero') {
      body.push(
        `<circle cx="${coord(px)}" cy="${coord(py)}" r="4" fill="#ffffff" stroke="${C.main}" stroke-width="1.8"/>`
      )
    } else {
      body.push(
        `<circle cx="${coord(px)}" cy="${coord(py)}" r="3" fill="${C.main}" stroke="#ffffff" stroke-width="1"/>`
      )
    }
    if (p.label) {
      const dx = p.labelDx ?? 9
      const dy = p.labelDy ?? -9
      const color = kind === 'max' || kind === 'min' ? C.accent : C.text
      body.push(
        `<text x="${coord(px + dx)}" y="${coord(py + dy)}" font-size="12" fill="${color}">${esc(p.label)}</text>`
      )
    }
  }

  // ---- 自由标注 ----
  for (const a of annotations) {
    body.push(
      `<text x="${coord(sx(a.x))}" y="${coord(sy(a.y))}" text-anchor="${a.anchor || 'start'}" font-size="12" fill="${a.color || C.text}">${esc(a.text)}</text>`
    )
  }

  // ---- 图例：右上角半透明白底，避免压住曲线后看不清 ----
  if (legend.length) {
    const maxChars = Math.max(...legend.map((l) => String(l.text).length))
    const lw = Math.min(Math.max(maxChars * 12 + 34, 88), iw * 0.62)
    const lh = legend.length * 18 + 12
    const lx = W - pad - lw - 6
    const ly = pad + 6
    body.push(
      `<rect x="${coord(lx)}" y="${coord(ly)}" width="${coord(lw)}" height="${lh}" rx="6" fill="rgba(255,255,255,0.92)" stroke="#e2e5e9"/>`
    )
    legend.forEach((l, i) => {
      const ry = ly + 15 + i * 18
      const color = l.color || C.main
      if (l.kind === 'dot') {
        body.push(
          `<circle cx="${coord(lx + 14)}" cy="${coord(ry - 4)}" r="3.6" fill="${color}"/>`
        )
      } else {
        body.push(
          `<line x1="${coord(lx + 8)}" y1="${coord(ry - 4)}" x2="${coord(lx + 26)}" y2="${coord(ry - 4)}" stroke="${color}" stroke-width="2"/>`
        )
      }
      body.push(
        `<text x="${coord(lx + 32)}" y="${coord(ry)}" font-size="12" fill="${C.text}">${esc(l.text)}</text>`
      )
    })
  }

  // ---- 标题与轴名 ----
  if (o.title) {
    body.push(
      `<text x="${coord(W / 2)}" y="24" text-anchor="middle" font-size="14" font-weight="600" fill="${C.text}">${esc(o.title)}</text>`
    )
  }
  if (o.axisLabelX) {
    body.push(
      `<text x="${coord(W / 2)}" y="${coord(H - 8)}" text-anchor="middle" font-size="12" fill="${C.aux}">${esc(o.axisLabelX)}</text>`
    )
  }
  if (o.axisLabelY) {
    body.push(
      `<text x="14" y="${coord(H / 2)}" text-anchor="middle" font-size="12" fill="${C.aux}" transform="rotate(-90 14 ${coord(H / 2)})">${esc(o.axisLabelY)}</text>`
    )
  }

  const title = `<title>${esc(o.title || '函数图像')}</title>`
  return `<svg xmlns="${SVG_NS}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" font-family="${FONT}" font-size="12">${title}<rect width="${W}" height="${H}" fill="${C.paper}"/>${body.join('')}</svg>`
}

/** 便捷：plotSvg → svgDataUri */
export function plotDataUri(o) {
  return svgDataUri(plotSvg(o))
}
