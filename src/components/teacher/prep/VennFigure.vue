<!-- 集合关系图形：A⊆B 的欧拉图 + 元素个数/子集数标注，n 变化时实时更新（纯 SVG，可离线） -->
<template>
  <div class="venn-figure">
    <svg :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="`集合 A 包含于集合 B，B 有 ${n} 个元素`">
      <rect x="18" y="18" :width="W - 36" :height="H - 44" rx="14" fill="#f8fbff" stroke="#dbe6f5" stroke-width="1.3" />
      <text x="34" y="40" class="vf-caption">A 的任意元素都是 B 的元素 ⇒ A ⊆ B</text>

      <circle :cx="CX" :cy="CY" r="96" fill="#eff6ff" stroke="#2563eb" stroke-width="2" />
      <circle :cx="CX" :cy="CY" r="52" fill="#dbeafe" stroke="#2563eb" stroke-width="2" />

      <text :x="CX" :y="CY - 106" class="vf-set-label" text-anchor="middle">B</text>
      <text :x="CX" :y="CY - 28" class="vf-set-label" text-anchor="middle">A</text>

      <text :x="CX" :y="H - 22" class="vf-footnote" text-anchor="middle">
        {{ subsetFormula }} · {{ properFormula }}
      </text>
    </svg>
    <div v-if="showLabels" class="venn-figure__legend">
      <span class="venn-chip">A ⊆ B</span>
      <span class="venn-chip venn-chip--alt">{{ elementText }}</span>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  n: { type: Number, default: 3 },
  subsetFormula: { type: String, default: '' },
  properFormula: { type: String, default: '' },
  elementText: { type: String, default: '' },
  showLabels: { type: Boolean, default: true },
})

const W = 440
const H = 280
const CX = 220
const CY = 140
</script>

<style scoped>
.venn-figure {
  width: 100%;
}
.venn-figure svg {
  width: 100%;
  height: auto;
  display: block;
}
.vf-caption {
  font-size: 11.5px;
  fill: #475569;
}
.vf-set-label {
  font-size: 15px;
  fill: #1d4ed8;
  font-weight: 700;
}
.vf-label {
  font-size: 11px;
  fill: #1e3a8a;
}
.vf-footnote {
  font-size: 11.5px;
  fill: #334155;
}
.venn-figure__legend {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 2px;
}
.venn-chip {
  font-size: 11.5px;
  color: #1d4ed8;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  padding: 1px 10px;
}
.venn-chip--alt {
  color: #475569;
  background: #f8fafc;
  border-color: #e2e8f0;
}
</style>
