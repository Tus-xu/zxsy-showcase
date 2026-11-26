<template>
  <div class="krf" :class="{ 'is-reduced': reduced }" role="img" :aria-label="ariaLabel">
    <svg viewBox="0 0 560 340" class="krf-svg" aria-hidden="true">
      <defs>
        <linearGradient id="krf-blue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#dbeafe" />
          <stop offset="1" stop-color="#eff6ff" />
        </linearGradient>
        <linearGradient id="krf-purple" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ede9fe" />
          <stop offset="1" stop-color="#f5f3ff" />
        </linearGradient>
        <filter id="krf-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#4f46e5" flood-opacity=".12" />
        </filter>
      </defs>

      <!-- 背景网格 -->
      <g class="krf-grid">
        <line v-for="x in 10" :key="'gx' + x" :x1="x * 56" y1="18" :x2="x * 56" y2="322" />
        <line v-for="y in 5" :key="'gy' + y" :x1="18" :y1="y * 56" :x2="542" :y2="y * 56" />
      </g>

      <!-- 双曲线小图标 + 标题 -->
      <g class="krf-badge">
        <rect x="24" y="22" width="148" height="34" rx="10" fill="#fff" stroke="#dbe4ff" />
        <text x="40" y="44" font-size="14" font-weight="700" fill="#4f46e5">双曲线的离心率</text>
      </g>

      <!-- 直角三角形：a 横、b 竖、c 斜边。数字层按 1 : √7 真实比例绘制。 -->
      <g filter="url(#krf-shadow)">
        <path :d="`M${geo.ox} ${geo.oy} L${geo.ax} ${geo.ay} L${geo.bx} ${geo.by} Z`" fill="url(#krf-blue)" stroke="#bfdbfe" stroke-width="1.5" />
        <line :x1="geo.ox" :y1="geo.oy" :x2="geo.ax" :y2="geo.ay" stroke="#2563eb" stroke-width="5" stroke-linecap="round" class="krf-on" />
        <line :x1="geo.ox" :y1="geo.oy" :x2="geo.bx" :y2="geo.by" stroke="#7c3aed" stroke-width="5" stroke-linecap="round" class="krf-on" />
        <line
          :x1="geo.ax" :y1="geo.ay" :x2="geo.bx" :y2="geo.by"
          :stroke="step >= 1 ? '#d97706' : '#cbd5e1'"
          :stroke-width="step >= 1 ? 5 : 3"
          :stroke-dasharray="step >= 1 ? '0' : '8 7'"
          stroke-linecap="round"
          class="krf-c"
        />
        <path :d="`M${geo.ox + 18} ${geo.oy - 18} L${geo.ox + 18} ${geo.oy} L${geo.ox} ${geo.oy - 18}`" fill="none" stroke="#94a3b8" stroke-width="1.8" />
        <circle :cx="geo.ox" :cy="geo.oy" r="4" fill="#1e293b" />
        <circle :cx="geo.ax" :cy="geo.ay" r="4" fill="#2563eb" />
        <circle :cx="geo.bx" :cy="geo.by" r="4" fill="#7c3aed" />
      </g>

      <!-- 标签：白描边保证压在线上也清楚 -->
      <g class="krf-labels">
        <text :x="geo.aLabelX" :y="geo.aLabelY" text-anchor="middle" font-size="17" font-weight="800" fill="#2563eb">
          {{ numeric ? 'a = 1' : 'a（实半轴）' }}
        </text>
        <text :x="geo.bLabelX" :y="geo.bLabelY" text-anchor="middle" font-size="17" font-weight="800" fill="#7c3aed" :transform="`rotate(-90 ${geo.bLabelX} ${geo.bLabelY})`">
          {{ numeric ? 'b = √7' : 'b（虚半轴）' }}
        </text>
        <text
          v-if="!numeric || step >= 1"
          :x="geo.cLabelX" :y="geo.cLabelY" text-anchor="middle" font-size="17" font-weight="800"
          :fill="step >= 1 ? '#b45309' : '#94a3b8'" :transform="`rotate(${geo.cAngle} ${geo.cLabelX} ${geo.cLabelY})`"
        >
          {{ numeric ? 'c = 2√2' : 'c（焦点距）' }}
        </text>
      </g>

      <!-- 公式 / 结果 -->
      <g v-if="!numeric" class="krf-formula">
        <g v-if="step >= 1">
          <rect x="348" y="78" width="184" height="54" rx="12" fill="#fff" stroke="#fde68a" />
          <text x="366" y="110" font-size="19" font-weight="800" fill="#b45309">c² = a² + b²</text>
        </g>
        <text x="348" y="154" font-size="14" fill="#64748b">双曲线：c 是斜边，c &gt; a</text>
        <text x="348" y="178" font-size="14" fill="#64748b">b/a 不是 e，只是原料</text>
        <g v-if="step >= 2" class="krf-eq">
          <rect x="348" y="202" width="184" height="54" rx="12" fill="#eef2ff" stroke="#c7d2fe" />
          <text x="366" y="234" font-size="19" font-weight="800" fill="#4f46e5">e = c / a</text>
        </g>
      </g>

      <g v-else class="krf-formula">
        <g v-if="step >= 1">
          <rect x="348" y="76" width="184" height="54" rx="12" fill="#fff" stroke="#fde68a" />
          <text x="366" y="108" font-size="19" font-weight="800" fill="#b45309">c² = 1 + 7 = 8</text>
        </g>
        <text x="348" y="152" font-size="14" fill="#64748b">a² = 1</text>
        <text x="348" y="174" font-size="14" fill="#64748b">b² = 7</text>
        <text v-if="step >= 1" x="348" y="196" font-size="14" fill="#64748b">c = 2√2</text>
        <g v-if="step >= 2" class="krf-eq">
          <rect x="348" y="216" width="184" height="54" rx="12" fill="#eef2ff" stroke="#c7d2fe" />
          <text x="366" y="248" font-size="19" font-weight="800" fill="#4f46e5">e = 2√2 / 1</text>
        </g>
      </g>

    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  mode: { type: String, default: 'three-sides' },
  step: { type: Number, default: 0 },
  reduced: { type: Boolean, default: false },
})

