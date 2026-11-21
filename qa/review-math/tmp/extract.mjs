// Extract reviewable data modules from product sources without modifying them.
// PNG imports are replaced by string stubs so Node can import the data.
import { readFileSync, writeFileSync } from 'node:fs'

const ROOT = 'D:/zxsy-math-arena-showcase'

function extract(srcFile, outFile, exportNames) {
  let src = readFileSync(`${ROOT}/${srcFile}`, 'utf8')
  src = src.replace(/^import\s+(\w+)\s+from\s+'\.\.\/assets\/[^']+'\s*$/gm, "const $1 = ''")
  if (!exportNames.every((n) => src.includes(`export function ${n}`) || src.includes(`export const ${n}`))) {
    throw new Error(`missing export in ${srcFile}`)
  }
  writeFileSync(`${ROOT}/qa/review-math/tmp/${outFile}`, src, 'utf8')
  return src
}

extract('src/data/guidance.js', 'guidance.data.mjs', ['guidanceCases', 'findGuidanceCase'])
extract('src/data/practice.js', 'practice.data.mjs', [
  'practiceGroups',
  'practiceItems',
  'judgePracticeItem',
  'normalizeAnswer',
  'findPracticeGroup',
  'findPracticeItem',
])
extract('src/data/courseware.js', 'courseware.data.mjs', ['coursewareDecks', 'lessonPlans', 'blueprints'])
extract('src/data/submissions.js', 'submissions.data.mjs', ['submissions'])
console.log('extracted ok')
