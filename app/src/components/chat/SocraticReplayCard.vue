<template>
  <!-- sgv3（CHAIN-DESIGN §10-W6 / §2.2 reflecting）思维轨迹回放卡：本会话真实数据的
       攀登路线图——哪步卡过、哪次提示救了你、你自己纠正几次、换挡轨迹、FSRS 复习排期。
       数据全部来自后端 build_replay_data（ix_materials.py）的程序化投影，前端零编造；
       无会话数据（replay 缺失/全零）整卡不渲染——禁套话（W6 验收项）。
       展示型卡：无作答回传，无已用态；历史回显经 card 块通用还原同构渲染。 -->
  <div v-if="hasData" class="soc-replay" :data-soc-replay="String(card.session_id || '')">
    <div class="sr-head">
      <span class="sr-title">🗺️ 思维轨迹回放</span>
      <span v-if="totals.rounds" class="sr-rounds">本局 {{ totals.rounds }} 轮</span>
    </div>

    <!-- 总览：纠错/提示/补课/误因——全零项不显示（禁凑数） -->
    <div v-if="totalBadges.length" class="sr-totals">
      <span v-for="b in totalBadges" :key="b.key" class="sr-chip" :class="b.cls">{{ b.text }}</span>
    </div>

    <!-- 攀登路线图：每步一根柱（错次+提示数 = 卡壳强度），点开看这步的细账 -->
    <div v-if="stepRows.length" class="sr-map">
      <div class="sr-map-label">攀登路线 · 共 {{ stepRows.length }} 步</div>
      <div class="sr-chart">
        <div
          v-for="r in stepRows"
          :key="r.no"
          class="sr-col"
          :class="{ stuck: r.stuck, clean: !r.stuck }"
          :title="r.title"
        >
          <div class="sr-bar" :style="{ height: r.barH }"></div>
          <span class="sr-no">{{ r.no }}</span>
        </div>
      </div>
      <div v-for="r in stepRows" :key="'row' + r.no" class="sr-step" :class="{ 'is-stuck': r.stuck }">
        <div class="sr-step-head">
          <span class="sr-step-no">{{ r.no }}</span>
          <div class="sr-step-what"><MarkdownView :text="tex(r.what)" :zoomable="false" /></div>
          <span v-if="r.stuck" class="sr-chip warn">卡过 {{ r.wrongCount }} 次</span>
          <span v-else class="sr-chip ok">一次过</span>
        </div>
        <div v-if="r.detailBadges.length" class="sr-step-detail">
          <span v-for="b in r.detailBadges" :key="b" class="sr-mini">{{ b }}</span>
        </div>
      </div>
    </div>

    <!-- 本局用过的作答形式（W8：形式随心而变） -->
    <div v-if="formBadges.length" class="sr-forms">
      <span class="sr-forms-label">你用过的作答方式</span>
      <span v-for="f in formBadges" :key="f.key" class="sr-chip form" :title="f.key">{{ f.zh }}</span>
    </div>

    <!-- 换挡轨迹（W5：学生看见自己赢得的自主权） -->
    <div v-if="tierPath.length" class="sr-tier">
      <span class="sr-forms-label">支持强度变化</span>
      <span v-for="(t, i) in tierPath" :key="i" class="sr-tier-hop" :title="t.reason || ''">
        {{ t.zh }}<span v-if="i < tierPath.length - 1" class="sr-tier-arrow"> → </span>
      </span>
    </div>

    <!-- FSRS 复习排期（后端收尾中：字段名未定稿，多候选键容错，缺失不渲染；
         sgv4 F11 遗留断点顺手修：review_schedule 兼容 dict 形态 {"days_until":n}
         ——ix_materials.py:728 实际下发 dict，此前只认数组导致「📅 复习排期」永不渲染） -->
    <div v-if="schedule.length" class="sr-fsrs">
      <span class="sr-forms-label">📅 复习排期</span>
      <span v-for="(s, i) in schedule" :key="i" class="sr-chip fsrs">{{ s.text }}</span>
    </div>

    <!-- sgv4（DESIGN §5.6/R5）：脆弱点行——「慢而对/多改而对」的 fragile kp 列表，
         复现频率提高的可见性面；候选键容错（后端 B5 扩 replay 数据），缺失不渲染 -->
    <div v-if="fragileRows.length" class="sr-fragile">
      <span class="sr-forms-label">🌱 脆弱点</span>
      <span v-for="(f, i) in fragileRows" :key="i" class="sr-chip fragile" :title="f.reason || '用时偏长或反复修改后答对——掌握尚不牢固，会多复习几次'">{{ f.name }}</span>
    </div>

    <!-- 图谱点亮（同上：候选键容错） -->
    <div v-if="litKps.length" class="sr-lights">
      <span class="sr-forms-label">✨ 点亮知识</span>
      <span v-for="(k, i) in litKps" :key="i" class="sr-chip light">{{ k }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import MarkdownView from '@/components/MarkdownView.vue'
import { wrapBareLatex } from '@/utils/latex'
import { FORM_ZH, REPLAY_MISCONCEPTION_ZH, SCAFFOLD_LEVEL_ZH, TIER_NAME_ZH } from './messageModel'

const props = defineProps({
  /** 后端 main.py reflecting 出口：{card_type:'socratic_replay', session_id, replay}；
   *  replay = build_replay_data 产物：{steps[], totals, forms_used[], tier_path[]}；
   *  sgv4 F11：review_schedule 字段名已定稿——dict {"days_until":n}（ix_materials.py:728）；
   *  图谱点亮/脆弱点为后端扩展字段——候选键探测，缺失即不渲染该块 */
  card: { type: Object, required: true },
})

// 裸 LaTeX（无 $ 定界）包装后交 MarkdownView/KaTeX（沿 SocraticCompleteCard tex 纪律）；
// steps[].what 是 assertion 程序切片短句，inline 模式更适合
const tex = (v) => wrapBareLatex(String(v ?? ''), { inline: true })

const replay = computed(() => {
  const r = props.card?.replay
  return r && typeof r === 'object' ? r : {}
})

const totals = computed(() => {
  const t = replay.value.totals
  return t && typeof t === 'object' ? t : {}
})

const stepRows = computed(() => {
  const rows = Array.isArray(replay.value.steps) ? replay.value.steps : []
  const norm = rows
    .filter((s) => s && typeof s === 'object')
    .map((s) => ({
      no: Number(s.no) || 0,
      what: String(s.what || ''),
      wrongCount: Number(s.wrong_count) || 0,
      attempts: Number(s.attempts) || 0,
      hints: Number(s.hints) || 0,
      scaffoldMax: Number(s.scaffold_max) || 0,
      misconceptions: (Array.isArray(s.misconceptions) ? s.misconceptions : [])
        .map((m) => String(m || '').trim())
        .filter(Boolean),
    }))
    .filter((r) => r.no > 0)
  const peak = Math.max(1, ...norm.map((r) => r.wrongCount + r.hints))
  return norm.map((r) => {
    const stuck = r.wrongCount > 0 || r.hints > 0
    // 明细账目只对卡过的步展开（「一次过」无需账目，信息密度优先）
    const detail = []
    if (stuck) {
      if (r.wrongCount) detail.push(`纠正 ${r.wrongCount} 次`)
      if (r.hints) detail.push(`提示 ${r.hints} 次`)
      if (r.attempts) detail.push(`作答 ${r.attempts} 次`)
      const sc = SCAFFOLD_LEVEL_ZH[r.scaffoldMax]
      if (sc) detail.push(`最深处：${sc}`)
    }
    for (const m of r.misconceptions) detail.push(`揪出「${REPLAY_MISCONCEPTION_ZH[m] || m}」`)
    return {
      ...r,
      stuck,
      barH: `${Math.max(8, Math.round(((r.wrongCount + r.hints) / peak) * 100))}%`,
      detailBadges: detail,
      title: `第 ${r.no} 步：${r.what}`,
    }
  })
})

const totalBadges = computed(() => {
  const out = []
  if (Number(totals.value.wrong_total) > 0) out.push({ key: 'wrong', cls: 'warn', text: `🧗 纠错 ${totals.value.wrong_total} 次` })
  if (Number(totals.value.hint_total) > 0) out.push({ key: 'hint', cls: '', text: `💡 提示救场 ${totals.value.hint_total} 次` })
  if (Number(totals.value.detours) > 0) out.push({ key: 'detour', cls: '', text: `🧭 绕行补课 ${totals.value.detours} 次` })
  if (Number(totals.value.hypo_events) > 0) out.push({ key: 'hypo', cls: 'ok', text: `🔍 误因被你揪出 ${totals.value.hypo_events} 次` })
  return out
})

const formBadges = computed(() =>
  (Array.isArray(replay.value.forms_used) ? replay.value.forms_used : [])
    .map((f) => String(f || '').trim())
    .filter(Boolean)
    .map((f) => ({ key: f, zh: FORM_ZH[f] || f })),
)

const tierPath = computed(() =>
  (Array.isArray(replay.value.tier_path) ? replay.value.tier_path : [])
    .filter((t) => t && typeof t === 'object')
    .map((t) => ({
      tier: t.tier,
      reason: String(t.reason || ''),
      zh: `T${Number(t.tier) || 0} ${TIER_NAME_ZH[Number(t.tier)] || ''}`.trim(),
    }))
    .filter((t) => t.tier != null),
)

// ===== replay 扩展字段（定稿键 + 旧候选键容错并存，CHAIN-DESIGN §10-W6 / sgv4 F11）=====
// FSRS 排期：已定稿 dict 形态 {"days_until": n}（ix_materials.py:728 实际下发，无 kp 名）；
// 数组项 {kp_name|kp_code|kp, days_until|days|due_in_days} 为兼容保留（未来扩展零回退）
const SCHEDULE_KEYS = ['review_schedule', 'fsrs_schedule', 'fsrs']
const LIGHT_KEYS = ['kp_lights', 'lit_kps', 'graph_lights', 'kp_graph']
// sgv4 §5.6：脆弱点 kp 列表（候选键容错；项为字符串或 {kp_name|kp_code|kp, reason?}）
const FRAGILE_KEYS = ['fragile_kps', 'fragile_points', 'fragile', 'fragile_hits']

const schedule = computed(() => {
  for (const k of SCHEDULE_KEYS) {
    const v = replay.value[k]
    // sgv4 F11：dict 形态（真实下发形态）——{"days_until": 3.5} 单值，无 kp 名
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const days = Number(v.days_until ?? v.days ?? v.due_in_days)
      if (Number.isFinite(days) && days >= 0) return [{ text: `${Math.round(days * 10) / 10} 天后` }]
      continue
    }
    if (!Array.isArray(v) || !v.length) continue
    const rows = v
      .map((it) => {
        if (!it) return null
        if (typeof it === 'string') return { name: it, days: null }
        if (typeof it !== 'object') return null
        const name = String(it.kp_name || it.kp_code || it.kp || '').trim()
        const days = Number(it.days_until ?? it.days ?? it.due_in_days)
        return { name, days: Number.isFinite(days) ? days : null }
      })
      .filter((r) => r && r.name)
    if (rows.length) {
      return rows.map((r) => ({
        text: r.days != null ? `${r.name} · ${r.days} 天后` : r.name,
      }))
    }
  }
  return []
})

