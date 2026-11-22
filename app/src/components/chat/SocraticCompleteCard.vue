<template>
  <!-- socratic_complete 完成卡：最终答案 + 分步解答 + 结果徽标 + 统计小字 -->
  <div class="soc-complete">
    <div class="sc-head">
      <span class="sc-title">🎉 本次引导完成</span>
      <span class="tag" :class="outcomeCls">{{ outcomeText }}</span>
      <span v-if="card.verified" class="tag green">✓ 已验证</span>
    </div>

    <div v-if="card.final_answer" class="sc-answer">
      <div class="sc-answer-label">最终答案</div>
      <MarkdownView :text="tex(card.final_answer)" />
    </div>

    <div v-if="steps.length" class="sc-steps">
      <div class="sc-steps-label">分步解答（{{ steps.length }} 步）</div>
      <div v-for="(s, i) in steps" :key="i" class="sc-step">
        <div class="sc-step-no">{{ i + 1 }}</div>
        <div class="sc-step-body">
          <MarkdownView :text="tex(s.assertion)" />
          <div v-if="s.reason" class="sc-reason">
            <MarkdownView :text="tex(s.reason)" />
          </div>
        </div>
      </div>
    </div>

    <div class="sc-meta">
      <span v-if="diffText">难度「{{ diffText }}」</span>
      <span v-if="durationText">用时 {{ durationText }}</span>
      <span v-if="hintTotal">提示 {{ hintTotal }} 次</span>
      <span v-if="answerRequests">查看答案请求 {{ answerRequests }} 次</span>
      <!-- sgv2（DESIGN §5.3.3/§8.1）：错题已由 FSRS 自动排期，完成卡如实展示状态 -->
      <span v-if="reviewPlanned" class="tag orange">📅 错题已进复习计划</span>
    </div>

    <!-- sgv2（DESIGN §6.2/§8.2）：掌握度增量条（before 取会话开场基线，after 现查）；
         before 缺失（KC 标注失败/旧会话）时只展示当前值，不伪造增量 -->
    <div v-if="masteryDelta.length" class="sc-mastery">
      <div class="sc-mastery-label">本次掌握度变化</div>
      <div v-for="(m, i) in masteryDelta" :key="i" class="sc-mrow">
        <span class="sc-mkp">{{ m.kp_name || m.kp_code }}</span>
        <span class="sc-mbar">
          <span class="sc-mfill" :class="m.deltaCls" :style="{ width: m.afterPct }"></span>
          <span v-if="m.beforePct" class="sc-mbefore" :style="{ left: m.beforePct }"></span>
        </span>
        <span class="sc-mval">{{ m.beforeText }} → {{ m.afterText }}</span>
      </div>
    </div>

    <!-- sgv2：补课摘要（detour 摘要 + 状态徽标；无绕行则不渲染） -->
    <div v-if="detourSummary.length" class="sc-detours">
      <span v-for="(d, i) in detourSummary" :key="i" class="sc-detour" :class="`is-${d.status}`">
        🧭 {{ d.kp_name || '前置补课' }} · {{ detourStatusZh(d.status) }}<template v-if="d.rounds"> · {{ d.rounds }} 轮</template>
      </span>
    </div>
    <!-- sgv2 G9/G13 配套（DESIGN §10.4.2）：blocked 缺口回显——与后端 policy.detour_blocked_kps
         同口径（同 kp failed/skipped ≥2 → 本次不再绕行，改示范兜底），让学生看见「为什么不绕了」 -->
    <div v-for="(name, i) in blockedNames" :key="'b' + i" class="sc-detour-blocked">
      🚫 「{{ name }}」两次补课未过——这部分本次不再绕行，由老师直接示范
    </div>

    <!-- v1.4 完成后续学按钮行（对齐愿景 03：讲解完必须有下一步出口，形成学习闭环）
         sgv3（CHAIN-DESIGN §2.1/§10-W7）：新增第五出口「出一道考考 AI」——transfer
         opt-in 出口（学生点选才进 transfer 交互，会话临时复活；不点即结束），
         四出口现状全部 KEEP（举一反三/错题本/学情/结束），完成路径零回退 -->
    <div class="sc-actions">
      <button class="sc-act primary" @click="$emit('act', 'variant')">🔄 举一反三 · 再来一组变式</button>
      <button class="sc-act quizai" @click="$emit('act', 'quiz_ai')">🎭 出一道考考 AI</button>
      <button class="sc-act" @click="$emit('act', 'errorBook')">📖 查看错题本</button>
      <button class="sc-act" @click="$emit('act', 'mastery')">📈 看看我的学情</button>
      <button class="sc-act" @click="$emit('act', 'finish')">🏁 今天就到这</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import MarkdownView from '@/components/MarkdownView.vue'
