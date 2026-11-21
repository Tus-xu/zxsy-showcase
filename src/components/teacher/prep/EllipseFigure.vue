<!-- 椭圆参数图形：a、b 变化时图形、焦点、辅助线与标注同步刷新（纯 SVG，可离线） -->
<template>
  <div class="ellipse-figure">
    <svg v-if="valid" :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="`椭圆 a=${a} b=${b} c=${cText} 的示意图`">
      <defs>
        <marker id="ef-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
        </marker>
      </defs>

      <!-- 坐标轴 -->
      <g v-if="showAxes" class="ef-axes">
        <line :x1="30" :y1="CY" :x2="W - 22" :y2="CY" stroke="#64748b" stroke-width="1.2" marker-end="url(#ef-arrow)" />
        <line :x1="CX" :y1="H - 22" :x2="CX" :y2="20" stroke="#64748b" stroke-width="1.2" marker-end="url(#ef-arrow)" />
        <text :x="W - 16" :y="CY - 8" class="ef-axis-label">x</text>
        <text :x="CX + 8" :y="26" class="ef-axis-label">y</text>
        <text :x="CX - 13" :y="CY + 16" class="ef-axis-label">O</text>
      </g>

      <!-- 椭圆 -->
      <ellipse
        :cx="CX"
        :cy="CY"
        :rx="rx"
        :ry="ry"
        fill="none"
        :stroke="color"
        :stroke-width="strokeWidth"
      />

      <!-- 辅助线：a / b / c -->
      <g v-if="showAux" class="ef-aux">
        <line :x1="CX" :y1="CY" :x2="CX + rx" :y2="CY" stroke="#60a5fa" stroke-width="1.2" stroke-dasharray="4 4" />
        <text :x="CX + rx / 2" :y="CY - 8" class="ef-aux-label">a</text>
        <line :x1="CX" :y1="CY" :x2="CX" :y2="CY - ry" stroke="#60a5fa" stroke-width="1.2" stroke-dasharray="4 4" />
        <text :x="CX + 8" :y="CY - ry / 2" class="ef-aux-label">b</text>
        <line :x1="CX" :y1="CY" :x2="CX + fx" :y2="CY" stroke="#f59e0b" stroke-width="1.4" stroke-dasharray="5 4" />
        <text :x="CX + fx / 2" :y="CY + 17" class="ef-aux-label ef-aux-label--c">c</text>
      </g>

      <!-- 焦半径与动点 -->
      <g v-if="showAux" class="ef-radii">
        <line :x1="pX" :y1="pY" :x2="CX - fx" :y2="CY" stroke="#2563eb" stroke-width="1.2" stroke-dasharray="5 4" />
        <line :x1="pX" :y1="pY" :x2="CX + fx" :y2="CY" stroke="#2563eb" stroke-width="1.2" stroke-dasharray="5 4" />
      </g>

      <!-- 焦点 -->
      <g v-if="showFocus">
        <circle :cx="CX - fx" :cy="CY" r="4.2" fill="#dc2626" />
        <circle :cx="CX + fx" :cy="CY" r="4.2" fill="#dc2626" />
        <text v-if="showLabels" :x="CX - fx - 6" :y="CY + ry + 16" class="ef-focus-label" text-anchor="end">
          F₁(−{{ cText }},0)
        </text>
        <text v-if="showLabels" :x="CX + fx + 6" :y="CY + ry + 16" class="ef-focus-label">
          F₂({{ cText }},0)
        </text>
      </g>

      <!-- 动点 P -->
      <g>
        <circle :cx="pX" :cy="pY" r="4" fill="#111827" />
        <text v-if="showLabels" :x="pX + 9" :y="pY - 7" class="ef-point-label">P(x, y)</text>
      </g>
    </svg>
    <div v-else class="ellipse-figure__invalid">
      <svg :viewBox="`0 0 ${W} ${H}`" aria-hidden="true">
        <ellipse :cx="CX" :cy="CY" rx="120" ry="70" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="6 6" />
        <text :x="CX" :y="CY + 4" class="ef-invalid-text" text-anchor="middle">参数无效</text>
      </svg>
      <p>{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  a: { type: Number, default: 5 },
  b: { type: Number, default: 3 },
  cText: { type: String, default: '4' },
  valid: { type: Boolean, default: true },
  error: { type: String, default: '' },
  showFocus: { type: Boolean, default: true },
  showAxes: { type: Boolean, default: true },
  showAux: { type: Boolean, default: true },
  showLabels: { type: Boolean, default: true },
  color: { type: String, default: '#2563eb' },
  strokeWidth: { type: Number, default: 2.4 },
  animate: { type: Boolean, default: false },
})

const W = 440
const H = 280
const CX = 220
const CY = 142
const MAX_RX = 150
const MAX_RY = 92

const scale = computed(() => {
  const a = Math.max(0.2, props.a)
  const b = Math.max(0.2, props.b)
  return Math.max(6, Math.min(MAX_RX / a, MAX_RY / b))
})
const rx = computed(() => props.a * scale.value)
const ry = computed(() => props.b * scale.value)
const c = computed(() => {
  if (!props.valid) return 0
  return Math.sqrt(Math.max(0, props.a * props.a - props.b * props.b))
})
const fx = computed(() => c.value * scale.value)

const theta = ref(1.02)
const pX = computed(() => CX + rx.value * Math.cos(theta.value))
const pY = computed(() => CY - ry.value * Math.sin(theta.value))

let raf = 0
function tick() {
  theta.value += 0.008
  raf = requestAnimationFrame(tick)
}
function stop() {
  if (raf) cancelAnimationFrame(raf)
  raf = 0
}
watch(
  () => props.animate,
  (on) => {
    stop()
    if (on) raf = requestAnimationFrame(tick)
  },
  { immediate: true },
)
onBeforeUnmount(stop)
</script>

<style scoped>
.ellipse-figure {
  width: 100%;
}
.ellipse-figure svg {
  width: 100%;
  height: auto;
  display: block;
}
.ef-axis-label {
  font-size: 12px;
  fill: #475569;
}
.ef-aux-label {
  font-size: 12px;
  fill: #2563eb;
  font-style: italic;
  font-weight: 600;
}
.ef-aux-label--c {
  fill: #b45309;
}
.ef-focus-label {
  font-size: 11px;
  fill: #b91c1c;
}
.ef-point-label {
  font-size: 11.5px;
  fill: #111827;
  font-style: italic;
}
.ef-invalid-text {
  font-size: 14px;
  fill: #94a3b8;
}
.ellipse-figure__invalid p {
  margin: 4px 0 0;
  text-align: center;
  font-size: 12px;
  color: #dc2626;
}
</style>
