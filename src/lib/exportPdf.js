/**
 * 文稿 → 真实 PDF（pdf-lib + 内嵌 CJK 子集字体，浏览器内生成，断网可用）。
 * doc 结构：{ title, meta:[string], blocks:[{type:'h'|'p'|'formula'|'list'|'quote', text}] }
 * 字体：src/assets/fonts/offline-cjk.ttf（GB2312 一级常用字子集，构建时由 scripts/make_font_subset.py 生成）
 */
import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import fontUrl from '../assets/fonts/offline-cjk.ttf?url'
import { downloadBlob } from './download'

const INK = rgb(0.06, 0.09, 0.16)
const MUTED = rgb(0.42, 0.47, 0.55)
const PRIMARY = rgb(0.31, 0.275, 0.898)
const LINE = rgb(0.886, 0.91, 0.941)

let fontBytesCache = null
async function loadFontBytes() {
  if (fontBytesCache) return fontBytesCache
  if (fontUrl.startsWith('data:')) {
    // 单文件构建：字体已内联为 data URI
    const b64 = fontUrl.split(',')[1]
    const bin = atob(b64)
    const arr = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
    fontBytesCache = arr
    return arr
  }
  const res = await fetch(fontUrl)
  fontBytesCache = new Uint8Array(await res.arrayBuffer())
  return fontBytesCache
}

function wrapText(text, font, size, maxWidth) {
  const lines = []
  let cur = ''
  for (const ch of String(text)) {
    if (ch === '\n') {
      lines.push(cur)
      cur = ''
      continue
    }
    const next = cur + ch
    if (font.widthOfTextAtSize(next, size) > maxWidth && cur) {
      lines.push(cur)
      cur = ch
    } else {
      cur = next
    }
  }
  if (cur) lines.push(cur)
  return lines.length ? lines : ['']
}

export async function buildPdf(doc) {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const font = await pdf.embedFont(await loadFontBytes(), { subset: true })
  const W = 595.28
  const H = 841.89
  const M = 56
  const maxW = W - M * 2

  let page = pdf.addPage([W, H])
  let y = H - M

  const ensureSpace = (need) => {
    if (y - need < M) {
      page = pdf.addPage([W, H])
      y = H - M
    }
  }
  const draw = (text, size, color, opts = {}) => {
    const lines = wrapText(text, font, size, maxW)
    const lh = size * (opts.lineHeight || 1.72)
    for (const line of lines) {
      ensureSpace(lh)
      page.drawText(line, { x: M + (opts.indent || 0), y: y - size, size, font, color })
      y -= lh
    }
  }

  // 页眉装饰
  page.drawRectangle({ x: 0, y: H - 8, width: W, height: 8, color: PRIMARY })

  draw(doc.title || '', 22, INK, { lineHeight: 1.5 })
  y -= 4
  if (doc.meta?.length) {
    draw(doc.meta.join('　·　'), 9, MUTED, { lineHeight: 1.6 })
  }
  y -= 6
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1, color: LINE })
  y -= 18

  for (const b of doc.blocks || []) {
    switch (b.type) {
      case 'h':
        y -= 6
        draw(b.text, 14, rgb(0.26, 0.22, 0.72), { lineHeight: 1.6 })
        y -= 2
        break
      case 'formula':
        ensureSpace(30)
        page.drawRectangle({ x: M, y: y - 26, width: maxW, height: 30, color: rgb(0.945, 0.961, 0.973), borderColor: LINE, borderWidth: 0.6 })
        draw(b.text, 12, PRIMARY, { indent: 12, lineHeight: 1.7 })
        y -= 6
        break
      case 'quote':
        draw('｜ ' + b.text, 10, MUTED, { lineHeight: 1.7 })
        break
      case 'list':
        draw('• ' + b.text, 10.5, INK, { indent: 6, lineHeight: 1.75 })
        break
      default:
        draw(b.text, 10.5, INK, { lineHeight: 1.8 })
    }
    y -= 4
  }

  // 页脚页码
  const pages = pdf.getPages()
  pages.forEach((pg, i) => {
    pg.drawText(`智学数研 · 离线演示   ${i + 1} / ${pages.length}`, {
      x: M,
      y: 28,
      size: 8,
      font,
      color: MUTED,
    })
  })

  return pdf.save()
}

export async function exportPdf(doc, fileName) {
  const bytes = await buildPdf(doc)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  downloadBlob(blob, fileName || `${doc.title || 'document'}.pdf`)
  return { bytes: blob.size, name: fileName || `${doc.title || 'document'}.pdf` }
}
