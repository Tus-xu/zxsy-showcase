<template>
  <!-- sgv2 前置补课卡（DESIGN §6.2/§8.1/§3.5）：先补 5 分钟缺口知识点——
       工作示例（Markdown）+ 检验题作答入口 + [回原题][跳过，看这步怎么做]。
       检验题作答走既有 attempt 协议（不发新动作值，后端 detour 分流承接）；
       resume / detour_skip 经 tutorAction 白名单新值透传（agent_router.py:770-771/785-786）。
       G8（main.py:_start_placement）：冷启动微评估复用本卡下发（kind="placement"，无工作示例）——
       两按钮语义翻转：resume=不测也不补直接开始做题；detour_skip=跳过测试进补课（main.py:679-693）。
       全部字段防御判空：物料生成 fail-open 时后端根本不下发本卡，但历史数据仍可能缺字段。
       sgv4（DESIGN §7.2/F7）：检验题形式扩全结构化集合（V4 删 tier→free_text 直返，
       check_interaction 任何结构化形式都经 SocraticInteractionCard 分发壳渲染——
       复用信封壳免写第二套 form 分发，禁平行内核）；teach 讲解内容带 citations
       教材溯源出处（R7/A4）与 degraded 降级声明（R7/A5）。probe 段（T6 探测题，
       binary 包装）走主环 socratic_interaction 卡下发，不经本卡。 -->
  <div class="soc-detour" :class="{ 'is-placement': isPlacement }">
    <div class="sd-head">
      <span class="sd-title">{{ titleText }}</span>
      <span v-if="card.reason" class="sd-reason">{{ card.reason }}</span>
    </div>

    <!-- sgv4：内容降级声明（讲解内容非教材原文时显式标注） -->
    <div v-if="degradedZh" class="sd-degraded" data-sd-degraded="">
      ⚠ {{ degradedZh }}
    </div>

    <div v-if="card.worked_example" class="sd-example">
      <div class="sd-label">看个最小例子</div>
      <div class="sd-md"><MarkdownView :text="tex(card.worked_example)" /></div>
    </div>

    <!-- sgv4：教材溯源出处徽标（R7/A4：doc_title/chunk_id 可回溯 kb，点击看原文摘录） -->
    <SocraticCitations :citations="cardCitations" />

    <div v-if="card.check_question" class="sd-check">
      <div class="sd-label">{{ checkLabel }}</div>
      <div class="sd-md"><MarkdownView :text="tex(card.check_question)" /></div>
      <!-- sgv3（CHAIN-DESIGN §5.6/§5.7 + B7⑩）→ sgv4（§7.2/F7）：检验题结构化交互——
           check_interaction 全形式集合经统一分发壳渲染（allow_text_fallback 关闭：
           检验题打字回退由本卡 sd-input 承担，避免双输入框）；提交走 interact 协议
           经 check-interaction → interactionSubmit；旧协议 attempt 输入保留（历史零回退） -->
      <div v-if="checkIx && !ixSent" class="sd-check-ix">
        <SocraticInteractionCard :card="checkEnvelope" @submit="onCheckIxSubmit" />
      </div>
      <div v-if="!ixSent" class="sd-check-form">
        <input
          v-model="answer"
          class="sd-input"
          :disabled="sent"
          :placeholder="checkIx ? '也可以直接打字作答' : inputPlaceholder"
          maxlength="200"
          @keydown.enter.prevent="submit"
        />
        <button class="btn btn-sm btn-primary sd-submit" :disabled="!answer.trim() || sent" @click="submit">
          {{ sent ? '已提交' : '提交答案' }}
        </button>
      </div>
      <div v-if="sent || ixSent" class="sd-sent-hint">答案已发出，看老师上面怎么说；需要改答案直接在输入框再发一次即可。</div>
    </div>

    <div class="sd-actions">
      <button class="sd-act primary" @click="$emit('act', 'resume')">{{ resumeLabel }}</button>
      <button class="sd-act" @click="$emit('act', 'detour_skip')">{{ skipLabel }}</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import MarkdownView from '@/components/MarkdownView.vue'
