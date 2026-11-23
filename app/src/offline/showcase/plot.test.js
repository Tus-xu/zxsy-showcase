/**
 * 离线绘图纯函数的单测（TDD：先写用例，再补实现）。
 *
 * 守两条底线：
 *   1. 图上的点必须由数据算出来，不是示意占位（反算屏幕坐标回数据空间比对）；
 *   2. 所有导出资产都不带任何外部地址，file:// 双击打开时保证 0 请求。
 */
import { describe, it, expect } from 'vitest'
import { svgDataUri, num, plotSvg, plotDataUri, PLOT_PAD } from './plot'
import {
  PROBLEM_IMAGE,
  VARIANT_V1_IMAGE,
  FIG_LESSON_LINE,
  FIG_LIMIT_SECANT,
  FIG_S3_FRAMES,
  FIG_GUIDE_CURVE,
} from './assets'

const URI_PREFIX = 'data:image/svg+xml;charset=utf-8,'

/** 取出 data URI 里的原始 SVG（与 svgDataUri 的编码方式对称） */
function decoded(asset) {
  const i = asset.dataUri.indexOf(',')
  expect(i, 'data URI 缺少逗号分隔').toBeGreaterThan(0)
  return decodeURIComponent(asset.dataUri.slice(i + 1))
}

/** 解析所有折线的屏幕坐标；每段是 [[x,y], ...] */
function polylines(svg) {
  const out = []
  const re = /<polyline\b[^>]*\bpoints="([^"]*)"/g
  let m
  while ((m = re.exec(svg))) {
    out.push(
      m[1]
        .trim()
        .split(/\s+/)
        .map((pair) => pair.split(',').map(Number))
    )
  }
  return out
}

/** 屏幕坐标反算回数据空间（与 plotSvg 的线性映射互逆） */
function toData(px, py, view) {
  const iw = view.width - PLOT_PAD * 2
  const ih = view.height - PLOT_PAD * 2
  return {
    x: view.xmin + ((px - PLOT_PAD) / iw) * (view.xmax - view.xmin),
    y: view.ymax - ((py - PLOT_PAD) / ih) * (view.ymax - view.ymin),
  }
}

/** 找到数据 x 最接近 targetX 的顶点，返回该点的数据坐标 */
function nearestX(seg, view, targetX) {
  let best = null
  for (const [px, py] of seg) {
    const d = toData(px, py, view)
    if (!best || Math.abs(d.x - targetX) < Math.abs(best.x - targetX)) best = d
  }
  return best
}

const S3_VIEW = { xmin: -2.4, xmax: 2.4, ymin: -7.5, ymax: 7.5, width: 480, height: 320 }
const GUIDE_VIEW = { xmin: -2.6, xmax: 3.6, ymin: -24, ymax: 14, width: 520, height: 340 }
const LINE_VIEW = { xmin: -1.2, xmax: 2.2, ymin: -1.6, ymax: 2.6, width: 460, height: 300 }

describe('svgDataUri', () => {
  it('输出 data URI，且百分号解码能还原原 SVG', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><text>函数 &amp; 图像</text></svg>'
    const uri = svgDataUri(svg)
    expect(uri.startsWith('data:image/svg+xml')).toBe(true)
    expect(uri.startsWith(URI_PREFIX)).toBe(true)
    expect(decodeURIComponent(uri.slice(uri.indexOf(',') + 1))).toBe(svg)
    // 六边形以外的字符也不能漏编码（# 会被当成 fragment）
    expect(uri).not.toContain('#')
  })
})

