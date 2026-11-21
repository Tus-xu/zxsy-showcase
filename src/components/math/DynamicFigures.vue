<template>
  <div class="dyn">
    <!-- 双曲线参数联动 -->
    <div v-if="kind === 'hyperbola'" class="dyn__stage">
      <svg viewBox="0 0 520 300" class="dyn__svg">
        <defs>
          <marker id="dyn-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 z" fill="#94a3b8" />
          </marker>
        </defs>
        <line x1="30" y1="150" x2="490" y2="150" stroke="#cbd5e1" stroke-width="1.2" marker-end="url(#dyn-arrow)" />
        <line x1="260" y1="285" x2="260" y2="20" stroke="#cbd5e1" stroke-width="1.2" marker-end="url(#dyn-arrow)" />
        <text x="470" y="142" font-size="12" fill="#94a3b8">x</text>
        <text x="268" y="30" font-size="12" fill="#94a3b8">y</text>
        <path :d="hyperbolaPath" fill="none" stroke="#4f46e5" stroke-width="2.4" />
        <line :x1="cx - c * sx" y1="150" :x2="cx + c * sx" y2="150" stroke="#f59e0b" stroke-width="1.6" stroke-dasharray="5 4" />
        <circle :cx="cx - c * sx" cy="150" r="4.5" fill="#ef4444" />
        <circle :cx="cx + c * sx" cy="150" r="4.5" fill="#ef4444" />
        <text :x="cx - c * sx - 26" y="132" font-size="12.5" fill="#b91c1c">F₁</text>
        <text :x="cx + c * sx + 10" y="132" font-size="12.5" fill="#b91c1c">F₂</text>
        <text x="34" y="278" font-size="12" fill="#64748b">实半轴 a = {{ a.toFixed(2) }}　虚半轴 b = {{ b.toFixed(2) }}　半焦距 c = {{ cVal.toFixed(2) }}</text>
      </svg>
      <div class="dyn__controls">
        <label>a <input v-model.number="a" type="range" min="0.6" max="2.4" step="0.05" /></label>
        <label>b <input v-model.number="b" type="range" min="0.3" max="3" step="0.05" /></label>
        <div class="dyn__readout">
          离心率 e = c/a = <b>{{ eVal.toFixed(3) }}</b>
          <span v-if="Math.abs(b / a - Math.sqrt(7)) < 0.03" class="dyn__hit">≈ √7 倍 → e≈2√2</span>
        </div>
        <button class="dyn__btn" @click="presetSqrt7">设为本题：b/a = √7</button>
      </div>
    </div>

    <!-- 正三棱柱辅助图 -->
    <div v-if="kind === 'prism'" class="dyn__stage">
      <svg viewBox="0 0 520 320" class="dyn__svg">
        <g stroke-linecap="round">
          <!-- 底面 -->
          <polygon points="150,250 250,288 350,250 250,212" fill="#eef2ff" stroke="#94a3b8" stroke-width="1.2" />
          <line x1="150" y1="250" x2="250" y2="212" stroke="#64748b" stroke-width="1.2" />
          <!-- 侧棱 -->
          <line x1="150" y1="250" x2="150" y2="120" stroke="#94a3b8" stroke-width="1.4" />
          <line x1="250" y1="288" x2="250" y2="158" stroke="#94a3b8" stroke-width="1.4" />
          <line x1="350" y1="250" x2="350" y2="120" stroke="#94a3b8" stroke-width="1.4" />
          <!-- 上底 -->
          <line x1="150" y1="120" x2="250" y2="82" stroke="#94a3b8" stroke-width="1.4" />
          <line x1="250" y1="82" x2="350" y2="120" stroke="#94a3b8" stroke-width="1.4" />
          <line x1="350" y1="120" x2="150" y2="120" stroke="#94a3b8" stroke-width="1.4" />
          <!-- 平面 AA1D 高亮 -->
          <polygon v-if="showPlane" points="150,120 250,158 250,288 250,82" fill="rgba(79,70,229,.12)" stroke="none" />
          <line v-if="showPlane" x1="150" y1="120" x2="250" y2="288" stroke="#4f46e5" stroke-width="1.6" stroke-dasharray="4 3" />
          <!-- AD 中线 -->
          <line x1="250" y1="82" x2="250" y2="288" stroke="#0ea5e9" stroke-width="2" />
          <!-- BC -->
          <line x1="150" y1="250" x2="350" y2="220" stroke="#f97316" stroke-width="2" />
          <circle cx="250" cy="235" r="4" fill="#f97316" />
          <text x="258" y="243" font-size="12" fill="#c2410c">D</text>
          <text x="132" y="262" font-size="12.5" fill="#475569">B</text>
          <text x="352" y="228" font-size="12.5" fill="#475569">C</text>
          <text x="240" y="74" font-size="12.5" fill="#475569">A</text>
          <text x="238" y="300" font-size="12.5" fill="#475569">A₁</text>
          <text x="236" y="160" font-size="12" fill="#0369a1">AD</text>
        </g>
      </svg>
      <div class="dyn__controls">
        <label class="dyn__check"><input v-model="showPlane" type="checkbox" /> 高亮平面 AA₁D</label>
        <div class="dyn__readout">D 为 BC 中点时：AD⊥BC；侧棱 AA₁⊥底面 ⇒ AA₁⊥BC ⇒ <b>BC⊥平面 AA₁D</b>（B 项）</div>
        <button class="dyn__btn" @click="showPlane = !showPlane">{{ showPlane ? '隐藏' : '显示' }}平面</button>
      </div>
    </div>

    <!-- 有放回取球仿真 -->
    <div v-if="kind === 'draw'" class="dyn__stage">
      <svg viewBox="0 0 520 220" class="dyn__svg">
        <rect x="30" y="40" width="120" height="130" rx="10" fill="#f8fafc" stroke="#cbd5e1" />
        <text x="52" y="30" font-size="12" fill="#64748b">箱中 5 个球（编号 1~5）</text>
        <g v-for="n in 5" :key="n">
          <circle :cx="60 + ((n - 1) % 3) * 32" :cy="85 + Math.floor((n - 1) / 3) * 42" r="14" :fill="ballColor(n)" />
          <text :x="60 + ((n - 1) % 3) * 32 - 4" :y="90 + Math.floor((n - 1) / 3) * 42" font-size="12" fill="#fff">{{ n }}</text>
        </g>
        <text x="200" y="60" font-size="13" fill="#334155">最近一次抽取：</text>
        <text x="200" y="88" font-size="15" fill="#4f46e5" font-weight="700">{{ lastDraw.join('、') || '—' }}</text>
        <text x="200" y="118" font-size="13" fill="#334155">本次 X（出现过的号码种数）= <tspan fill="#4f46e5" font-weight="700">{{ lastX ?? '—' }}</tspan></text>
        <text x="200" y="148" font-size="13" fill="#334155">累计 {{ trials }} 次的平均 X = <tspan fill="#059669" font-weight="700">{{ avgX.toFixed(3) }}</tspan></text>
        <text x="200" y="176" font-size="12" fill="#94a3b8">理论值 E(X) = 61/25 = 2.44</text>
      </svg>
      <div class="dyn__controls">
        <button class="dyn__btn dyn__btn--primary" @click="runTrials(1)">抽一次</button>
        <button class="dyn__btn" @click="runTrials(100)">模拟 100 次</button>
        <button class="dyn__btn" @click="runTrials(1000)">模拟 1000 次</button>
        <button class="dyn__btn" @click="resetSim">清零</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  kind: { type: String, required: true }, // hyperbola | prism | draw
})