const numeric = computed(() => ['numbers', 'square-sum', 'result'].includes(props.mode))
const step = computed(() => Math.max(0, Math.min(2, Number(props.step) || 0)))

/** 数字层按 a=1、b=√7 的真实比例绘制；关系层用放大后的示意三角形。 */
const geo = computed(() => {
  const ox = 100
  const oy = 286
  const aPx = numeric.value ? 80 : 200
  const bPx = numeric.value ? 80 * Math.sqrt(7) : 170
  const ax = ox + aPx
  const ay = oy
  const bx = ox
  const by = oy - bPx
  const midX = (ox + ax) / 2
  const midY = (oy + by) / 2
  const cAngle = Math.atan2(ay - by, ax - bx) * 180 / Math.PI
  return {
    ox, oy, ax, ay, bx, by,
    aLabelX: (ox + ax) / 2,
    aLabelY: oy + 28,
    bLabelX: ox - 24,
    bLabelY: (oy + by) / 2,
    cLabelX: midX + 23,
    cLabelY: midY - 17,
    cAngle,
  }
})

const ariaLabel = computed(() => {
  if (!numeric.value) {
    return '直角三角形关系图：两条直角边是 a 和 b，斜边是 c；离心率 e 等于 c 除以 a'
  }
  if (step.value >= 2) {
    return '具体数字图：a 等于 1，b 等于根号 7，c 等于 2 倍根号 2，e 等于 2 倍根号 2'
  }
  if (step.value >= 1) {
    return '具体数字图：a 等于 1，b 等于根号 7，c 等于 2 倍根号 2'
  }
  return '具体数字图：a 等于 1，b 等于根号 7；先看两条直角边'
})
</script>

<style scoped>
.krf {
  width: 100%; height: 100%; min-height: 300px; border-radius: 18px;
  background: linear-gradient(160deg, #fbfdff 0%, #f4f7ff 100%);
  border: 1px solid #e6ebf7; overflow: hidden; position: relative;
}
.krf::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse at 78% 12%, rgba(99, 102, 241, .08), transparent 52%);
}
.krf-svg { width: 100%; height: 100%; display: block; }
.krf-grid line { stroke: #eef2fa; stroke-width: 1; }
.krf-badge rect { filter: drop-shadow(0 3px 8px rgba(79, 70, 229, .06)); }
.krf-on { animation: krf-in .55s ease both; }
.krf-c { transition: stroke .4s ease, stroke-width .4s ease, stroke-dasharray .4s ease; }
.krf-labels text { paint-order: stroke; stroke: #fff; stroke-width: 4px; stroke-linejoin: round; }
@keyframes krf-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
.is-reduced .krf-on { animation: none; }
@media (max-width: 720px) {
  .krf { min-height: 250px; }
}
</style>
