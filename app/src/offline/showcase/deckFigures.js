/**
 * 双师课件图形资产：真实 PPT 图片 + 与真实图同一视觉语言的矢量教学图。
 *
 * - 真实图来自指定 decks 目录（只读抽取，不在运行时访问原路径）；
 * - 矢量图只补原 PPT 没有图、但讲解必须“看见”的页：线束、截距、例1/例2、
 *   配对、抛物线、阶梯矩形。图形是教学示意，不替代原题图。
 * - 所有 URL 都交给 SlideCanvas 的 figure 通道，保持 980×551 版式与缩放。
 */
import linePointSlope from '@/assets/decks/line-point-slope.png'
import seqSum from '@/assets/decks/seq-sum.png'
import linePointSlopeConcise from '@/assets/decks/line-point-slope-concise.png'

const W = 700
const H = 420

const FONT = "'Microsoft YaHei','PingFang SC','Segoe UI',sans-serif"
const INK = '#0f172a'
const MUTED = '#64748b'
const BLUE = '#2563eb'
const RED = '#dc2626'
const AMBER = '#d97706'
const GRID = '#e8edf7'

function svg(body) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    `<rect width="${W}" height="${H}" fill="#ffffff"/>` +
    `<defs><clipPath id="plot"><rect x="70" y="30" width="570" height="360"/></clipPath></defs><style>text{paint-order:stroke;stroke:#fff;stroke-width:3px;stroke-linejoin:round}</style>` +
    `<g font-family="${FONT}">${body}</g></svg>`,
  )
}

function axes() {
  let grid = ''
  for (let x = -5; x <= 5; x += 1) {
    const px = 350 + x * 45
    grid += `<line x1="${px}" y1="40" x2="${px}" y2="380" stroke="${GRID}" stroke-width="1"/>`
  }
  for (let y = -2; y <= 4; y += 1) {
    const py = 300 - y * 45
    grid += `<line x1="80" y1="${py}" x2="640" y2="${py}" stroke="${GRID}" stroke-width="1"/>`
  }
  return `
    <g clip-path="url(#plot)">${grid}</g>
    <line x1="70" y1="300" x2="650" y2="300" stroke="${INK}" stroke-width="2"/>
    <polygon points="650,300 638,294 638,306" fill="${INK}"/>
    <line x1="350" y1="385" x2="350" y2="35" stroke="${INK}" stroke-width="2"/>
    <polygon points="350,35 344,47 356,47" fill="${INK}"/>
    <text x="658" y="306" font-size="18" font-style="italic" fill="${INK}">x</text>
    <text x="360" y="32" font-size="18" font-style="italic" fill="${INK}">y</text>
    <text x="326" y="326" font-size="18" fill="${INK}">O</text>`
}

const px = (x) => 350 + x * 45
const py = (y) => 300 - y * 45

function lineOf(k, x1 = 0, y1 = 0, color = BLUE, width = 3.2) {
  const xa = -5
  const xb = 5
  const ya = y1 + k * (xa - x1)
  const yb = y1 + k * (xb - x1)
  return `<line x1="${px(xa)}" y1="${py(ya)}" x2="${px(xb)}" y2="${py(yb)}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" clip-path="url(#plot)"/>`
}

function dot(x, y, color = RED, label = '', dx = 10, dy = -10) {
  return `<circle cx="${px(x)}" cy="${py(y)}" r="6.2" fill="${color}"/>` +
    (label ? `<text x="${px(x) + dx}" y="${py(y) + dy}" font-size="19" font-weight="700" fill="${INK}">${label}</text>` : '')
}

function pill(x, y, text, color = BLUE) {
  const w = Math.max(130, [...String(text)].reduce((n, ch) => n + (/[\u4e00-\u9fff]/.test(ch) ? 19 : 10), 0) + 28)
  return `<rect x="${x}" y="${y}" width="${w}" height="40" rx="10" fill="#eff4ff" stroke="#c7d6f5"/>` +
    `<text x="${x + 14}" y="${y + 24}" font-size="19" font-weight="700" fill="${color}">${text}</text>`
}