import { wrapBareLatex } from '@/utils/latex'
import SocraticInteractionCard from './SocraticInteractionCard.vue'
import SocraticCitations from './SocraticCitations.vue'
import { summarizeInteraction } from './messageModel'

const props = defineProps({
  card: { type: Object, required: true },
})
// act：'resume' | 'detour_skip'（MessageBubble 转 tutorAction）；
// check：检验题答案文本（MessageBubble 转 socraticChoice，走 attempt 判答分流）；
// check-interaction：sgv3 检验题免打字作答（sgv4 扩全形式 → interact 协议）
const emit = defineEmits(['act', 'check', 'check-interaction'])

const tex = (v) => wrapBareLatex(String(v ?? ''))

// G8：placement（冷启动开前测）与正式补课共用本卡，动作值协议不变（main.py:679-693 同值不同义），
// 文案必须随语境翻转，否则「跳过补课」按钮在 placement 下实际是「进补课」，误导学生
const isPlacement = computed(() => String(props.card?.kind || '') === 'placement')
const titleText = computed(() => {
  const kp = props.card.kp_name || '前置知识'
  return isPlacement.value ? `⏱ 先花 30 秒测一下：${kp}` : `🧭 先补 5 分钟：${kp}`
})
const checkLabel = computed(() =>
  isPlacement.value
    ? '不是考试，做不出来也没关系——直接发「不会」就行'
    : '检验一下（就 1 小题，过了马上回原题）'
)
const inputPlaceholder = computed(() =>
  isPlacement.value ? '写下你的想法；没把握直接发「不会」' : '写下你的答案，老师批完就带你回原题'
)
const resumeLabel = computed(() => (isPlacement.value ? '⏭ 不测了，直接开始做题' : '↩️ 回原题'))
const skipLabel = computed(() => (isPlacement.value ? '跳过测试，直接看 5 分钟补课' : '跳过补课，看这步怎么做'))

/* ===== sgv4：teach 内容溯源出处与降级声明（R7） ===== */
const cardCitations = computed(() => (Array.isArray(props.card?.citations) ? props.card.citations : []))
const degradedZh = computed(() => {
  const d = props.card?.degraded
  return d && typeof d === 'object' ? String(d.zh || d.message || '').trim() : ''
})

const answer = ref('')
const sent = ref(false)
function submit() {
  const t = answer.value.trim()
  if (!t || sent.value) return
  emit('check', t)
  sent.value = true
  answer.value = ''
  // 检验允许多轮（老师可能追问澄清）：发送后短暂锁定防连点，随后解锁可继续作答
  setTimeout(() => { sent.value = false }, 800)
}

/* ===== sgv3→sgv4：检验题免打字交互（check_interaction = {interaction_id, form, spec}）=====
   v3 仅认 cloze/assemble；V4 检验形式一律结构化（§7.2 删 tier→free_text 直返），
   全形式经 SocraticInteractionCard 分发壳渲染（free_text 除外——检验语境不应出现，
   出现时回落本卡文本输入，防双输入框）。 */
const checkIx = computed(() => {
  const ix = props.card?.check_interaction
  const f = ix && typeof ix === 'object' ? String(ix.form || '') : ''
  return ix && typeof ix === 'object' && f && f !== 'free_text' ? ix : null
})
const checkEnvelope = computed(() => ({
  card_type: 'socratic_interaction',
  interaction_id: String(checkIx.value?.interaction_id || ''),
  form: String(checkIx.value?.form || ''),
  stage: '', // detour 无 stage 徽标（复用本卡头部语境）
  prompt_lead: '作答这道检验题',
  spec: checkIx.value?.spec && typeof checkIx.value.spec === 'object' ? checkIx.value.spec : {},
  allow_text_fallback: false,
  allow_skip: false,
}))
const mountedAt = Date.now()
const ixSent = ref(false)
function onCheckIxSubmit(result) {
  if (ixSent.value || !checkIx.value) return
  const payload = result && typeof result === 'object' && 'payload' in result ? result : { payload: result }
  ixSent.value = true
  emit('check-interaction', {
    interactionId: String(checkIx.value.interaction_id || ''),
    form: String(checkIx.value.form || ''),
    summary: String(payload.summary || summarizeInteraction(checkIx.value.form, checkIx.value.spec || {}, payload.payload || {})),
    payload: payload.payload || {},
    spentMs: Math.max(0, Number(payload.spentMs) || Math.max(0, Date.now() - mountedAt)),
    editCount: Math.max(0, Number(payload.editCount) || 0),
  })
}
</script>

