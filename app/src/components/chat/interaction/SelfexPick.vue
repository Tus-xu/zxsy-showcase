<template>
  <div class="ix-selfex">
    <!-- sgv3（CHAIN-DESIGN §5.9）selfex 自我解释选择 · 免打字交互形式 8/9
         理由选择（Eedi 纪律：每个错项对应一种已知误概念，correct/maps_to 不下发前端）+
         require_evidence 时的依据二次点击（判断依据是哪个条件，防猜对选项 R18）。
         错选不入 wrong 惩罚路径，maps_to 直写假设队列（后端查表判定）。 -->
    <div class="ix-sx-stem">{{ stem }}</div>

    <div class="ix-sx-opts">
      <button
        v-for="(o, i) in options" :key="i" type="button"
        class="ix-sx-opt" :class="{ on: chosen === i }"
        @click="pickOption(i)"
      >
        <span class="ix-sx-key">{{ 'ABCD'[i] || i + 1 }}</span>
        <span class="ix-sx-body"><MarkdownView :text="o.text" :zoomable="false" /></span>
      </button>
    </div>

    <!-- 二次点击：判断依据（题型辨析场景 R5；evidence_options 后端从题干关键条件提取） -->
    <div v-if="needEvidence && chosen != null" class="ix-sx-evi">
      <div class="ix-sx-elabel">你的判断依据是哪个条件？（点一个）</div>
      <div class="ix-sx-eopts">
        <button
          v-for="(e, ei) in evidenceOptions" :key="ei" type="button"
          class="ix-sx-eopt" :class="{ on: evidence === ei }"
          @click="pickEvidence(ei)"
        ><MarkdownView :text="e.text" :zoomable="false" /></button>
      </div>
    </div>

    <div class="ix-sx-actions">
      <button type="button" class="ix-submit" :disabled="!canSubmit" @click="submit">说完了</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import MarkdownView from '@/components/MarkdownView.vue'

const props = defineProps({
  /** CHAIN-DESIGN §5.9 spec：{stem, options:[{text}], require_evidence, evidence_options:[{text}]} */
  spec: { type: Object, required: true },
})
const emit = defineEmits(['submit', 'edit']) // sgv4 §3.5：改选 emit('edit')，信封壳汇总 edit_count

const stem = computed(() => String(props.spec?.stem || '为什么这一步成立？'))
const options = computed(() =>
  (Array.isArray(props.spec?.options) ? props.spec.options : [])
    .filter((o) => o && o.text)
    .map((o) => ({ text: String(o.text) })),
)
const evidenceOptions = computed(() =>
  (Array.isArray(props.spec?.evidence_options) ? props.spec.evidence_options : [])
    .filter((e) => e && e.text)
    .map((e) => ({ text: String(e.text) })),
)
const needEvidence = computed(() => props.spec?.require_evidence === true && evidenceOptions.value.length > 0)

const chosen = ref(null)
const evidence = ref(null)
const canSubmit = computed(() => chosen.value != null && (!needEvidence.value || evidence.value != null))
/** sgv4 §3.5：改选（已选项变更）emit('edit')——数据飞轮脆弱掌握判据 */
function pickOption(i) {
  if (chosen.value !== null && chosen.value !== i) emit('edit')
  chosen.value = chosen.value === i ? null : i
}
function pickEvidence(ei) {
  if (evidence.value !== null && evidence.value !== ei) emit('edit')
  evidence.value = evidence.value === ei ? null : ei
}
function submit() {
  if (!canSubmit.value) return
  const out = { chosen: chosen.value }
  if (needEvidence.value) out.evidence = evidence.value
  emit('submit', out)
}
</script>

<style scoped>
.ix-selfex { font-size: 13px; }
.ix-sx-stem { font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; line-height: 1.6; }
.ix-sx-opts { display: flex; flex-direction: column; gap: 6px; }
.ix-sx-opt {
  display: flex; align-items: flex-start; gap: 8px; width: 100%; text-align: left;
  padding: 9px 11px; border-radius: var(--radius-md); cursor: pointer;
  border: 1px solid var(--border); background: rgba(255, 255, 255, 0.85); color: var(--text-primary);
  font: inherit; font-size: 12.5px; line-height: 1.6; transition: all .14s;
}
.ix-sx-opt:hover { border-color: #8b5cf6; background: #faf9ff; }
.ix-sx-opt.on { border-color: #7c3aed; background: #ede9fe; font-weight: 600; box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.12); }
.ix-sx-key {
  flex: 0 0 auto; width: 20px; height: 20px; border-radius: 6px; margin-top: 1px;
  background: #eef2ff; color: #5b5fc7; font-size: 11px; font-weight: 700;
  display: inline-flex; align-items: center; justify-content: center;
}
.ix-sx-opt.on .ix-sx-key { background: #7c3aed; color: #fff; }
.ix-sx-body { flex: 1; min-width: 0; }
.ix-sx-evi { margin-top: 8px; padding: 8px 10px; border-radius: var(--radius-sm); border: 1px dashed rgba(139, 92, 246, 0.35); background: #faf9ff; }
.ix-sx-elabel { font-size: 11.5px; color: #6d28d9; font-weight: 700; margin-bottom: 6px; }
.ix-sx-eopts { display: flex; flex-direction: column; gap: 5px; }
.ix-sx-eopt {
  text-align: left; padding: 6px 11px; border-radius: var(--radius-md); cursor: pointer; font-size: 12px;
  border: 1px solid var(--border); background: var(--bg-white); color: var(--text-primary); transition: all .13s;
}
.ix-sx-eopt:hover { border-color: #8b5cf6; }
.ix-sx-eopt.on { border-color: #7c3aed; background: #ede9fe; font-weight: 700; }
.ix-sx-actions { margin-top: 9px; }
.ix-submit {
  padding: 7px 16px; border-radius: var(--radius-md); cursor: pointer; font-size: 12.5px; font-weight: 700;
  border: 1px solid rgba(139, 92, 246, 0.45); color: #fff;
  background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); transition: filter .15s;
}
.ix-submit:disabled { opacity: 0.4; cursor: not-allowed; }
.ix-submit:not(:disabled):hover { filter: brightness(1.06); }
</style>
