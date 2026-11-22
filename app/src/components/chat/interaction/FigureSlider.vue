<template>
  <div class="ix-fs">
    <!-- sgv4（DESIGN §4.1 figure_slider / F4）滑块参数试探 · 认知动作「构造」的低输入形态。
         拖滑块 → 曲线实时重绘（曲线式可引用滑块变量，经 vars 绑定求值）；
         松手（change）计一次试探 → trials 入数据飞轮（R5：试探次数=犹豫/试错信号）。
         提交 payload {values:{id:value}, trials}；数值容差判定在后端（_answer 剥离不下发）。
         figure plan 归一/曲线采样复用 figurePlan.js（与 FigureProbe 单一能力源）。 -->
    <div v-if="promptText" class="ix-fs-prompt">{{ promptText }}</div>

    <svg class="ix-fs-svg" viewBox="0 0 100 75" preserveAspectRatio="xMidYMid meet" role="img" aria-label="滑块参数图形">
      <g v-for="g in grid" :key="g.k">
        <line :x1="g.x1" :y1="g.y1" :x2="g.x2" :y2="g.y2" class="fs-grid" />
      </g>
      <line v-if="axisY !== null" x1="0" :y1="axisY" x2="100" :y2="axisY" class="fs-axis" />
      <line v-if="axisX !== null" :x1="axisX" y1="0" :x2="axisX" y2="75" class="fs-axis" />
      <path v-for="(c, i) in curvePaths" :key="'c' + i" :d="c.d" class="fs-curve" :style="{ stroke: c.color }" />
      <g v-for="p in planPoints" :key="'pp' + p.label">
        <circle :cx="p.px" :cy="p.py" r="1.3" class="fs-planpt" />
        <text v-if="p.label" :x="p.px + 2" :y="p.py - 1.8" class="fs-planpt-label">{{ p.label }}</text>
      </g>
    </svg>

    <!-- 滑块面板 -->
    <div v-if="sliders.length" class="ix-fs-panel">
      <div v-for="s in sliders" :key="s.id" class="ix-fs-row">
        <span class="ix-fs-name">{{ s.label || s.id }}</span>
        <input
          type="range" class="ix-fs-range" :data-fs-slider="String(s.id)"
          :min="s.min" :max="s.max" :step="s.step" :value="sliderValues[s.id]"
          @input="onSlide(s.id, $event)" @change="onCommit"
        />
        <span class="ix-fs-val" :data-fs-value="String(s.id)">{{ fmtVal(sliderValues[s.id]) }}</span>
      </div>
      <div class="ix-fs-trials">已试探 {{ trials }} 次——拖动看曲线怎么变，觉得对了就提交</div>
    </div>
    <div v-else class="ix-fs-empty">这道题的滑块还没有就绪——可以直接打字告诉我你的判断</div>

    <div class="ix-fs-actions">
      <button type="button" class="ix-submit" :disabled="!sliders.length" @click="submit">就这组参数</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { normalizeFigure, figureView, sampleCurves } from './figurePlan'

const props = defineProps({
  /** sgv4 §4.1 figure_slider spec：{figure, sliders:[{id,min,max,step,value,label?}], prompt}
   *  （_answer={id:{value,tol}} 后端剥离不下发） */
  spec: { type: Object, required: true },
})
const emit = defineEmits(['submit', 'edit'])

const promptText = computed(() => String(props.spec?.prompt || '').trim())
const fig = computed(() => normalizeFigure(props.spec?.figure))
const view = computed(() => figureView(fig.value.params))
const gx = (x) => ((x - view.value[0]) / (view.value[1] - view.value[0])) * 100
const gy = (y) => 75 - ((y - view.value[2]) / (view.value[3] - view.value[2])) * 75
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

