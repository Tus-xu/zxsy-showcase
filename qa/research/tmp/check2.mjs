import { readFileSync } from 'node:fs'
const files = [
  'D:/zxsy-math-arena-showcase/qa/research/tmp/dump_papers.mjs',
  'D:/zxsy-math-arena-showcase/qa/research/tmp/make_papers_pdf.py',
  'D:/zxsy-math-arena-showcase/qa/research/tmp/verify_pdfs.py',
]
for (const p of files) {
  const lines = readFileSync(p, 'utf8').split('\n')
  console.log('---', p)
  lines.forEach((l, i) => {
    const runs = [...l.matchAll(/\\+/g)].map((m) => m[0].length).filter((n) => n >= 2)
    if (runs.length) console.log(i + 1, 'runs', runs.join(','), JSON.stringify(l.slice(0, 120)))
  })
}