/* ---------- 双曲线 ---------- */
const a = ref(1)
const b = ref(Math.sqrt(7))
const cx = 260
const cy = 150
const sx = 90
const sy = 62
const cVal = computed(() => Math.sqrt(a.value * a.value + b.value * b.value))
const eVal = computed(() => cVal.value / a.value)
const hyperbolaPath = computed(() => {
  // 双曲线 x²/a² − y²/b² = 1（按像素缩放）
  const pts1 = []
  const pts2 = []
  for (let t = -1.9; t <= 1.9; t += 0.02) {
    const x = a.value * Math.cosh(t)
    const y = b.value * Math.sinh(t)
    pts1.push(`${(cx + x * sx).toFixed(1)},${(cy - y * sy).toFixed(1)}`)
    pts2.push(`${(cx - x * sx).toFixed(1)},${(cy - y * sy).toFixed(1)}`)
  }
  return `M ${pts1.join(' L ')} M ${pts2.join(' L ')}`
})
function presetSqrt7() {
  a.value = 1
  b.value = Number(Math.sqrt(7).toFixed(2))
}

/* ---------- 三棱柱 ---------- */
const showPlane = ref(true)

/* ---------- 取球仿真 ---------- */
const lastDraw = ref([])
const lastX = ref(null)
const trials = ref(0)
const sumX = ref(0)
const avgX = computed(() => (trials.value ? sumX.value / trials.value : 0))
const ballColor = (n) => ['#4f46e5', '#0891b2', '#7c3aed', '#db2777', '#059669'][n - 1]
function oneTrial() {
  const draw = [1, 2, 3].map(() => 1 + Math.floor(Math.random() * 5))
  const x = new Set(draw).size
  lastDraw.value = draw
  lastX.value = x
  trials.value += 1
  sumX.value += x
}
function runTrials(n) {
  for (let i = 0; i < n; i++) oneTrial()
}
function resetSim() {
  lastDraw.value = []
  lastX.value = null
  trials.value = 0
  sumX.value = 0
}
</script>

<style scoped>
.dyn {
  display: grid;
  gap: 10px;
}
.dyn__stage {
  background: #fff;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 14px;
  padding: 12px;
}
.dyn__svg {
  width: 100%;
  height: auto;
  display: block;
}
.dyn__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-top: 8px;
  font-size: 12.5px;
  color: var(--ink2, #334155);
}
.dyn__controls label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.dyn__controls input[type='range'] {
  width: 120px;
}
.dyn__readout {
  font-size: 12.5px;
  color: var(--ink2, #334155);
}
.dyn__readout b {
  color: var(--brand-deep, #4338ca);
}
.dyn__hit {
  margin-left: 8px;
  color: #047857;
  background: #ecfdf5;
  border-radius: 6px;
  padding: 1px 7px;
  font-size: 11.5px;
}
.dyn__btn {
  border: 1px solid var(--line, #e2e8f0);
  background: #fff;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--ink2, #334155);
}
.dyn__btn:hover {
  border-color: var(--brand, #4f46e5);
  color: var(--brand-deep, #4338ca);
}
.dyn__btn--primary {
  background: var(--brand, #4f46e5);
  border-color: var(--brand, #4f46e5);
  color: #fff;
}
.dyn__check {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}
</style>
