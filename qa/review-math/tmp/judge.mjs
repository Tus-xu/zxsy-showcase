// Faithful re-implementation of GuideView.vue judging code paths (recheck round).
// Source: src/ends/student/GuideView.vue @ 2026-11-21 03:55 (normalize/variantMatches/
// matchTextStep/handleRule/submitChoice). Keep in sync if product changes.

export function normalize(s) {
  return String(s)
    .toLowerCase()
    .replace(/[\uFF21-\uFF3A\uFF41-\uFF5A\uFF10-\uFF19]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[\s\u3000]/g, '')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/[−–—]/g, '-')
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/[，]/g, ',')
    .replace(/[。]/g, '.')
}

function numValue(norm) {
  if (/^-?\d+(\.\d+)?$/.test(norm)) return Number(norm)
  const m = norm.match(/^(-?\d+)\/(\d+)$/)
  if (m && Number(m[2]) !== 0) return Number(m[1]) / Number(m[2])
  return null
}

export function variantMatches(v, input) {
  const norm = normalize(input)
  const list = []
  for (const a of v.accepts || []) list.push(normalize(a))
  if (v.answer != null) list.push(normalize(String(v.answer)))
  if (v.answerDisplay != null) list.push(normalize(String(v.answerDisplay)))
  if (list.some((a) => a === norm)) return true
  const val = numValue(norm)
  if (val !== null) {
    for (const a of list) {
      const av = numValue(a)
      if (av !== null && Math.abs(av - val) <= 1e-9) return true
    }
  }
  return false
}

export function matchTextStep(step, text) {
  const n = normalize(text)
  for (const rule of step.accept || []) {
    if (rule.regex && new RegExp(rule.regex, 'i').test(n)) return rule
  }
  for (const rule of step.partial || []) {
    if (rule.regex && new RegExp(rule.regex, 'i').test(n)) return { ...rule, kind: 'partial' }
  }
  return null
}

// GuideView.submitChoice: exact sorted-key-set equality against accept rules in order.
export function submitChoice(step, keys) {
  const sorted = keys.slice().sort()
  for (const rule of step.accept || []) {
    if (rule.keys && String(rule.keys.slice().sort()) === String(sorted)) return rule
  }
  return null
}

// GuideView.handleRule (correct branch) + submitText, modelled as a state machine.
// Returns { kind, stay, nextStepIndex, finished }.
export function applyTextRule(rules, stepIndex, steps, text) {
  const step = steps[stepIndex]
  const rule = matchTextStep(step, text)
  if (!rule) return { kind: 'unmatched', stay: true, stepIndex, finished: false }
  if (rule.kind === 'partial') return { kind: 'partial', stay: true, stepIndex, finished: false }
  if (rule.kind === 'wrong') {
    if (rule.next) {
      const idx = steps.findIndex((s) => s.id === rule.next)
      return { kind: 'wrong', stay: false, stepIndex: idx >= 0 ? idx : stepIndex, finished: false }
    }
    return { kind: 'wrong', stay: true, stepIndex, finished: false }
  }
  // correct
  if (rule.stay) return { kind: 'correct', stay: true, stepIndex, finished: false }
  if (rule.next === 'final') return { kind: 'correct', stay: false, stepIndex, finished: true }
  if (rule.next) {
    const idx = steps.findIndex((s) => s.id === rule.next)
    return { kind: 'correct', stay: false, stepIndex: idx >= 0 ? idx : stepIndex, finished: false }
  }
  // advance() -> stepIndex + 1
  const nextIndex = stepIndex + 1
  if (nextIndex >= steps.length) return { kind: 'correct', stay: false, stepIndex: nextIndex, finished: true }
  return { kind: 'correct', stay: false, stepIndex: nextIndex, finished: false }
}

export function applyChoiceRule(steps, stepIndex, keys) {
  const step = steps[stepIndex]
  const rule = submitChoice(step, keys)
  if (!rule) return { kind: 'no-rule', stepIndex, finished: false }
  if (rule.kind === 'correct') {
    if (rule.next === 'final') return { kind: 'correct', stepIndex, finished: true }
    if (rule.next) {
      const idx = steps.findIndex((s) => s.id === rule.next)
      return { kind: 'correct', stepIndex: idx >= 0 ? idx : stepIndex, finished: false }
    }
    return { kind: 'correct', stepIndex: stepIndex + 1, finished: false }
  }
  return { kind: rule.kind, stepIndex, finished: false }
}
