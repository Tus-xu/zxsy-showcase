<template>
  <div class="kpf" :class="{ 'is-reduced': reduced }" role="img" :aria-label="ariaLabel">
    <div class="kpf-track">
      <div
        v-for="(label, i) in labels" :key="i"
        class="kpf-node" :class="{ on: i <= step, current: i === step }"
      >
        <span class="kpf-dot">{{ i + 1 }}</span>
        <b>{{ label }}</b>
        <small>{{ details[i] || '' }}</small>
      </div>
    </div>
    <div class="kpf-foot">{{ caption || '先看知识链，再回原题。' }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  labels: { type: Array, default: () => [] },
  details: { type: Array, default: () => [] },
  step: { type: Number, default: 0 },
  caption: { type: String, default: '' },
  reduced: { type: Boolean, default: false },
})

const step = computed(() => Math.max(0, Math.min((props.labels?.length || 1) - 1, Number(props.step) || 0)))
const ariaLabel = computed(() => `知识路径：${(props.labels || []).join('，')}`)
</script>

<style scoped>
.kpf {
  width: 100%; min-height: 300px; padding: 22px 20px 16px; border-radius: 18px;
  background: linear-gradient(160deg, #fbfdff 0%, #f4f7ff 100%);
  border: 1px solid #e6ebf7; display: flex; flex-direction: column; justify-content: center; gap: 18px;
}
.kpf-track { display: flex; align-items: flex-start; gap: 6px; position: relative; }
.kpf-track::before {
  content: ''; position: absolute; left: 10%; right: 10%; top: 24px; height: 2px;
  background: #dbe4ff; z-index: 0;
}
.kpf-node {
  position: relative; z-index: 1; flex: 1; min-width: 0; display: flex; flex-direction: column;
  align-items: center; text-align: center; gap: 7px; opacity: .35; transform: translateY(4px);
  transition: opacity .45s ease, transform .45s ease;
}
.kpf-node.on { opacity: 1; transform: translateY(0); }
.kpf-dot {
  width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center;
  background: #fff; border: 2px solid #c7d2fe; color: #64748b; font-size: 11px; font-weight: 800;
}
.kpf-node.on .kpf-dot { background: #4f46e5; border-color: #4f46e5; color: #fff; }
.kpf-node.current .kpf-dot { box-shadow: 0 0 0 5px #eef2ff; transform: scale(1.08); }
.kpf-node b { font-size: 13px; line-height: 1.4; color: #1f2937; }
.kpf-node small { font-size: 11px; line-height: 1.5; color: #64748b; max-width: 16ch; }
.kpf-foot {
  align-self: center; margin-top: 4px; padding: 7px 12px; border-radius: 999px;
  font-size: 11.5px; color: #4f46e5; background: #eef2ff; border: 1px solid #dbe4ff;
}
.is-reduced .kpf-node { transition: none; }
@media (max-width: 720px) {
  .kpf { min-height: 250px; padding: 16px 10px; }
  .kpf-track { flex-direction: column; gap: 10px; }
  .kpf-track::before { left: 24px; right: auto; top: 10%; bottom: 10%; width: 2px; height: auto; }
  .kpf-node { flex-direction: row; text-align: left; align-items: center; gap: 10px; }
  .kpf-node small { max-width: none; }
}
</style>
