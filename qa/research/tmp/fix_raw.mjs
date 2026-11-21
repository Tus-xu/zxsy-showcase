/** 修正 research.js 中 String.raw 模板内被误写成双反斜杠的 LaTeX 源码。 */
import { readFileSync, writeFileSync } from 'node:fs'

const p = 'D:/zxsy-math-arena-showcase/src/data/research.js'
let src = readFileSync(p, 'utf8')
let changed = 0
src = src.replace(/String\.raw`[^`]*`/g, (m) => {
  const fixed = m.replace(/\\\\/g, '\\')
  if (fixed !== m) changed++
  return fixed
})
writeFileSync(p, src, 'utf8')
console.log('normalized String.raw blocks:', changed)