describe('plotSvg 几何', () => {
  it('y = x² 的每个取样点都落在曲线上', () => {
    const view = { xmin: -2, xmax: 2, ymin: -1, ymax: 5, width: 520, height: 340 }
    const segs = polylines(plotSvg({ ...view, curves: [{ fn: (x) => x * x }] }))
    expect(segs.length).toBe(1)
    expect(segs[0].length).toBe(401) // 400 段采样共 401 个点

    let maxErr = 0
    for (const [px, py] of segs[0]) {
      const { x, y } = toData(px, py, view)
      maxErr = Math.max(maxErr, Math.abs(y - x * x))
    }
    expect(maxErr).toBeLessThan(0.5)
  })

  it('遇到发散点会断开成多段，不会连一条直线穿越', () => {
    const svg = plotSvg({
      xmin: -5,
      xmax: 5,
      ymin: -3,
      ymax: 3,
      curves: [{ fn: (x) => 1 / x }],
    })
    expect(polylines(svg).length).toBeGreaterThan(1)
    expect(svg).not.toMatch(/NaN|Infinity/)
  })

  it('显式写 width / height / viewBox，<img> 里不会变形', () => {
    const svg = plotSvg({ xmin: 0, xmax: 1, ymin: 0, ymax: 1, width: 400, height: 280 })
    expect(svg).toContain('viewBox="0 0 400 280"')
    expect(svg).toContain('width="400"')
    expect(svg).toContain('height="280"')
  })
})

