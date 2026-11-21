/**
 * 将 data/research.js 中三份主讲义导出为 JSON（保留原始 tex 与文本），
 * 由 qa/research/tmp/make_papers_pdf.py 负责转换为 PDF 可读文本。
 * 运行：node qa/research/tmp/dump_papers.mjs
 */
import { writeFileSync } from 'node:fs'
import { researchPapers } from 'file:///D:/zxsy-math-arena-showcase/src/data/research.js'

function itemsOf(b) {
  switch (b.t) {
    case 'title':
      return [
        { kind: 'docTitle', text: b.title },
        { kind: 'docSub', text: b.sub },
        { kind: 'meta', text: b.author },
        { kind: 'meta', text: b.date },
        { kind: 'rule', text: '' },
      ]
    case 'h1':
      return [{ kind: 'h1', text: b.text }]
    case 'h2':
      return [{ kind: 'h2', text: b.text }]
    case 'h3':
      return [{ kind: 'h3', text: b.text }]
    case 'p':
      return [{ kind: 'p', text: b.text }]
    case 'quote':
      return [{ kind: 'quote', text: '｜ ' + b.text }]
    case 'formula':
      return [{ kind: 'formula', tex: b.tex, num: b.num || '' }]
    case 'proof':
      return [{ kind: 'proof', text: '证明. ' + b.text }]
    case 'theorem':
    case 'defn':
    case 'prop':
    case 'corollary':
      return [{ kind: 'theorem', title: b.title, text: b.text }]
    case 'list':
      return (b.items || []).map((it, i) => ({ kind: 'list', text: (b.ordered ? (i + 1) + '. ' : '• ') + it }))
    case 'table':
      return [
        { kind: 'caption', text: b.caption },
        { kind: 'table', head: b.head, rows: b.rows },
        { kind: 'meta', text: b.note || '' },
      ]
    case 'refs':
      return (b.items || []).map((it) => ({ kind: 'ref', text: it }))
    default:
      return [{ kind: 'p', text: b.text || '' }]
  }
}

const keys = ['fem-cea', 'cond-formula', 'write-lecture']
const out = []
for (const key of keys) {
  const paper = researchPapers[key]
  out.push({
    key,
    title: paper.title,
    meta: paper.meta,
    authors: paper.authors,
    year: paper.year,
    pages: paper.pages.map((pg) => ({ no: pg.no, items: pg.blocks.flatMap(itemsOf) })),
    qa: Object.values(paper.qa || {}).map((q) => ({ id: q.id, kind: q.kind, question: q.question })),
  })
}
const target = 'D:/zxsy-math-arena-showcase/qa/research/tmp/papers.json'
writeFileSync(target, JSON.stringify(out, null, 2), 'utf8')
console.log('wrote', target, 'papers:', out.map((p) => p.key + ':' + p.pages.length + 'p').join(', '))
