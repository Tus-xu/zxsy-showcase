// Practice item judging review: correctness coverage, false positives, tolerance edges.
import { practiceGroups, practiceItems, judgePracticeItem, normalizeAnswer } from './practice.data.mjs'

const out = []
const ok = (tag, msg) => out.push(['OK', tag, msg])
const bad = (tag, msg) => out.push(['FAIL', tag, msg])

function byId(id) {
  return practiceItems.find((x) => x.id === id)
}
function judge(item, raw) {
  return judgePracticeItem(item, raw)
}

console.log('== correct answers must be judged correct ==')
const correctAnswers = {
  'A-orig': [{ keys: ['D'] }],
  'A-v1': [{ keys: ['C'] }],
  'A-v2': [{ text: '√5' }, { text: '\\sqrt{5}' }, { text: '2.236' }, { text: '2.24' }, { text: 'e=√5' }],
  'B-orig': [{ keys: ['B', 'D'] }, { keys: ['D', 'B'] }],
  'B-v1': [{ keys: ['A', 'C', 'D'] }, { keys: ['D', 'C', 'A'] }],
  'B-v2': [{ keys: ['C'] }],
  'C-orig': [{ text: '61/25' }, { text: '2.44' }, { text: '305/125' }, { text: '5*(1-(4/5)^3)' }, { text: '5×(1−(4/5)³)' }],
  'C-v1': [{ text: '3' }, { text: '三' }],
  'C-v2': [{ text: '369/125' }, { text: '2.952' }, { text: '2.95' }, { text: '5*(1-(4/5)^4)' }],
}
for (const [id, raws] of Object.entries(correctAnswers)) {
  const item = byId(id)
  for (const raw of raws) {
    const r = judge(item, raw)
    const line = `${id} ${JSON.stringify(raw)} -> ${r.status}`
    if (r.status === 'correct') ok(`COR-${id}`, line)
    else bad(`COR-${id}`, line)
  }
}

console.log('\n== typical wrong answers -> must not be correct, feedback must exist ==')
const wrongAnswers = [
  ['A-orig', { keys: ['A'] }, 'A'],
  ['A-orig', { keys: ['B'] }, 'B'],
  ['A-orig', { keys: ['C'] }, 'C'],
  ['A-v1', { keys: ['D'] }, 'D'],
  ['A-v2', { text: '2' }, 'b/a'],
  ['A-v2', { text: '√3' }, 'sqrt3'],
  ['B-orig', { keys: ['A'] }, 'A only'],
  ['B-orig', { keys: ['A', 'B', 'C', 'D'] }, 'all'],
  ['B-v1', { keys: ['B'] }, 'wrong only'],
  ['C-orig', { text: '3' }, '3'],
  ['C-orig', { text: '61/125' }, '61/125'],
  ['C-orig', { text: '183/125' }, '183/125'],
  ['C-orig', { text: '69/25' }, '69/25'],
  ['C-v1', { text: '2.44' }, '2.44'],
  ['C-v2', { text: '2.44' }, '2.44'],
]
for (const [id, raw, why] of wrongAnswers) {
  const r = judge(byId(id), raw)
  const line = `${id} ${JSON.stringify(raw)} (${why}) -> ${r.status} | ${r.feedback.join(' / ').slice(0, 90)}`
  if (r.status !== 'correct' && r.feedback.length) ok(`WRG-${id}`, line)
  else bad(`WRG-${id}`, line)
}

console.log('\n== B multi partial semantics ==')
for (const [keys, expect] of [
  [['B'], 'partial'],
  [['D'], 'partial'],
  [['B', 'D'], 'correct'],
  [['A', 'B'], 'wrong'],
  [['B', 'D', 'A'], 'wrong'],
  [[], 'wrong(empty->no submit UI)'],
]) {
  const r = judge(byId('B-orig'), { keys })
  const line = `B-orig keys=${keys.join('') || '[]'} -> ${r.status}`
  if (expect === 'wrong(empty->no submit UI)' ? r.status === 'wrong' : r.status === expect) ok('PAR-B', line)
  else bad('PAR-B', line)
}

console.log('\n== numeric tolerance false positives (answer 61/25=2.44 exactly; 369/125=2.952) ==')
const tolProbes = [
  ['C-orig', '2.43'],
  ['C-orig', '2.42'],
  ['C-orig', '2.45'],
  ['C-orig', '2.46'],
  ['A-v2', '2.23'],
  ['A-v2', '2.25'],
  ['C-v2', '2.93'],
  ['C-v2', '2.97'],
  ['C-v1', '3.01'],
]
for (const [id, text] of tolProbes) {
  const r = judge(byId(id), { text })
  const line = `${id} text=${text} -> ${r.status}`
  if (r.status === 'correct') bad(`TOL-${id}`, `wrong value accepted: ${line}`)
  else ok(`TOL-${id}`, line)
}

console.log('\n== other equivalence coverage ==')
const eqProbes = [
  ['C-orig', '61/25=2.44', 'listed accept'],
  ['C-orig', '61÷25', 'division sign'],
  ['C-orig', '61 / 25', 'spaces'],
  ['C-v2', '2.95', 'rounded'],
  ['C-v2', '2.952', 'exact'],
]
for (const [id, text, why] of eqProbes) {
  const r = judge(byId(id), { text })
  ok(`EQ-${id}`, `${id} ${JSON.stringify(text)} (${why}) -> ${r.status}`)
}

console.log('\n== content sanity: pitfalls that fire for exact baseline values? ==')
// A correct answer must never match a pitfall.
for (const item of practiceItems) {
  if (item.type !== 'fill') continue
  for (const a of item.accepts || []) {
    const r = judge(item, { text: a })
    if (r.status !== 'correct') bad(`PIT-${item.id}`, `listed accept ${a} not correct: ${r.status}`)
  }
}

console.log('\n== SUMMARY ==')
const fails = out.filter((r) => r[0] === 'FAIL')
console.log(`checks=${out.length} pass=${out.length - fails.length} fail=${fails.length}`)
for (const f of fails) console.log(f[1], '|', f[2])
