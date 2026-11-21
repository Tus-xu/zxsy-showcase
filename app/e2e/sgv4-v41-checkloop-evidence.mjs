// V4.1 收敛修复专项运行取证（清场演练员 v41 ask：A4/A7/A8/H）。
// 观察驱动（真实 LLM 链路不可预测），全量记录不伪造；取证不可达如实落 SKIP。
// 输出：docs/design/student-guided-solving-v4/evidence-v41/
//   - v41-a4-citations.png / v41-a4-citations.json   A4：detour/概念卡 citations 徽标或降级标签
//   - v41-a7-transfer.png / v41-a7-transfer.json     A7：bridge 前 transfer 段显式声明卡
//   - v41-a8-twin*.png / v41-a8-twin.json            A8：孪生题卡（kind=twin DB 佐证）
//   - v41-h-turn-log.json                            H：首卡延迟 + 逐回合收尾卡类型清单
import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const base = process.env.BASE || 'http://127.0.0.1:5176'
const OUT = 'D:/zxsy-math-arena/docs/design/student-guided-solving-v4/evidence-v41'
fs.mkdirSync(OUT, { recursive: true })
const log = []
const shots = []
const turnEnds = [] // H：每回合收尾卡类型
function rec(kind, data) {
  const e = { t: new Date().toISOString(), kind, ...data }
  log.push(e)
  console.log(`[${kind}]`, JSON.stringify(data).slice(0, 260))
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
// 题干内嵌 KP 标准名（「导数的概念」⊆ knowledge_points DR-01「导数的概念与运算」→
// _resolve_kp_code 的 DB.name.contains(LLM名) 归一命中 → KG 溯源链可达）
const q = '【导数的概念】利用导数的定义，求 f(x)=x² 在 x=1 处的瞬时变化率。'
const t0 = Date.now()
await page.locator('.ci-ta').fill(q)
await page.locator('.ci-send').click()
rec('question-sent', { q, t0 })
const firstIx = page.locator('.soc-ix[data-soc-ix-form]').last()
await firstIx.waitFor({ timeout: 90000 }).catch(() => {})
const delayMs = Date.now() - t0
rec('first-interaction-card', { delayMs })
await page.waitForTimeout(800)
await shot(page, 'v41-opening-first-card')

// ---------- 观察器 ----------
async function observe() {
  return page.evaluate(() => {
    const ixs = [...document.querySelectorAll('.soc-ix')]
    const live = ixs.filter((e) => !e.classList.contains('used'))
    const cur = live[live.length - 1] || null
    const detours = [...document.querySelectorAll('.soc-detour')]
    const det = detours[detours.length - 1] || null
    const citeBadges = det ? [...det.querySelectorAll('.soc-cite-badge')].map((b) => b.textContent.trim()) : []
    const citesAll = [...document.querySelectorAll('.soc-cite-badge')].map((b) => b.textContent.trim())
    const degradedAll = [...document.querySelectorAll('.si-degraded, .sd-degraded, .soc-degraded')]
      .map((e) => e.textContent.trim()).filter((t) => /未找到教材原文|AI 生成/.test(t))
    const quotes = det ? [...det.querySelectorAll('.soc-cite-quote')].map((b) => b.textContent.trim()) : []
    const confirms = [...document.querySelectorAll('[data-soc-confirm]')]
    const lastConfirm = confirms.length ? confirms[confirms.length - 1] : null
    const confirmKind = lastConfirm ? lastConfirm.getAttribute('data-soc-confirm') : ''
    const confirmText = lastConfirm ? lastConfirm.textContent.replace(/\s+/g, ' ').slice(0, 200) : ''
    const phases = [...document.querySelectorAll('.sp-phase')].map((e) => e.textContent.trim())
    let bj = null
    if (cur && cur.dataset.socIxForm === 'binary') {
      bj = {
        question: (cur.querySelector('.ix-bj-q') || {}).textContent?.trim() || '',
        options: [...cur.querySelectorAll('.ix-bj-opt, [data-sbj-option]')].map((o) => o.textContent.trim().slice(0, 60)),
      }
    }
    return {
      liveCount: live.length,
      form: cur ? cur.dataset.socIxForm : null,
      ixId: cur ? cur.getAttribute('data-soc-ix-id') : '',
      phase: phases[phases.length - 1] || '',
      detourCount: detours.length,
      detourText: det ? det.textContent.replace(/\s+/g, ' ').slice(0, 400) : '',
      citeBadges, citesAll, degradedAll, quotes,
      confirmKind, confirmText,
      binary: bj,
      isLastResort: cur ? !!cur.querySelector('[data-soc-ix-last-resort]') : false,
      bodyTail: document.querySelector('.dialog-messages')?.textContent?.replace(/\s+/g, ' ').slice(-700) || '',
    }
  })
}

// ---------- 作答分派 ----------
// 策略：引导主环攒 stall（故意错 → stall≥2 → T6 KG 微补救 detour）；
// detour 内 probe → teach（A4 citations 观测）→ check（尽力作答，检验通过才进 transfer/A7）。
async function answer(o) {
  const card = page.locator('.soc-ix:not(.used)').last()
  const form = await card.getAttribute('data-soc-ix-form')
  rec('answer-begin', { form, phase: o.phase })
  try {
    if (form === 'binary') {
      // 引导主环：点第 1 项攒 stall；detour 检验/迁移（binary 二选一）：点第 2 项蒙对
      const pick = o.detourCount > 0 ? 1 : 0
      const opts = card.locator('.ix-bj-opt, [data-sbj-option]')
      await opts.nth(pick).click()
      await card.locator('.ix-submit, .ix-bj-actions button').first().click().catch(() => {})
    } else if (form === 'annotate') {
      const toks = card.locator('.ix-an-tok')
      const n = await toks.count()
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
        seg = [tg[0][0], Math.min(tg[0][1], n - 1)]
      } catch { rec('diag-parse-fail', { n }) }
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
    } else if (form === 'cloze') {
      const blanks = card.locator('.ix-cz-blank')
      if (await blanks.count()) {
        await blanks.first().click()
        const opts = card.locator('.ix-cz-opt')
        const on = await opts.count()
        if (on) await opts.nth(Math.min(1, on - 1)).click() // detour 检验 cloze：点第 2 项（二选一蒙对）
      }
      const inp = card.locator('input[type="text"], input:not([type])').first()
      if ((await inp.count()) && !(await blanks.count())) await inp.fill('2')
      await card.locator('.ix-submit').click()
    } else if (form === 'expr_input') {
      const pal = card.locator('button')
      const n = await pal.count()
      for (let i = 0; i < Math.min(3, n); i++) await pal.nth(i).click().catch(() => {})
      await card.locator('.ix-submit').click()
    } else if (form === 'free_text') {
      const ta = card.locator('[data-soc-ix-ft-input]')
      await ta.fill('x = 1')
      const send = card.locator('.si-send')
      if (await send.count()) await send.click()
      else await card.locator('.ix-submit').click().catch(() => {})
    } else if (form === 'errorhunt') {
      await card.locator('.ix-eh-line').first().click()
      await card.locator('.ix-eh-cause').first().waitFor({ timeout: 5000 }).catch(() => {})
      await card.locator('.ix-eh-cause').first().click().catch(() => {})
      await card.locator('.ix-submit').click()
    } else if (form === 'assemble') {
      const keys = card.locator('.ix-as-key')
      const n = await keys.count()
      for (const i of [0, Math.min(2, n - 1), Math.min(4, n - 1)]) await keys.nth(i).click()
      await card.locator('.ix-submit').click()
    } else {
      const clickable = card.locator('button:not([disabled])')
      const n = await clickable.count()
      for (let i = 0; i < Math.min(2, n); i++) {
        const txt = (await clickable.nth(i).textContent()) || ''
        if (/提交|写好|就这样|交给你|发出去|改用打字/.test(txt)) continue
        await clickable.nth(i).click().catch(() => {})
      }
      await card.locator('.ix-submit').click().catch(() => {})
    }
    rec('answer-done', { form })
    return true
  } catch (e) {
    rec('answer-error', { form, err: String(e).slice(0, 160) })
    return false
  }
}

