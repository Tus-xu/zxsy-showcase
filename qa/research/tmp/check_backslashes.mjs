import { readFileSync } from 'node:fs'
const p = 'D:/zxsy-math-arena-showcase/src/data/research.js'
const lines = readFileSync(p, 'utf8').split('\n')
let count3 = 0
lines.forEach((line, i) => {
  const runs = [...line.matchAll(/\\{2,}/g)].map((m) => m[0].length)
  if (runs.some((r) => r >= 3)) {
    count3++
    if (count3 <= 40) console.log(i + 1, 'runs=', runs.join(','), JSON.stringify(line.slice(0, 150)))
  }
})
console.log('lines with runs>=3:', count3, 'total lines:', lines.length)
const runsAll = {}
for (const line of lines) for (const m of line.matchAll(/\\+/g)) runsAll[m[0].length] = (runsAll[m[0].length] || 0) + 1
console.log('run length histogram:', runsAll)
