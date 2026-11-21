// Guidance review tests: acceptance coverage + false positives/negatives for the A/B/C scripts.
import { guidanceCases } from './guidance.data.mjs'
import { matchTextStep, submitChoice, checkVariant, normalize } from './judge.mjs'

const out = []
const ok = (tag, msg) => out.push(['OK', tag, msg])
const bad = (tag, msg, extra) => out.push(['FAIL', tag, msg, extra])

function stepOf(c, id) {
  return c.steps.find((s) => s.id === id)
}

// 1. Text-step acceptance coverage: correct answers must be accepted (kind=correct),
//    and baseline equivalent answers that a student plausibly types.
const correctTexts = {
  A: {
    s1: ['2b=√7·2a', '2b=√7×2a', '2b=2√7a', 'b/a=√7', 'b=√7a', '2b=√7*2a', 'b/a=√7'],
    s2: ['c²=a²+b²', 'c^2=a^2+b^2', 'a²+b²=c²', 'c²=b²+a²'],
    s3: ['8', 'e²=8', '1+7=8', '8'],
  },
  B: {
    s1: ['垂直', 'AD⊥BC', '垂直（AD 是中线也是高）'],
    s2: ['垂直', '垂直于底面', '⊥底面'],
  },
  C: {
    s1: ['2', 'X=2'],
    s2: ['64/125', '(4/5)^3', '0.512', '(4/5)³'],
    s3: ['61/125', '1-64/125', '0.488'],
    s4: ['61/25', '2.44', '305/125', '5×(1−(4/5)³)'],
  },
}

console.log('== A/B/C text-step coverage (expected correct inputs) ==')
for (const c of guidanceCases) {
  const cases = correctTexts[c.id] || {}
  for (const [sid, texts] of Object.entries(cases)) {
    const step = stepOf(c, sid)
    for (const t of texts) {
      const r = matchTextStep(step, t)
      const kind = r ? r.kind : 'unmatched'
      const line = `${c.id}.${sid}  input=${JSON.stringify(t)} -> ${kind}`
      if (kind === 'correct') ok(`A/B/C-${c.id}-${sid}`, line)
      else bad(`A/B/C-${c.id}-${sid}`, line)
    }
  }
}

// 2. Baseline equivalents for final answers (must be accepted where the step asks final value).
const finalEquivalents = {
  C: { s4: ['61/25', '2.44', '305/125', '5*(1-(4/5)^3)'] },
}
for (const c of guidanceCases) {
  for (const [sid, texts] of Object.entries(finalEquivalents[c.id] || {})) {
    const step = stepOf(c, sid)
    for (const t of texts) {
      const r = matchTextStep(step, t)
      if (!r || r.kind !== 'correct') bad(`EQUIV-${c.id}-${sid}`, `baseline equivalent not accepted: ${JSON.stringify(t)} -> ${r ? r.kind : 'unmatched'}`)
      else ok(`EQUIV-${c.id}-${sid}`, `accepted ${JSON.stringify(t)}`)
    }
  }
}

// 3. Negation / false-positive probes on text steps.
const negProbes = [
  ['B', 's1', '不垂直'],
  ['B', 's1', 'AD 与 BC 不垂直'],
  ['B', 's2', '这条线不垂直于底面'],
  ['B', 's2', '不垂直'],
  ['A', 's2', 'c²=a²-b²'],
  ['A', 's2', 'c²=a²−b²'],
  ['C', 's2', '(1/5)^3'],
  ['C', 's3', '64/125'],
  ['C', 's4', '2.4'],
  ['C', 's4', '3'],
  ['C', 's4', '61/125'],
  ['C', 's4', '183/125'],
  ['C', 's4', '69/25'],
  ['A', 's1', '我选 C，因为比值就是 √7'],
]
console.log('\n== text-step false-positive probes (expected: NOT correct) ==')
for (const [cid, sid, t] of negProbes) {
  const c = guidanceCases.find((x) => x.id === cid)
  const step = stepOf(c, sid)
  const r = matchTextStep(step, t)
  const kind = r ? r.kind : 'unmatched'
  const line = `${cid}.${sid} input=${JSON.stringify(t)} -> ${kind}`
  if (kind === 'correct') bad(`NEG-${cid}-${sid}`, `wrong input judged correct: ${line}`)
  else ok(`NEG-${cid}-${sid}`, line)
}

