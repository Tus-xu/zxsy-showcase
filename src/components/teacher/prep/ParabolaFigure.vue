<!-- 二次函数参数图形：a、h、k 变化时抛物线、顶点、对称轴与公式同步刷新（纯 SVG，可离线） -->
<template>
  <div class="parabola-figure">
    <svg v-if="valid" :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="`二次函数 a=${a} 顶点(${h},${k}) 的示意图`">
      <defs>
        <marker id="pf-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
        </marker>
        <clipPath :id="clipId">
          <rect x="26" y="14" :width="W - 48" :height="H - 40" />
        </clipPath>
      </defs>

      <line x1="24" :y1="originY" :x2="W - 20" :y2="originY" stroke="#64748b" stroke-width="1.1" marker-end="url(#pf-arrow)" />
      <line :x1="originX" :y1="H - 26" :x2="originX" y2="16" stroke="#64748b" stroke-width="1.1" marker-end="url(#pf-arrow)" />
      <text :x="W - 14" :y="originY - 8" class="pf-axis-label">x</text>
      <text :x="originX + 8" y="26" class="pf-axis-label">y</text>
      <text :x="originX - 14" :y="originY + 16" class="pf-axis-label">O</text>

      <!-- 对称轴 -->
      <line
        :x1="vx"
        y1="18"
        :x2="vx"
        :y2="H - 30"
        stroke="#f59e0b"
        stroke-width="1.2"
        stroke-dasharray="5 4"
      />
      <text :x="vx + 6" y="34" class="pf-axis-light">x = {{ fmt(h) }}</text>

      <!-- 抛物线 -->
      <path :d="curve" fill="none" :stroke="color" :stroke-width="strokeWidth" :clip-path="`url(#${clipId})`" />

      <!-- 顶点 -->
      <circle :cx="vx" :cy="vy" r="4.4" fill="#dc2626" />
      <text v-if="showLabels" :x="vx + 9" :y="vy - 8" class="pf-point-label">V({{ fmt(h) }}, {{ fmt(k) }})</text>
      <text v-if="showLabels && extremum" :x="vx + 9" :y="vy + 18" class="pf-extremum">{{ extremum }}</text>
    </svg>
    <div v-else class="parabola-figure__invalid">
      <svg :viewBox="`0 0 ${W} ${H}`" aria-hidden="true">
        <text :x="W / 2" :y="H / 2" class="pf-invalid-text" text-anchor="middle">参数无效</text>
      </svg>
      <p>{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  a: { type: Number, default: 2 },
  h: { type: Number, default: -2 },
  k: { type: Number, default: -3 },
  valid: { type: Boolean, default: true },
  error: { type: String, default: '' },
  extremum: { type: String, default: '' },
  showLabels: { type: Boolean, default: true },
  color: { type: String, default: '#2563eb' },
  strokeWidth: { type: Number, default: 2.4 },
})

const W = 440
const H = 280
const clipId = `pf-clip-${Math.random().toString(36).slice(2, 8)}`
const padL = 46
const padR = 24
const padT = 20
const padB = 34

const spanX = 5.4
const xMin = computed(() => props.h - spanX)
const xMax = computed(() => props.h + spanX)
const yAtEdge = computed(() => props.a * spanX * spanX + props.k)
const yTop = computed(() => Math.max(yAtEdge.value, props.k) + 1.2)
const yBot = computed(() => Math.min(yAtEdge.value, props.k) - 1.2)

const originX = computed(() => {
  const span = xMax.value - xMin.value
  const x = ((0 - xMin.value) / span) * (W - padL - padR) + padL
  return Math.min(W - padR, Math.max(padL, x))
})
const originY = computed(() => {
  const span = yTop.value - yBot.value
  const y = ((yTop.value - 0) / span) * (H - padT - padB) + padT
  return Math.min(H - padB, Math.max(padT, y))
})

function px(x) {
  return ((x - xMin.value) / (xMax.value - xMin.value)) * (W - padL - padR) + padL
}
function py(y) {
  return ((yTop.value - y) / (yTop.value - yBot.value)) * (H - padT - padB) + padT
}

const vx = computed(() => px(props.h))
const vy = computed(() => py(props.k))

const curve = computed(() => {
  const pts = []
  const steps = 140
  for (let i = 0; i <= steps; i += 1) {
    const x = xMin.value + ((xMax.value - xMin.value) * i) / steps
    const y = props.a * (x - props.h) * (x - props.h) + props.k
    pts.push(`${i === 0 ? 'M' : 'L'}${px(x).toFixed(2)},${py(y).toFixed(2)}`)
  }
  return pts.join(' ')
})

function fmt(n) {
  if (!Number.isFinite(Number(n))) return '—'
  return String(Math.round(Number(n) * 100) / 100)
}
</script>

<style scoped>
.parabola-figure {
  width: 100%;
}
.parabola-figure svg {
  width: 100%;
  height: auto;
  display: block;
}
.pf-axis-label {
  font-size: 12px;
  fill: #475569;
}
.pf-axis-light {
  font-size: 11px;
  fill: #b45309;
}
.pf-point-label {
  font-size: 11.5px;
  fill: #111827;
  font-weight: 600;
}
.pf-extremum {
  font-size: 11px;
  fill: #047857;
}
.pf-invalid-text {
  font-size: 14px;
  fill: #94a3b8;
}
.parabola-figure__invalid p {
  margin: 4px 0 0;
  text-align: center;
  font-size: 12px;
  color: #dc2626;
}
</style>
