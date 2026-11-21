// Recheck round: verify the claimed P0/P1 fixes and look for regressions.
import { readFileSync } from 'node:fs'
import { guidanceCases } from './guidance.data.mjs'
import { practiceItems, judgePracticeItem } from './practice.data.mjs'
import { coursewareDecks } from './courseware.data.mjs'
import { submissions } from './submissions.data.mjs'
import { matchTextStep, submitChoice, variantMatches } from './judge.mjs'

const results = []
const ok = (tag, msg) => results.push(['OK', tag, msg])
const bad = (tag, msg) => results.push(['FAIL', tag, msg])
const risk = (tag, msg) => results.push(['RISK', tag, msg])

function c(id) { return guidanceCases.find((x) => x.id === id) }
function step(id) { const [cid, sid] = id.split('.'); return c(cid).steps.find((s) => s.id === sid) }

// Mixed text/choice state-machine replay, mirroring GuideView.handleRule/submitChoice.
function simulate(cid, actions) {
  const cs = c(cid)
  let idx = 0
  let finished = false
  const log = []
  for (const a of actions) {
    if (idx >= cs.steps.length) break
    const s = cs.steps[idx]
    if (a.keys) {
      const rule = submitChoice(s, a.keys)
      const kind = rule ? rule.kind : 'no-rule'
      log.push({ step: s.id, input: a.keys.join(''), kind })
      if (rule && rule.kind === 'correct') {
        if (rule.next === 'final') finished = true
        else if (rule.next) idx = cs.steps.findIndex((x) => x.id === rule.next)
        else idx += 1
      }
    } else {
      const rule = matchTextStep(s, a.text)
      const kind = rule ? rule.kind : 'unmatched'
      log.push({ step: s.id, input: a.text, kind, stay: !!rule?.stay })
      if (rule && rule.kind === 'correct') {
        if (rule.stay) continue
        if (rule.next === 'final') finished = true
        else if (rule.next) idx = cs.steps.findIndex((x) => x.id === rule.next)
        else idx += 1
      } else if (rule && rule.kind === 'wrong' && rule.next) {
        idx = cs.steps.findIndex((x) => x.id === rule.next)
      }
    }
    if (idx >= cs.steps.length) finished = true
  }
  return { finished, idx, log }
}

/* ---------- 1. guidance: A acceptance & flow ---------- */
console.log('== A equivalents (previously FAIL) ==')
for (const [sid, t, expect] of [
  ['A.s1', '2b=√7·2a', 'correct'],
  ['A.s1', '2b=2√7a', 'correct'],
  ['A.s1', '2b=√7×2a', 'correct'],
  ['A.s1', '2b=√7*2a', 'correct'],
  ['A.s1', 'b/a=√7', 'correct'],
  ['A.s1', 'b=√7a', 'correct'],
  ['A.s2', 'c²=b²+a²', 'correct'],
  ['A.s2', 'b^2+a^2=c^2', 'correct'],
  ['A.s2', 'a²+b²=c²', 'correct'],
]) {
  const r = matchTextStep(step(sid), t)
  const kind = r ? r.kind : 'unmatched'
  if (kind === expect) ok(`A-EQ-${sid}`, `${t} -> ${kind}`)
  else bad(`A-EQ-${sid}`, `${t} -> ${kind} (expect ${expect})`)
}

