// V4 运行证据采集（清场演练员 ask ④）：真实登录 → 发题 → 逐轮观察/作答 →
// 里程碑截图与 DOM 断言。观察驱动（真实 LLM 链路不可预测），全量记录不伪造。
// 输出：docs/design/student-guided-solving-v4/evidence/
import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const base = process.env.BASE || 'http://127.0.0.1:5176'
const OUT = 'D:/zxsy-math-arena/docs/design/student-guided-solving-v4/evidence'
fs.mkdirSync(OUT, { recursive: true })
const log = []
const shots = []
function rec(kind, data) {
  const e = { t: new Date().toISOString(), kind, ...data }
  log.push(e)
  console.log(`[${kind}]`, JSON.stringify(data).slice(0, 300))
}
async function shot(page, name) {
  const p = path.join(OUT, `${name}.png`)
  await page.screenshot({ path: p, fullPage: false })
  shots.push(`${name}.png`)
  rec('shot', { name })
}

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1500, height: 980 }, locale: 'zh-CN' })
const page = await ctx.newPage()
page.setDefaultTimeout(45000)
const consoleErrors = []
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 160)) })

// ---------- 登录 ----------
await page.goto(`${base}/login`, { waitUntil: 'networkidle' })
await page.locator('#preferred-role').selectOption('student')
await page.getByRole('tab', { name: '密码登录' }).click()
await page.locator('input.input[placeholder="请输入中国大陆手机号"]').fill('13800001001')
await page.locator('#auth-password').fill('MathArenaDemo2026!')
await page.getByRole('button', { name: /安全登录/ }).click()
await page.waitForURL((u) => !String(u).includes('/login'), { timeout: 30000 })
rec('login', { ok: true })

