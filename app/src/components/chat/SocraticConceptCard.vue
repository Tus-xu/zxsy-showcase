<template>
  <div class="soc-concept" data-soc-concept-card="">
    <!-- sgv4（DESIGN §5.5 L2 / F7b）L2 概念卡（socratic_concept_card）：
         提示阶梯 L2 = 教材溯源讲解（§6 同链路：kb_retrieve + 出处）+ 配可视化小工具
         + 原 completion 交互（交互部分由后端随后下发的 socratic_interaction 卡承载）。
         复用 SocraticDetourCard 骨架纪律（防御判空/Markdown+KaTeX/动作白名单透传）；
         与 detour 卡区分：无检验题、无 resume/skip——continue 是唯一出口（→检验/练习交互），
         防跳过检验（T13 讲完必检验，无旁路）。 -->
    <div class="scc-head">
      <span class="scc-title">📘 先把这个概念讲清楚</span>
      <span v-if="card.kp_name" class="scc-kp">{{ card.kp_name }}</span>
    </div>

    <!-- sgv4：内容降级声明（R7/A5：未关联到教材原文时显式标注，绝不静默编造） -->
    <div v-if="degradedZh" class="scc-degraded" data-scc-degraded="">
      ⚠ {{ degradedZh }}
    </div>

    <!-- 讲解区（Markdown + KaTeX；wrapBareLatex 裸式子包装） -->
    <div v-if="contentText" class="scc-body">
      <div class="scc-md"><MarkdownView :text="tex(contentText)" /></div>
    </div>

    <!-- 可视化小工具：frames 形态走 MathFigure（渐进帧）；figure plan JSON 形态渲染静态 SVG -->
    <MathFigure v-if="figureFrames.length" :figure="card.figure" :question-figure="true" />
    <svg v-else-if="curvePaths.length" class="scc-fig" viewBox="0 0 100 75" preserveAspectRatio="xMidYMid meet" role="img" aria-label="概念配图">
      <line v-if="axisY !== null" x1="0" :y1="axisY" x2="100" :y2="axisY" class="scc-axis" />
      <line v-if="axisX !== null" :x1="axisX" y1="0" :x2="axisX" y2="75" class="scc-axis" />
      <path v-for="(c, i) in curvePaths" :key="'c' + i" :d="c.d" class="scc-curve" :style="{ stroke: c.color }" />
      <g v-for="p in planPoints" :key="'p' + p.label">
        <circle :cx="p.px" :cy="p.py" r="1.3" class="scc-planpt" />
        <text v-if="p.label" :x="p.px + 2" :y="p.py - 1.8" class="scc-planpt-label">{{ p.label }}</text>
      </g>
    </svg>

    <!-- 教材溯源出处徽标（R7/A4） -->
    <SocraticCitations :citations="cardCitations" />

    <div class="scc-actions">
      <!-- 唯一出口：continue → 后端下发检验/练习交互（讲完必检验，无跳过按钮） -->
      <button type="button" class="scc-continue" data-scc-continue="" @click="$emit('act', actValue)">
        我看懂了，继续 →
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import MarkdownView from '@/components/MarkdownView.vue'
import MathFigure from './MathFigure.vue'
import SocraticCitations from './SocraticCitations.vue'
import { wrapBareLatex } from '@/utils/latex'
import { normalizeFigure, figureView, sampleCurves } from './interaction/figurePlan'

const props = defineProps({
  /** sgv4 概念卡（后端 _issue_concept_card）：{card_type:'socratic_concept_card', kp_name?,
   *  content?/worked_example?/teaching?, citations?, degraded?, figure?, act_value?} */
  card: { type: Object, required: true },
})
// act：continue（MessageBubble 转 tutorAction → 视图组 tutor_action 透传；
// act_value 缺省 'concept_continue'——后端 B6 ⑧ 契约值，agent_router 白名单同步）
defineEmits(['act'])