// 4. Choice steps: correct set + partial + plausible wrong combinations.
const choiceProbes = [
  ['A', 's4', ['D'], 'correct'],
  ['A', 's4', ['C'], 'wrong'],
  ['A', 's4', ['A'], 'wrong'],
  ['A', 's4', ['B'], 'wrong'],
  ['B', 's3', ['B'], 'correct'],
  ['B', 's3', ['D'], 'wrong'], // D is mathematically true but not the criterion answer
  ['B', 's4', ['B', 'D'], 'correct'],
  ['B', 's4', ['B'], 'partial'],
  ['B', 's4', ['D'], 'partial'],
  ['B', 's4', ['A', 'B', 'C', 'D'], 'wrong'],
  ['B', 's4', ['A', 'D'], 'wrong'],
  ['B', 's4', ['A', 'B', 'D'], 'wrong'],
  ['B', 's4', ['B', 'C'], 'wrong'],
]
console.log('\n== choice-step probes ==')
for (const [cid, sid, keys, expect] of choiceProbes) {
  const c = guidanceCases.find((x) => x.id === cid)
  const step = stepOf(c, sid)
  const r = submitChoice(step, keys)
  const kind = r ? r.kind : 'NO-RULE(generic wrong reply)'
  const line = `${cid}.${sid} keys=${keys.join('')} -> ${kind}`
  if (expect === kind || (expect === 'wrong' && kind === 'NO-RULE(generic wrong reply)')) ok(`CH-${cid}-${sid}`, line)
  else bad(`CH-${cid}-${sid}`, line)
}

// 5. Guidance variants (GuideView.checkVariant logic).
console.log('\n== guidance variants: answer vs adversarial opposite ==')
const variantProbes = []
for (const c of guidanceCases) {
  for (const v of c.variants) {
    if (v.type === 'single') {
      variantProbes.push([v.id, v.answer, true])
      for (const o of v.options || []) if (o.key !== v.answer) variantProbes.push([v.id, o.key, false])
    } else {
      for (const a of v.accepts || []) variantProbes.push([v.id, a, true])
    }
  }
}
// adversarial probes specific to B fill variants (成立 / 不成立 opposition)
variantProbes.push(['B-v1', '成立', false])
variantProbes.push(['B-v2', '不成立', false])
variantProbes.push(['A-v1', '3', false])
variantProbes.push(['A-v1', '1.7', false])
variantProbes.push(['C-v2', '125', false])
variantProbes.push(['C-v2', '369', false])
variantProbes.push(['C-v2', '2.9', false])
variantProbes.push(['C-v1', '2.44', false])
variantProbes.push(['C-v1', '61/25', false])
for (const [vid, input, expectCorrect] of variantProbes) {
  let v = null
  for (const c of guidanceCases) v = v || c.variants.find((x) => x.id === vid)
  const got = checkVariant(v, input)
  const line = `${vid} input=${JSON.stringify(input)} -> ${got ? 'correct' : 'wrong'} (expected ${expectCorrect ? 'correct' : 'wrong'})`
  if (got === expectCorrect) ok(`VAR-${vid}`, line)
  else bad(`VAR-${vid}`, line)
}

console.log('\n== SUMMARY ==')
const fails = out.filter((r) => r[0] === 'FAIL')
console.log(`checks=${out.length} pass=${out.length - fails.length} fail=${fails.length}`)
for (const f of fails) console.log(f[1], '|', f[2], f[3] ? `| ${f[3]}` : '')
