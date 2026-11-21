<template>
  <aside class="grad-card queue">
    <div class="queue__head">
      <div>
        <div class="queue__title">作答队列</div>
        <div class="queue__sub">按提交时间排列 · 共 {{ submissions.length }} 份</div>
      </div>
      <span class="tv3-tag tv3-tag--primary">{{ confirmedCount }} / {{ submissions.length }}</span>
    </div>

    <div class="queue__filters">
      <button
        v-for="f in filterDefs"
        :key="f.key"
        type="button"
        class="queue__filter"
        :class="{ 'is-active': filter === f.key }"
        :data-testid="`queue-filter-${f.key}`"
        @click="filter = f.key"
      >
        {{ f.label }}<em>{{ f.count }}</em>
      </button>
    </div>

    <div class="queue__list ms-scroll">
      <button
        v-for="s in visible"
        :key="s.id"
        type="button"
        class="queue__item"
        :class="{ 'is-active': s.id === activeId, 'is-done': isConfirmed(s.id) }"
        :data-testid="`queue-item-${s.id}`"
        @click="$emit('select', s.id)"
      >
        <div class="queue__item-top">
          <b>第 {{ globalIndex(s) + 1 }} 份 · 第 {{ s.questionNo }} 题</b>
          <span class="tv3-tag" :class="isConfirmed(s.id) ? 'tv3-tag--ok' : 'tv3-tag--warn'">
            {{ statusText(s) }}
          </span>
        </div>
        <div class="queue__item-meta">{{ s.studentName }} · {{ s.className }} · {{ s.submittedAt }}</div>
        <div class="queue__item-title">{{ s.questionTitle }}</div>
        <div class="queue__item-foot">
          <span v-if="isConfirmed(s.id)" class="queue__final">
            终评 <b>{{ grades[s.id].score }}</b> / {{ s.fullScore }}
          </span>
          <span v-else class="queue__suggest">系统建议 {{ s.systemScore }} / {{ s.fullScore }}</span>
          <span class="queue__arrow">{{ s.id === activeId ? '批改中' : '查看 ›' }}</span>
        </div>
      </button>

      <div v-if="!visible.length" class="queue__empty">该筛选下暂无提交</div>
    </div>

    <div class="queue__foot">
      未确认的批改不会写入学生端；确认后刷新仍保留。
    </div>
  </aside>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  submissions: { type: Array, required: true },
  grades: { type: Object, required: true },
  activeId: { type: String, default: '' },
})
defineEmits(['select'])

const filter = ref('all')

function isConfirmed(id) {
  return !!(props.grades[id] && props.grades[id].confirmed === true)
}
function globalIndex(s) {
  return props.submissions.findIndex((x) => x.id === s.id)
}
function statusText(s) {
  return isConfirmed(s.id) ? '已确认' : '待批'
}

const confirmedCount = computed(() => props.submissions.filter((s) => isConfirmed(s.id)).length)
const pendingCount = computed(() => props.submissions.length - confirmedCount.value)

const filterDefs = computed(() => [
  { key: 'all', label: '全部', count: props.submissions.length },
  { key: 'pending', label: '待批', count: pendingCount.value },
  { key: 'confirmed', label: '已确认', count: confirmedCount.value },
])

const visible = computed(() => {
  if (filter.value === 'pending') return props.submissions.filter((s) => !isConfirmed(s.id))
  if (filter.value === 'confirmed') return props.submissions.filter((s) => isConfirmed(s.id))
  return props.submissions
})
</script>

<style scoped>
.queue {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.queue__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--tv3-line2);
}
.queue__title {
  font-size: 14px;
  font-weight: 700;
  color: var(--tv3-ink);
}
.queue__sub {
  margin-top: 2px;
  font-size: 11.5px;
  color: var(--tv3-ink3);
}
.queue__filters {
  display: flex;
  gap: 2px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--tv3-line2);
}
.queue__filter {
  flex: 1;
  border: 0;
  background: transparent;
  border-radius: 8px;
  padding: 5px 4px;
  font-size: 12px;
  color: var(--tv3-ink3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.queue__filter em {
  font-style: normal;
  font-size: 11px;
  font-weight: 700;
  color: var(--tv3-ink4);
}
.queue__filter.is-active {
  background: var(--tv3-primary-soft);
  color: var(--tv3-primary);
  font-weight: 600;
}
.queue__filter.is-active em {
  color: var(--tv3-primary);
}
.queue__list {
  flex: 1;
  min-height: 0;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.queue__item {
  width: 100%;
  text-align: left;
  border: 1px solid var(--tv3-line);
  background: #fff;
  border-radius: 12px;
  padding: 10px 12px;
  transition: all 0.14s ease;
}
.queue__item:hover {
  border-color: var(--tv3-primary-border);
  box-shadow: var(--tv3-shadow-sm);
}
.queue__item.is-active {
  border-color: var(--tv3-primary);
  background: linear-gradient(180deg, #f5f7ff 0%, #ffffff 70%);
  box-shadow: 0 6px 18px -8px rgba(79, 70, 229, 0.45);
}
.queue__item.is-done .queue__item-top b {
  color: var(--tv3-ink2);
}
.queue__item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.queue__item-top b {
  font-size: 12.5px;
  color: var(--tv3-ink);
}
.queue__item-meta {
  margin-top: 4px;
  font-size: 11.5px;
  color: var(--tv3-ink3);
}
.queue__item-title {
  margin-top: 3px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--tv3-ink2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.queue__item-foot {
  margin-top: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11.5px;
  color: var(--tv3-ink3);
}
.queue__final b {
  color: var(--tv3-teal);
  font-size: 13px;
}
.queue__suggest {
  color: var(--tv3-amber);
}
.queue__arrow {
  color: var(--tv3-primary);
  font-weight: 600;
}
.queue__empty {
  padding: 30px 10px;
  text-align: center;
  font-size: 12px;
  color: var(--tv3-ink3);
}
.queue__foot {
  border-top: 1px solid var(--tv3-line2);
  padding: 9px 14px;
  font-size: 11px;
  line-height: 1.6;
  color: var(--tv3-ink3);
}
</style>
