/**
 * 课件 → 真实 PPTX（pptxgenjs，浏览器内生成，断网可用）。
 * 生成的是可编辑文本/形状，不是整页截图。
 * deck 结构见 src/data/courseware.js：{ title, subtitle, meta:{...}, slides:[{layout,title,subtitle,lead,equation,bullets,figure,footer}] }
 */
import pptxgen from 'pptxgenjs'
import { downloadBlob } from './download'
import { plainMath } from './plainMath'

/** 导出前把轻量 LaTeX 转成 PPT 可读文本（PPT 无法渲染 $...$） */
function toPlainDeck(deck) {
  const t = (v) => (v == null ? v : plainMath(v))
  return {
    ...deck,
    title: t(deck.title),
    subtitle: t(deck.subtitle),
    meta: { ...(deck.meta || {}), textbook: t(deck.meta?.textbook), className: t(deck.meta?.className) },
    slides: (deck.slides || []).map((s) => ({
      ...s,
      kicker: t(s.kicker),
      title: t(s.title),
      subtitle: t(s.subtitle),
      lead: t(s.lead),
      equation: t(s.equation),
      bullets: (s.bullets || []).map(t),
      figure: t(s.figure),
      note: t(s.note),
      footer: t(s.footer),
    })),
  }
}

const C = {
  primary: '4F46E5',
  ink: '0F172A',
  ink2: '334155',
  muted: '94A3B8',
  line: 'E2E8F0',
  soft: 'EEF2FF',
  white: 'FFFFFF',
  green: '047857',
}

function addFooter(slide, text) {
  if (!text) return
  slide.addText(text, {
    x: 0.5,
    y: 7.05,
    w: 12.3,
    h: 0.3,
    fontSize: 9,
    color: C.muted,
    align: 'right',
  })
}

function bg(slide) {
  slide.background = { color: C.white }
}

export function buildPptx(deck) {
  deck = toPlainDeck(deck)
  const pptx = new pptxgen()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.author = '智学数研 · 离线演示'
  pptx.title = deck.title
  pptx.subject = deck.meta?.textbook ? `${deck.meta.textbook} · ${deck.title}` : deck.title

  for (const [i, s] of deck.slides.entries()) {
    const slide = pptx.addSlide()
    bg(slide)

    // 顶部品牌条
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.42, fill: { color: C.primary } })
    slide.addText(`${deck.title} · ${deck.subtitle || ''}`, {
      x: 0.5,
      y: 0.04,
      w: 8,
      h: 0.34,
      fontSize: 10,
      color: C.white,
      bold: true,
    })
    slide.addText(deck.meta?.textbook || '智学数研 · 高中数学', {
      x: 9,
      y: 0.04,
      w: 3.8,
      h: 0.34,
      fontSize: 9,
      color: 'DDD6FE',
      align: 'right',
    })

    if (s.layout === 'title') {
      slide.addText(s.kicker || '智学数研 · 智学备课', { x: 0.9, y: 1.5, w: 11.5, h: 0.4, fontSize: 13, color: C.primary, bold: true })
      slide.addText(s.title, { x: 0.9, y: 2.0, w: 11.5, h: 1.2, fontSize: 40, bold: true, color: C.ink })
      if (s.subtitle) slide.addText(s.subtitle, { x: 0.9, y: 3.25, w: 11.5, h: 0.9, fontSize: 18, color: C.ink2 })
      if (s.lead) slide.addText(s.lead, { x: 0.9, y: 4.35, w: 11.5, h: 1.4, fontSize: 14, color: C.ink2, lineSpacingMultiple: 1.4 })
      slide.addText(deck.meta?.className || '', { x: 0.9, y: 6.75, w: 11.5, h: 0.4, fontSize: 11, color: C.muted })
      addFooter(slide, s.footer)
      continue
    }

    // 正文页：左侧序号 + 标题
    slide.addText(String(i + 1).padStart(2, '0'), { x: 0.55, y: 0.78, w: 0.9, h: 0.6, fontSize: 24, bold: true, color: C.primary })
    slide.addShape(pptx.ShapeType.roundRect, { x: 0.55, y: 1.38, w: 0.55, h: 0.06, fill: { color: C.primary }, line: { color: C.primary } })
    slide.addText(s.title || '', { x: 1.55, y: 0.7, w: 11.2, h: 0.8, fontSize: 26, bold: true, color: C.ink })

    let y = 1.7
    if (s.lead) {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 1.55,
        y,
        w: 11.2,
        h: 0.95,
        fill: { color: C.soft },
        line: { color: C.soft },
        rectRadius: 0.12,
      })
      slide.addText(s.lead, { x: 1.8, y: y + 0.13, w: 10.7, h: 0.7, fontSize: 15, color: C.ink, lineSpacingMultiple: 1.35 })
      y += 1.2
    }

    if (s.equation) {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 1.55,
        y,
        w: 5.4,
        h: 1.15,
        fill: { color: 'F8FAFC' },
        line: { color: C.line },
        rectRadius: 0.1,
      })
      slide.addText(s.equation, { x: 1.7, y: y + 0.18, w: 5.1, h: 0.8, fontSize: 20, color: C.primary, bold: true, align: 'center' })
      y += 1.45
    }

    if (s.bullets?.length) {
      slide.addText(
        s.bullets.map((b) => ({ text: b, options: { bullet: { code: '2022' }, breakLine: true } })),
        { x: 1.55, y, w: 11.2, h: 0.55 * s.bullets.length + 0.4, fontSize: 15, color: C.ink2, lineSpacingMultiple: 1.5, valign: 'top' },
      )
    }

    if (s.figure) {
      slide.addShape(pptx.ShapeType.ellipse, { x: 8.4, y: 1.9, w: 4.2, h: 2.6, line: { color: C.primary, width: 2 }, fill: { color: 'FFFFFF' } })
      slide.addText(s.figure, { x: 8.4, y: 4.65, w: 4.3, h: 0.5, fontSize: 11, color: C.muted, align: 'center' })
    }

    if (s.note) {
      slide.addText(`讲稿：${s.note}`, { x: 1.55, y: 6.55, w: 11.2, h: 0.4, fontSize: 10, color: C.muted, italic: true })
    }
    addFooter(slide, s.footer || deck.meta?.textbook)
  }

  return pptx.write({ outputType: 'blob' })
}

export async function exportDeckPptx(deck, fileName) {
  const plain = toPlainDeck(deck)
  const blob = await buildPptx(plain)
  downloadBlob(blob, fileName || `${plain.title}.pptx`)
  return { bytes: blob.size, name: fileName || `${plain.title}.pptx` }
}

export async function exportDeckPdfText(deck) {
  // 课件 PDF 走文本渲染器（见 exportPdf.js），此处只导出大纲文本，供验收核对
  const lines = deck.slides.map((s, i) => `${i + 1}. ${s.title || ''}${s.lead ? ' — ' + s.lead : ''}`)
  return [deck.title, deck.subtitle || '', ...lines].join('\n')
}
