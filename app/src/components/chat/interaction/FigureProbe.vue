<template>
  <div class="ix-fp" :data-fp-mode="mode">
    <!-- sgv4（DESIGN §4.1 figure_probe / F3）图上探点 · 认知动作「标注」（R-图象对象优先）。
         spec.figure 是后端图形 plan JSON（figures.py：{type:'function', params:{curves,x_range,y_range,points}}
         或 {params, caption} 包装，双形态防御）；mode=point 图上点选 / mode=glider 沿曲线滑动。
         提交 payload {picked:[{x,y}]}（数学坐标，容差判定在后端）。
         泄题纪律：spec.targets 是判定目标（答案坐标），前端绝不渲染不提示；
         曲线求值复用 utils/exprEval（GraphBlock 解析器抽出共享，禁平行内核）。 -->
    <div v-if="promptText" class="ix-fp-prompt">{{ promptText }}</div>

    <svg
      ref="svgRef" class="ix-fp-svg" viewBox="0 0 100 75" preserveAspectRatio="xMidYMid meet"
      role="img" aria-label="图上探点" @pointerdown="onPlaneDown" @pointermove="onMove" @pointerup="onUp" @pointerleave="onUp"
    >
      <!-- 网格（整数刻度，稀疏防密） -->
      <g v-for="g in grid" :key="g.k">
        <line :x1="g.x1" :y1="g.y1" :x2="g.x2" :y2="g.y2" class="fp-grid" />
      </g>
      <!-- 坐标轴 -->
      <line v-if="axisY !== null" x1="0" :y1="axisY" x2="100" :y2="axisY" class="fp-axis" />
      <line v-if="axisX !== null" :x1="axisX" y1="0" :x2="axisX" y2="75" class="fp-axis" />
      <!-- 曲线（function 类型；多曲线取前 4 条） -->
      <path v-for="(c, i) in curvePaths" :key="'c' + i" :d="c.d" class="fp-curve" :style="{ stroke: c.color }" />
      <!-- plan 自带标注点（固定展示，不可拖） -->
      <g v-for="p in planPoints" :key="'pp' + p.label">
        <circle :cx="p.px" :cy="p.py" r="1.3" class="fp-planpt" />
        <text :x="p.px + 2" :y="p.py - 1.8" class="fp-planpt-label">{{ p.label }}</text>
      </g>
      <!-- 已点选的探点 -->
      <g v-for="(pk, i) in pickedPts" :key="'pk' + i" class="fp-picked">
        <circle :cx="pk.px" :cy="pk.py" r="2.6" class="fp-picked-hit" />
        <circle :cx="pk.px" :cy="pk.py" r="1.1" class="fp-picked-dot" />
      </g>
      <!-- glider：约束在首条曲线上的滑动点 -->
      <g v-if="mode === 'glider' && gliderPt" class="fp-glider" :class="{ active: gliding }" data-fp-glider="" @pointerdown.stop.prevent="gliding = true">
        <circle :cx="gliderPt.px" :cy="gliderPt.py" r="3.2" class="fp-glider-hit" />
        <circle :cx="gliderPt.px" :cy="gliderPt.py" r="1.5" class="fp-glider-dot" />
      </g>
    </svg>

    <div class="ix-fp-meta">
      <span v-if="mode === 'point'" class="ix-fp-count">已点 {{ pickedPts.length }} 处（点图落点，再点同处取消）</span>
      <span v-else class="ix-fp-count">拖动沿曲线的探点到目标位置</span>
      <button v-if="mode === 'point' && pickedPts.length" type="button" class="ix-fp-undo" @click="undoPick">撤销上一点</button>
      <span v-if="degradedNote" class="ix-fp-degrade">{{ degradedNote }}</span>
    </div>

    <div class="ix-fp-actions">
      <button type="button" class="ix-submit" :disabled="!canSubmit" @click="submit">
        {{ mode === 'point' ? '点好了' : '就这里' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { tryCompileExpr } from '@/utils/exprEval'
import { normalizeFigure, figureView, sampleCurves } from './figurePlan'

const props = defineProps({
  /** sgv4 §4.1 figure_probe spec：{figure, mode:point|glider, prompt, targets}
   *  （targets=判定答案坐标，前端只收不渲染——泄题红线） */
  spec: { type: Object, required: true },
})
const emit = defineEmits(['submit', 'edit'])

const mode = computed(() => (String(props.spec?.mode || '').trim() === 'glider' ? 'glider' : 'point'))
const promptText = computed(() => String(props.spec?.prompt || '').trim())

/* ===== figure plan 归一（共享 figurePlan.js）：{type,params} 直取 / {params,caption} 包装 ===== */
const fig = computed(() => normalizeFigure(props.spec?.figure))

/* ===== 视窗：x_range/y_range（缺失默认 [-6,6]×[-4,4]）→ viewBox 100x75 ===== */
const view = computed(() => figureView(fig.value.params))
const gx = (x) => ((x - view.value[0]) / (view.value[1] - view.value[0])) * 100
const gy = (y) => 75 - ((y - view.value[2]) / (view.value[3] - view.value[2])) * 75
const invX = (px) => view.value[0] + (px / 100) * (view.value[1] - view.value[0])
const invY = (py) => view.value[2] + ((75 - py) / 75) * (view.value[3] - view.value[2])
const axisY = computed(() => (view.value[2] <= 0 && view.value[3] >= 0 ? gy(0) : null))
const axisX = computed(() => (view.value[0] <= 0 && view.value[1] >= 0 ? gx(0) : null))

const grid = computed(() => {
  const out = []
  const stepX = Math.max(1, Math.round((view.value[1] - view.value[0]) / 10))
  const stepY = Math.max(1, Math.round((view.value[3] - view.value[2]) / 8))
  for (let x = Math.ceil(view.value[0]); x <= Math.floor(view.value[1]); x += stepX) {
    out.push({ k: `x${x}`, x1: gx(x), y1: 0, x2: gx(x), y2: 75 })
  }
  for (let y = Math.ceil(view.value[2]); y <= Math.floor(view.value[3]); y += stepY) {
    out.push({ k: `y${y}`, x1: 0, y1: gy(y), x2: 100, y2: gy(y) })
  }
  return out
})

/* ===== 曲线采样（共享 sampleCurves；编译失败/非 function 降级为裸坐标系） ===== */
const curvePaths = computed(() => sampleCurves(fig.value, view.value, gx, gy, 75).paths)
const planPoints = computed(() =>
  (Array.isArray(fig.value.params?.points) ? fig.value.params.points : [])
    .filter((p) => p && Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y)))
    .slice(0, 12)
    .map((p) => ({ px: gx(Number(p.x)), py: gy(Number(p.y)), label: String(p.label || '') })),
)
const degradedNote = computed(() => {
  if (fig.value.type === 'function' && curvePaths.value.length) return ''
  return fig.value.type && fig.value.type !== 'function' ? '该图形类型暂不支持探点交互，已显示坐标系' : ''
})

