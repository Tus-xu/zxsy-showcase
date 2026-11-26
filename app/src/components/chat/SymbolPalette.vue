<template>
  <!-- sgv4（DESIGN F5）：符号点选面板——从 ExprAssembler.vue 抽出的共享组件。
       纯点选、零键盘（R21 防「打字模拟器」纪律）；按键集按 spec.keypad 裁剪（R1：
       last_resort 也不给裸 LaTeX 框，只给按题裁剪的符号键）。两个消费方：
       ① ExprAssembler（assemble 形式，对象键 {t,v,latex}，锁定态由调用方计算）；
       ② ExprInput / last_resort free_text 主通道（字符串键 'x'/'^2'/'√'/…）。
       DOM 类沿用 .ix-as-palette/.ix-as-key（v3 测试与既有样式契约零回退），
       另加 data-palette-key 稳定锚点供 DOM 级验收。 -->
  <div class="ix-as-palette" :class="{ locked }" :data-soc-palette="String(paletteId || '')">
    <button
      v-for="(p, pi) in normalizedKeys" :key="pi" type="button" class="ix-as-key"
      :data-palette-key="p.v" :disabled="locked" @click="$emit('press', p)"
    >{{ keyLabel(p) }}</button>
    <div v-if="locked && limitHint" class="ix-as-limit">{{ limitHint }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** 键集：{t,v,latex?,label?} 对象（assemble）或字符串（keypad 裁剪）混合数组 */
  keys: { type: Array, default: () => [] },
  /** 锁定态（assemble >12 token 防打字模拟器） */
  locked: { type: Boolean, default: false },
  /** 锁定时显示的提示文案 */
  limitHint: { type: String, default: '' },
  /** 面板稳定锚点（e2e/测试用） */
  paletteId: { type: String, default: '' },
})
defineEmits(['press'])

/** 字符串键归一为对象键；无效项过滤 */
const normalizedKeys = computed(() =>
  (Array.isArray(props.keys) ? props.keys : [])
    .map((p) => (typeof p === 'string' ? { t: 'op', v: p } : p))
    .filter((p) => p && p.v !== undefined && p.v !== null && String(p.v) !== ''),
)

/** 显示标签：常见 LaTeX 命令换 Unicode 数学符，其余去掉前导反斜杠 */
const LABELS = {
  frac: 'a/b',
  sqrt: '√',
  sum: '∑',
  prod: '∏',
  int: '∫',
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  theta: 'θ',
  lambda: 'λ',
  mu: 'μ',
  pi: 'π',
  sigma: 'σ',
  phi: 'φ',
  le: '≤',
  ge: '≥',
  neq: '≠',
  approx: '≈',
  pm: '±',
  times: '×',
  cdot: '·',
  infty: '∞',
  angle: '∠',
  perp: '⊥',
  parallel: '∥',
}
function keyLabel(p) {
  if (p?.label) return String(p.label)
  const raw = String(p?.v ?? '')
  const bare = raw.replace(/^\\/, '')
  return LABELS[bare] || raw
}
</script>

<style scoped>
/* 从 ExprAssembler scoped 样式迁回自身：ExprInput/free_text 复用 SymbolPalette 时
   原先没有任何按钮样式，符号会挤成一团（用户截图 ref-14/16 的根因）。 */
.ix-as-palette { display: flex; flex-wrap: wrap; gap: 5px; }
.ix-as-palette.locked { opacity: 0.55; }
.ix-as-key {
  min-width: 36px; min-height: 34px; padding: 6px 9px; border-radius: 8px; cursor: pointer;
  font-size: 13.5px; font-weight: 600; line-height: 1.2;
  border: 1px solid var(--border); background: var(--bg-white); color: var(--text-primary);
  font-family: var(--font-serif, serif); transition: background .12s ease, border-color .12s ease;
  touch-action: manipulation;
}
.ix-as-key:hover:not(:disabled) { border-color: #7c3aed; background: #f5f3ff; }
.ix-as-key:active:not(:disabled) { transform: scale(0.94); }
.ix-as-key:disabled { cursor: not-allowed; opacity: 0.5; }
.ix-as-limit { width: 100%; font-size: 11px; color: #b45309; margin-top: 3px; }
@media (prefers-reduced-motion: reduce) {
  .ix-as-key { transition: none; }
}
</style>
