/**
 * 科研端数据 QA：数学数值核验 + 证据引用完整性 + 页码一致性。
 * 运行：node qa/research/tmp/data_qa.mjs
 */
import { writeFileSync } from 'node:fs'
import {
  researchProjects,
  researchPapers,
  formulaChecks,
  projectPapers,
  findBlock,
  findPaper,
  writingProjects,
} from 'file:///D:/zxsy-math-arena-showcase/src/data/research.js'

const lines = []
const pass = []
const fail = []
const check = (name, ok, detail = '') => {
  ;(ok ? pass : fail).push({ name, detail })
  lines.push((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : ''))
}

// 1. 材料页码一致性
for (const p of Object.values(researchPapers)) {
  check(`页码连续且 meta 页数与 pages 一致：${p.id}`, p.pages.every((pg, i) => pg.no === i + 1) && (p.meta.match(/(\d+) 页/) || [])[1] === String(p.pages.length), `pages=${p.pages.length}`)
}

// 2. 数值实验表：e_h/h 与 e_h/h^2
const num = researchPapers['fem-num']
const t1 = num.pages[1].blocks.find((b) => b.t === 'table')
const t2 = num.pages[2].blocks.find((b) => b.t === 'table')
const rows1 = t1.rows.map((r) => ({ h: eval(r[0]), e: Number(r[1]), ratio: Number(r[2]) }))
check('表 1 e_h/h 列可复算', rows1.every((r) => Math.abs(r.e / r.h - r.ratio) < 0.002), rows1.map((r) => (r.e / r.h).toFixed(4)).join(','))
check('表 1 能量范数一阶收敛（h 减半误差约减半）', rows1.every((r, i) => i === 0 || Math.abs(r.e / rows1[i - 1].e - 0.5) < 0.02), rows1.map((r) => r.e).join(','))
const rows2 = t2.rows.map((r) => ({ h: eval(r[0]), e: Number(r[1]), ratio: Number(r[2]) }))
check('表 2 e_h/h^2 列可复算', rows2.every((r) => Math.abs(r.e / (r.h * r.h) - r.ratio) < 0.005), rows2.map((r) => (r.e / (r.h * r.h)).toFixed(4)).join(','))
check('表 2 L2 二阶收敛（h 减半误差约变为 1/4）', rows2.every((r, i) => i === 0 || Math.abs(r.e / rows2[i - 1].e - 0.25) < 0.015), rows2.map((r) => r.e).join(','))

// 3. 公式案例数值核验
const sqrtCase = formulaChecks.find((c) => c.id === 'sqrt-square')
check('√(x²)=x 反例 x=−2：√4=2≠−2', Math.sqrt(sqrtCase.counterexample.x ** 2) === 2 && sqrtCase.counterexample.x === -2)
const cancel = formulaChecks.find((c) => c.id === 'cancel-zero')
const x = cancel.counterexample.x
check('约分反例 x=1：原式无定义 (NaN)', Number.isNaN((x * x - 1) / (x - 1)))
const sq = formulaChecks.find((c) => c.id === 'complete-square')
check(
  '配方恒等式 5 组抽样左右相等（b=2）',
  sq.counterexample.samples.every((s) => Math.abs(s.x * s.x + 2 * 2 * s.x - (s.x + 2) ** 2 + 4) < 1e-12),
  sq.counterexample.samples.map((s) => s.x).join(','),
)
check('三条公式检查均带“离线演示审核结论”说明', formulaChecks.every((c) => c.status && c.engine && c.judgment))

// 4. Céa 引理表述与证据
const cea = researchPapers['fem-cea']
const thm = findBlock('fem-cea', 4, 'thm-cea')?.block
check('Céa 引理表述含 V_h⊂V、连续、V-椭圆、M/α、inf', /V_h.*V/.test(thm.text) && /连续/.test(thm.text) && /椭圆/.test(thm.text) && /M\/α/.test(thm.text) && /inf/.test(thm.text))
const proof = findBlock('fem-cea', 4, 'proof-cea')?.block
check('Céa 证明含 Galerkin 正交性 + 连续/椭圆不等式两步', /Galerkin 正交性/.test(proof.text) && /连续性/.test(proof.text) && /V-椭圆性/.test(proof.text))
check('定理条件问答证据指向定理页', cea.qa['cea-thm'].evidence.some((e) => e.page === 4 && e.block === 'thm-cea'))