/* ===== point 模式：图上落点（clientX → 数学坐标；同点再点取消） ===== */
const svgRef = ref(null)
const picks = ref([]) // [{x,y}]
const pickedPts = computed(() => picks.value.map((p) => ({ px: gx(p.x), py: gy(p.y) })))
function planeCoord(evt) {
  const host = svgRef.value
  if (!host) return null
  const rect = host.getBoundingClientRect()
  if (!rect.width || !rect.height) return null
  const px = ((evt.clientX - rect.left) / rect.width) * 100
  const py = ((evt.clientY - rect.top) / rect.height) * 75
  if (px < 0 || px > 100 || py < 0 || py > 75) return null
  return { x: Math.round(invX(px) * 100) / 100, y: Math.round(invY(py) * 100) / 100 }
}
function onPlaneDown(evt) {
  if (mode.value === 'glider') return // glider 自身的 pointerdown 在 .fp-glider 上（.stop）
  const c = planeCoord(evt)
  if (!c) return
  const i = picks.value.findIndex((p) => Math.abs(p.x - c.x) < 0.15 && Math.abs(p.y - c.y) < 0.15)
  if (i >= 0) {
    picks.value = picks.value.filter((_, k) => k !== i)
  } else {
    picks.value = [...picks.value, c]
  }
  emit('edit')
}
function undoPick() {
  if (!picks.value.length) return
  picks.value = picks.value.slice(0, -1)
  emit('edit')
}

