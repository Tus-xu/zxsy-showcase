<template>
  <!-- sgv4（DESIGN §6.2/R7/A4）教材溯源出处徽标：讲解卡/概念卡/交互卡共用的
       「来源：《doc_title》」徽标行——点击徽标展开 quote 教材原文（A4 验收面：
       citations[].doc_title/chunk_id 非空即可回溯 kb_chunks）。
       无 citations 不渲染（防御判空，历史消息零影响）。 -->
  <div v-if="cleanCitations.length" class="soc-cites" data-soc-citations="">
    <span class="soc-cites-label">📖 来源</span>
    <button
      v-for="(c, i) in cleanCitations" :key="i" type="button"
      class="soc-cite-badge" :data-soc-cite="String(c.doc_title || i)"
      :title="`章节/切片：${c.chunk_id || '未知'}${c.kp_codes?.length ? ' · 知识点：' + c.kp_codes.join('、') : ''}`"
      @click="toggle(i)"
    >
      《{{ c.doc_title }}》<span v-if="c.chunk_id" class="soc-cite-chunk">{{ c.chunk_id }}</span>
    </button>
    <div v-for="(c, i) in cleanCitations" v-show="openIdx === i" :key="'q' + i" class="soc-cite-quote">
      <span class="soc-cite-quote-mark">“</span>{{ c.quote || '（该来源未附原文摘录）' }}<span class="soc-cite-quote-mark">”</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  /** sgv4 §3.2 citations：[{doc_title, chunk_id, kp_codes?, quote?}] */
  citations: { type: Array, default: () => [] },
})

const cleanCitations = computed(() =>
  (Array.isArray(props.citations) ? props.citations : [])
    .filter((c) => c && typeof c === 'object' && String(c.doc_title || '').trim())
    .map((c) => ({
      doc_title: String(c.doc_title).trim(),
      chunk_id: String(c.chunk_id || '').trim(),
      kp_codes: Array.isArray(c.kp_codes) ? c.kp_codes.map((k) => String(k)).filter(Boolean) : [],
      quote: String(c.quote || '').trim(),
    })),
)

const openIdx = ref(-1)
function toggle(i) {
  openIdx.value = openIdx.value === i ? -1 : i
}
</script>

<style scoped>
.soc-cites { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
.soc-cites-label { font-size: 11px; font-weight: 700; color: #0f766e; }
.soc-cite-badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; font-weight: 600; color: #0f766e; cursor: pointer;
  background: #f0fdfa; border: 1px solid rgba(13, 148, 136, 0.3);
  border-radius: 999px; padding: 2px 9px; max-width: 100%;
}
.soc-cite-badge:hover { border-color: #0d9488; }
.soc-cite-chunk { font-weight: 400; opacity: 0.75; }
.soc-cite-quote {
  flex-basis: 100%; margin-top: 4px; padding: 6px 10px;
  font-size: 12px; color: #134e4a; background: rgba(240, 253, 250, 0.85);
  border-left: 3px solid rgba(13, 148, 136, 0.5); border-radius: 4px; line-height: 1.65;
}
.soc-cite-quote-mark { color: #0d9488; font-weight: 700; }
</style>