/** sgv4 §5.6：脆弱点行归一（字符串项 / {kp_name,kp_code,kp,reason} 对象项均容错） */
const fragileRows = computed(() => {
  for (const k of FRAGILE_KEYS) {
    const v = replay.value[k]
    if (!Array.isArray(v) || !v.length) continue
    const rows = v
      .map((it) => {
        if (typeof it === 'string') return it.trim() ? { name: it.trim(), reason: '' } : null
        if (it && typeof it === 'object') {
          const name = String(it.kp_name || it.kp_code || it.kp || '').trim()
          return name ? { name, reason: String(it.reason || '') } : null
        }
        return null
      })
      .filter(Boolean)
    if (rows.length) return rows
  }
  return []
})

const litKps = computed(() => {
  for (const k of LIGHT_KEYS) {
    const v = replay.value[k]
    if (!Array.isArray(v) || !v.length) continue
    const names = v
      .map((it) => {
        if (typeof it === 'string') return it.trim()
        if (it && typeof it === 'object') return String(it.kp_name || it.kp_code || it.kp || '').trim()
        return ''
      })
      .filter(Boolean)
    if (names.length) return names
  }
  return []
})

// 无数据不渲染（W6 禁套话）：后端 build_replay_data 全零已不下发卡，这里防旧消息/
// 异常 payload——steps 空且总览零项即无会话数据，整卡不渲染
const hasData = computed(
  () => stepRows.value.length > 0
    || totalBadges.value.length > 0
    || formBadges.value.length > 0
    || tierPath.value.length > 0
    || schedule.value.length > 0
    || litKps.value.length > 0
    || fragileRows.value.length > 0,
)
</script>