console.log('\n== A 收束：无泄底 + stay 流程 ==')
const A = c('A')
const s3 = A.steps.find((s) => s.id === 's3')
const s4 = A.steps.find((s) => s.id === 's4')
if (/2√2|√8|sqrt8|2\\sqrt\{2\}/.test(s4.ask)) bad('A-LEAK-ASK', `s4 ask 含 e 的数值：${s4.ask}`)
else ok('A-LEAK-ASK', `s4 ask 不含最终 e 值：${s4.ask}`)
const s3Reply8 = (s3.accept.find((r) => r.stay)?.reply || []).join(' ')
if (/2√2|√8|sqrt8|2\\sqrt\{2\}/.test(s3Reply8)) bad('A-LEAK-REPLY', `答 8 的回复仍给出 e：${s3Reply8}`)
else ok('A-LEAK-REPLY', `答 8 的回复只逗留并追问 e：${s3Reply8}`)
const r8 = matchTextStep(s3, '8')
if (r8 && r8.kind === 'correct' && r8.stay === true && !r8.next) ok('A-STAY-8', '答 8 -> correct+stay')
else bad('A-STAY-8', `答 8 -> kind=${r8?.kind} stay=${r8?.stay} next=${r8?.next}`)
for (const t of ['√8', '2√2']) {
  const r = matchTextStep(s3, t)
  if (r && r.kind === 'correct' && r.next === 's4') ok('A-STAY-E', `答 ${t} -> correct next s4`)
  else bad('A-STAY-E', `答 ${t} -> kind=${r?.kind} next=${r?.next}`)
}
for (const t of ['e=2√2', '2.828', 'e^2=8']) {
  const r = matchTextStep(s3, t)
  risk('A-STAY-INPUT', `答 ${t} -> ${r ? r.kind + (r.stay ? '+stay' : '') + (r.next ? '+' + r.next : '') : 'unmatched'}`)
}
const Aflow = simulate('A', [{ text: '2b=√7·2a' }, { text: 'c²=a²+b²' }, { text: '8' }, { text: '2√2' }, { keys: ['D'] }])
if (Aflow.finished) ok('A-FLOW', 'A 主线：关系式→c²=a²+b²→8(stay)→2√2→选 D 完成')
else bad('A-FLOW', JSON.stringify(Aflow))
const AflowDirect = simulate('A', [{ text: 'b/a=√7' }, { text: 'c²=a²+b²' }, { text: '√8' }, { keys: ['D'] }])
if (AflowDirect.finished) ok('A-FLOW-DIRECT', 'A 直接答 √8 也可进入选择并完成')
else bad('A-FLOW-DIRECT', JSON.stringify(AflowDirect))

/* ---------- 2. B negation ---------- */
console.log('\n== B 否定式判分 ==')
for (const [sid, t, expect] of [
  ['B.s1', '垂直', 'correct'],
  ['B.s1', '⊥', 'correct'],
  ['B.s1', '不垂直', 'wrong'],
  ['B.s1', 'AD 与 BC 不垂直', 'wrong'],
  ['B.s1', '不⊥', 'wrong'],
  ['B.s1', '不是垂直', 'wrong'],
  ['B.s1', '并非垂直', 'wrong'],
  ['B.s2', '垂直于底面', 'correct'],
  ['B.s2', '不垂直于底面', 'wrong'],
  ['B.s2', '不⊥', 'wrong'],
  ['B.s2', '不是垂直的', 'wrong'],
]) {
  const r = matchTextStep(step(sid), t)
  const kind = r ? r.kind : 'unmatched'
  if (kind === expect) ok(`B-NEG-${sid}`, `${t} -> ${kind}`)
  else bad(`B-NEG-${sid}`, `${t} -> ${kind} (expect ${expect})`)
}

/* ---------- 3. variants ---------- */
console.log('\n== 变式判分（原双向子串误判点） ==')
const variantProbes = [
  ['B-v1', '不成立', true], ['B-v1', '成立', false], ['B-v1', '错', true],
  ['B-v2', '成立', true], ['B-v2', '不成立', false], ['B-v2', '对', true],
  ['A-v1', '√3', true], ['A-v1', '1.732', true], ['A-v1', '1.7320', true],
  ['A-v1', '3', false], ['A-v1', '1.7', false],
  ['C-v2', '369/125', true], ['C-v2', '2.952', true], ['C-v2', '2.95', true],
  ['C-v2', '125', false], ['C-v2', '369', false], ['C-v2', '2.9', false],
  ['C-v1', '3', true], ['C-v1', '2.44', false], ['C-v1', '61/25', false],
]
for (const [vid, input, expect] of variantProbes) {
  let v = null
  for (const cs of guidanceCases) v = v || cs.variants.find((x) => x.id === vid)
  const got = variantMatches(v, input)
  if (got === expect) ok(`VAR-${vid}`, `${input} -> ${got}`)
  else bad(`VAR-${vid}`, `${input} -> ${got} (expect ${expect})`)
}
for (const [vid, input] of [['B-v1', '不成立。'], ['B-v2', '成立。'], ['A-v1', '√3。']]) {
  let v = null
  for (const cs of guidanceCases) v = v || cs.variants.find((x) => x.id === vid)
  const got = variantMatches(v, input)
  if (got) ok(`VAR-PUNC-${vid}`, `${input} -> ${got}`)
  else risk(`VAR-PUNC-${vid}`, `${input} -> false（严格等值后中文句号导致误判；建议归一化时去掉句末标点）`)
}
let vA1 = null
for (const cs of guidanceCases) vA1 = vA1 || cs.variants.find((x) => x.id === 'A-v1')
if (!variantMatches(vA1, '1.7321')) risk('VAR-A-v1-ROUND', '1.7321 -> false（√3 四位近似未收录；可加 ±5e-4 容差或补 accepts）')