/* 1. 过定点的一束直线：一点 + 斜率决定方向 */
const lineBundle = svg(`
  ${axes()}
  ${lineOf(2, 1, 1, '#2563eb', 3)}
  ${lineOf(-1, 1, 1, '#7c3aed', 2.6)}
  ${lineOf(0.45, 1, 1, '#0891b2', 2.6)}
  ${dot(1, 1, RED, 'P₁(1,1)', 14, 24)}
  <text x="${px(2.6)}" y="${py(4.2)}" font-size="18" font-weight="700" fill="#2563eb">k=2</text>
  <text x="${px(-2.2)}" y="${py(3.9)}" font-size="18" font-weight="700" fill="#7c3aed">k=−1</text>
  <text x="${px(3.4)}" y="${py(2.05)}" font-size="18" font-weight="700" fill="#0891b2">k=0.45</text>
  ${pill(80, 38, '一点 + 斜率 → 方向锁定', BLUE)}
`)

/* 2. y=kx+2 线束：都绕 (0,2) 旋转 */
const lineIntercept = svg(`
  ${axes()}
  ${lineOf(-2, 0, 2, '#2563eb', 2.6)}
  ${lineOf(-0.5, 0, 2, '#7c3aed', 2.6)}
  ${lineOf(1, 0, 2, '#0891b2', 2.6)}
  ${lineOf(2, 0, 2, '#d97706', 2.6)}
  ${dot(0, 2, RED, 'b=2', -38, 24)}
  <text x="${px(0.8)}" y="${py(4.25)}" font-size="18" font-weight="700" fill="#d97706">y=kx+2</text>
  <text x="${px(-4.6)}" y="${py(-1.75)}" font-size="17" fill="${MUTED}">k 变，方向变；b 不变，都过 (0,2)</text>
  ${pill(80, 38, 'b 是纵截距，不是长度', AMBER)}
`)

/* 3. 例1：过 (1,2)，k=−3 */
const lineExample1 = svg(`
  ${axes()}
  ${lineOf(-3, 1, 2, BLUE, 3.2)}
  ${dot(1, 2, RED, 'P₁(1,2)', 12, -12)}
  ${dot(0, 5, AMBER, '(0,5)', 12, -10)}
  <text x="${px(1.9)}" y="${py(-2.55)}" font-size="18" font-weight="700" fill="${BLUE}">y=−3x+5</text>
  ${pill(80, 38, 'y−2 = −3(x−1)', BLUE)}
`)

/* 4. 例2：截距 4，过 (2,−2)，斜率 −3 */
const lineExample2 = svg(`
  ${axes()}
  ${lineOf(-3, 0, 4, BLUE, 3.2)}
  ${dot(0, 4, AMBER, '(0,4)', 12, -10)}
  ${dot(2, -2, RED, '(2,−2)', 12, 22)}
  <line x1="${px(2)}" y1="${py(-2)}" x2="${px(2)}" y2="${py(4)}" stroke="${MUTED}" stroke-width="1.6" stroke-dasharray="5 5"/>
  <line x1="${px(0)}" y1="${py(4)}" x2="${px(2)}" y2="${py(4)}" stroke="${MUTED}" stroke-width="1.6" stroke-dasharray="5 5"/>
  <text x="${px(2.2)}" y="${py(1)}" font-size="17" fill="${MUTED}">Δy=−6</text>
  <text x="${px(0.5)}" y="${py(3.6)}" font-size="17" fill="${MUTED}">Δx=2</text>
  ${pill(80, 38, 'b=4，过 (2,−2)', AMBER)}
`)

/* 5. 高斯配对：上下两行，弧线配对 */
const seqPairing = svg(`
  <text x="80" y="58" font-size="22" font-weight="800" fill="${INK}">1 + 2 + … + 100 = ?</text>
  <text x="80" y="90" font-size="17" fill="${MUTED}">把首末配对：每一对的和都相等</text>
  <g font-size="19" font-weight="700" fill="#1e3a8a">
    <text x="100" y="170">1</text><text x="190" y="170">2</text><text x="280" y="170">3</text>
    <text x="370" y="170">…</text><text x="450" y="170">98</text><text x="540" y="170">99</text><text x="620" y="170">100</text>
  </g>
  <g stroke="#93b4f5" stroke-width="2" fill="none">
    <path d="M107 182 C 107 255, 627 255, 627 182"/>
    <path d="M197 182 C 197 235, 547 235, 547 182"/>
    <path d="M287 182 C 287 215, 457 215, 457 182"/>
  </g>
  <text x="370" y="282" text-anchor="middle" font-size="19" font-weight="800" fill="${BLUE}">每一对 = 101</text>
  <rect x="80" y="320" width="540" height="58" rx="12" fill="#eff4ff" stroke="#c7d6f5"/>
  <text x="104" y="357" font-size="19" font-weight="800" fill="${BLUE}">100 个数 → 50 对 → 101 × 50 = 5050</text>
`)