// 5. 所有证据引用有效（paper/page/block 存在）
const badEvidence = []
function walkEvidence(list, where) {
  for (const ev of list || []) {
    const found = findBlock(ev.paperId, ev.page, ev.block)
    if (!found) badEvidence.push(`${where} -> ${ev.paperId}/${ev.page}/${ev.block}`)
  }
}
for (const p of Object.values(researchPapers)) {
  for (const qa of Object.values(p.qa || {})) walkEvidence(qa.evidence, `${p.id}.qa.${qa.id}`)
  for (const [k, tool] of Object.entries(p.tools || {})) walkEvidence(tool.evidence, `${p.id}.tools.${k}`)
}
for (const c of formulaChecks) walkEvidence(c.evidence, `formula.${c.id}`)
check('全部问答/工具/公式检查的证据 paper+page+block 均可定位', badEvidence.length === 0, badEvidence.slice(0, 5).join('; '))

// 6. 材料/项目关联完整
const orphan = Object.values(researchPapers).filter((p) => !researchProjects.some((proj) => proj.id === p.projectId))
check('每份材料都属于已有项目', orphan.length === 0, orphan.map((p) => p.id).join(','))
check('项目声明的论文 id 均存在', researchProjects.every((proj) => (proj.papers || []).every((id) => findPaper(id)) && projectPapers(proj).length === proj.papers.length))
check('每个项目均有写作工程', researchProjects.every((proj) => writingProjects[proj.writeProjectId]))

// 7. 写作工程：引用键与补丁可应用
const femWrite = writingProjects['p-fem']
const bib = femWrite.files['refs.bib'].content
check('refs.bib 含 demo-cea 键', /@\w+\{demo-cea,/.test(bib))
check('初稿含未定义引用键 Cea1971（可复现警告）', femWrite.files['sections/theory.tex'].content.includes('\\cite{Cea1971}'))
check('改进建议 qedhere 补丁锚点存在', femWrite.files['sections/theory.tex'].content.includes('\\]'))
check('qedhere 修复补丁锚点（导言区）存在', femWrite.files['main.tex'].content.includes('\\usepackage{graphicx}'))
check('润色补丁原文存在', femWrite.files['main.tex'].content.includes('本文讨论有限元方法求解椭圆型问题时的误差估计。'))
check('翻译补丁原文存在', femWrite.files['main.tex'].content.includes('本文讨论有限元方法求解椭圆型问题时的误差估计。基于 Céa 引理与插值理论，'))
check('写作工程无外部文献条目（仅随包演示材料）', !/@(article|book|inproceedings)\{/.test(bib) && bib.includes('随包演示讲义'))

// 8. 数学文本：所有正文公式 $ 成对
const unbalanced = []
for (const p of Object.values(researchPapers)) {
  for (const pg of p.pages) {
    for (const b of pg.blocks) {
      const s = String(b.text || '')
      const dollars = (s.match(/\$/g) || []).length
      if (dollars % 2 !== 0) unbalanced.push(`${p.id} p${pg.no}`)
    }
  }
}
check('正文行内公式 $ 均成对', unbalanced.length === 0, unbalanced.slice(0, 5).join(','))

// 9. 免责声明标注
check('三份主讲义 meta 均含“随包演示讲义”标注', ['fem-cea', 'cond-formula', 'write-lecture'].every((k) => researchPapers[k].meta.includes('随包演示讲义')))

const summary = {
  total: pass.length + fail.length,
  pass: pass.length,
  fail: fail.length,
}
const out = '# 科研端数据 QA（自动核验）\n\n'
  + '运行：`node qa/research/tmp/data_qa.mjs`　结果：**' + summary.pass + '/' + summary.total + ' PASS**，FAIL ' + summary.fail + '。\n\n'
  + '```\n' + lines.join('\n') + '\n```\n'
writeFileSync('D:/zxsy-math-arena-showcase/qa/research/DATA-QA.md', out, 'utf8')
console.log(lines.join('\n'))
console.log('\nRESULT:', summary.fail === 0 ? 'PASS' : 'FAIL', `(${summary.pass}/${summary.total})`)
