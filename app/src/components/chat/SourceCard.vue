<template>
  <div class="src-card" :class="{ open, 'student-source': studentDialog }">
    <div class="src-head">
      <button type="button" class="src-toggle" :aria-expanded="open" @click="$emit('toggle')">
        <span class="src-idx">{{ c.n }}</span>
        <span v-if="c.kind && !studentDialog" class="src-kind">{{ c.kind }}</span>
        <span class="src-title">{{ c.title || c.source || '未命名资料' }}</span>
        <UiIcon name="chevron-right" :size="12" />
      </button>
      <a v-if="sourceUrl" class="src-open" :href="sourceUrl" target="_blank" rel="noopener noreferrer" aria-label="打开原资料">↗</a>
    </div>
    <div v-if="open" class="src-body">
      <div v-if="c.snippet" class="src-snippet">{{ c.snippet }}</div>
      <div v-if="sourceUrl" class="src-meta"><b>链接：</b><a :href="sourceUrl" target="_blank" rel="noopener noreferrer">{{ c.url }}</a></div>
      <div v-if="c.retrieved_at" class="src-meta"><b>检索时间：</b>{{ fmtTime(c.retrieved_at) }}</div>
      <div v-if="c.source" class="src-meta"><b>来源：</b>{{ c.source }}</div>
      <div v-if="c.loc" class="src-meta"><b>位置：</b>{{ studentDialog ? String(c.loc).split(' · 切片')[0] : c.loc }}</div>
      <div v-if="c.chunk_id && !studentDialog" class="src-meta chunk"><b>切片：</b>{{ c.chunk_id }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { fmtTime } from './messageModel'
import UiIcon from '@/components/common/UiIcon.vue'

const props = defineProps({
  c: { type: Object, required: true },
  open: { type: Boolean, default: false },
  studentDialog: { type: Boolean, default: false },
})
defineEmits(['toggle'])

const sourceUrl = computed(() => {
  try {
    const url = new URL(props.c.url)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
})
</script>

<style scoped>
.src-card {
  font-size: 12px; border: 1px solid var(--border); border-radius: var(--radius-sm);
  background: var(--bg-white); transition: border-color 0.15s;
  max-width: min(320px, 100%); min-width: min(200px, 100%);
}
.src-card:hover { border-color: var(--primary-border); }
.src-head { display: flex; align-items: center; }
.src-toggle {
  display: flex; align-items: center; gap: 6px; padding: 6px 8px;
  flex: 1; min-width: 0; min-height: 34px; text-align: start; font: inherit;
  color: var(--brand-deep); background: none; border: 0; border-radius: inherit; cursor: pointer;
}
.src-toggle:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
.src-toggle[aria-expanded="true"] :deep(.ui-icon) { transform: rotate(90deg); }
.src-idx {
  display: inline-grid; place-items: center; min-width: 20px; height: 20px; flex: none;
  border-radius: 5px; background: var(--brand-soft); color: var(--brand-deep); font-weight: 700;
}
.src-kind {
  flex: none; padding: 1px 6px; border-radius: 999px;
  background: var(--primary-bg, rgba(79, 70, 229, 0.08));
  color: var(--primary); font-size: 11px;
}
.src-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.student-source { max-width: min(400px, 100%); min-width: 0; background: var(--bg); }
.student-source .src-title { white-space: normal; overflow-wrap: anywhere; }
.src-open { margin: 0 8px 0 0; color: var(--brand-deep); text-decoration: none; }
.src-body {
  border-top: 1px solid var(--border); padding: 8px 10px;
  display: flex; flex-direction: column; gap: 4px;
}
.src-snippet { color: var(--text-secondary); line-height: 1.6; }
.src-meta { color: var(--ma-text-muted, var(--ink2)); word-break: break-word; }
.src-meta b { color: var(--text-secondary); font-weight: 500; }
.src-meta a { color: var(--primary); text-decoration: none; }
.src-meta a:hover { text-decoration: underline; }
</style>
