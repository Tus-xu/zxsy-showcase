/**
 * 本轮离线演示用到的全部图形资产。
 *
 * 约束：所有图都在本地由字符串生成，data URI 内联进单文件 HTML；
 * 不引用任何外部地址、不出现 <script> / <image>，断网双击也能完整显示。
 * 数学函数与数值已与教学方案核对，改图时请同步改单测。
 */
import { plotSvg, svgDataUri } from './plot'

const FONT = "-apple-system, 'Segoe UI', 'Microsoft YaHei', sans-serif"

// 与 plot.js 同理：字符引用声明命名空间，产物里没有字面量的协议前缀
const SVG_NS = '&#104;ttp://www.w3.org/2000/svg'

// 练习册题面的中性纸色
const SHEET = {
  paper: '#fbfaf7',
  border: '#ddd6cc',
  rule: '#e6e0d6',
  ink: '#3b4450',
  muted: '#8a8f98',
  main: '#2f4f7f',
  chip: '#f1ede5',
  chipBorder: '#e2dcd2',
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * 拼一张练习册风格的题面（不是函数图，所以不走 plotSvg）。
 * 左侧题号方块 + 眉题/标题 + 正文 + 选项 + 底部「自编」标记。
 */
function sheetSvg({ index, kicker, title, lines, hint, options, footnote }) {
  const W = 760
  const H = options ? 330 : 300
  const body = []

  body.push(
    `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="${SHEET.paper}" stroke="${SHEET.border}"/>`
  )

  // 左侧题号小方块
  body.push(`<rect x="28" y="30" width="38" height="38" rx="9" fill="${SHEET.main}"/>`)
  body.push(
    `<text x="47" y="56" text-anchor="middle" font-size="${String(index).length > 1 ? 14 : 18}" font-weight="700" fill="#ffffff">${esc(index)}</text>`
  )

  // 眉题 + 标题 + 分隔线
  body.push(
    `<text x="78" y="44" font-size="12" fill="${SHEET.muted}" letter-spacing="1.4">${esc(kicker)}</text>`
  )
  body.push(
    `<text x="78" y="67" font-size="15" font-weight="700" fill="${SHEET.ink}">${esc(title)}</text>`
  )
  body.push(
    `<line x1="28" y1="86" x2="${W - 28}" y2="86" stroke="${SHEET.rule}" stroke-width="1"/>`
  )

  // 右上角离线标记
  body.push(
    `<rect x="${W - 106}" y="33" width="78" height="22" rx="11" fill="#eef1f5"/>`
  )
  body.push(
    `<text x="${W - 67}" y="48" text-anchor="middle" font-size="11" fill="#6b7280">离线示例</text>`
  )

  // 正文（19px，行距 36）；表达式里的上标由 tspan 完成
  lines.forEach((line, i) => {
    body.push(
      `<text x="30" y="${126 + i * 36}" font-size="19" fill="${SHEET.ink}">${line}</text>`
    )
  })

  if (hint) {
    body.push(
      `<text x="30" y="${options ? 196 : 208}" font-size="13" fill="${SHEET.muted}">${esc(hint)}</text>`
    )
  }

  // 四个选项胶囊
  if (options) {
    const oy = 214
    options.forEach((opt, i) => {
      const ox = 30 + i * 176
      body.push(
        `<rect x="${ox}" y="${oy}" width="160" height="44" rx="9" fill="#ffffff" stroke="${SHEET.chipBorder}"/>`
      )
      body.push(
        `<circle cx="${ox + 24}" cy="${oy + 22}" r="12" fill="${SHEET.chip}"/>`
      )
      body.push(
        `<text x="${ox + 24}" y="${oy + 27}" text-anchor="middle" font-size="13" font-weight="700" fill="${SHEET.main}">${esc(opt.key)}</text>`
      )
      body.push(
        `<text x="${ox + 46}" y="${oy + 28}" font-size="17" fill="${SHEET.ink}">${esc(opt.text)}</text>`
      )
    })
  }

  // 底部：明确标「自编」，避免与现役题库混淆
  body.push(
    `<text x="30" y="${H - 18}" font-size="12" fill="${SHEET.muted}">${esc(footnote)}</text>`
  )
  body.push(
    `<text x="${W - 30}" y="${H - 18}" text-anchor="end" font-size="12" fill="${SHEET.muted}">离线演示 · 无外网请求</text>`
  )

  return `<svg xmlns="${SVG_NS}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" font-family="${FONT}"><title>${esc(title)}</title>${body.join('')}</svg>`
}

const F_EXPR =
  '<tspan font-style="italic">f(x)</tspan> = x<tspan dy="-6" font-size="13">3</tspan><tspan dy="6"> − 3x</tspan>'
const G_EXPR =
  '<tspan font-style="italic">g(x)</tspan> = 2x<tspan dy="-6" font-size="13">3</tspan><tspan dy="6"> − 3x</tspan><tspan dy="-6" font-size="13">2</tspan><tspan dy="6"> − 12x + 1</tspan>'

const problemSvg = sheetSvg({
  index: '1',
  kicker: '函数与导数 · 课堂练习',
  title: '三次函数极值 · 自编题图',
  lines: [`已知 ${F_EXPR}。`, '求函数的单调区间及极值，并说明判断依据。'],
  hint: '（先求 f′(x)，再判断导数在各区间上的符号。）',
  footnote: '自编题图 · 离线教学示例',
})

const variantSvg = sheetSvg({
  index: 'V1',
  kicker: '函数与导数 · 随堂变式',
  title: '变式 V1 · 三次函数的极值点',
  lines: [`已知 ${G_EXPR}。`, '则 g(x) 的极小值点为（　）'],
  hint: '（先求 g′(x)，再判断导数符号的变化。）',
  options: [
    { key: 'A', text: '−1' },
    { key: 'B', text: '1' },
    { key: 'C', text: '2' },
    { key: 'D', text: '−2' },
  ],
  footnote: '自编题图 · 离线教学示例',
})

/** S1 / S5 / 组合会话共用的题图（自编、本地排版）。 */
export const PROBLEM_IMAGE = {
  name: '三次函数极值·自编题图.svg',
  mime: 'image/svg+xml',
  alt: '自编题图：已知 f(x)=x³−3x，求函数的单调区间及极值，并说明判断依据',
  dataUri: svgDataUri(problemSvg),
}

/** 变式 V1 题图（自编，含四个选项）。 */
export const VARIANT_V1_IMAGE = {
  name: '三次函数极值·变式V1·自编题图.svg',
  mime: 'image/svg+xml',
  alt: '自编题图：已知 g(x)=2x³−3x²−12x+1，求极小值点，选项 A −1、B 1、C 2、D −2',
  dataUri: svgDataUri(variantSvg),
}

const lessonSvg = plotSvg({
  xmin: -1.2,
  xmax: 2.2,
  ymin: -1.6,
  ymax: 2.6,
  width: 460,
  height: 300,
  grid: true,
  axisLabelX: 'x',
  axisLabelY: 'y',
  title: 'y = 1 − x：轴上方与下降段',
  curves: [{ fn: (x) => 1 - x }],
  shades: [{ x0: 0, x1: 1, label: '0 < x < 1' }],
  points: [
    { x: 0, y: 1, label: '(0, 1)', labelDx: 8, labelDy: -9 },
    { x: 1, y: 0, label: '(1, 0)', labelDx: 8, labelDy: 16 },
    { x: 0.5, y: 0.5, kind: 'plain' },
  ],
  annotations: [
    { x: 0.5, y: 1.72, text: '在 x 轴上方', anchor: 'middle', color: '#b4472e' },
    { x: 1.55, y: 0.62, text: '向右下降', anchor: 'start', color: '#7a8794' },
  ],
  legend: [
    { text: 'y = 1 − x', kind: 'line' },
    { text: '0 < x < 1', kind: 'dot', color: '#7a8794' },
  ],
})

/** D1 小课：y = 1 − x，高亮 0 < x < 1 的「轴上方 + 向右下降」。 */
export const FIG_LESSON_LINE = {
  caption:
    'y = 1 − x：在 0 < x < 1 上图像位于 x 轴上方，且函数值随 x 增大而减小（斜率 −1）。',
  dataUri: svgDataUri(lessonSvg),
  svg: lessonSvg,
}

// 两条割线都从 P(1,1) 出发：h = −0.1 连到 (0.9,0.81)，h = 0.1 连到 (1.1,1.21)
const secantN = (x) => 1 + 1.9 * (x - 1)
const secantP = (x) => 1 + 2.1 * (x - 1)
const tangentP = (x) => 2 * x - 1

const limitSvg = plotSvg({
  xmin: 0.5,
  xmax: 1.6,
  ymin: 0.2,
  ymax: 2.8,
  width: 480,
  height: 320,
  grid: true,
  axisLabelX: 'x',
  axisLabelY: 'y',
  title: 'y = x² 在 x = 1 附近：割线趋近切线',
  curves: [
    { fn: (x) => x * x },
    { fn: secantN, color: '#7a8794', width: 1.6, dash: '6 4', from: 0.7, to: 1 },
    { fn: secantP, color: '#5f6b78', width: 1.6, dash: '2 4', from: 1, to: 1.55 },
    { fn: tangentP, color: '#b4472e', width: 2, dash: '6 4', from: 0.7, to: 1.55 },
  ],
  points: [
    { x: 0.9, y: 0.81, kind: 'plain' },
    { x: 1, y: 1, kind: 'plain', label: 'P(1, 1)', labelDx: 10, labelDy: 18 },
    { x: 1.1, y: 1.21, kind: 'plain' },
  ],
  annotations: [
    { x: 0.55, y: 1.75, text: 'h = −0.1（差商 1.9）', anchor: 'start', color: '#7a8794' },
    { x: 1.55, y: 2.55, text: 'h = 0.1（差商 2.1）', anchor: 'end', color: '#5f6b78' },
    { x: 1.55, y: 0.62, text: '切线 y = 2x − 1（斜率 2）', anchor: 'end', color: '#b4472e' },
  ],
})

/** 极限小课：y = x² 在 x = 1 的两条割线趋近切线 y = 2x − 1。 */
export const FIG_LIMIT_SECANT = {
  caption:
    'y = x² 在 x = 1 附近：h = −0.1 的割线差商为 1.9，h = 0.1 的割线差商为 2.1，两者都趋近切线 y = 2x − 1 的斜率 2。',
  dataUri: svgDataUri(limitSvg),
  svg: limitSvg,
}

const f = (x) => x * x * x - 3 * x

const S3_BASE = {
  xmin: -2.4,
  xmax: 2.4,
  // y 范围覆盖 f 在窗口两端的所有取值，保证三帧都显示「完整曲线」
  ymin: -7.5,
  ymax: 7.5,
  width: 480,
  height: 320,
  title: 'f(x) = x³ − 3x',
  curves: [{ fn: f }],
}

const s3Frame1 = plotSvg({
  ...S3_BASE,
  points: [
    { x: -1, kind: 'max', label: '(−1, 2)', labelDx: 10, labelDy: -10 },
    { x: 1, kind: 'min', label: '(1, −2)', labelDx: 10, labelDy: 16 },
  ],
})

const s3Frame2 = plotSvg({
  ...S3_BASE,
  shades: [{ x0: -1.75, x1: -0.25 }],
  tangents: [{ x: -1, len: 0.6 }],
  points: [
    { x: -1, kind: 'max', label: '极大 (−1, 2)', labelDx: 10, labelDy: -12 },
    { x: 1, y: -2, kind: 'plain' },
  ],
  annotations: [
    { x: -1, y: 5.2, text: 'f′ 由正变负 → 极大', anchor: 'middle', color: '#b4472e' },
  ],
})

const s3Frame3 = plotSvg({
  ...S3_BASE,
  shades: [{ x0: 0.25, x1: 1.75 }],
  tangents: [{ x: 1, len: 0.6 }],
  points: [
    { x: -1, y: 2, kind: 'plain' },
    { x: 1, kind: 'min', label: '极小 (1, −2)', labelDx: 10, labelDy: 14 },
  ],
  annotations: [
    { x: 1, y: -5.2, text: 'f′ 由负变正 → 极小', anchor: 'middle', color: '#b4472e' },
  ],
})

/** S3 看图讲解三帧：每帧保留完整曲线与坐标轴，只变聚焦标记/区间/切线。 */
export const FIG_S3_FRAMES = [
  {
    label: '整条曲线与两处候选点',
    dataUri: svgDataUri(s3Frame1),
    svg: s3Frame1,
  },
  {
    label: '聚焦 (−1,2)：左正右负',
    dataUri: svgDataUri(s3Frame2),
    svg: s3Frame2,
  },
  {
    label: '聚焦 (1,−2)：左负右正',
    dataUri: svgDataUri(s3Frame3),
    svg: s3Frame3,
  },
]

const g = (x) => 2 * x * x * x - 3 * x * x - 12 * x + 1

const guideSvg = plotSvg({
  xmin: -2.6,
  xmax: 3.6,
  ymin: -24,
  ymax: 14,
  width: 520,
  height: 340,
  grid: true,
  axisLabelX: 'x',
  axisLabelY: 'y',
  title: 'g(x) = 2x³ − 3x² − 12x + 1',
  curves: [{ fn: g }],
  shades: [
    { x0: -1.5, x1: -0.5 },
    { x0: 1.5, x1: 2.5 },
  ],
  tangents: [
    { x: -1, len: 0.55 },
    { x: 2, len: 0.55 },
  ],
  points: [
    { x: -1, y: 8, kind: 'max', label: '(−1, 8) 极大', labelDx: 10, labelDy: -10 },
    { x: 2, y: -19, kind: 'min', label: '(2, −19) 极小', labelDx: 10, labelDy: 18 },
  ],
})

/** 导学推导用图：g(x) 曲线，标出 (−1,8) 极大与 (2,−19) 极小。 */
export const FIG_GUIDE_CURVE = {
  caption:
    'g(x) = 2x³ − 3x² − 12x + 1：x = −1 处取极大值 8，x = 2 处取极小值 −19；可用附近函数值比较验证。',
  dataUri: svgDataUri(guideSvg),
  svg: guideSvg,
}