/* ---------- 4. C s3 / s4 ---------- */
console.log('\n== C 补事件与主线 ==')
for (const [t, expect] of [
  ['1-64/125', 'correct'], ['1−64/125', 'correct'], ['1 - 64/125', 'correct'],
  ['64/125', 'partial'], ['61/125', 'correct'], ['0.488', 'correct'],
]) {
  const r = matchTextStep(c('C').steps.find((s) => s.id === 's3'), t)
  const kind = r ? r.kind : 'unmatched'
  if (kind === expect) ok('C-S3', `${t} -> ${kind}`)
  else bad('C-S3', `${t} -> ${kind} (expect ${expect})`)
}
const Cflow = simulate('C', [{ text: '2' }, { text: '64/125' }, { text: '1-64/125' }, { text: '61/25' }])
if (Cflow.finished) ok('C-FLOW', 'C 主线完成')
else bad('C-FLOW', JSON.stringify(Cflow))
for (const t of ['69/25', '2.4']) {
  const r = matchTextStep(c('C').steps.find((s) => s.id === 's4'), t)
  risk('C-S4-COVER', `答 ${t} -> ${r ? r.kind : 'unmatched'}（基准典型错答 69/25 仍无专门分支）`)
}
const Bflow = simulate('B', [{ text: '垂直' }, { text: '垂直' }, { keys: ['B'] }, { keys: ['B', 'D'] }])
if (Bflow.finished) ok('B-FLOW', 'B 主线完成：垂直→垂直→B→BD')
else bad('B-FLOW', JSON.stringify(Bflow))
const Bpartial = simulate('B', [{ text: '垂直' }, { text: '垂直' }, { keys: ['B'] }, { keys: ['B'] }])
if (!Bpartial.finished) ok('B-PARTIAL-FLOW', '只选 B 不结束（部分正确保持）')
else bad('B-PARTIAL-FLOW', '只选 B 提前结束')

/* ---------- 5. practice re-run ---------- */
console.log('\n== practice 容差与文本 ==')
const byId = (id) => practiceItems.find((x) => x.id === id)
for (const [id, t] of [['C-orig', '2.43'], ['C-orig', '2.45'], ['A-v2', '2.22'], ['A-v2', '2.26'], ['C-v2', '2.97'], ['C-v1', '3.01']]) {
  const r = judgePracticeItem(byId(id), { text: t })
  if (r.status === 'correct') bad(`PRAC-TOL-${id}`, `${t} 仍被判 correct`)
  else ok(`PRAC-TOL-${id}`, `${t} -> ${r.status}`)
}
const c2 = byId('C-v2')
const r64 = judgePracticeItem(c2, { text: '64/625' })
if (r64.feedback.join('').includes('256}{625') || r64.feedback.join('').includes('256/625')) ok('PRAC-CV2-TEXT', '64/625 错因已改为 256/625 正确说明')
else bad('PRAC-CV2-TEXT', r64.feedback.join(' / '))
const bv2 = byId('B-v2')
if (/\$y\$ 分量/.test(bv2.solution) && /\\lambda=1/.test(bv2.solution)) ok('PRAC-BV2-TEXT', 'B-v2 平行矛盾已改为 y 分量/λ 矛盾')
else bad('PRAC-BV2-TEXT', bv2.solution.slice(0, 300))
for (const [id, t] of [['C-orig', '61/25'], ['C-orig', '2.44'], ['A-v2', '√5'], ['B-orig', 'BD'], ['B-v2', 'C'], ['C-v2', '369/125'], ['C-v1', '3']]) {
  const r = judgePracticeItem(byId(id), id.startsWith('B') ? { keys: t.split('') } : { text: t })
  if (r.status === 'correct') ok(`PRAC-COR-${id}`, `${t} -> correct`)
  else bad(`PRAC-COR-${id}`, `${t} -> ${r.status}`)
}

