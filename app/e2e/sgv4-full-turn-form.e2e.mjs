/**
 * sgv4 全回合形式覆盖 e2e（DESIGN §10 A1/A2/A9/A14/A15 DOM 级验收）
 *
 * 验收口径（可测）：
 *   A1 判定回合结构化卡出现率 100% + 对话回合（打字求助/跑题注入）文本后收尾必带可点选卡
 *      ——「无任何可交互卡片的回合 = 0」；
 *   A2 「取正取负」类判断渲染为按钮组：[data-soc-ix-form="binary"] 内 [data-sbj-option] ≥2
 *      （DOM 属性锚点，不依赖样式类），主答渠道非文本框；
 *   A9 纯文本回合仅带 last_resort 理由：free_text 卡无 last_resort 徽标数 = 0；
 *   A14 「我没思路」触发路由（help 信号）→ 收尾必有可点选卡（首次求助=probe 预期 binary）；
 *   A15 出口/示范确认按钮化（socratic_exit_offer / socratic_confirm 卡渲染即证）+
 *      出口确认→揭示→下一步必发入场卡（Z6 链路）：出口确认卡停留期间绝不自动揭示，
 *      点 [data-sbj-action="exit_confirm"] 后揭示续接段必补发下一步入场交互卡
 *      （后端 _reveal_step_exit：main.py:6343 揭示文本 → current_step+=1 →
 *      choose_form → _issue_step_interaction）；命中「这是最后一步」分支走 answer→confirm
 *      整题揭示（设计内不发步级入场卡），记 SKIP 并带原因。取证不可达（会话未走到）一律
 *      ok=false + 「SKIP:」原因落 results.json，绝不静默 ok。
 * 运行前置（V4 全链）：
 *   ① 前端 dev server（BASE，默认 http://127.0.0.1:5176）；
 *   ② services/api 已部署 V4 后端（B 系列：决策表/形式下发/零卡回合补齐）；
 *   ③ 种子账号 13800001001 / MathArenaDemo2026!（tools/seed_demo_accounts.py）；
 *   ④ LLM 凭证就绪（引导链路真实出题）。
 * 截图与断言结果落盘 artifacts/sgv4-full-turn-form/。
 */
import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const base = process.env.BASE || 'http://127.0.0.1:5176'
const outDir = process.env.OUT || path.resolve(__dirname, '..', '..', 'artifacts', 'sgv4-full-turn-form')
fs.mkdirSync(outDir, { recursive: true })

