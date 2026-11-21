// Verify LaTeX example projects under the page-side offline engine that the UI actually uses.
import { normalizeFiles, compileProject, parseProject } from '../../../src/components/research/latexEngine.js'
import { writingProjects, starterWritingFiles, formulaChecks, researchPapers } from './research.snapshot.module.mjs'

function report(name, files) {
  const norm = normalizeFiles(files)
  const res = compileProject(norm)
  console.log(`\n### ${name}: ok=${res.ok} errors=${res.errors.length} warnings=${res.warnings.length}`)
  for (const e of res.errors) console.log('  ERROR', e.file + ':' + e.line, e.message.slice(0, 120))
  for (const w of res.warnings) console.log('  WARN', w.file + ':' + w.line, w.message.slice(0, 120))
  if (res.ok) {
    console.log('  title:', res.doc.title, '| sections:', res.doc.sections.map((s) => s.text).join(' / '))
    console.log('  blocks:', res.doc.blocks.map((b) => b.t).join(','))
    console.log('  formula blocks:', res.doc.blocks.filter((b) => b.t === 'formula').map((b) => b.tex))
  }
  return { norm, res }
}

for (const [pid, proj] of Object.entries(writingProjects)) {
  const { norm } = report(`writingProjects.${pid}`, proj.files)
  // simulate applying the qed-close patch to sections/theory.tex (the documented demo error)
  if (pid === 'p-fem') {
    const files2 = { ...norm }
    files2['sections/theory.tex'] = {
      kind: 'tex',
      content: norm['sections/theory.tex'].content.replace('\\]', '\\]\n\\qedhere'),
    }
    report('writingProjects.p-fem AFTER qed-close patch (expect undefined qedhere error)', files2)
  }
}
report('starter files', starterWritingFiles('测试项目'))

// Check formula-check LaTeX samples compile under KaTeX semantics? (KaTeX not used for these; they are plain strings.)
console.log('\nformulaChecks ids:', formulaChecks.map((f) => f.id).join(','))
console.log('researchPapers formula/page counts:', Object.values(researchPapers).map((p) => `${p.id}:${p.pages.length}`).join(' '))