import { wrapBareLatex } from '@/utils/latex'
import { difficultyName } from '@/components/student/labels'

const props = defineProps({
  card: { type: Object, required: true },
})
// v1.4：完成卡按钮行（variant/errorBook/mastery/finish，由 MessageBubble → ChatView 承接）
defineEmits(['act'])

// 裸 LaTeX（无 $ 定界符）自动包装后再渲染，避免 \dfrac 等源码直接显示
// v1.6：剥掉模型漏进步骤文本的 [[STEP]] / [[STEP] 标记（实测 step reason 里出现裸标记）
const stripStepMarks = (v) => String(v ?? '').replace(/\s*\[\[STEP\]\]?/g, ' ')
const tex = (v) => wrapBareLatex(stripStepMarks(v))

const steps = computed(() => (Array.isArray(props.card.steps) ? props.card.steps : []))

const outcomeText = computed(
  () => ({ independent: '独立完成', guided: '引导完成', revealed: '查看解答' }[props.card.outcome] || '已完成')
)
const outcomeCls = computed(
  () => ({ independent: 'green', guided: 'cyan', revealed: 'orange' }[props.card.outcome] || 'gray')
)

const diffText = computed(() => difficultyName(props.card.difficulty))

const durationText = computed(() => {
  const s = Number(props.card.duration_s)
  if (!Number.isFinite(s)) return ''
  if (s < 60) return `${s} 秒`
  return `${Math.floor(s / 60)} 分 ${s % 60} 秒`
})

const hintTotal = computed(() => Number(props.card.hint_stats?.total) || 0)
const answerRequests = computed(() => Number(props.card.hint_stats?.answer_requests) || 0)

/* ===== sgv2（DESIGN §6.2 完成卡扩展）===== */

// 掌握度增量：[{kp_code, kp_name, before, after}]（before 取 plan.mastery_baseline，
// 后端 main.py:_mastery_delta）；防御判空——before/after 缺失只展示有值一侧
const masteryDelta = computed(() =>
  (Array.isArray(props.card.mastery_delta) ? props.card.mastery_delta : [])
    .filter((m) => m && (m.after != null || m.before != null))
    .map((m) => {
      const pct = (v) => (v == null ? '' : `${Math.max(2, Math.min(100, Math.round(v * 100)))}%`)
      const fmt = (v) => (v == null ? '—' : `${Math.round(v * 100)}%`)
      const improved = m.after != null && m.before != null ? m.after >= m.before : true
      return {
        ...m,
        afterPct: pct(m.after) || '0%',
        beforePct: pct(m.before),
        beforeText: fmt(m.before),
        afterText: fmt(m.after),
        deltaCls: improved ? 'up' : 'down',
      }
    })
)

// 补课摘要：[{kp_name, status, rounds}]（后端 _detour_summary）
const detourSummary = computed(() =>
  (Array.isArray(props.card.detour_summary) ? props.card.detour_summary : []).filter(
    (d) => d && (d.kp_name || d.status)
  )
)
function detourStatusZh(status) {
  return { passed: '检验通过', failed: '未通过', skipped: '已跳过' }[status] || status || '已结束'
}

// G9/G13 配套（DESIGN §10.4.2）：blocked 缺口推导——与后端 policy.detour_blocked_kps
// （policy.py:393-402）同口径：同 kp 的 failed/skipped 记录 ≥2 → blocked。摘要卡无 kp_code，
// 按 kp_name 归组（同会话内同名即同 kp）。blocked kp 后端强制档 3 示范兜底，如实展示。
const blockedNames = computed(() => {
  const counts = new Map()
  for (const d of detourSummary.value) {
    if (d.status === 'failed' || d.status === 'skipped') {
      const k = String(d.kp_name || '').trim()
      if (k) counts.set(k, (counts.get(k) || 0) + 1)
    }
  }
  return [...counts.entries()].filter(([, n]) => n >= 2).map(([k]) => k)
})

// 「已进复习计划」徽标：会话出现过 wrong/partial 判定（错因分布非空）→
// 错题已入库并获 FSRS 排期（后端 _record_attempt_error 自动排期，§5.3.3）
const reviewPlanned = computed(() =>
  Object.values(props.card.misconceptions || {}).some((n) => Number(n) > 0)
)
</script>

