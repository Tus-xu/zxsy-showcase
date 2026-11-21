<template>
  <section class="grad-card paper" data-testid="grading-paper">
    <div class="paper__head">
      <div class="paper__head-main">
        <span class="paper__no">第 {{ index + 1 }} 份作答</span>
        <span class="tv3-tag tv3-tag--primary">{{ typeLabel }}</span>
        <span class="tv3-tag">{{ submission.studentName }} · {{ submission.className }}</span>
        <span class="paper__time">提交于 {{ submission.submittedAt }}</span>
      </div>
      <div class="paper__head-right">
        <span class="paper__qno">第 {{ submission.questionNo }} 题</span>
        <b>{{ submission.questionTitle }}</b>
        <span class="paper__full">满分 {{ submission.fullScore }}</span>
      </div>
    </div>

    <div class="paper__body ms-scroll">
      <div class="paper__block">
        <div class="paper__label">题面</div>
        <p class="paper__question">
          <MathText :text="questionText" />
        </p>
        <div v-if="options.length" class="paper__options">
          <div v-for="o in options" :key="o.key" class="paper__option">
            <span class="paper__option-key">{{ o.key }}</span>
            <MathText :text="o.text" />
          </div>
        </div>
      </div>

      <div class="paper__block">
        <div class="paper__label">
          评分细则
          <span class="paper__label-note">共 {{ submission.rubric.length }} 项 · 合计 {{ submission.fullScore }} 分</span>
        </div>
        <div class="rubric">
          <div v-for="(r, i) in submission.rubric" :key="i" class="rubric__row">
            <span class="rubric__idx">{{ i + 1 }}</span>
            <span class="rubric__item">{{ r.item }}</span>
            <span class="rubric__pts">{{ r.points }} 分</span>
          </div>
        </div>
      </div>

      <div class="paper__block paper__block--answer">
        <div class="paper__label">
          学生作答原图
          <span class="paper__label-note">点击图片放大核对</span>
        </div>
        <button type="button" class="paper__imgwrap" data-testid="grading-answer-image" @click="zoomed = true">
          <img :src="submission.image" :alt="`${submission.studentName} 第 ${submission.questionNo} 题作答原图`" class="paper__img" />
          <span class="paper__zoom">🔍 放大</span>
        </button>
        <div class="paper__answer-meta">
          <span class="tv3-tag tv3-tag--warn">系统识别缺陷：{{ submission.defect }}</span>
          <span class="paper__answer-summary">作答摘要：{{ submission.answerSummary }}</span>
        </div>
      </div>

      <details class="paper__ref">
        <summary class="paper__ref-summary">
          <span class="paper__ref-tag">参考答案</span>
          <span class="paper__ref-answer"><MathText :text="reference.answer" /></span>
          <span class="paper__ref-more">展开解析与讲评要点 ▾</span>
        </summary>
        <div class="paper__ref-body">
          <ul class="paper__ref-lines">
            <li v-for="(line, i) in reference.lines" :key="i"><MathText :text="line" /></li>
          </ul>
          <p v-if="reference.keyPoint" class="paper__keypoint">
            <b>讲评要点</b><MathText :text="reference.keyPoint" />
          </p>
          <p class="paper__ref-source">来源：三题手册审核稿 + 独立复核结论，与评分细则一致。</p>
        </div>
      </details>
    </div>

    <div v-if="zoomed" class="paper__zoom-mask" @click="zoomed = false">
      <img :src="submission.image" :alt="`${submission.studentName} 作答原图（放大）`" />
      <span class="paper__zoom-close">点击任意处关闭</span>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import MathText from '../../MathText.vue'

const props = defineProps({
  submission: { type: Object, required: true },
  index: { type: Number, default: 0 },
  caseData: { type: Object, default: null },
  reference: { type: Object, required: true },
})

const zoomed = ref(false)

const typeLabel = computed(() => {
  const t = props.caseData && props.caseData.type
  if (t === 'single') return '单选题'
  if (t === 'multi') return '多选题'
  if (t === 'fill') return '填空题'
  return '解答题'
})

const questionText = computed(() => (props.caseData && props.caseData.questionText) || props.submission.questionText)
const options = computed(() => (props.caseData && props.caseData.options) || [])
</script>