/* ===== glider 模式：约束在首条曲线上滑动 ===== */
const gliderX = ref(null)
const gliding = ref(false)
const gliderFn = computed(() => curvePaths.value.length && fig.value.params?.curves?.[0] ? tryCompileExpr(fig.value.params.curves[0].expr) : null)
const gliderPt = computed(() => {
  if (mode.value !== 'glider') return null
  if (!gliderFn.value) return null
  const x = gliderX.value === null ? (view.value[0] + view.value[1]) / 2 : gliderX.value
  const y = gliderFn.value(x)
  if (!Number.isFinite(y)) return null
  return { px: gx(x), py: gy(y), x, y }
})
function onMove(evt) {
  if (!gliding.value || !svgRef.value) return
  const host = svgRef.value
  const rect = host.getBoundingClientRect()
  if (!rect.width) return
  const px = Math.min(100, Math.max(0, ((evt.clientX - rect.left) / rect.width) * 100))
  gliderX.value = Math.round(invX(px) * 100) / 100
}
function onUp() {
  if (gliding.value) {
    gliding.value = false
    emit('edit') // 一次拖动落定计一次 edit
  }
}

/* ===== 提交：{picked:[{x,y}]}（point=全部落点 / glider=单点位置） ===== */
const canSubmit = computed(() => (mode.value === 'point' ? picks.value.length > 0 : !!gliderPt.value))
function submit() {
  if (!canSubmit.value) return
  const picked = mode.value === 'point'
    ? picks.value.map((p) => ({ x: p.x, y: p.y }))
    : [{ x: Math.round(gliderPt.value.x * 100) / 100, y: Math.round(gliderPt.value.y * 100) / 100 }]
  emit('submit', { picked })
}
</script>

<style scoped>
.ix-fp { font-size: 13px; }
.ix-fp-prompt { font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; }
.ix-fp-svg {
  width: 100%; height: auto; display: block; touch-action: none;
  background: rgba(255, 255, 255, 0.92); border: 1px solid var(--border); border-radius: var(--radius-sm);
}
.fp-grid { stroke: #e2e8f0; stroke-width: 0.3; }
.fp-axis { stroke: #94a3b8; stroke-width: 0.5; }
.fp-curve { fill: none; stroke-width: 0.9; stroke-linecap: round; }
.fp-planpt { fill: #64748b; }
.fp-planpt-label { font-size: 3.6px; fill: #475569; }
.fp-picked-hit { fill: rgba(139, 92, 246, 0.25); stroke: #7c3aed; stroke-width: 0.4; cursor: pointer; }
.fp-picked-dot { fill: #7c3aed; }
.fp-glider { cursor: grab; }
.fp-glider.active { cursor: grabbing; }
.fp-glider-hit { fill: rgba(139, 92, 246, 0.2); stroke: #7c3aed; stroke-width: 0.55; }
.fp-glider-dot { fill: #7c3aed; }
.ix-fp-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 6px; }
.ix-fp-count { font-size: 11.5px; color: var(--text-muted); }
.ix-fp-undo {
  border: 1px solid var(--border); background: var(--bg-white); color: var(--text-secondary);
  border-radius: var(--radius-sm); padding: 2px 9px; font-size: 11.5px; cursor: pointer;
}
.ix-fp-undo:hover { border-color: #8b5cf6; color: #6d28d9; }
.ix-fp-degrade { font-size: 11px; color: #b45309; }
.ix-fp-actions { margin-top: 8px; }
.ix-submit {
  padding: 7px 16px; border-radius: var(--radius-md); cursor: pointer; font-size: 12.5px; font-weight: 700;
  border: 1px solid rgba(139, 92, 246, 0.45); color: #fff;
  background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); transition: filter .15s;
}
.ix-submit:disabled { opacity: 0.4; cursor: not-allowed; }
.ix-submit:not(:disabled):hover { filter: brightness(1.06); }
</style>