/* ---------- 6. submissions / courseware / research / labels / docs ---------- */
console.log('\n== 其他 P1/P2 文案 ==')
const subB = submissions.find((x) => x.id === 'sub-B')
if (subB.systemScore === 1) ok('SUB-B-SCORE', 'sub-B 建议分=1（原 2）')
else bad('SUB-B-SCORE', `sub-B 建议分=${subB.systemScore}`)
const rubricSum = subB.rubric.reduce((a, r) => a + r.points, 0)
const hasAware = subB.rubric.some((r) => /有放回|重复/.test(r.item))
if (hasAware || rubricSum !== 5) ok('SUB-B-RUBRIC', '细则是 1+2+2 不变，但已调整建议分与评语')
else risk('SUB-B-RUBRIC', 'sub-B 细则仍为 1+2+2=5 且不含“有放回/重复意识”分项，建议分 1 仍不能由细则重算（评语自造了口径）')
const hostManual = readFileSync('主持人手册.md', 'utf8')
if (/系统建议 2 分/.test(hostManual)) risk('DOC-HOST-MANUAL', '主持人手册.md:66 仍写“系统建议 2 分”，与 submissions.js 的 1 分不一致')
const gradingReport = readFileSync('qa/teacher-grading/REPORT.md', 'utf8')
if (/系统建议 2\/5/.test(gradingReport)) risk('DOC-GRADING-REPORT', 'qa/teacher-grading/REPORT.md 仍记录“系统建议 2/5”，需随验收记录更新')
const quad = coursewareDecks.find((d) => d.id === 'deck-quadratic')
const qs3 = quad.slides.find((s) => s.id === 's3')
if (!/2x²\s*\+\s*8x\s*\+\s*5/.test(qs3.lead) && !/2\(x\+2\)²/.test(qs3.lead)) ok('CW-QUAD-S3', '二次函数 s3 导语已去硬编码例题')
else bad('CW-QUAD-S3', qs3.lead)
const ellipse = coursewareDecks.find((d) => d.id === 'deck-ellipse')
const es5 = ellipse.slides.find((s) => s.id === 's5')
if (/a=5/.test(es5.lead) || /a=5/.test(es5.equation || '')) risk('CW-ELLIPSE-S5', `椭圆 s5 仍写死 a=5、b=3：${es5.lead.slice(0, 50)}…`)
else ok('CW-ELLIPSE-S5', '椭圆 s5 已参数中立')
const researchSrc = readFileSync('src/data/research.js', 'utf8')
if (/比值列 e_h\/h/.test(researchSrc) && !/第四列/.test(researchSrc)) ok('RS-COLS', 'research 表注已改为“比值列”，无“第四列”')
else risk('RS-COLS', 'research 表注仍需检查')
for (const cs of guidanceCases) if (/高考/.test(cs.sourceLabel)) bad('LABEL', `${cs.id} sourceLabel 仍含"高考"`)
if (!guidanceCases.some((cs) => /高考/.test(cs.sourceLabel))) ok('LABEL', '三题 sourceLabel 已改“演示题库原题”')
const bS3D = c('B').steps.find((s) => s.id === 's3').accept.find((r) => r.keys?.join('') === 'D')
if (bS3D?.reply.join('').includes('可能也成立')) risk('B-S3-WORD', 'B s3 对 D 仍写"D 项可能也成立"（D 实为确凿成立）')
if (/对照选项 D/.test(s4.hint)) risk('A-HINT-LEAK', 'A s4 “给个提示”仍直接给出 e=2√2 与选项 D')

/* ---------- summary ---------- */
console.log('\n== RECHECK SUMMARY ==')
const fails = results.filter((r) => r[0] === 'FAIL')
const risks = results.filter((r) => r[0] === 'RISK')
const passes = results.filter((r) => r[0] === 'OK')
console.log(`checks=${passes.length + fails.length} pass=${passes.length} fail=${fails.length} risk=${risks.length}`)
for (const f of fails) console.log(f[0], f[1], '|', f[2])
console.log('--- RISK ---')
for (const r of risks) console.log(r[0], r[1], '|', r[2])