// ---------- 主循环 ----------
let seenForms = new Set()
const milestones = { detour: false, citations: false, degraded: false, transferCard: false, transferSkip: false, bridge: false, twinCandidate: false, concept: false }
let transferInfo = null
for (let r = 1; r <= 30; r++) {
  await page.waitForTimeout(3000)
  const o = await observe()
  if (o.form) {
    seenForms.add(o.form)
    turnEnds.push({ round: r, form: o.form, detourCount: o.detourCount, confirmKind: o.confirmKind || null })
  } else {
    turnEnds.push({ round: r, form: null, note: 'no-live-card' })
  }
  rec('observe', { round: r, form: o.form, detourCount: o.detourCount, cites: o.citesAll.length, degraded: o.degradedAll.length, confirm: o.confirmKind })

  // A4：citations 徽标（detour/概念卡）
  if (o.citesAll.length > 0 && !milestones.citations) {
    milestones.citations = true
    await shot(page, 'v41-a4-citations')
    fs.writeFileSync(path.join(OUT, 'v41-a4-citations.json'), JSON.stringify({
      badges: o.citesAll, quotes: o.quotes, detourText: o.detourText.slice(0, 300),
      assert: 'A4 微补救讲解卡 citations 非空 + 卡面「来源：」徽标（doc_title/chunk_id 可回溯 kb_chunks）',
    }, null, 2))
    rec('milestone-citations', { badges: o.citesAll, quotes: o.quotes })
  }
  // A4 降级标签证据（语料不可回溯时）
  if (o.degradedAll.length > 0 && !milestones.citations && !milestones.degraded) {
    milestones.degraded = true
    await shot(page, 'v41-a4-degraded-label')
    fs.writeFileSync(path.join(OUT, 'v41-a4-degraded-label.json'), JSON.stringify({
      degraded: o.degradedAll, assert: 'A4 降级标签证据：kb 检索未回溯 → 「未找到教材原文，本讲解由 AI 生成」显式降级标签',
    }, null, 2))
    rec('milestone-degraded', { degraded: o.degradedAll })
  }
  // detour 出现
  if (o.detourCount > 0 && !milestones.detour) {
    milestones.detour = true
    await shot(page, 'v41-detour-probe')
    rec('milestone-detour', { text: o.detourText.slice(0, 200) })
  }
  // A7：迁移题卡（transfer_interaction cloze/binary 卡出现在 detour≥1 且迁移语境）
  if (o.detourCount > 0 && o.form && !milestones.transferCard) {
    const t = o.detourText || ''
    const tail = o.bodyTail || ''
    if (/迁移|平行题|同构/.test(t + tail)) {
      milestones.transferCard = true
      transferInfo = { form: o.form, detourText: t.slice(0, 260), tail: tail.slice(-260) }
      await shot(page, 'v41-a7-transfer')
      fs.writeFileSync(path.join(OUT, 'v41-a7-transfer.json'), JSON.stringify({
        ...transferInfo, assert: 'A7 bridge 前存在 transfer 段显式声明卡（迁移题卡；或迁移跳过卡 transfer_skip 二选一）',
      }, null, 2))
      rec('milestone-transfer', transferInfo)
    }
  }
  // A7 另一路径：迁移跳过确认卡
  if (o.confirmKind === 'transfer_skip' && !milestones.transferSkip) {
    milestones.transferSkip = true
    await shot(page, 'v41-a7-transfer-skip')
    fs.writeFileSync(path.join(OUT, 'v41-a7-transfer-skip.json'), JSON.stringify({
      confirmText: o.confirmText, assert: 'A7 迁移物料构建失败路径：显式 transfer_skip 确认卡（不再静默 fail-open 直桥）',
    }, null, 2))
    rec('milestone-transfer-skip', { text: o.confirmText })
  }
  // A8：孪生题候选（cloze 卡 + 孪生/同构语境——DOM 无 kind 标记，DB 侧 kind=twin 佐证）
  if (o.form === 'cloze' && /孪生|再来一道|换一个数|换数/.test(o.bodyTail) && !milestones.twinCandidate) {
    milestones.twinCandidate = true
    await shot(page, 'v41-a8-twin-candidate')
    fs.writeFileSync(path.join(OUT, 'v41-a8-twin.json'), JSON.stringify({
      ixId: o.ixId, tail: o.bodyTail.slice(-300),
      assert: 'A8 孪生题候选卡（cloze 下发）；kind=twin 与「同构不同数」由 DB envelope + test_sgv4_check_loop 佐证',
    }, null, 2))
    rec('milestone-twin-candidate', { ixId: o.ixId })
  }
  if ((o.confirmKind === 'concept' || /概念/.test(o.detourText.slice(0, 60))) && !milestones.concept) {
    milestones.concept = true
    await shot(page, 'v41-l2-concept-card')
  }
  // bridge 回归
  if (o.detourCount > 0 && /回到原题|回原题|回归原题|继续我们|带回原题/.test(o.bodyTail) && !milestones.bridge) {
    milestones.bridge = true
    await shot(page, 'v41-bridge-back-to-main')
    rec('milestone-bridge', {})
  }

  // 作答
  if (o.form) {
    await answer(o)
    const wStart = Date.now()
    const beforeCnt = await page.evaluate(() => document.querySelectorAll('.msg-row, .mb').length).catch(() => 0)
    while (Date.now() - wStart < 50000) {
      await page.waitForTimeout(2500)
      const now = await page.evaluate(() => document.querySelectorAll('.msg-row, .mb').length).catch(() => 0)
      if (now > beforeCnt) { rec('response-landed', { round: r, ms: Date.now() - wStart }); break }
    }
  } else {
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

const finalObs = await observe()
fs.writeFileSync(path.join(OUT, 'v41-h-turn-log.json'), JSON.stringify({
  firstCardMs: delayMs,
  question: q,
  turnEnds,
  formsSeen: [...seenForms],
  milestones,
  transferInfo,
  screenshots: shots,
  consoleErrors: consoleErrors.slice(0, 10),
  final: { form: finalObs.form, detourCount: finalObs.detourCount, cites: finalObs.citesAll.length },
}, null, 2))
rec('done', { milestones, formsSeen: [...seenForms], firstCardMs: delayMs })
await browser.close()
console.log('V41 EVIDENCE RUN DONE; screenshots:', shots.length)