const tex = (v) => wrapBareLatex(String(v ?? ''))
const contentText = computed(() =>
  String(props.card?.content || props.card?.worked_example || props.card?.teaching || '').trim())
const actValue = computed(() => String(props.card?.act_value || 'concept_continue'))

/* ===== R7：溯源出处与降级声明 ===== */
const cardCitations = computed(() => (Array.isArray(props.card?.citations) ? props.card.citations : []))
const degradedZh = computed(() => {
  const d = props.card?.degraded
  return d && typeof d === 'object' ? String(d.zh || d.message || '').trim() : ''
})

/* ===== 可视化小工具：frames 形态 → MathFigure；figure plan JSON → 静态 SVG ===== */
const figureFrames = computed(() =>
  (Array.isArray(props.card?.figure?.frames) ? props.card.figure.frames : []))
const fig = computed(() => normalizeFigure(!figureFrames.value.length ? props.card?.figure : null))
const view = computed(() => figureView(fig.value.params))
const gx = (x) => ((x - view.value[0]) / (view.value[1] - view.value[0])) * 100
const gy = (y) => 75 - ((y - view.value[2]) / (view.value[3] - view.value[2])) * 75
const axisY = computed(() => (view.value[2] <= 0 && view.value[3] >= 0 ? gy(0) : null))
const axisX = computed(() => (view.value[0] <= 0 && view.value[1] >= 0 ? gx(0) : null))
const curvePaths = computed(() => sampleCurves(fig.value, view.value, gx, gy, 75).paths)
const planPoints = computed(() =>
  (Array.isArray(fig.value.params?.points) ? fig.value.params.points : [])
    .filter((p) => p && Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y)))
    .slice(0, 12)
    .map((p) => ({ px: gx(Number(p.x)), py: gy(Number(p.y)), label: String(p.label || '') })),
)
</script>

<style scoped>
.soc-concept {
  margin-top: 10px; padding: 12px 14px; border-radius: var(--radius-md);
  border: 1px solid rgba(13, 148, 136, 0.35); background: rgba(240, 253, 250, 0.65);
}
.scc-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.scc-title { font-size: 13px; font-weight: 700; color: #0f766e; }
.scc-kp {
  font-size: 11px; color: #0f766e; background: #ccfbf1;
  border-radius: 999px; padding: 1px 8px; font-weight: 600;
}
/* 降级声明（R7/A5） */
.scc-degraded {
  font-size: 12px; font-weight: 600; color: #b45309; background: #fffbeb;
  border: 1px solid rgba(217, 119, 6, 0.4); border-radius: var(--radius-sm);
  padding: 5px 10px; margin-bottom: 8px;
}
/* 讲解区 */
.scc-body {
  padding: 9px 11px; border-radius: var(--radius-sm); margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.88); border: 1px solid var(--border);
}
.scc-md { font-size: 13px; line-height: 1.7; }
.scc-md :deep(.md-body p) { margin: 0 0 6px; }
/* 静态配图（figure plan JSON 形态） */
.scc-fig {
  width: 100%; height: auto; display: block; margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.92); border: 1px solid var(--border); border-radius: var(--radius-sm);
}
.scc-axis { stroke: #94a3b8; stroke-width: 0.5; }
.scc-curve { fill: none; stroke-width: 0.9; stroke-linecap: round; }
.scc-planpt { fill: #0f766e; }
.scc-planpt-label { font-size: 3.6px; fill: #115e59; }
/* continue：唯一出口（讲完必检验，无跳过） */
.scc-actions { display: flex; justify-content: flex-end; }
.scc-continue {
  padding: 8px 18px; border-radius: var(--radius-md); cursor: pointer; font-size: 13px; font-weight: 700;
  border: 1px solid rgba(13, 148, 136, 0.5); color: #fff;
  background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); transition: filter .15s;
}
.scc-continue:hover { filter: brightness(1.06); }
</style>