<style scoped>
.soc-detour {
  margin-top: 10px; padding: 12px 14px; border-radius: var(--radius-md);
  border: 1px solid rgba(139, 92, 246, 0.3); background: rgba(245, 243, 255, 0.6);
}
.sd-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.sd-title { font-size: 13px; font-weight: 700; color: #6d28d9; }
.sd-reason { font-size: 11px; color: var(--text-muted); }
.sd-label { font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; }
.sd-example, .sd-check {
  padding: 9px 11px; border-radius: var(--radius-sm); margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.85); border: 1px solid var(--border);
}
.sd-md { font-size: 13px; line-height: 1.7; }
.sd-md :deep(.md-body p) { margin: 0 0 4px; }
.sd-check-form { display: flex; gap: 8px; margin-top: 8px; }
/* sgv3 检验题免打字交互嵌入区（sgv4：全形式经分发壳渲染） */
.sd-check-ix {
  margin-top: 8px; padding: 9px 11px; border-radius: var(--radius-sm);
  border: 1px dashed rgba(139, 92, 246, 0.35); background: rgba(250, 249, 255, 0.8);
}
/* sgv4：内容降级声明（R7 显式降级） */
.sd-degraded {
  font-size: 12px; font-weight: 600; color: #b45309; background: #fffbeb;
  border: 1px solid rgba(217, 119, 6, 0.4); border-radius: var(--radius-sm);
  padding: 5px 10px; margin-bottom: 8px;
}
.sd-input {
  flex: 1; min-width: 0; border: 1px solid var(--border); border-radius: var(--radius-sm);
  padding: 7px 10px; font-family: var(--font); font-size: 13px; outline: none;
  background: var(--bg-white); color: var(--text-primary);
}
.sd-input:focus { border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15); }
.sd-submit { flex: 0 0 auto; }
.sd-sent-hint { margin-top: 6px; font-size: 11px; color: var(--text-muted); }
.sd-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.sd-act {
  padding: 7px 14px; border-radius: var(--radius-md); cursor: pointer;
  border: 1px solid var(--border); background: var(--bg-white);
  font-size: 12.5px; font-weight: 600; color: var(--text-secondary);
  transition: all var(--transition-fast);
}
.sd-act:hover { border-color: #8b5cf6; color: #6d28d9; background: #f5f3ff; }
.sd-act.primary {
  border-color: rgba(139, 92, 246, 0.45); color: #fff;
  background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%);
}
.sd-act.primary:hover { filter: brightness(1.06); color: #fff; }
/* G8 placement（开前测）：与补课卡同构不同色——琥珀色示意「评估」而非「补课」 */
.soc-detour.is-placement { border-color: rgba(245, 158, 11, 0.35); background: rgba(255, 251, 235, 0.6); }
.soc-detour.is-placement .sd-title { color: #b45309; }
.soc-detour.is-placement .sd-input:focus { border-color: #d97706; box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.15); }
.soc-detour.is-placement .sd-act:hover { border-color: #d97706; color: #b45309; background: #fffbeb; }
.soc-detour.is-placement .sd-act.primary {
  border-color: rgba(217, 119, 6, 0.45);
  background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%);
}
</style>