/* 6. Sn 抛物线：a1=14，d=−3.5，n=4/5 同高 */
const SEQ_X = (n) => 160 + 64 * (n - 1)
const SEQ_S = (n) => -1.75 * n * n + 15.75 * n
const SEQ_Y = (n) => 340 - 6.3 * SEQ_S(n)
const SEQ_PATH = Array.from({ length: 8 }, (_, i) => `${i ? 'L' : 'M'}${SEQ_X(i + 1)} ${SEQ_Y(i + 1)}`).join(' ')

const seqParabola = svg(`
  <line x1="80" y1="340" x2="650" y2="340" stroke="${INK}" stroke-width="2"/>
  <polygon points="650,340 638,334 638,346" fill="${INK}"/>
  <line x1="110" y1="365" x2="110" y2="62" stroke="${INK}" stroke-width="2"/>
  <polygon points="110,62 104,74 116,74" fill="${INK}"/>
  <text x="656" y="346" font-size="18" font-style="italic" fill="${INK}">n</text>
  <text x="120" y="58" font-size="18" font-style="italic" fill="${INK}">Sₙ</text>
  <path d="${SEQ_PATH}" fill="none" stroke="${BLUE}" stroke-width="3.2"/>
  ${[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `<circle cx="${SEQ_X(n)}" cy="${SEQ_Y(n)}" r="${n === 4 || n === 5 ? 6 : 4}" fill="${n === 4 || n === 5 ? RED : BLUE}"/>`).join('')}
  <line x1="${SEQ_X(4)}" y1="${SEQ_Y(4)}" x2="${SEQ_X(4)}" y2="340" stroke="${RED}" stroke-width="1.4" stroke-dasharray="5 5"/>
  <line x1="${SEQ_X(5)}" y1="${SEQ_Y(5)}" x2="${SEQ_X(5)}" y2="340" stroke="${RED}" stroke-width="1.4" stroke-dasharray="5 5"/>
  <text x="${SEQ_X(4) - 12}" y="${SEQ_Y(4) - 12}" font-size="19" font-weight="800" fill="${RED}">n=4</text>
  <text x="${SEQ_X(5) - 8}" y="${SEQ_Y(5) - 12}" font-size="19" font-weight="800" fill="${RED}">n=5</text>
  <rect x="180" y="56" width="440" height="40" rx="10" fill="#eff4ff" stroke="#c7d6f5"/>
  <text x="198" y="83" font-size="18" font-weight="800" fill="${BLUE}">a₁=14，d=−3.5：通项在 n=5 变号</text>
  <text x="130" y="380" font-size="17" fill="${MUTED}">Sₙ 先增后减，最大值在通项变号处</text>
`)

/* 7. 阶梯矩形：1+2+…+n 与倒序拼成 n×(n+1) */
const seqStair = svg(`
  <text x="80" y="48" font-size="21" font-weight="800" fill="${INK}">把阶梯倒过来，拼成一个矩形</text>
  <text x="80" y="76" font-size="17" fill="${MUTED}">以 n=5 为例：每列 1 个蓝块 + 1 个紫块，共 6 块</text>
  ${Array.from({ length: 5 }, (_, i) => Array.from({ length: 6 }, (_, r) => {
    const blue = r < i + 1
    return `<rect x="${100 + i * 54}" y="${300 - r * 28}" width="48" height="24" rx="4" fill="${blue ? '#dbeafe' : '#ede9fe'}" stroke="${blue ? '#93c5fd' : '#c4b5fd'}"/>`
  }).join('')).join('')}
  <rect x="96" y="128" width="278" height="176" rx="4" fill="none" stroke="${BLUE}" stroke-width="2" stroke-dasharray="7 6"/>
  <rect x="80" y="344" width="540" height="42" rx="10" fill="#f8fafc" stroke="#e2e8f0"/>
  <text x="100" y="372" font-size="18" font-weight="800" fill="${BLUE}">2S = 5 × 6 = 30 → S = n(n+1)/2</text>
`)

export const DECK_FIGURES = {
  'line-point-slope': linePointSlope,
  'seq-sum': seqSum,
  'line-point-slope-concise': linePointSlopeConcise,
  'line-bundle': lineBundle,
  'line-intercept': lineIntercept,
  'line-example1': lineExample1,
  'line-example2': lineExample2,
  'seq-pairing': seqPairing,
  'seq-parabola': seqParabola,
  'seq-stair': seqStair,
}

export function figureUrl(id) {
  return DECK_FIGURES[String(id || '')] || ''
}