<style scoped>
.soc-replay {
  margin-top: 10px; padding: 12px 14px; border-radius: var(--radius-md);
  border: 1px solid rgba(99, 102, 241, 0.3); background: rgba(250, 250, 255, 0.72);
}
.sr-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.sr-title { font-size: 13px; font-weight: 700; color: #4f46e5; }
.sr-rounds { font-size: 11px; color: var(--text-muted); }

.sr-totals { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.sr-chip {
  font-size: 11px; border-radius: var(--radius-full); padding: 2px 9px;
  color: var(--text-secondary); background: var(--bg-subtle, #f1f5f9);
  border: 1px solid var(--border); white-space: nowrap;
}
.sr-chip.warn { color: #b45309; background: #fffbeb; border-color: rgba(217, 119, 6, 0.3); }
.sr-chip.ok { color: #047857; background: #ecfdf5; border-color: rgba(5, 150, 105, 0.3); }
.sr-chip.form { color: #5b5fc7; background: #eef2ff; border-color: rgba(99, 102, 241, 0.25); cursor: help; }
.sr-chip.fsrs { color: #0f766e; background: #f0fdfa; border-color: rgba(13, 148, 136, 0.3); }
.sr-chip.light { color: #7c3aed; background: #f5f3ff; border-color: rgba(124, 58, 237, 0.25); }

.sr-map-label { font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px; }
/* 攀登柱状图：柱高 = 该步错次+提示数（卡壳强度），一次过的步是矮绿柱、卡过的步是高琥珀柱 */
.sr-chart { display: flex; align-items: flex-end; gap: 5px; height: 56px; margin-bottom: 10px; }
.sr-col { flex: 1; min-width: 14px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; }
.sr-bar { width: 70%; border-radius: 4px 4px 0 0; }
.sr-col.clean .sr-bar { background: linear-gradient(180deg, #34d399, #a7f3d0); }
.sr-col.stuck .sr-bar { background: linear-gradient(180deg, #f59e0b, #fde68a); }
.sr-no { font-size: 10px; color: var(--text-muted); margin-top: 2px; }

.sr-step { margin-bottom: 8px; }
.sr-step.is-stuck .sr-step-no { background: #d97706; }
.sr-step-head { display: flex; align-items: flex-start; gap: 7px; }
.sr-step-no {
  width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0; margin-top: 2px;
  background: #059669; color: #fff; font-size: 10.5px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.sr-step-what { flex: 1; min-width: 0; font-size: 12.5px; color: var(--text-primary); }
.sr-step-what :deep(.md-body p) { margin: 0; }
.sr-step-detail { display: flex; flex-wrap: wrap; gap: 5px; margin: 4px 0 0 25px; }
.sr-mini {
  font-size: 10.5px; color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.7); border: 1px solid var(--border);
  border-radius: var(--radius-full); padding: 1px 7px;
}

.sr-forms, .sr-tier, .sr-fsrs, .sr-lights, .sr-fragile { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 9px; }
.sr-forms-label { font-size: 11.5px; font-weight: 700; color: var(--text-secondary); }
.sr-chip.fragile { color: #92400e; background: #fffbeb; border-color: rgba(217, 119, 6, 0.35); cursor: help; }
.sr-tier-hop { font-size: 12px; font-weight: 600; color: var(--text-primary); font-variant-numeric: tabular-nums; cursor: help; }
.sr-tier-arrow { color: var(--text-muted); font-weight: 400; }
</style>
