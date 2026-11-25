<template>
  <div class="sugg" @keydown.esc="close">
    <button
      v-if="collapsed"
      ref="toggleRef"
      type="button"
      class="sugg-toggle"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      {{ expanded ? '收起建议' : '提问建议' }}
      <UiIcon name="chevron-right" :size="13" />
    </button>
    <div v-if="!collapsed || expanded" class="sugg-grid" aria-label="提问建议" tabindex="0">
      <button
        v-for="s in suggestions" :key="s.text" type="button" class="sugg-chip"
        :disabled="disabled" :title="s.reason || ''"
        @click="pick(s)"
      >
        {{ s.text }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { api } from '@/api/client'
import UiIcon from '@/components/common/UiIcon.vue'

const props = defineProps({
  /** 首轮发送后收起（由父级按 messages.length 驱动） */
  collapsed: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  presetOnly: { type: Boolean, default: false },
  /**
   * 学情驱动的推荐（父级 HomeLearningPanel 同源数据）。
   * 每项 { text, reason, skill?, action?, ask?, item? }：reason 是可见的“为什么推荐”。
   * 传 null 时才回退到组件内自取薄弱点（保持组件可独立使用）。
   */
  personalized: { type: Array, default: null },
})
const emit = defineEmits(['pick'])

const expanded = ref(false)
const toggleRef = ref(null)
watch(() => props.collapsed, () => { expanded.value = false })

function close() {
  if (!expanded.value) return
  expanded.value = false
  toggleRef.value?.focus()
}

function pick(suggestion) {
  close()
  emit('pick', suggestion)
}

// 兜底：父级未传数据时，仍按真实 weak-points 生成（不伪造学情）
const fetched = ref([])
onMounted(async () => {
  if (props.personalized !== null) return
  try {
    const data = await api.get('/student/report/weak-points')
    const items = data?.items || data || []
    const name = (w) => w.kp_name || w.name || ''
    const list = []
    for (const w of items.slice(0, 2)) {
      if (!name(w)) continue
      list.push({ text: `出 3 道「${name(w)}」的变式题`, skill: 'quiz_gen', reason: '薄弱点' })
    }
    if (name(items[0])) {
      // sgv3（CHAIN-DESIGN §9.3）无题引导卡两步化：先出题（smart_quiz），题干就位后
      // 题卡引导入口回流 socratic——不再把出题意图发给解题技能（无题不引导红线）
      list.push({ text: `围绕「${name(items[0])}」出一道，带我一步步解`, skill: 'quiz_gen', reason: '薄弱点' })
    }
    fetched.value = list
  } catch { /* 无学情/接口不可用：保持常青建议，不报错 */ }
})
const suggestions = computed(() => [
  ...(props.personalized !== null ? props.personalized : fetched.value),
  ...(props.presetOnly ? [] : EVERGREEN),
])

const EVERGREEN = [
  { text: '分析我的错题规律', skill: '' },
  { text: '我贴道题，帮我出几道变式巩固', skill: 'quiz_gen' },
  // sgv3（CHAIN-DESIGN §9.3）两步化：出题意图归 smart_quiz（门禁 ROUTE_TO_QUIZ 同语义），
  // 出完题再从题卡进引导——「引导我解一道题」不再作为无题引导入口
  { text: '出一道二次函数题，再带我一步步解', skill: 'quiz_gen' },
  { text: '讲讲定积分的几何意义', skill: 'kb_qa' },
  { text: '来一场 60 分钟全真模拟', skill: '' },
  { text: '帮我梳理本周该复习什么', skill: '' },
]

</script>

<style scoped>
.sugg { padding-bottom: 7px; }
.sugg-toggle {
  display: inline-flex; align-items: center; gap: 5px; min-height: 28px; padding: 2px 5px;
  background: none; border: 0; color: var(--ink2); font: inherit; font-size: 12px; font-weight: 600; cursor: pointer;
}
.sugg-toggle:hover { color: var(--brand-deep); }
.sugg-toggle[aria-expanded="true"] :deep(.ui-icon) { transform: rotate(90deg); }
.sugg-grid {
  display: flex; flex-wrap: wrap; gap: 6px; padding: 4px 3px;
  max-height: min(86px, 16dvh); overflow: auto; scrollbar-width: thin;
}
.sugg-chip {
  min-height: 31px; padding: 3px 11px; border-radius: var(--radius-full);
  border: 1px solid var(--border); background: var(--card); color: var(--ink2);
  font: inherit; font-size: 12px; text-align: left; cursor: pointer;
}
.sugg-chip:hover:not(:disabled) { border-color: var(--primary-border); color: var(--brand-deep); background: var(--brand-soft); }
.sugg-chip:disabled { cursor: default; opacity: .65; }
</style>
