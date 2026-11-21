<template>
  <aside class="grad-card review" data-testid="grading-review">
    <div class="review__head">
      <div>
        <div class="review__title">系统建议 · 仅参考</div>
        <div class="review__sub">规则匹配 + 解析结论；终评由教师唯一写入</div>
      </div>
      <span class="tv3-tag tv3-tag--ai">AI 辅助</span>
    </div>

    <div class="review__body ms-scroll">
      <div v-if="hasSuggestion" class="suggest" data-testid="grading-suggestion">
        <div class="suggest__score">
          <b data-testid="grading-suggestion-score">{{ submission.systemScore }}</b>
          <span>/ {{ submission.fullScore }}</span>
          <em>建议分</em>
        </div>
        <p class="suggest__comment">{{ submission.systemComment }}</p>
        <div class="suggest__judge">
          <span class="tv3-tag" :class="submission.defect === '无' ? 'tv3-tag--ok' : 'tv3-tag--danger'">
            系统判定：{{ submission.defect === '无' ? '无缺陷' : '存在缺陷' }}
          </span>
          <span class="suggest__defect">{{ submission.defect }}</span>
        </div>
      </div>

      <div v-else class="suggest suggest--error" data-testid="grading-suggestion-error">
        <b>⚠ 系统建议生成失败</b>
        <p>没有拿到结构化的建议分与评语（可恢复错误）。请直接依据题面、参考答案与评分细则在下方人工终审给分，不会阻塞批改流程。</p>
      </div>

      <div class="review__divider" />

      <div class="field">
        <label class="field__label" for="grading-score">
          教师终审给分<span class="field__req">必填</span>
          <span class="field__hint">0 ~ {{ submission.fullScore }} 分，可保留 .5</span>
        </label>
        <div class="field__score-row">
          <input
            id="grading-score"
            class="tv3-input field__score"
            :class="{ 'is-invalid': !!error }"
            type="number"
            min="0"
            :max="submission.fullScore"
            step="0.5"
            :value="draft.score"
            data-testid="grading-score-input"
            @input="$emit('update:score', $event.target.value)"
          />
          <span class="field__full">/ {{ submission.fullScore }} 分</span>
        </div>
      </div>

      <div class="field">
        <label class="field__label" for="grading-comment">
          评语<span class="field__hint">将与学生端回看一起展示</span>
        </label>
        <textarea
          id="grading-comment"
          class="tv3-textarea field__comment"
          rows="4"
          :value="draft.comment"
          placeholder="例如：第 2 步没有把“出现过的号码种数”转化为指示变量，结论 3 是抽取次数而不是 E(X)。"
          data-testid="grading-comment-input"
          @input="$emit('update:comment', $event.target.value)"
        />
      </div>

      <p v-if="error" class="review__error" data-testid="grading-error">{{ error }}</p>

      <div v-if="confirmed" class="confirmed" data-testid="grading-confirmed-state">
        <span class="tv3-tag tv3-tag--ok">已确认</span>
        <div class="confirmed__text">
          终评 <b>{{ grade.score }}</b> / {{ submission.fullScore }} 分 · {{ gradedAtText }}
          <div class="confirmed__hint">已写入学生回看；刷新页面仍保留，可修改后重新确认。</div>
        </div>
      </div>

      <button
        type="button"
        class="review__confirm"
        :class="{ 'is-update': confirmed }"
        :disabled="draft.score === '' || draft.score === null || draft.score === undefined"
        data-testid="grading-confirm"
        @click="$emit('confirm')"
      >
        {{ confirmed ? '✓ 更新终评（覆盖学生端展示）' : '✓ 确认批改（写入终分）' }}
      </button>

      <button v-if="nextId" type="button" class="review__next" data-testid="grading-next" @click="$emit('next')">
        下一份待批 →
      </button>

      <div class="review__sync">
        <div class="review__sync-title">跨端同步</div>
        <p>
          确认后按提交 ID <code>{{ submission.id }}</code> 写入
          <code>teacher.grading.grades</code>，学生端读取同一份提交即可看到分数与评语（未确认前不写键、不显示分数）。
        </p>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  submission: { type: Object, required: true },
  draft: { type: Object, required: true },
  grade: { type: Object, default: null },
  error: { type: String, default: '' },
  nextId: { type: String, default: '' },
})
defineEmits(['update:score', 'update:comment', 'confirm', 'next'])

const hasSuggestion = computed(
  () =>
    Number.isFinite(props.submission.systemScore) &&
    typeof props.submission.systemComment === 'string' &&
    props.submission.systemComment.length > 0,
)
const confirmed = computed(() => !!(props.grade && props.grade.confirmed === true))

function pad(n) {
  return String(n).padStart(2, '0')
}
const gradedAtText = computed(() => {
  const raw = props.grade && props.grade.gradedAt
  if (!raw) return ''
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return String(raw)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
})
</script>

