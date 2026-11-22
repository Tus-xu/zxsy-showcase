import { FIXTURES } from './fixtures.js'
const roles = Object.fromEntries(Object.entries(FIXTURES).map(([r, m]) => [r, Object.keys(m).length]))
console.log('counts:', JSON.stringify(roles))
const s = FIXTURES.student || {}
const run03 = Object.keys(s).filter(k => k.includes('limit=30'))
console.log('limit=30 keys:', run03.length, run03.slice(0, 3))

