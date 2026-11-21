<template>
  <Teleport to="body">
    <div v-if="open" class="hw-modal" data-test="homework-dialog" @click.self="$emit('close')">
      <div class="hw-modal__panel" role="dialog" aria-modal="true" aria-label="作业回看">
        <header class="hw-modal__head">
          <div>
            <div class="hw-modal__eyebrow">作业回看 · 我的提交</div>
            <h2>第 {{ submission.questionNo }} 题 · {{ submission.questionTitle }}</h2>
          </div>
          <div class="hw-modal__head-right">
            <span class="ms-tag" :class="grade ? 'ms-tag--ok' : 'ms-tag--warn'" data-test="dialog-grading-status">
              {{ grade ? '已批改' : '待批改' }}
            </span>
            <button type="button" class="hw-modal__close" aria-label="关闭" @click="$emit('close')">✕</button>
          </div>
        </header>

        <div class="hw-modal__body">
          <section class="hw-modal__paper">
            <div class="hw-modal__paper-label">我的答卷（提交原件）</div>
            <div class="hw-modal__paper-img">
              <img :src="submission.image" :alt="`第 ${submission.questionNo} 题我的作答`" data-test="submission-image" />
            </div>
            <div class="hw-modal__paper-meta">
              <span>{{ submission.studentName }} · {{ submission.className }}</span>
              <span>提交于 {{ submission.submittedAt }}</span>
            </div>
          </section>

          <section class="hw-modal__detail">
            <div class="hw-modal__block">
              <div class="hw-modal__label">题目</div>
              <p class="hw-modal__question">{{ submission.questionText }}</p>
            </div>

            <div class="hw-modal__block">
              <div class="hw-modal__label">我的作答</div>
              <p class="hw-modal__answer">{{ submission.answerSummary }}</p>
            </div>

            <div class="hw-modal__grade" :class="grade ? 'is-graded' : 'is-pending'">
              <template v-if="grade">
                <div class="hw-modal__score">
                  <b data-test="dialog-score">{{ grade.score }}</b>
                  <span>/ {{ submission.fullScore }}</span>
                </div>
                <div class="hw-modal__grade-main">
                  <div class="hw-modal__grade-title">
                    教师评语
                    <span class="hw-modal__graded-at">批改于 {{ formatTime(grade.gradedAt) }}</span>
                  </div>
                  <p data-test="dialog-comment">{{ grade.comment || '（老师未填写评语）' }}</p>
                </div>
              </template>
              <template v-else>
                <div class="hw-modal__pending-icon">⏳</div>
                <div class="hw-modal__grade-main">
                  <div class="hw-modal__grade-title">待批改</div>
                  <p>老师确认批改后，得分与评语会自动同步到这里；刷新页面仍会保留已确认的批改结果。</p>
                </div>
              </template>
            </div>

            <div class="hw-modal__block">
              <div class="hw-modal__label">评分细则（{{ submission.fullScore }} 分）</div>
              <ul class="hw-modal__rubric">
                <li v-for="(item, i) in submission.rubric" :key="i">
                  <span class="hw-modal__rubric-dot"></span>
                  <span class="hw-modal__rubric-text">{{ item.item }}</span>
                  <span class="hw-modal__rubric-points">{{ item.points }} 分</span>
                </li>
              </ul>
            </div>
          </section>
        </div>

        <footer class="hw-modal__foot">
          <span class="hw-modal__foot-hint">
            这份答卷来自本次演示的作业样例；分数与评语以教师端“已确认”的批改记录为准。
          </span>
          <button type="button" class="ms-btn" @click="$emit('close')">关闭</button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import { formatTime } from './progress'

const props = defineProps({
  open: { type: Boolean, default: false },
  submission: { type: Object, required: true },
  grade: { type: Object, default: null },
})
const emit = defineEmits(['close'])