<style scoped>
.soc-complete {
  margin-top: 10px; padding: 12px 14px; border-radius: var(--radius-md);
  border: 1px solid rgba(16, 185, 129, 0.35); background: rgba(236, 253, 245, 0.55);
}
.sc-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
.sc-title { font-size: 13px; font-weight: 700; color: #059669; }

.sc-answer {
  padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); margin-bottom: var(--space-3);
  background: var(--primary-subtle);
  border: 1px solid var(--primary-border);
}
.sc-answer-label { font-size: 11px; font-weight: 700; color: var(--primary); margin-bottom: 4px; }

.sc-steps-label { font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 8px; }
.sc-step { display: flex; gap: 8px; margin-bottom: 10px; }
.sc-step-no {
  width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0; margin-top: 1px;
  background: var(--primary); color: #fff; font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.sc-step-body { flex: 1; min-width: 0; font-size: 13px; }
.sc-reason {
  margin-top: 4px; padding: 6px 10px; border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.7); border-left: 3px solid var(--primary-light);
  font-size: 12px; color: var(--text-secondary);
}
.sc-reason :deep(.md-body) { font-size: 12px; color: var(--text-secondary); }

.sc-meta {
  display: flex; flex-wrap: wrap; gap: 10px; font-size: 11px; color: var(--text-muted);
  border-top: 1px dashed var(--border); padding-top: 8px; align-items: center;
}

/* sgv2：掌握度增量条（before 基线刻度 + after 填充） */
.sc-mastery { margin-top: 10px; }
.sc-mastery-label { font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px; }
.sc-mrow { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; font-size: 12px; }
.sc-mkp { flex: 0 0 auto; max-width: 40%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-primary); font-weight: 600; }
.sc-mbar {
  position: relative; flex: 1; height: 8px; border-radius: 999px;
  background: var(--bg-subtle, #eef2f7); overflow: hidden;
}
.sc-mfill { position: absolute; inset: 0 auto 0 0; border-radius: 999px; transition: width .3s ease; }
.sc-mfill.up { background: linear-gradient(90deg, #059669, #34d399); }
.sc-mfill.down { background: linear-gradient(90deg, #d97706, #fbbf24); }
.sc-mbefore {
  position: absolute; top: -2px; bottom: -2px; width: 2px; border-radius: 1px;
  background: rgba(91, 91, 214, 0.55);
}
.sc-mval { flex: 0 0 auto; font-variant-numeric: tabular-nums; color: var(--text-secondary); }

/* sgv2：补课摘要徽标 */
.sc-detours { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 9px; }
.sc-detour { font-size: 11px; border-radius: var(--radius-full); padding: 2px 9px; }
.sc-detour.is-passed { color: #047857; background: #ecfdf5; border: 1px solid rgba(5, 150, 105, 0.3); }
.sc-detour.is-failed { color: #b45309; background: #fffbeb; border: 1px solid rgba(217, 119, 6, 0.3); }
.sc-detour.is-skipped { color: var(--text-secondary); background: var(--bg-subtle, #f1f5f9); border: 1px solid var(--border); }
/* G9/G13：blocked 缺口说明行（诚实展示「不再绕行」决策，不留静默空壳） */
.sc-detour-blocked {
  margin-top: 8px; font-size: 11.5px; line-height: 1.6;
  color: #92400e; background: rgba(255, 251, 235, 0.75);
  border: 1px dashed rgba(217, 119, 6, 0.4); border-radius: var(--radius-sm); padding: 6px 10px;
}

/* v1.4 完成卡按钮行 */
.sc-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.sc-act {
  padding: 7px 14px; border-radius: var(--radius-md); cursor: pointer;
  border: 1px solid var(--border); background: var(--bg-white);
  font-size: 12.5px; font-weight: 600; color: var(--text-secondary);
  transition: all var(--transition-fast);
}
.sc-act:hover { border-color: var(--primary-border); color: var(--primary); background: var(--primary-subtle); }
.sc-act.primary {
  border-color: var(--primary-border); color: #fff;
  background: linear-gradient(135deg, var(--primary, #5b5bd6) 0%, #7c7ce0 100%);
}
.sc-act.primary:hover { filter: brightness(1.06); color: #fff; }
/* sgv3 transfer 出口：反转色（学生当老师——紫→青，与主出口并重但不喧宾） */
.sc-act.quizai {
  border-color: rgba(13, 148, 136, 0.4); color: #0f766e;
  background: linear-gradient(135deg, #f0fdfa 0%, #ecfeff 100%);
}
.sc-act.quizai:hover { border-color: #0d9488; color: #0f766e; background: #cffafe; }
</style>