// ---------- 发题 ----------
await page.goto(`${base}/dialog`, { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
// 题干内嵌 KP 标准名（「导数的概念」⊆ knowledge_points DR-01「导数的概念与运算」，
// _resolve_kp_code 的 DB.name.contains(LLM名) 归一即可命中）→ steps[].kp_code=DR-01 →
// 前置边 EL-02/HS-02/TG-03 齐备 → T6 _try_start_detour 可启动（此前 kp_code 缺失使
// KG 溯源结构性不可用，见本轮运行发现）。
const q = '【导数的概念】利用导数的定义，求 f(x)=x² 在 x=1 处的瞬时变化率。'
const t0 = Date.now()
await page.locator('.ci-ta').fill(q)
await page.locator('.ci-send').click()
rec('question-sent', { q, t0 })
const firstIx = page.locator('.soc-ix[data-soc-ix-form]').last()
await firstIx.waitFor({ timeout: 60000 })
const delayMs = Date.now() - t0
rec('first-interaction-card', { delayMs })
await page.waitForTimeout(800)
await shot(page, 'v4-opening-first-card')

// ---------- 观察器 ----------
async function observe() {
  return page.evaluate(() => {
    const ixs = [...document.querySelectorAll('.soc-ix')]
    const live = ixs.filter((e) => !e.classList.contains('used'))
    const cur = live[live.length - 1] || null
    const detours = [...document.querySelectorAll('.soc-detour')]
    const det = detours[detours.length - 1] || null
    const cites = det ? [...det.querySelectorAll('.soc-cite-badge')].map((b) => b.textContent.trim()) : []
    const quotes = det ? [...det.querySelectorAll('.soc-cite-quote')].map((b) => b.textContent.trim()) : []
    const fills = [...document.querySelectorAll('.sp-fill')]
    const fillsCls = fills.slice(-2).map((f) => f.className)
    const phases = [...document.querySelectorAll('.sp-phase')].map((e) => e.textContent.trim())
    const concept = [...document.querySelectorAll('[data-soc-concept-card]')].length
    const tierShifts = [...document.querySelectorAll('.soc-tier-shift')].map((e) => e.textContent.trim().slice(0, 80))
    const errs = [...document.querySelectorAll('.soc-err')].length
    let bj = null
    if (cur && cur.dataset.socIxForm === 'binary') {
      bj = {
        question: (cur.querySelector('.ix-bj-q') || {}).textContent?.trim() || '',
        options: [...cur.querySelectorAll('.ix-bj-opt')].map((o) => ({
          id: o.dataset.sbjOption, label: o.textContent.trim().slice(0, 40),
        })),
        hasTextInput: !!cur.querySelector('textarea, input[type="text"]'),
      }
    }
    const skipBtn = cur ? (cur.querySelector('.si-skip') || {}).textContent?.trim() || '' : ''
    return {
      liveCount: live.length,
      totalIx: ixs.length,
      form: cur ? cur.dataset.socIxForm : null,
      phase: phases[phases.length - 1] || '',
      skipLabel: skipBtn,
      isLastResort: cur ? cur.classList.contains('is-last-resort') || !!cur.querySelector('[data-soc-ix-last-resort]') : false,
      lastResortText: cur ? (cur.querySelector('[data-soc-ix-last-resort]') || {}).textContent?.trim() || '' : '',
      hintText: cur ? (cur.querySelector('[data-soc-ix-hint]') || {}).textContent?.trim() || '' : '',
      routingReason: cur ? (cur.getAttribute('title') || '') : '',
      detourCount: detours.length,
      detourText: det ? det.textContent.replace(/\s+/g, ' ').slice(0, 400) : '',
      citations: cites, quotes,
      conceptCards: concept,
      tierShifts, errCards: errs,
      lastFillCls: fillsCls,
      binary: bj,
      bodyTail: document.querySelector('.dialog-messages')?.textContent?.replace(/\s+/g, ' ').slice(-600) || '',
    }
  })
}

// ---------- 作答分派 ----------
let round = 0
let annotateAttempts = 0
async function answer(o) {
  const card = page.locator('.soc-ix:not(.used)').last()
  const form = await card.getAttribute('data-soc-ix-form')
  rec('answer-begin', { form, phase: o.phase, round })
  try {
    // 策略（依据 main.py 判定链实证）：
    // · reading act1 annotate → 启发式选数学 token（F1≥0.5 即 partial→幕推进）
    // · act2 restate / planning → wrong 不惩罚直通 guiding（_on_planning_interact 尾分支）
    // · guiding 主环 → 乱拼/点错攒 stall（record_stall per-step；≥2 → T6 KG 微补救）
    if (form === 'binary') {
      // 永远点第 1 项：首错→T5 同形式重试→再点第 1 项必再错→stall=2→T6 KG 微补救
      await card.locator('.ix-bj-opt').first().click()
      await card.locator('.ix-submit').click()
    } else if (form === 'annotate') {
      // 实证（tmp/diag_annotate_targets.py 复算）：LLM 标注稳定输出整句三大块
      // [[0,11),[11,14),[14,30)]（temperature 0.2，每次 output_tokens=23）。
      // _interval_f1 是 tuple 精确匹配：拖选第一段 [s0,e0]（闭）== target (s0,e0) 半开
      // → tp=1, r=1/3 → F1=0.5 恰过 partial 线 → 幕推进（相邻段因重叠互删无法全选）。
      const { spawnSync } = await import('node:child_process')
      const toks = card.locator('.ix-an-tok')
      const n = await toks.count()
      // DOM tokens 序列 → 诊断脚本只跑 LLM 标注（与会话同题同分词 → targets 可对齐）
      const domTokens = []
      for (let i = 0; i < n; i++) domTokens.push(((await toks.nth(i).textContent()) || '').trim())
      const diag = spawnSync(
        'D:/zxsy-math-arena/services/api/.venv/Scripts/python.exe',
        ['D:/zxsy-math-arena/tmp/diag_annotate_targets.py', JSON.stringify(domTokens)],
        { encoding: 'utf8', timeout: 40000, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } },
      )
      let seg = null
      try {
        const line = (diag.stdout || '').split('\n').find((l) => l.startsWith('TARGETS:'))
        const tg = JSON.parse(line.slice('TARGETS:'.length).trim())
        const s0 = tg[0][0], e0 = tg[0][1]
        seg = [s0, Math.min(e0, n - 1)]
      } catch (e) { rec('diag-parse-fail', { err: String(e).slice(0, 120), tail: (diag.stderr || '').slice(-120) }) }
      rec('annotate-targets', { seg, n })
      if (seg && seg[1] > seg[0]) {
        const a = await toks.nth(seg[0]).boundingBox()
        const b = await toks.nth(seg[1]).boundingBox()
        await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
        await page.mouse.down()
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 4 })
        await page.mouse.up()
      } else {
        await toks.nth(0).click().catch(() => {})
      }
      const sb = card.locator('.ix-submit')
      if (await sb.count()) await sb.click()
      else await page.keyboard.press('Enter')
    } else if (form === 'assemble') {
      const keys = card.locator('.ix-as-key')
      const n = await keys.count()
      // 乱拼三个键（构造类必错策略，攒 stall→T6 KG 微补救）
      const picks = [0, Math.min(2, n - 1), Math.min(4, n - 1)]
      for (const i of picks) await keys.nth(i).click()
      await card.locator('.ix-submit').click()
    } else if (form === 'cloze') {
      const blanks = card.locator('.ix-cz-blank')
      if (await blanks.count()) {
        await blanks.first().click()
        const opts = card.locator('.ix-cz-opt')
        const on = await opts.count()
        if (on) await opts.nth(on - 1).click() // 故意点最后一项（大概率错）
      }
      await card.locator('.ix-submit').click()
    } else if (form === 'errorhunt') {
      // 选行 → 选因 → 提交（canSubmit 需两者；点第 1 行+第 1 因大概率错→攒 stall）
      await card.locator('.ix-eh-line').first().click()
      await card.locator('.ix-eh-cause').first().waitFor({ timeout: 5000 }).catch(() => {})
      const causes = card.locator('.ix-eh-cause')
      if (await causes.count()) await causes.first().click()
      await card.locator('.ix-submit').click()
    } else if (form === 'expr_input') {
      const pal = card.locator('button')
      const n = await pal.count()
      for (let i = 0; i < Math.min(3, n); i++) await pal.nth(i).click().catch(() => {})
      await card.locator('.ix-submit').click()
    } else if (form === 'sequence') {
      const cards = card.locator('.ix-sq-c, [class*="ix-sq"]')
      await cards.first().click().catch(() => {})
      const put = card.locator('.ix-sq-mini.primary')
      if (await put.count()) await put.click()
      await card.locator('.ix-submit').click().catch(() => {})
    } else if (form === 'route_commit') {
      const rs = card.locator('[class*="ix-rt"]')
      await rs.first().click().catch(() => {})
      await card.locator('.ix-submit').click().catch(() => {})
    } else if (form === 'triage') {
      const pool = card.locator('[class*="ix-tg"]')
      await pool.first().click().catch(() => {})
      await card.locator('.ix-submit').click().catch(() => {})
    } else if (form === 'free_text') {
      const ta = card.locator('[data-soc-ix-ft-input]')
      // 填确定性错误答案（「这一步我不会」会被判 clarification 不计 stall；错答案判 wrong 攒 stall）
      await ta.fill('x = 1')
      const send = card.locator('.si-send')
      if (await send.count()) await send.click()
      else await card.locator('.ix-submit').click().catch(() => {})
    } else if (form === 'numline' || form === 'figure_probe' || form === 'figure_slider') {
      // 通用点击面：先点一个可点元素再提交
      const clickable = card.locator('button:not([disabled])')
      const n = await clickable.count()
      for (let i = 0; i < Math.min(2, n); i++) {
        const txt = (await clickable.nth(i).textContent()) || ''
        if (/提交|写好|就这样|交给你/.test(txt)) continue
        await clickable.nth(i).click().catch(() => {})
      }
      await card.locator('.ix-submit').click().catch(() => {})
    } else {
      const opts = card.locator('.soc-choice-item, .ix-opt, button')
      await opts.first().click().catch(() => {})
      await card.locator('.ix-submit').click().catch(() => {})
    }
    rec('answer-done', { form, round })
    return true
  } catch (e) {
    rec('answer-error', { form, round, err: String(e).slice(0, 160) })
    return false
  }
}

