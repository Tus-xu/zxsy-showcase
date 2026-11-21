<template>
  <div class="ix-errhunt">
    <!-- sgv3（CHAIN-DESIGN §5.8）errorhunt 找错批注 · 免打字交互形式 7/9
         三场景共用：wrong 后 conflict 幕（教师卡壳剧场 wow W4）/ 教师卡壳 /
         transfer 批改 AI。行点选（定位从哪步开始错）+ 错因面板点选 → 双确定性判定
         （位置对∧错因对 → correct；位置对∧错因错 → partial；位置错 → wrong）。 -->
    <div class="ix-eh-ask">🔍 {{ askText }}</div>

    <ol class="ix-eh-lines">
      <li v-for="(ln, i) in lines" :key="ln.id">
        <button
          type="button" class="ix-eh-line" :class="{ picked: badLine === ln.id }"
          @click="badLine = badLine === ln.id ? '' : ln.id"
        >
          <span class="ix-eh-mark">{{ badLine === ln.id ? '✋ 从这步开始错' : '' }}</span>
          <span class="ix-eh-latex"><LatexText :text="String(ln.latex || ln.text || '')" /></span>
        </button>
      </li>
    </ol>

    <!-- 错因面板：定位行之后展开 -->
    <div v-if="badLine" class="ix-eh-causes">
      <div class="ix-eh-clabel">这一步错在哪？选一个错因：</div>
      <button
        v-for="(c, ci) in causeOptions" :key="ci" type="button"
        class="ix-eh-cause" :class="{ on: causeChoice === ci }"
        @click="causeChoice = causeChoice === ci ? null : ci"
      >{{ c.text }}</button>
    </div>

    <div class="ix-eh-actions">
      <button type="button" class="ix-submit" :disabled="!canSubmit" @click="submit">找到了，提交</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import LatexText from '@/components/LatexText.vue'

const props = defineProps({
  /** CHAIN-DESIGN §5.8 spec：{lines:[{id,latex}], ask, cause_options:[{text,...}]} */
  spec: { type: Object, required: true },
})
const emit = defineEmits(['submit'])

const lines = computed(() =>
  (Array.isArray(props.spec?.lines) ? props.spec.lines : [])
    .filter((l) => l && l.id != null)
    .map((l) => ({ id: String(l.id), latex: String(l.latex || l.text || '') })),
)
const askText = computed(() => String(props.spec?.ask || '我从哪一步开始走错了？'))
const causeOptions = computed(() =>
  (Array.isArray(props.spec?.cause_options) ? props.spec.cause_options : [])
    .filter((c) => c && c.text)
    .map((c) => ({ text: String(c.text) })),
)

const badLine = ref('')
const causeChoice = ref(null)
const canSubmit = computed(() => !!badLine.value && causeOptions.value.length > 0 && causeChoice.value != null)
function submit() {
  if (!canSubmit.value) return
  emit('submit', { bad_line: badLine.value, cause_choice: causeChoice.value })
}
</script>

<style scoped>
.ix-errhunt { font-size: 13px; }
.ix-eh-ask { font-size: 12.5px; font-weight: 700; color: #b91c1c; margin-bottom: 7px; }
.ix-eh-lines { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; counter-reset: eh; }
.ix-eh-line {
  width: 100%; display: flex; align-items: flex-start; gap: 8px; text-align: left;
  padding: 8px 11px; border-radius: var(--radius-md); cursor: pointer;
  border: 1px solid var(--border); background: rgba(255, 255, 255, 0.85); color: var(--text-primary);
  font: inherit; line-height: 1.7; transition: all .14s;
}
.ix-eh-line::before { content: counter(eh); counter-increment: eh; flex: 0 0 auto; width: 18px; height: 18px; border-radius: 5px; background: #f1f5f9; color: #64748b; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; margin-top: 2px; }
.ix-eh-line:hover { border-color: #dc2626; }
.ix-eh-line.picked { border-color: #dc2626; background: #fef2f2; box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1); }
.ix-eh-line.picked::before { background: #dc2626; color: #fff; }
.ix-eh-mark { flex: 0 0 auto; font-size: 11px; font-weight: 700; color: #dc2626; white-space: nowrap; margin-top: 3px; min-width: 0; }
.ix-eh-latex { flex: 1; min-width: 0; font-size: 12.5px; }
.ix-eh-causes { margin-top: 8px; padding: 8px 10px; border-radius: var(--radius-sm); border: 1px dashed rgba(220, 38, 38, 0.35); background: rgba(254, 242, 242, 0.5); }
.ix-eh-clabel { font-size: 11.5px; color: #b91c1c; font-weight: 700; margin-bottom: 6px; }
.ix-eh-cause {
  display: block; width: 100%; text-align: left; margin-bottom: 5px; padding: 7px 11px;
  border-radius: var(--radius-md); cursor: pointer; font-size: 12.5px; line-height: 1.6;
  border: 1px solid var(--border); background: var(--bg-white); color: var(--text-primary); transition: all .13s;
}
.ix-eh-cause:hover { border-color: #dc2626; }
.ix-eh-cause.on { border-color: #dc2626; background: #fef2f2; font-weight: 700; }
.ix-eh-actions { margin-top: 9px; }
.ix-submit {
  padding: 7px 16px; border-radius: var(--radius-md); cursor: pointer; font-size: 12.5px; font-weight: 700;
  border: 1px solid rgba(220, 38, 38, 0.45); color: #fff;
  background: linear-gradient(135deg, #dc2626 0%, #f87171 100%); transition: filter .15s;
}
.ix-submit:disabled { opacity: 0.4; cursor: not-allowed; }
.ix-submit:not(:disabled):hover { filter: brightness(1.06); }
</style>
