<template>
  <!-- 课堂任务：作业（林一川 = sub-A）—— 待批改 / 已批改都在这里回看 -->
  <button type="button" class="hw-task" :class="{ 'hw-task--graded': !!grade }" data-test="homework-task" @click="$emit('open')">
    <span class="hw-task__icon">📝</span>
    <span class="hw-task__main">
      <span class="hw-task__line">
        <span class="ms-tag">作业</span>
        <b>第 {{ submission.questionNo }} 题 · {{ submission.questionTitle }}</b>
        <span class="ms-tag" :class="grade ? 'ms-tag--ok' : 'ms-tag--warn'" data-test="homework-status">
          {{ grade ? `已批改 ${grade.score}/${submission.fullScore}` : '待批改' }}
        </span>
      </span>
      <span class="hw-task__meta">
        👩‍🏫 张老师 · 我提交于 {{ submission.submittedAt }} · 满分 {{ submission.fullScore }} 分
      </span>
      <span class="hw-task__question">{{ submission.questionText }}</span>
    </span>
    <span class="hw-task__thumb"><img :src="submission.image" alt="我的作答" /></span>
    <span class="ms-btn ms-btn--sm" :class="{ 'ms-btn--primary': !grade }">查看作答回看</span>
  </button>
</template>

<script setup>
defineProps({
  submission: { type: Object, required: true },
  grade: { type: Object, default: null },
})
defineEmits(['open'])
</script>

<style scoped>
.hw-task {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  text-align: left;
  padding: 14px 18px;
  border: 1px solid var(--line, #e2e8f0);
  border-left: 3px solid #f59e0b;
  border-radius: 14px;
  background: #fff;
  font-family: inherit;
  transition: all 0.16s ease;
}
.hw-task--graded {
  border-left-color: var(--ok, #059669);
}
.hw-task:hover {
  border-color: #fcd9a6;
  background: #fffdf7;
}
.hw-task__icon {
  width: 42px;
  height: 42px;
  flex: none;
  border-radius: 12px;
  background: #fffbeb;
  display: grid;
  place-items: center;
  font-size: 20px;
}
.hw-task__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.hw-task__line {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  color: var(--ink, #0f172a);
}
.hw-task__line b {
  font-size: 14px;
}
.hw-task__meta {
  font-size: 11.5px;
  color: var(--ink3, #94a3b8);
}
.hw-task__question {
  font-size: 12px;
  color: var(--ink2, #334155);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 640px;
}
.hw-task__thumb {
  width: 76px;
  height: 50px;
  border-radius: 8px;
  border: 1px solid var(--line, #e2e8f0);
  background: #fff;
  overflow: hidden;
  flex: none;
  display: grid;
  place-items: center;
}
.hw-task__thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>