// ---------- 主循环 ----------
let seenForms = new Set()
const milestones = { detour: false, citations: false, checkRetry: false, transfer: false, bridge: false, concept: false, tierShift: false, lastResort: false, binaryJudge: false, numline: false }
const delayRecord = { question: q, firstCardMs: delayMs, at: new Date().toISOString() }
fs.writeFileSync(path.join(OUT, 'v4-delay-record.json'), JSON.stringify(delayRecord, null, 2))

for (let r = 1; r <= 30; r++) {
  round = r
  // 等待真实新消息出现（上一轮提交的响应落库渲染完成）——杜绝 rapid-fire 重答
  await page.waitForTimeout(3000)
  const o = await observe()
  if (o.form) seenForms.add(o.form)
  rec('observe', { round: r, form: o.form, phase: o.phase, detourCount: o.detourCount, lastResort: o.isLastResort, cites: o.citations.length, concept: o.conceptCards, tierShifts: o.tierShifts.length, err: o.errCards, hint: o.hintText.slice(0, 60) })

  // 里程碑检测与截图
  if (o.binary && !milestones.binaryJudge) {
    milestones.binaryJudge = true
    rec('milestone-binary', { question: o.binary.question, options: o.binary.options, hasTextInput: o.binary.hasTextInput })
    await shot(page, 'v4-a-binary-judge-buttons')
    fs.writeFileSync(path.join(OUT, 'v4-a-binary-dom.json'), JSON.stringify({ question: o.binary.question, options: o.binary.options, hasTextInput: o.binary.hasTextInput, assert: '判断时刻渲染按钮组(ix-bj-opt[data-sbj-option]) 而非文本输入框' }, null, 2))
  }
  if (o.form === 'numline' && !milestones.numline) { milestones.numline = true; await shot(page, 'v4-b-numline') }
  if (o.detourCount > 0 && !milestones.detour) {
    milestones.detour = true
    await shot(page, 'v4-c1-detour-probe')
    rec('milestone-detour', { text: o.detourText })
  }
  if (o.citations.length > 0 && !milestones.citations) {
    milestones.citations = true
    await shot(page, 'v4-c2-teach-citations')
    fs.writeFileSync(path.join(OUT, 'v4-c2-teach-citations.json'), JSON.stringify({ badges: o.citations, quotes: o.quotes, detourText: o.detourText, assert: 'KG 微补救讲解卡带教材出处(doc_title/chunk_id)+原文摘录' }, null, 2))
    rec('milestone-citations', { badges: o.citations, quotes: o.quotes })
  }
  if (o.conceptCards > 0 && !milestones.concept) { milestones.concept = true; await shot(page, 'v4-d1-ladder-L2-concept-card') }
  if (o.tierShifts.length > 0 && !milestones.tierShift) { milestones.tierShift = true; await shot(page, 'v4-d2-tier-shift'); rec('milestone-tier-shift', { text: o.tierShifts }) }
  if (o.isLastResort && !milestones.lastResort) {
    milestones.lastResort = true
    await shot(page, 'v4-e-last-resort-symbol-palette')
    const pal = await page.evaluate(() => {
      const cur = [...document.querySelectorAll('.soc-ix:not(.used)')].pop()
      if (!cur) return null
      return { paletteKeys: [...cur.querySelectorAll('.ix-ei button, .sp-key, button')].length, hasInput: !!cur.querySelector('[data-soc-ix-ft-input], [data-soc-expr-input]') }
    })
    fs.writeFileSync(path.join(OUT, 'v4-e-last-resort-dom.json'), JSON.stringify({ lastResortText: o.lastResortText, ...pal, assert: 'last_resort 文本回合带显式理由标签 + 符号面板' }, null, 2))
    rec('milestone-last-resort', { text: o.lastResortText, ...pal })
  }

  // 结束条件：回归原题（bridge）后主环新卡出现，或 body 出现回归文案
  if (/回到原题|回原题|回归原题|补课检验通过/.test(o.bodyTail) && o.detourCount > 0 && !milestones.bridge) {
    milestones.bridge = true
    await shot(page, 'v4-c5-bridge-back-to-main')
    rec('milestone-bridge', {})
  }

  // 作答
  if (o.form) {
    await answer(o)
    // 等待响应落库：消息数增长或 45s 超时（真实 LLM 链路 3~40s）
    const wStart = Date.now()
    const beforeCnt = await page.evaluate(() => document.querySelectorAll('.msg-row, .mb').length).catch(() => 0)
    while (Date.now() - wStart < 50000) {
      await page.waitForTimeout(2500)
      const now = await page.evaluate(() => document.querySelectorAll('.msg-row, .mb').length).catch(() => 0)
      if (now > beforeCnt) { rec('response-landed', { round: r, ms: Date.now() - wStart }); break }
    }
  } else {
    // 无未答卡：可能等待生成；若 60s 仍无卡则视为会话推进靠文本，发「继续」
    const wStart = Date.now()
    let revived = false
    while (Date.now() - wStart < 60000) {
      await page.waitForTimeout(2500)
      const o2 = await observe()
      if (o2.form) { revived = true; break }
    }
    if (!revived) {
      await page.locator('.ci-ta').fill('继续')
      await page.locator('.ci-send').click().catch(() => {})
      rec('nudge', { round: r })
    }
  }
}

// 检验段专属截图（check_retry：detour 内检验失败后换形式）
const finalObs = await observe()
fs.writeFileSync(path.join(OUT, 'v4-runtime-log.json'), JSON.stringify({
  milestones, formsSeen: [...seenForms], rounds: log.length, consoleErrors: consoleErrors.slice(0, 10),
  final: finalObs, screenshots: shots,
}, null, 2))
rec('done', { formsSeen: [...seenForms], milestones })
await browser.close()
console.log('EVIDENCE RUN DONE; screenshots:', shots.length)
