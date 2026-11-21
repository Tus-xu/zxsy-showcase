<template>
  <div class="ix-restate">
    <!-- sgv3（CHAIN-DESIGN §5.3）restate_check 复述-批改反转（wow W2）· 免打字交互形式 3/9
         AI 复述题意（portrait 句列表）故意掺 1 处轻度误读，学生点选说错的句子——
         学生从被检查者翻转为检查者。错误句 id（restate_flaw）不下发前端，
         后端确定性判定（挑对 → planning；挑错位置 → wrong+reading 误概念）。
         「全部正确」按钮（自认 AI 复述无错）同样是有效作答。 -->
    <div class="ix-rs-note">🤔 {{ noteText }}</div>
    <ol class="ix-rs-list">
      <li v-for="(s, i) in sentences" :key="i">
        <button
          type="button" class="ix-rs-sent" :class="{ picked: pickedIdx === i }"
          @click="pickSentence(i)"
        >
          <span class="ix-rs-mark">{{ pickedIdx === i ? '👈 这句不对' : '❓' }}</span>
          <span class="ix-rs-body"><MarkdownView :text="s" :zoomable="false" /></span>
        </button>
      </li>
    </ol>
    <div v-if="firstMove" class="ix-rs-guess">
      <span class="ix-rs-guess-tag">AI 的第一步猜测</span>
      <span>这不是复述句，不用挑错——只用来对照你的想法。</span>
      <div class="ix-rs-guess-body"><MarkdownView :text="firstMove" :zoomable="false" /></div>
    </div>
    <div class="ix-rs-actions">
      <button
        type="button" class="ix-rs-all" :class="{ picked: allCorrect }"
        @click="allCorrect = !allCorrect; pickedIdx = -1"
      >👍 AI 复述全部正确</button>
      <button type="button" class="ix-submit" :disabled="!canSubmit" @click="submit">提交批改</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import MarkdownView from '@/components/MarkdownView.vue'

const props = defineProps({
  /** CHAIN-DESIGN §5.3 spec：{portrait:[...], flawed, note}（flawed 仅供文案，错误位置不下发） */
  spec: { type: Object, required: true },
})
const emit = defineEmits(['submit'])

const sentences = computed(() =>
  (Array.isArray(props.spec?.portrait) ? props.spec.portrait : []).map((s) => String(s ?? '')).filter(Boolean),
)
const firstMove = computed(() => String(props.spec?.first_move || '').trim())
const noteText = computed(() => {
  const n = String(props.spec?.note || '').trim()
  if (n) return n
  return props.spec?.flawed === false ? '我按读到的复述了一遍，你看看对不对' : 'AI 复述可能有错——找出来就是你的了'
})
const pickedIdx = ref(-1)
const allCorrect = ref(false)
// 两个提交状态互斥：先点「全部正确」再点某句时，必须清掉全对，否则提交会静默丢句选。
function pickSentence(i) {
  allCorrect.value = false
  pickedIdx.value = pickedIdx.value === i ? -1 : i
}
const canSubmit = computed(() => pickedIdx.value >= 0 || allCorrect.value)
function submit() {
  if (!canSubmit.value) return
  if (allCorrect.value) emit('submit', { all_correct: true })
  else emit('submit', { bad_sentence: pickedIdx.value })
}
</script>

<style scoped>
.ix-restate { font-size: 13px; }
.ix-rs-note { font-size: 11.5px; color: #b45309; background: #fffbeb; border: 1px dashed rgba(217, 119, 6, 0.4); border-radius: var(--radius-sm); padding: 5px 10px; margin-bottom: 8px; }
.ix-rs-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; counter-reset: rs; }
.ix-rs-list li { counter-increment: rs; }
.ix-rs-sent {
  width: 100%; display: flex; align-items: flex-start; gap: 8px; text-align: left;
  padding: 9px 11px; border-radius: var(--radius-md); cursor: pointer;
  border: 1px solid var(--border); background: rgba(255, 255, 255, 0.85); color: var(--text-primary);
  font: inherit; font-size: 12.5px; line-height: 1.6; transition: all .14s;
}
.ix-rs-sent::before { content: counter(rs); flex: 0 0 auto; width: 18px; height: 18px; border-radius: 5px; background: #eef2ff; color: #5b5fc7; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; margin-top: 1px; }
.ix-rs-sent:hover { border-color: #8b5cf6; background: #faf9ff; }
.ix-rs-sent.picked { border-color: #d97706; background: #fffbeb; box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.12); }
.ix-rs-mark { flex: 0 0 auto; font-size: 11px; color: #b45309; font-weight: 700; white-space: nowrap; margin-top: 2px; }
.ix-rs-body { flex: 1; min-width: 0; }
.ix-rs-guess { margin-top: 8px; padding: 8px 10px; border-radius: var(--radius-md); border: 1px dashed var(--border); background: rgba(248, 250, 252, 0.8); color: var(--text-secondary); font-size: 11.5px; line-height: 1.6; }
.ix-rs-guess-tag { display: inline-block; margin-right: 6px; padding: 1px 6px; border-radius: 4px; background: #eef2ff; color: #5b5fc7; font-weight: 700; font-size: 10.5px; }
.ix-rs-guess-body { margin-top: 4px; color: var(--text-primary); }
.ix-rs-actions { display: flex; align-items: center; gap: 9px; margin-top: 9px; flex-wrap: wrap; }
.ix-rs-all {
  padding: 7px 13px; border-radius: var(--radius-md); cursor: pointer; font-size: 12px; font-weight: 600;
  border: 1px solid var(--border); background: var(--bg-white); color: var(--text-secondary); transition: all .14s;
}
.ix-rs-all:hover { border-color: #059669; color: #047857; }
.ix-rs-all.picked { border-color: #059669; background: #ecfdf5; color: #047857; font-weight: 700; }
.ix-submit {
  padding: 7px 16px; border-radius: var(--radius-md); cursor: pointer; font-size: 12.5px; font-weight: 700;
  border: 1px solid rgba(139, 92, 246, 0.45); color: #fff;
  background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); transition: filter .15s;
}
.ix-submit:disabled { opacity: 0.4; cursor: not-allowed; }
.ix-submit:not(:disabled):hover { filter: brightness(1.06); }
</style>