/* ===== 滑块状态：spec 初值 → values；change 提交试探计数 ===== */
const sliders = computed(() =>
  (Array.isArray(props.spec?.sliders) ? props.spec.sliders : [])
    .filter((s) => s && s.id != null)
    .map((s) => ({
      id: String(s.id),
      label: s.label != null ? String(s.label) : '',
      min: Number.isFinite(Number(s.min)) ? Number(s.min) : 0,
      max: Number.isFinite(Number(s.max)) ? Number(s.max) : 10,
      step: Number(s.step) > 0 ? Number(s.step) : 0.1,
      value: Number.isFinite(Number(s.value)) ? Number(s.value) : 0,
    })),
)
const initValues = () => Object.fromEntries(sliders.value.map((s) => [s.id, s.value]))
const sliderValues = ref(initValues())
const trials = ref(0)
function onSlide(id, evt) {
  const v = Number(evt.target?.value)
  if (!Number.isFinite(v)) return
  sliderValues.value = { ...sliderValues.value, [id]: v }
}
function onCommit() {
  trials.value += 1
  emit('edit') // 一次试探（松手提交）计一次 edit
}
const fmtVal = (v) => (Number.isFinite(Number(v)) ? String(Math.round(Number(v) * 100) / 100) : '—')

/* ===== 曲线：滑块值作为表达式变量实时重绘 ===== */
const curvePaths = computed(() => sampleCurves(fig.value, view.value, gx, gy, 75, { ...sliderValues.value }).paths)
const planPoints = computed(() =>
  (Array.isArray(fig.value.params?.points) ? fig.value.params.points : [])
    .filter((p) => p && Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y)))
    .slice(0, 12)
    .map((p) => ({ px: gx(Number(p.x)), py: gy(Number(p.y)), label: String(p.label || '') })),
)

/* ===== 提交：{values:{id:value}, trials} ===== */
function submit() {
  if (!sliders.value.length) return
  const values = {}
  for (const s of sliders.value) values[s.id] = Math.round(Number(sliderValues.value[s.id]) * 1000) / 1000
  emit('submit', { values, trials: trials.value })
}
</script>

<style scoped>
.ix-fs { font-size: 13px; }
.ix-fs-prompt { font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; }
.ix-fs-svg { width: 100%; height: auto; display: block; background: rgba(255, 255, 255, 0.92); border: 1px solid var(--border); border-radius: var(--radius-sm); }
.fs-grid { stroke: #e2e8f0; stroke-width: 0.3; }
.fs-axis { stroke: #94a3b8; stroke-width: 0.5; }
.fs-curve { fill: none; stroke-width: 0.9; stroke-linecap: round; }
.fs-planpt { fill: #64748b; }
.fs-planpt-label { font-size: 3.6px; fill: #475569; }
.ix-fs-panel { margin-top: 8px; }
.ix-fs-row { display: flex; align-items: center; gap: 9px; margin-bottom: 7px; }
.ix-fs-name { flex: 0 0 auto; font-size: 12.5px; font-weight: 700; color: #6d28d9; min-width: 56px; }
.ix-fs-range { flex: 1; min-width: 0; accent-color: #7c3aed; }
.ix-fs-val { flex: 0 0 44px; text-align: right; font-size: 12.5px; font-variant-numeric: tabular-nums; font-weight: 700; color: var(--text-primary); }
.ix-fs-trials { font-size: 11px; color: var(--text-muted); }
.ix-fs-empty { font-size: 12px; color: var(--text-muted); padding: 6px 0; }
.ix-fs-actions { margin-top: 9px; }
.ix-submit {
  padding: 7px 16px; border-radius: var(--radius-md); cursor: pointer; font-size: 12.5px; font-weight: 700;
  border: 1px solid rgba(139, 92, 246, 0.45); color: #fff;
  background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); transition: filter .15s;
}
.ix-submit:disabled { opacity: 0.4; cursor: not-allowed; }
.ix-submit:not(:disabled):hover { filter: brightness(1.06); }
</style>