function onKeydown(e) {
  if (e.key === 'Escape' && props.open) emit('close')
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.hw-modal {
  position: fixed;
  inset: 0;
  z-index: 9002;
  background: rgba(15, 23, 42, 0.46);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px;
}
.hw-modal__panel {
  width: min(1020px, 100%);
  max-height: calc(100vh - 56px);
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 30px 90px rgba(2, 6, 23, 0.32);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.hw-modal__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--line2, #f1f5f9);
}
.hw-modal__eyebrow {
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--brand-deep, #4338ca);
  background: var(--brand-soft, #eef2ff);
  border-radius: 6px;
  padding: 2px 8px;
  display: inline-block;
  margin-bottom: 6px;
}
.hw-modal__head h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
}
.hw-modal__head-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.hw-modal__close {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  border: 1px solid var(--line, #e2e8f0);
  background: #fff;
  color: var(--ink2, #334155);
  font-size: 13px;
}
.hw-modal__close:hover {
  background: var(--bg2, #f1f5f9);
}
.hw-modal__body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
  gap: 22px;
  padding: 20px 24px;
  overflow-y: auto;
}
.hw-modal__paper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.hw-modal__paper-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--ink3, #94a3b8);
  letter-spacing: 0.04em;
}
.hw-modal__paper-img {
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 12px;
  background: #f8fafc;
  padding: 10px;
  display: grid;
  place-items: center;
}
.hw-modal__paper-img img {
  width: 100%;
  max-height: 330px;
  object-fit: contain;
  border-radius: 6px;
  background: #fff;
}
.hw-modal__paper-meta {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 11.5px;
  color: var(--ink3, #94a3b8);
}
.hw-modal__detail {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}
.hw-modal__block {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.hw-modal__label {
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--ink3, #94a3b8);
}
.hw-modal__question {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--ink, #0f172a);
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  padding: 10px 13px;
}
.hw-modal__answer {
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
  color: var(--ink2, #334155);
}
.hw-modal__grade {
  display: flex;
  gap: 14px;
  border-radius: 14px;
  padding: 14px 16px;
  border: 1px solid var(--line, #e2e8f0);
  background: #fff;
}
.hw-modal__grade.is-graded {
  background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
  border-color: var(--ok-border, #a7f3d0);
}
.hw-modal__grade.is-pending {
  background: linear-gradient(135deg, #ffffff 0%, #fffbeb 100%);
  border-color: var(--warn-border, #fde68a);
}
.hw-modal__score {
  flex: none;
  display: flex;
  align-items: baseline;
  gap: 3px;
  padding-right: 14px;
  border-right: 1px dashed #a7f3d0;
}
.hw-modal__score b {
  font-size: 40px;
  line-height: 1;
  font-weight: 800;
  color: var(--ok-deep, #047857);
  font-family: var(--font-num, 'Inter', sans-serif);
}
.hw-modal__score span {
  font-size: 14px;
  color: var(--ink3, #94a3b8);
}
.hw-modal__pending-icon {
  flex: none;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid var(--warn-border, #fde68a);
  display: grid;
  place-items: center;
  font-size: 20px;
}
.hw-modal__grade-main {
  min-width: 0;
}
.hw-modal__grade-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  font-weight: 700;
  color: var(--ink2, #334155);
  margin-bottom: 4px;
}
.hw-modal__graded-at {
  font-size: 11px;
  font-weight: 400;
  color: var(--ink3, #94a3b8);
}
.hw-modal__grade-main p {
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
  color: var(--ink2, #334155);
}
.hw-modal__rubric {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.hw-modal__rubric li {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 12.5px;
  color: var(--ink2, #334155);
  background: #f8fafc;
  border-radius: 9px;
  padding: 7px 11px;
}
.hw-modal__rubric-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--brand, #4f46e5);
  flex: none;
}
.hw-modal__rubric-text {
  flex: 1;
  min-width: 0;
}
.hw-modal__rubric-points {
  font-weight: 700;
  color: var(--brand-deep, #4338ca);
  flex: none;
}
.hw-modal__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 13px 24px;
  border-top: 1px solid var(--line2, #f1f5f9);
  background: #fbfcff;
}
.hw-modal__foot-hint {
  font-size: 11.5px;
  color: var(--ink3, #94a3b8);
}
</style>