const results = []
const errors = []
function rec(step, ok, detail) {
  results.push({ step, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${step} | ${detail}`)
}

async function shot(page, name, full = false) {
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: full })
}

/** 可交互卡出现判定（A1 口径：等待输入状态的回合必以其中一张卡收尾） */
const INTERACTIVE_CARD_SEL = [
  '[data-soc-ix-form]', // socratic_interaction 信封卡（含 binary/numline/…全形式）
  '.soc-choices', // socratic_step_choice 选项卡
  '.soc-detour', // 补课/检验卡
  '[data-soc-confirm]', // socratic_exit_offer / socratic_confirm / socratic_nudge
  '[data-soc-concept-card]', // L2 概念卡
  '[data-soc-need-problem]', // 无题门禁卡
].join(', ')

/** 等待流式结束（ChatInput 流式中渲染 .ci-stop，结束后移除；卡片渲染留余量） */
async function waitTurnDone(page) {
  await page.waitForSelector('.ci-stop', { state: 'visible', timeout: 20000 }).catch(() => {})
  await page.waitForSelector('.ci-stop', { state: 'detached', timeout: 180000 })
  await page.waitForTimeout(1500) // 卡片渲染余量
}

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1500, height: 980 }, locale: 'zh-CN' })
const page = await ctx.newPage()
page.setDefaultTimeout(60000)
page.on('console', (m) => { if (m.type() === 'error') errors.push(`page: ${m.text().slice(0, 200)}`) })
page.on('response', (r) => { if (/\/api\//.test(r.url()) && r.status() >= 500) errors.push(`${r.status()} ${r.url()}`) })

try {
  /* ===== 登录（种子学生账号） ===== */
  await page.goto(`${base}/login`, { waitUntil: 'networkidle' })
  await page.locator('#preferred-role').selectOption('student')
  await page.getByRole('tab', { name: '密码登录' }).click()
  await page.locator('input.input[placeholder="请输入中国大陆手机号"]').fill('13800001001')
  await page.locator('#auth-password').fill('MathArenaDemo2026!')
  await page.getByRole('button', { name: /安全登录/ }).click()
  await page.waitForURL((u) => !String(u).includes('/login'), { timeout: 30000 })
  rec('login', true, '学生账号登录成功')

  /* ===== 进入学习对话（无题门禁卡 = 第一个判定回合） ===== */
  await page.goto(`${base}/dialog`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  // 发一道导数应用题进引导链（f'(x) 符号判断场景——A2 复现截图原场景）
  const input = page.locator('.chat-input textarea, .chat-input input[type="text"]').first()
  await input.fill('帮我一步步解这道题：已知函数 f(x) = x³ - 3x² - 9x + 5，求 f(x) 的单调区间。')
  await input.press('Enter')
  await waitTurnDone(page)
  await shot(page, '01-opening-turn')

  // A1：开场回合（可能含无题门禁/读题三幕/计划押注）必带可点选卡
  const openingCard = await page.locator(INTERACTIVE_CARD_SEL).first().isVisible().catch(() => false)
  rec('A1-opening-interactive-card', openingCard, '开场回合以可交互卡收尾')

  /* ===== 判定回合驱动：逐回合用结构化卡推进（有卡点卡，无卡兜底打字） ===== */
  const turnSnaps = []
  for (let turn = 0; turn < 8; turn++) {
    const card = page.locator(`${INTERACTIVE_CARD_SEL}`).last()
    const visible = await card.isVisible().catch(() => false)
    if (!visible) {
      turnSnaps.push({ turn, endedWithCard: false, form: '' })
      break
    }
    const form = (await card.getAttribute('data-soc-ix-form')) || ''
      || (await card.getAttribute('data-soc-confirm')) || ''
    turnSnaps.push({ turn, endedWithCard: true, form })
    // 结构化优先作答：binary 按钮组 → 点首选项提交；annotate 划选 token 后提交；
    // cloze/其他交互卡尝试主提交按钮；无则打字兜底（keep 会话推进到 guiding 判断回合）
    const binaryOpt = card.locator('[data-sbj-option]').first()
    if (await binaryOpt.isVisible().catch(() => false)) {
      await binaryOpt.click()
      await card.locator('.ix-submit, .ix-bj-actions button').first().click().catch(() => {})
    } else {
      const tok = card.locator('.ix-an-tok').first()
      if (await tok.isVisible().catch(() => false)) {
        // annotate：划选两个 token 再提交（推进读题/标注回合）
        const toks = card.locator('.ix-an-tok')
        for (let k = 0; k < Math.min(2, await toks.count()); k++) {
          await toks.nth(k).click().catch(() => {})
        }
        await card.locator('.ix-submit:visible').first().click().catch(() => {})
      } else {
        const choice = card.locator('.soc-choice').first()
        if (await choice.isVisible().catch(() => false)) {
          await choice.click()
        } else {
          const ixSubmit = card.locator('.ix-submit:visible').first()
          const submitVisible = await ixSubmit.isVisible().catch(() => false)
          const submitEnabled = submitVisible ? !(await ixSubmit.isDisabled().catch(() => true)) : false
          if (submitEnabled) {
            await ixSubmit.click()
          } else {
            await input.fill('我觉得先求导，找驻点再分区间讨论')
            await input.press('Enter')
          }
        }
      }
    }
    await waitTurnDone(page)
    await shot(page, `02-turn-${turn}`)
  }
  const endedAll = turnSnaps.length > 0 && turnSnaps.every((t) => t.endedWithCard)
  rec('A1-every-turn-ends-with-card', endedAll, `逐回合收尾卡覆盖：${JSON.stringify(turnSnaps.slice(0, 4))}…`)

  /* ===== A2：binary 按钮组 DOM 级断言（取正取负场景） =====
     binary 判断时刻（R-judge 引导步入场 / T6 probe 探测）在真实 LLM 链路中出现时机
     不可预测——probe binary 常在 A14 求助回合才首次出现。故断言封装为多点复查：
     turn 循环后 / A14 后 / 跑题注入后各查一次，任一时点 binary 在场即记 PASS；
     全部时点未出现才落 SKIP（取证不可达≠通过）。 */
  let a2Done = false
  async function checkBinaryAt(tag) {
    if (a2Done) return
    const binaryZone = page.locator('[data-soc-ix-form="binary"]').last()
    const binaryVisible = await binaryZone.isVisible().catch(() => false)
    if (!binaryVisible) return
    const optCount = await binaryZone.locator('[data-sbj-option]').count()
    // 主答渠道 = [data-sbj-option] 按钮组；卡底 .si-fallback「改用打字」小字入口是
    // SocraticInteractionCard.vue:74-84 设计内的打字回退（可及性，视觉降级 minor），
    // 不计入「主答渠道非文本框」判定——只查主答区（回退行之外）是否有文本输入。
    const hasMainTextInput = await binaryZone.evaluate(
      (el) => [...el.querySelectorAll('input')].filter((i) => !i.closest('.si-fallback')).length,
    )
    a2Done = true
    rec('A2-binary-button-group', optCount >= 2 && hasMainTextInput === 0, `[${tag}] binary 卡内 [data-sbj-option]×${optCount}，主答区非文本框（卡底打字回退为设计内入口）`)
    await binaryZone.scrollIntoViewIfNeeded()
    await shot(page, '03-binary-doom-assert')
  }
  await checkBinaryAt('post-turn-loop')
  if (!a2Done) rec('A2-binary-button-group-probe-pending', true, 'turn 循环后未见 binary，继续在 A14/跑题回合复查')

  /* ===== A9：free_text 卡必须带 last_resort 理由徽标 ===== */
  const ftTotal = await page.locator('[data-soc-ix-form="free_text"]').count()
  let ftUnlabeled = 0
  for (let i = 0; i < ftTotal; i++) {
    const hasBadge = await page.locator('[data-soc-ix-form="free_text"]').nth(i).locator('[data-soc-ix-last-resort]').isVisible().catch(() => false)
    if (!hasBadge) ftUnlabeled += 1
  }
  rec('A9-free-text-last-resort-label', ftUnlabeled === 0, `free_text 卡 ${ftTotal} 张，无理由标签 ${ftUnlabeled} 张`)

  /* ===== A14：打字求助注入 → 对话回合收尾必带可点选卡（Z2/出口优先/probe） ===== */
  const lastAiText = () => page.evaluate(() => {
    const rows = [...document.querySelectorAll('.msg-row.ai')]
    const last = rows[rows.length - 1]
    return last ? last.textContent.slice(0, 160) : ''
  })
  const cardsBefore = await page.locator(INTERACTIVE_CARD_SEL).count()
  await input.fill('我没思路')
  await input.press('Enter')
  await waitTurnDone(page)
  await shot(page, '04-help-injection')
  const cardsAfter = await page.locator(INTERACTIVE_CARD_SEL).count()
  rec('A14-help-turn-ends-with-card', cardsAfter > cardsBefore, `求助回合新增可点选卡 ${cardsAfter - cardsBefore} 张；AI 回应：${await lastAiText()}`)
  await checkBinaryAt('post-help') // T6 probe binary 常在求助回合首次出现

  /* ===== A15：出口确认→揭示→下一步必发入场卡（Z6 链路）+ 绝不自动揭示 =====
     检查点紧随 A14：出口确认卡（若出现）以回合收尾、尚未被后续注入推进——
     此时它是最后一条 AI 消息的收尾卡，链路取证最干净；跑题注入放在其后 */
  const exitInLastAi = page.locator('.msg-row.ai').last().locator('[data-soc-confirm="exit_offer"]')
  const exitShown = await exitInLastAi.isVisible().catch(() => false)
  if (!exitShown) {
    rec('A15-exit-confirm-reveal-next-entry', false, 'SKIP: 会话至此未以出口确认卡收尾（T10 需预算耗尽 ∧ 已示范/再耗尽，DESIGN §5.3；Z6 链路仅在该回合可 DOM 取证，取证不可达≠通过）')
  } else {
    // 绝不自动揭示（DESIGN §5.3 T10「学生确认制」）：出口确认卡以回合收尾时 SSE 已结束
    // （waitTurnDone 过 .ci-stop detached），学生未点击的停留窗口内不得出现任何新 AI 消息
    await exitInLastAi.scrollIntoViewIfNeeded()
    await shot(page, '06-exit-offer')
    const aiIdleBefore = await page.locator('.msg-row.ai').count()
    await page.waitForTimeout(3000)
    const noAutoReveal = (await page.locator('.msg-row.ai').count()) === aiIdleBefore
    // 学生点确认 → 后端 _reveal_step_exit：揭示文本 → current_step+1 → GUIDE_NEXT_STEP
    // → choose_form → _issue_step_interaction 补发入场交互卡（Z6，与正常步入场同构）
    await exitInLastAi.locator('[data-sbj-action="exit_confirm"]').first().click()
    await waitTurnDone(page)
    await shot(page, '07-reveal-next-entry')
    const entryInLastAi = await page.locator('.msg-row.ai').last().locator('[data-soc-ix-form]').first().isVisible().catch(() => false)
    const tailText = await lastAiText()
    if (!entryInLastAi && tailText.includes('这是最后一步')) {
      // 设计内分支：最后一步的揭示指引走既有 answer→confirm 整题揭示，不发步级入场卡
      rec('A15-exit-confirm-reveal-next-entry', false, `SKIP: 揭示命中「最后一步」分支（走 answer→confirm 整题揭示，设计内不发步级入场卡）；绝不自动揭示=${noAutoReveal}；AI 尾文本：${tailText}`)
    } else {
      rec('A15-exit-confirm-reveal-next-entry', noAutoReveal && entryInLastAi, `绝不自动揭示=${noAutoReveal}；确认后下一步入场交互卡=${entryInLastAi}；AI 尾文本：${tailText}`)
    }
  }

  /* ===== 跑题注入（Z3）：对话回合收尾卡 ===== */
  const beforeOff = await page.locator(INTERACTIVE_CARD_SEL).count()
  await input.fill('今天中午吃什么好呢')
  await input.press('Enter')
  await waitTurnDone(page)
  await shot(page, '05-offtopic-injection')
  const afterOff = await page.locator(INTERACTIVE_CARD_SEL).count()
  rec('A1-offtopic-turn-ends-with-card', afterOff > beforeOff, `跑题回合新增可点选卡 ${afterOff - beforeOff} 张；AI 回应：${await lastAiText()}`)
  await checkBinaryAt('post-offtopic') // 最后一处复查点

  /* ===== 汇总 ===== */
  if (!a2Done) rec('A2-binary-button-group', false, 'SKIP: 全部三个复查点（turn 循环后/A14 后/跑题后）本会话均未出现 binary 判断时刻（R-judge 引导步/ probe 探测均未命中；取证不可达≠通过——确定性可达性由 test_sgv4_forms R-judge 规则锁佐证）')
  const failCount = results.filter((r) => !r.ok).length
  fs.writeFileSync(
    path.join(outDir, 'results.json'),
    JSON.stringify({ base, at: new Date().toISOString(), results, errors }, null, 2),
  )
  rec('sgv4-e2e-summary', failCount === 0, `${results.length - 1} 项断言，${failCount} 项失败`)
} catch (e) {
  errors.push(`fatal: ${e?.message || e}`)
  await shot(page, '99-fatal').catch(() => {})
  rec('sgv4-e2e-fatal', false, String(e?.message || e))
} finally {
  fs.writeFileSync(
    path.join(outDir, 'results.json'),
    JSON.stringify({ base, at: new Date().toISOString(), results, errors }, null, 2),
  )
  await browser.close()
}
if (results.some((r) => !r.ok)) process.exitCode = 1
