<template>
  <!-- sgv2 错因分析卡（DESIGN §6.2/§8.1）：你的作答 → 错在哪 → 原话依据 → 关联知识点 → 追问。
       全部字段防御判空（§9：诊断字段缺失走后端回落路径，卡内缺什么 hide 什么，绝不白屏）；
       misconception_zh 由后端下发（prompts.MISCONCEPTION_NAMES_ZH 单一映射源），前端不自建。 -->
  <div class="soc-err" :class="verdict === 'wrong' ? 'is-wrong' : 'is-partial'">
    <div class="se-head">
      <span class="se-title">🔍 错因分析</span>
      <span v-if="verdictZh" class="tag" :class="verdict === 'wrong' ? 'red' : 'orange'">{{ verdictZh }}</span>
      <span v-if="card.misconception_zh" class="se-mis">{{ card.misconception_zh }}</span>
      <span v-if="card.kp_name" class="se-kp">{{ card.kp_name }}</span>
    </div>

    <div v-if="card.error_move" class="se-row">
      <span class="se-label">错在哪</span>
      <div class="se-body"><MarkdownView :text="tex(card.error_move)" :zoomable="false" /></div>
    </div>

    <div v-if="card.evidence_quote" class="se-quote">
      <span class="se-quote-mark">“</span><MarkdownView :text="tex(card.evidence_quote)" :zoomable="false" /><span class="se-quote-mark">”</span>
      <span class="se-quote-src">—— 你的原话</span>
    </div>

    <!-- sgv4（DESIGN F12）：「想一想」区改为指向追问交互卡的引导条——追问的结构化交互
         由同轮 socratic_interaction 卡承载（T5 首错换形式追问 / T3b 误解辨析卡），
         本卡不再渲染虚线文本框占位（认知指向：去下面的交互卡作答，不是打字） -->
    <div v-if="card.probe_question" class="se-probe">
      <span class="se-label">想一想</span>
      <div class="se-body">
        <MarkdownView :text="tex(card.probe_question)" :zoomable="false" />
        <div class="se-probe-go">👇 你的回答走下方追问交互卡——点选项，不用打字</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import MarkdownView from '@/components/MarkdownView.vue'
import { wrapBareLatex } from '@/utils/latex'

const props = defineProps({
  card: { type: Object, required: true },
})

const tex = (v) => wrapBareLatex(String(v ?? ''))

// verdict 着色：wrong 红色系 / 其余（partial）琥珀系（judge 契约：wrong|partial 才发卡）
const verdict = computed(() => String(props.card.verdict || ''))

const verdictZh = computed(
  () => ({ wrong: '这步答错了', partial: '差一点，再具体些' }[verdict.value] || '')
)
</script>

<style scoped>
.soc-err {
  margin-top: 10px; padding: 11px 13px; border-radius: var(--radius-md);
  border: 1px solid rgba(239, 68, 68, 0.28); background: rgba(254, 242, 242, 0.65);
}
.soc-err.is-partial {
  border-color: rgba(245, 158, 11, 0.32); background: rgba(255, 251, 235, 0.6);
}
.se-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
.se-title { font-size: 12.5px; font-weight: 700; color: #b91c1c; }
.is-partial .se-title { color: #b45309; }
.se-mis {
  font-size: 11px; font-weight: 600; color: #9f1239;
  background: #fff1f2; border: 1px solid rgba(225, 29, 72, 0.25);
  border-radius: var(--radius-full); padding: 1px 8px;
}
.is-partial .se-mis { color: #92400e; background: #fef3c7; border-color: rgba(217, 119, 6, 0.3); }
.se-kp {
  font-size: 11px; color: var(--primary); background: #eef2ff;
  border-radius: var(--radius-full); padding: 1px 8px;
}
.se-row { display: flex; gap: 8px; align-items: flex-start; margin-bottom: 5px; }
.se-label {
  flex: 0 0 auto; font-size: 11px; font-weight: 700; color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.75); border: 1px solid var(--border);
  border-radius: 6px; padding: 1px 7px; margin-top: 2px; white-space: nowrap;
}
.se-body { flex: 1; min-width: 0; font-size: 13px; line-height: 1.65; }
.se-body :deep(.md-body p) { margin: 0; }
.se-quote {
  display: flex; align-items: baseline; flex-wrap: wrap; gap: 2px;
  font-size: 12.5px; color: #7f1d1d; font-style: italic;
  border-left: 3px solid rgba(239, 68, 68, 0.4); padding: 2px 0 2px 9px; margin: 6px 0;
}
.is-partial .se-quote { color: #78350f; border-left-color: rgba(217, 119, 6, 0.45); }
.se-quote :deep(.md-body) { display: inline; font-style: italic; }
.se-quote :deep(.md-body p) { display: inline; margin: 0; }
.se-quote-mark { font-size: 15px; font-weight: 700; }
.se-quote-src { font-size: 10.5px; color: var(--text-muted); font-style: normal; margin-left: 4px; }
.se-probe {
  display: flex; gap: 8px; align-items: flex-start;
  margin-top: 7px; padding: 8px 10px; border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.8); border: 1px solid rgba(239, 68, 68, 0.28);
}
.is-partial .se-probe { border-color: rgba(217, 119, 6, 0.4); }
/* sgv4 F12：追问引导条（指向下方交互卡，不再渲染虚线文本框占位） */
.se-probe-go {
  margin-top: 5px; font-size: 11.5px; font-weight: 700; color: #6d28d9;
}
.is-partial .se-probe-go { color: #b45309; }
</style>