<style scoped>
.review {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.review__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 13px 16px 11px;
  border-bottom: 1px solid var(--tv3-line2);
}
.review__title {
  font-size: 14px;
  font-weight: 700;
  color: var(--tv3-ink);
}
.review__sub {
  margin-top: 2px;
  font-size: 11px;
  color: var(--tv3-ink3);
}
.review__body {
  flex: 1;
  min-height: 0;
  padding: 12px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.suggest {
  border-radius: 12px;
  padding: 11px 12px;
  background: linear-gradient(135deg, #f5f3ff 0%, #eef2ff 60%, #ecfeff 100%);
  border: 1px solid var(--tv3-primary-border);
}
.suggest__score {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.suggest__score b {
  font-size: 28px;
  line-height: 1.1;
  font-weight: 800;
  color: var(--tv3-primary);
  font-family: var(--tv3-font-num);
}
.suggest__score span {
  font-size: 13px;
  color: var(--tv3-ink3);
}
.suggest__score em {
  font-style: normal;
  margin-left: auto;
  font-size: 11px;
  font-weight: 700;
  color: var(--tv3-ai);
  background: #fff;
  border: 1px solid var(--tv3-ai-border);
  border-radius: 999px;
  padding: 1px 8px;
}
.suggest__comment {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.75;
  color: var(--tv3-ink2);
}
.suggest__judge {
  margin-top: 8px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex-wrap: wrap;
}
.suggest__defect {
  flex: 1;
  min-width: 160px;
  font-size: 11px;
  line-height: 1.6;
  color: var(--tv3-ink3);
}
.suggest--error {
  background: var(--tv3-rose-soft);
  border-color: var(--tv3-rose-border);
}
.suggest--error b {
  font-size: 13px;
  color: var(--tv3-rose);
}
.suggest--error p {
  margin: 5px 0 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--tv3-ink2);
}
.review__divider {
  height: 1px;
  background: var(--tv3-line2);
}
.field__label {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--tv3-ink2);
  margin-bottom: 6px;
}
.field__req {
  font-size: 10px;
  font-weight: 700;
  color: var(--tv3-rose);
  background: var(--tv3-rose-soft);
  border-radius: 4px;
  padding: 0 5px;
}
.field__hint {
  margin-left: auto;
  font-size: 10.5px;
  font-weight: 400;
  color: var(--tv3-ink3);
}
.field__score-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.field__score {
  width: 108px;
  font-size: 16px;
  font-weight: 700;
  font-family: var(--tv3-font-num);
  color: var(--tv3-primary);
}
.field__score.is-invalid {
  border-color: var(--tv3-rose);
}
.field__full {
  font-size: 12px;
  color: var(--tv3-ink3);
}
.field__comment {
  min-height: 96px;
  font-size: 12.5px;
}
.review__error {
  margin: 0;
  font-size: 11.5px;
  color: var(--tv3-rose);
  background: var(--tv3-rose-soft);
  border: 1px solid var(--tv3-rose-border);
  border-radius: 8px;
  padding: 6px 10px;
}
.confirmed {
  display: flex;
  gap: 9px;
  align-items: flex-start;
  background: var(--tv3-teal-soft);
  border: 1px solid var(--tv3-teal-border);
  border-radius: 10px;
  padding: 9px 11px;
}
.confirmed__text {
  font-size: 12px;
  color: var(--tv3-ink2);
  line-height: 1.6;
}
.confirmed__text b {
  font-family: var(--tv3-font-num);
  color: var(--tv3-teal);
  font-size: 14px;
}
.confirmed__hint {
  margin-top: 2px;
  font-size: 10.5px;
  color: var(--tv3-ink3);
}
.review__confirm {
  width: 100%;
  border: 0;
  border-radius: 11px;
  padding: 11px 14px;
  font-size: 13.5px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #4f46e5 0%, #6d28d9 55%, #0891b2 100%);
  box-shadow: 0 10px 24px -10px rgba(79, 70, 229, 0.65);
  transition: all 0.15s ease;
}
.review__confirm:hover:not(:disabled) {
  filter: brightness(1.06);
  transform: translateY(-1px);
}
.review__confirm:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}
.review__confirm.is-update {
  background: linear-gradient(135deg, #0e7490 0%, #4f46e5 100%);
}
.review__next {
  width: 100%;
  border: 1px solid var(--tv3-primary-border);
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--tv3-primary);
  background: #fff;
}
.review__next:hover {
  background: var(--tv3-primary-soft);
}
.review__sync {
  margin-top: 2px;
  border: 1px dashed var(--tv3-line);
  border-radius: 10px;
  padding: 8px 10px;
  background: var(--tv3-bg2);
}
.review__sync-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--tv3-ink2);
  margin-bottom: 3px;
}
.review__sync p {
  margin: 0;
  font-size: 10.5px;
  line-height: 1.65;
  color: var(--tv3-ink3);
}
.review__sync code {
  font-family: var(--tv3-font-num);
  background: #fff;
  border: 1px solid var(--tv3-line);
  border-radius: 4px;
  padding: 0 4px;
  font-size: 10px;
  color: var(--tv3-primary);
}
</style>