describe('plotSvg 标注', () => {
  it('极大/极小点用强调色，zero 画空心圈', () => {
    const svg = plotSvg({
      xmin: -2,
      xmax: 2,
      ymin: -3,
      ymax: 3,
      curves: [{ fn: (x) => x * x - 2 }],
      points: [{ x: 0, kind: 'min', label: '极小' }],
    })
    expect(svg).toMatch(/<circle[^>]*fill="#b4472e"/)

    const zero = plotSvg({
      xmin: -2,
      xmax: 2,
      ymin: -1,
      ymax: 3,
      curves: [{ fn: (x) => x }],
      points: [{ x: 1, kind: 'zero' }],
    })
    expect(zero).toMatch(/<circle[^>]*fill="#ffffff"[^>]*stroke="#2f4f7f"/)
  })

  it('tangents 在函数值处生成水平线段', () => {
    const view = { xmin: -2, xmax: 2, ymin: -1, ymax: 5, width: 520, height: 340 }
    const svg = plotSvg({
      ...view,
      curves: [{ fn: (x) => x * x }],
      tangents: [{ x: 1, len: 0.5 }],
    })
    const tangent = [...svg.matchAll(/<line\b[^>]*>/g)]
      .map((m) => m[0])
      .find((l) => l.includes('stroke-dasharray="5 4"') && l.includes('#7a8794'))
    expect(tangent, '没有找到切线').toBeTruthy()

    const y1 = Number(tangent.match(/y1="([^"]+)"/)[1])
    const y2 = Number(tangent.match(/y2="([^"]+)"/)[1])
    expect(y1).toBe(y2)
    expect(Math.abs(toData(0, y1, view).y - 1)).toBeLessThan(0.05)
  })

  it('shades 生成区间矩形，区间标签按 XML 转义', () => {
    const svg = plotSvg({
      xmin: -1,
      xmax: 2,
      ymin: -1,
      ymax: 2,
      shades: [{ x0: 0, x1: 1, label: '0<x<1' }],
    })
    const rect = svg.match(/<rect[^>]*fill="rgba\(122,135,148,0\.16\)"[^>]*>/)
    expect(rect).toBeTruthy()
    expect(Number(rect[0].match(/width="([^"]+)"/)[1])).toBeGreaterThan(0)
    expect(svg).toContain('>0&lt;x&lt;1<')
  })

  it('标题与标注里的 XML 特殊字符不会破坏结构', () => {
    const svg = plotSvg({
      xmin: 0,
      xmax: 1,
      ymin: 0,
      ymax: 1,
      title: 'a<b&"c"',
      annotations: [{ x: 0.5, y: 0.5, text: "'x'<y>" }],
    })
    expect(svg).toContain('a&lt;b&amp;&quot;c&quot;')
    expect(svg).not.toContain("'x'<y>")
  })

  it('plotDataUri 等价于 plotSvg 后再编码', () => {
    const o = { xmin: -1, xmax: 1, ymin: -1, ymax: 1, title: 't' }
    expect(plotDataUri(o)).toBe(svgDataUri(plotSvg(o)))
  })
})

describe('num', () => {
  it('去掉浮点尾巴，保留有效小数', () => {
    expect(num(2.0000000001)).toBe('2')
    expect(num(0.30000000000000004)).toBe('0.3')
    expect(num(-0)).toBe('0')
    expect(num(1.25)).toBe('1.25')
  })
})

describe('导出资产的离线硬约束', () => {
  const assets = [
    PROBLEM_IMAGE,
    VARIANT_V1_IMAGE,
    FIG_LESSON_LINE,
    FIG_LIMIT_SECANT,
    ...FIG_S3_FRAMES,
    FIG_GUIDE_CURVE,
  ]

  it('任何字段（含解码后的 SVG）都没有外网地址 / script / image', () => {
    for (const a of assets) {
      const raw = [a.name, a.mime, a.alt, a.caption, a.label, a.svg, a.dataUri].filter(
        (v) => typeof v === 'string'
      )
      for (const s of raw) {
        expect(s, '资产字段出现外网地址').not.toMatch(/https?:\/\//)
        expect(s.toLowerCase()).not.toContain('<script')
        expect(s.toLowerCase()).not.toContain('<image')
      }
      const svg = decoded(a)
      expect(svg.startsWith('<svg')).toBe(true)
      expect(svg, '解码后的 SVG 出现外网地址').not.toMatch(/https?:\/\//)
      expect(svg.toLowerCase()).not.toContain('<script')
      expect(svg.toLowerCase()).not.toContain('<image')
    }
  })
})

describe('资产内容与数学事实', () => {
  it('S3 三帧 label 精确、题图正文可读', () => {
    expect(FIG_S3_FRAMES.map((f) => f.label)).toEqual([
      '整条曲线与两处候选点',
      '聚焦 (−1,2)：左正右负',
      '聚焦 (1,−2)：左负右正',
    ])
    const svg = decoded(PROBLEM_IMAGE)
    expect(svg).toContain('f(x)')
    expect(svg).toContain('自编题图')
    expect(svg).toContain('求函数的单调区间及极值')
  })

  it('变式 V1 正文含 g(x) 与四个选项', () => {
    const svg = decoded(VARIANT_V1_IMAGE)
    expect(svg).toContain('g(x)')
    expect(svg).toContain('极小值')
    for (const k of ['A', 'B', 'C', 'D']) expect(svg).toContain(`>${k}<`)
    for (const v of ['−1', '−2']) expect(svg).toContain(v)
  })

  it('g(x) 曲线确实经过 (−1, 8) 与 (2, −19)', () => {
    const seg = polylines(FIG_GUIDE_CURVE.svg)[0]
    expect(seg).toBeTruthy()
    expect(Math.abs(nearestX(seg, GUIDE_VIEW, -1).y - 8)).toBeLessThan(0.2)
    expect(Math.abs(nearestX(seg, GUIDE_VIEW, 2).y + 19)).toBeLessThan(0.2)
    expect(FIG_GUIDE_CURVE.svg).toContain('(−1, 8)')
    expect(FIG_GUIDE_CURVE.svg).toContain('(2, −19)')
  })

  it('f(x) 曲线确实经过 (−1, 2) 与 (1, −2)', () => {
    const seg = polylines(FIG_S3_FRAMES[0].svg)[0]
    expect(seg).toBeTruthy()
    expect(Math.abs(nearestX(seg, S3_VIEW, -1).y - 2)).toBeLessThan(0.2)
    expect(Math.abs(nearestX(seg, S3_VIEW, 1).y + 2)).toBeLessThan(0.2)
  })

  it('y = 1 − x 经过 (0, 1) 与 (1, 0)', () => {
    const seg = polylines(FIG_LESSON_LINE.svg)[0]
    expect(seg).toBeTruthy()
    expect(Math.abs(nearestX(seg, LINE_VIEW, 0).y - 1)).toBeLessThan(0.1)
    expect(Math.abs(nearestX(seg, LINE_VIEW, 1).y - 0)).toBeLessThan(0.1)
  })

  it('极限图标注了 h = −0.1/0.1 的差商 1.9/2.1 与切线 y = 2x − 1', () => {
    expect(FIG_LIMIT_SECANT.svg).toContain('1.9')
    expect(FIG_LIMIT_SECANT.svg).toContain('2.1')
    expect(FIG_LIMIT_SECANT.svg).toContain('2x − 1')
  })
})
