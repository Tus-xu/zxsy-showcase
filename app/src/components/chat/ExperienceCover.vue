<template>
  <section class="exp-cover" aria-label="体验封面">
    <div class="ec-eyebrow">{{ cover.eyebrow }}</div>
    <h2 class="ec-title">{{ cover.title }}</h2>
    <div class="ec-body">
      <figure v-if="problem" class="ec-figure">
        <img :src="problem.image" :alt="`${problem.no} 题图`" />
        <figcaption>{{ problem.no }} · {{ problem.title }}</figcaption>
      </figure>
      <ul v-if="cover.bullets?.length" class="ec-points">
        <li v-for="(b, i) in cover.bullets" :key="i">{{ b }}</li>
      </ul>
    </div>
    <div class="ec-foot">
      <span class="ec-dot" aria-hidden="true"></span>
      第 1 条消息已经填在输入框里，点「发送」开始；之后每轮都会自动填好下一条。
    </div>
    <div v-if="problem?.note" class="ec-note">{{ problem.note }}</div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { EXPERIENCE_PROBLEM_BY_ID } from '@/offline/experience/catalog'

const props = defineProps({
  meta: { type: Object, required: true },
})
const cover = computed(() => props.meta?.cover || {})
const problem = computed(() => EXPERIENCE_PROBLEM_BY_ID[props.meta?.problemId] || null)
</script>

<style scoped>
.exp-cover {
  max-width: 720px; margin: 28px auto 0; padding: 24px 26px 22px;
  background: var(--card); border: 1px solid var(--line); border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}
.ec-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11.5px; font-weight: 700; color: var(--brand-deep);
  background: var(--brand-soft); border-radius: 999px; padding: 3px 10px;
}
.ec-title {
  margin: 12px 0 16px; font-size: 22px; line-height: 1.35; font-weight: 800;
  color: var(--ink); letter-spacing: -.01em; text-wrap: balance;
}
.ec-body { display: flex; flex-direction: column; gap: 14px; align-items: stretch; }
.ec-figure {
  flex: none; width: 100%; max-width: 640px; margin: 0 auto; padding: 10px;
  background: var(--bg2); border: 1px solid var(--line); border-radius: 12px;
}
.ec-figure img { display: block; width: 100%; height: auto; max-width: 621px; margin: 0 auto; border-radius: 8px; background: #fff; }
.ec-figure figcaption { margin-top: 7px; font-size: 11.5px; color: var(--ink2); text-align: center; }
.ec-points { flex: none; width: 100%; margin: 0; padding: 0; list-style: none; display: grid; gap: 10px; }
.ec-points li {
  position: relative; padding-left: 22px; font-size: 13.5px; line-height: 1.6; color: var(--ink2);
}
.ec-points li::before {
  content: ''; position: absolute; left: 2px; top: 7px; width: 8px; height: 8px;
  border-radius: 50%; background: var(--brand); box-shadow: 0 0 0 3px var(--brand-soft);
}
.ec-foot {
  display: flex; align-items: center; gap: 8px; margin-top: 18px; padding-top: 14px;
  border-top: 1px dashed var(--line); font-size: 12.5px; color: var(--ink2);
}
.ec-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--ok); flex: none; }
.ec-note {
  margin-top: 10px; padding: 8px 11px; border-radius: 9px; font-size: 12px; line-height: 1.6;
  color: var(--warn-deep); background: var(--warn-bg); border: 1px solid var(--warn-border);
}
@media (max-width: 760px) {
  .ec-body { flex-direction: column; }
  .ec-figure { width: 100%; max-width: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .ec-points li::before { box-shadow: none; }
}
</style>
