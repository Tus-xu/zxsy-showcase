<template>
  <section class="exp-cat" :class="{ collapsed: open === false }" aria-label="体验分类">
    <button type="button" class="ec-head" :aria-expanded="open !== false" @click="toggle">
      <span class="ec-head-title">体验分类</span>
      <span class="ec-head-sub">3 题 · 4 种</span>
      <span class="ec-chev" aria-hidden="true">{{ open === false ? '▸' : '▾' }}</span>
    </button>

    <div v-if="open !== false" class="ec-list">
      <div v-for="p in problems" :key="p.id" class="ec-problem">
        <div class="ec-problem-head">
          <b>{{ p.no }} · {{ p.title }}</b>
          <small>{{ p.tag }}</small>
        </div>
        <div class="ec-modes">
          <button
            v-for="m in modes" :key="m.id" type="button"
            class="ec-mode" :class="{ active: activeId === expId(p, m) }"
            :title="`${p.no} · ${m.name} · ${m.blurb}`"
            :data-experience="expId(p, m)"
            @click="$emit('open', expId(p, m))"
          >
            <span class="ec-mode-icon" aria-hidden="true">{{ m.icon }}</span>
            <span class="ec-mode-name">{{ m.short || m.name }}</span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { EXPERIENCE_PROBLEMS, EXPERIENCE_MODES } from '@/offline/experience/catalog'

defineProps({
  activeId: { type: String, default: '' },
})
defineEmits(['open'])

const problems = EXPERIENCE_PROBLEMS
const modes = EXPERIENCE_MODES
const open = ref(localStorage.getItem('ma_exp_cat_collapsed') !== '1')

function expId(p, m) {
  return `exp-${p.id}-${m.id}`
}
function toggle() {
  open.value = open.value === false
  localStorage.setItem('ma_exp_cat_collapsed', open.value === false ? '1' : '0')
}
</script>

<style scoped>
.exp-cat {
  flex: none;
  margin: 10px 0 12px; padding: 9px 8px 8px;
  border: 1px solid var(--line); border-radius: 12px; background: var(--card);
}
.exp-cat.collapsed { padding-bottom: 4px; }
.ec-head {
  display: flex; align-items: center; gap: 6px; width: 100%;
  padding: 2px 2px 7px; border: 0; background: none; cursor: pointer;
  color: var(--ink2); font: inherit; text-align: left;
}
.ec-head-title { font-size: 11.5px; font-weight: 800; letter-spacing: .04em; color: var(--ink2); }
.ec-head-sub { font-size: 10.5px; color: var(--ink2); margin-left: auto; }
.ec-chev { font-size: 11px; color: var(--ink3); }
.ec-list { display: grid; gap: 5px; }
.ec-problem { padding-top: 5px; border-top: 1px dashed var(--line2); }
.ec-problem:first-child { padding-top: 0; border-top: 0; }
.ec-problem-head {
  display: flex; align-items: baseline; justify-content: space-between; gap: 6px;
  margin-bottom: 4px; min-width: 0;
}
.ec-problem-head b {
  font-size: 11px; color: var(--ink); font-weight: 700; min-width: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.ec-problem-head small { font-size: 9px; color: var(--ink2); flex: none; }
.ec-modes { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 3px; }
.ec-mode {
  display: inline-flex; align-items: center; justify-content: center; gap: 2px; min-width: 0;
  padding: 4px 1px; border: 1px solid var(--line); border-radius: 6px;
  background: var(--bg); color: var(--ink2); cursor: pointer;
  font: inherit; font-size: 10.5px; font-weight: 600; text-align: center;
  transition: background .15s ease, border-color .15s ease, color .15s ease;
}
.ec-mode:hover { background: var(--brand-soft); border-color: var(--brand-border, #c7d2fe); color: var(--brand-deep); }
.ec-mode.active { background: var(--brand-soft); border-color: var(--brand); color: var(--brand-deep); }
.ec-mode-icon { font-size: 11px; line-height: 1; }
.ec-mode-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 900px) {
  .ec-mode { font-size: 10px; padding: 5px 4px; }
}
@media (prefers-reduced-motion: reduce) {
  .ec-mode { transition: none; }
}
</style>