<style scoped>
.paper {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.paper__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--tv3-line2);
  background: linear-gradient(180deg, #fbfcff 0%, #ffffff 100%);
}
.paper__head-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
}
.paper__no {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--tv3-ink);
}
.paper__time {
  font-size: 11.5px;
  color: var(--tv3-ink3);
}
.paper__head-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.paper__head-right b {
  font-size: 12.5px;
  color: var(--tv3-ink2);
}
.paper__qno {
  font-size: 11.5px;
  color: var(--tv3-ink3);
}
.paper__full {
  font-size: 11.5px;
  color: var(--tv3-gold-deep);
  background: var(--tv3-gold-soft);
  border: 1px solid var(--tv3-gold-border);
  border-radius: 999px;
  padding: 1px 8px;
}
.paper__body {
  flex: 1;
  min-height: 0;
  padding: 10px 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.paper__block {
  border: 1px solid var(--tv3-line2);
  border-radius: 12px;
  padding: 9px 12px;
  background: #fff;
}
.paper__ref {
  border: 1px solid #d9f3e8;
  border-radius: 12px;
  background: linear-gradient(180deg, #f7fdfb 0%, #ffffff 70%);
}
.paper__ref-summary {
  list-style: none;
  cursor: pointer;
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 9px 12px;
  font-size: 12.5px;
}
.paper__ref-summary::-webkit-details-marker {
  display: none;
}
.paper__ref-tag {
  flex: none;
  font-size: 10.5px;
  font-weight: 700;
  color: var(--tv3-teal);
  background: var(--tv3-teal-soft);
  border: 1px solid var(--tv3-teal-border);
  border-radius: 999px;
  padding: 1px 8px;
}
.paper__ref-answer {
  font-weight: 700;
  color: var(--tv3-teal);
}
.paper__ref-more {
  margin-left: auto;
  font-size: 10.5px;
  color: var(--tv3-ink3);
}
.paper__ref-body {
  padding: 2px 12px 10px;
  border-top: 1px dashed var(--tv3-line);
}
.paper__ref-source {
  margin: 6px 0 0;
  font-size: 10.5px;
  color: var(--tv3-ink3);
}
.paper__ref-lines {
  margin: 8px 0 0;
  padding-left: 18px;
  font-size: 12px;
  line-height: 1.75;
  color: var(--tv3-ink2);
}
.paper__label {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  color: var(--tv3-ink2);
  margin-bottom: 6px;
}
.paper__label-note {
  font-size: 10.5px;
  font-weight: 400;
  color: var(--tv3-ink3);
}
.paper__question {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--tv3-ink);
}
.paper__options {
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 5px 14px;
}
.paper__option {
  display: flex;
  align-items: baseline;
  gap: 7px;
  font-size: 12.5px;
  color: var(--tv3-ink2);
  border: 1px dashed var(--tv3-line);
  border-radius: 8px;
  padding: 4px 9px;
}
.paper__option-key {
  font-weight: 700;
  color: var(--tv3-primary);
  font-family: var(--tv3-font-num);
}
.paper__keypoint {
  margin: 6px 0 0;
  font-size: 11px;
  line-height: 1.65;
  color: var(--tv3-ink3);
  background: var(--tv3-amber-soft);
  border: 1px solid var(--tv3-amber-border);
  border-radius: 8px;
  padding: 5px 9px;
}
.paper__keypoint b {
  color: var(--tv3-amber);
  margin-right: 6px;
}
.rubric {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.rubric__row {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 12.5px;
  color: var(--tv3-ink2);
  background: var(--tv3-bg2);
  border-radius: 8px;
  padding: 5px 10px;
}
.rubric__idx {
  width: 18px;
  height: 18px;
  flex: none;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #fff;
  border: 1px solid var(--tv3-line);
  font-size: 10.5px;
  font-weight: 700;
  color: var(--tv3-ink3);
}
.rubric__item {
  flex: 1;
}
.rubric__pts {
  font-weight: 700;
  color: var(--tv3-primary);
  font-family: var(--tv3-font-num);
}
.paper__imgwrap {
  position: relative;
  display: block;
  width: 100%;
  padding: 0;
  border: 1px solid var(--tv3-line);
  border-radius: 10px;
  background: var(--tv3-bg2);
  overflow: hidden;
}
.paper__img {
  display: block;
  width: 100%;
  max-height: 280px;
  object-fit: contain;
  background: #f8fafc;
}
.paper__zoom {
  position: absolute;
  right: 8px;
  bottom: 8px;
  font-size: 11px;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
}
.paper__answer-meta {
  margin-top: 8px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex-wrap: wrap;
}
.paper__answer-summary {
  flex: 1;
  min-width: 220px;
  font-size: 11.5px;
  line-height: 1.65;
  color: var(--tv3-ink3);
}
.paper__zoom-mask {
  position: fixed;
  inset: 0;
  z-index: 120;
  background: rgba(15, 23, 42, 0.76);
  display: grid;
  place-items: center;
  padding: 40px;
  cursor: zoom-out;
}
.paper__zoom-mask img {
  max-width: min(1100px, 92vw);
  max-height: 82vh;
  border-radius: 12px;
  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.5);
  background: #fff;
}
.paper__zoom-close {
  position: absolute;
  bottom: 22px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.78);
  font-size: 12px;
}
</style>
