/**
 * 教案 → 真实 DOCX（docx，浏览器内生成，断网可用；中文无需嵌入字体）。
 * plan 结构见 src/data/courseware.js：{ title, meta, sections:[{ heading, items:[string] }] }
 */
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx'
import { downloadBlob } from './download'
import { plainMath } from './plainMath'

const FONT = 'Microsoft YaHei'

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 120, line: opts.line ?? 320 },
    alignment: opts.align,
    heading: opts.heading,
    border: opts.border,
    children: [
      new TextRun({
        text: plainMath(text),
        bold: !!opts.bold,
        size: opts.size ?? 22,
        color: opts.color,
        font: FONT,
      }),
    ],
  })
}

export function buildDocx(plan) {
  const children = []
  children.push(p(plan.title, { bold: true, size: 36, heading: HeadingLevel.TITLE, align: AlignmentType.CENTER, after: 160 }))
  if (plan.meta?.length) {
    children.push(p(plan.meta.join('　·　'), { size: 18, color: '64748B', align: AlignmentType.CENTER, after: 260 }))
  }

  for (const sec of plan.sections) {
    children.push(
      new Paragraph({
        spacing: { before: 220, after: 100 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '4F46E5', space: 2 } },
        children: [new TextRun({ text: sec.heading, bold: true, size: 26, color: '4338CA', font: FONT })],
      }),
    )
    for (const item of sec.items) {
      if (item.startsWith('## ')) {
        children.push(p(item.slice(3), { bold: true, size: 23, after: 80 }))
      } else if (item.startsWith('- ')) {
        children.push(
          new Paragraph({
            spacing: { after: 80, line: 320 },
            children: [new TextRun({ text: item.slice(2), size: 21, font: FONT })],
            bullet: { level: 0 },
          }),
        )
      } else {
        children.push(p(item, { size: 21 }))
      }
    }
  }

  const doc = new Document({
    creator: '智学数研 · 离线演示',
    title: plan.title,
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 21 },
        },
      },
    },
    sections: [{ properties: { page: { margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } }, children }],
  })
  return Packer.toBlob(doc)
}

export async function exportPlanDocx(plan, fileName) {
  const blob = await buildDocx(plan)
  downloadBlob(blob, fileName || `${plan.title}.docx`)
  return { bytes: blob.size, name: fileName || `${plan.title}.docx` }
}

export function planToMarkdown(plan) {
  const out = [`# ${plan.title}`, '', plan.meta ? plan.meta.join(' · ') : '', '']
  for (const sec of plan.sections) {
    out.push(`## ${sec.heading}`)
    for (const item of sec.items) {
      if (item.startsWith('## ')) out.push(`### ${item.slice(3)}`)
      else if (item.startsWith('- ')) out.push(item)
      else out.push(item)
    }
    out.push('')
  }
  return out.join('\n')
}
