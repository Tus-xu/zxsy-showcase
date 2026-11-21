// KaTeX-validate every inline math segment ($...$) in the reviewed data files.
import katex from 'katex'
import { guidanceCases } from './guidance.data.mjs'
import { practiceGroups } from './practice.data.mjs'
import { coursewareDecks, lessonPlans, blueprints } from './courseware.data.mjs'
import { submissions } from './submissions.data.mjs'

const bad = []
let count = 0
function checkString(s, where) {
  if (typeof s !== 'string') return
  const re = /\$\$([\s\S]*?)\$\$|\$([^$]+)\$/g
  let m
  while ((m = re.exec(s))) {
    const tex = m[1] !== undefined ? m[1] : m[2]
    count++
    try {
      katex.renderToString(tex, { throwOnError: true, displayMode: m[1] !== undefined, strict: false })
    } catch (e) {
      bad.push([where, tex, e.message.slice(0, 120)])
    }
  }
}
function walk(v, where, seen = new Set()) {
  if (typeof v === 'string') return checkString(v, where)
  if (v && typeof v === 'object') {
    if (seen.has(v)) return
    seen.add(v)
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${where}[${i}]`, seen))
    else for (const [k, x] of Object.entries(v)) walk(x, `${where}.${k}`, seen)
  }
}

walk(guidanceCases, 'guidance')
walk(practiceGroups, 'practice')
walk(coursewareDecks, 'courseware.decks')
walk(lessonPlans, 'courseware.lessonPlans')
walk(blueprints, 'courseware.blueprints')
walk(submissions, 'submissions')
console.log(`checked ${count} inline math segments; errors=${bad.length}`)
for (const [w, t, e] of bad) console.log('ERR', w, '|', t, '|', e)
