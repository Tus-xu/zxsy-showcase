<template>
  <div class="soc-ix" :class="[{ used }, `is-${form || 'unknown'}`, { 'is-last-resort': isLastResort }]" :data-soc-ix-form="form || ''" :data-soc-ix-id="card.interaction_id || ''">
    <!-- sgv3（CHAIN-DESIGN §6.1）socratic_interaction 统一交互信封壳 · F1
         所有免打字交互形式共用一个壳：卡头（阶段徽标 + prompt_lead + 形式徽标/决策依据）
         → form 分发形态子组件 → 打字回退（allow_text_fallback 永远允许，可及性）
         → 跳过（allow_skip）。沿 SocraticDetourCard 结构纪律：props.card 防御判空、
         emit 上行、状态本地、提交即抛。已用态（used）置灰整卡防重复作答。
         上行协议 §6.2：submit → {summary, payload, spentMs}（视图组 tutor_interaction 上下文）；
         text/skip → attempt 文本（走既有判答链路兜底）。
         sgv4（DESIGN §3.2/§3.3/§3.5 扩展）：
         · 信封新字段全 optional——hints（L1 高亮线索随卡）/ last_resort（打字例外理由标签）
           / degraded（内容降级声明）/ citations（教材溯源出处）/ form_source+routing_reason（遥测面 tooltip）；
         · 5 新形式分发：binary/numline/figure_probe/figure_slider/expr_input（§4.1 形式目录）；
         · free_text 不再经未知分支降级：last_resort 主通道渲染（理由标签 + 按题裁剪符号面板）；
         · 结构化形式的打字回退视觉降级为卡底小字入口（主通道让位给结构化交互）；
         · edit_count：子组件 edit 事件汇总上行（§3.5 数据飞轮 R5 脆弱掌握判据）。 -->
    <div class="si-head">
      <span v-if="stageZh" class="si-stage">{{ stageZh }}</span>
      <span class="si-lead">{{ leadText }}</span>
      <span v-if="formZh" class="si-form" :title="formBadgeTitle">{{ formZh }}</span>
    </div>

    <!-- sgv4：L1 高亮线索随卡下发（阶梯 L1 不改形式，§5.5） -->
    <div v-if="hintText" class="si-hint" data-soc-ix-hint="">
      <span class="si-hint-level">{{ hintLevelZh }}</span>{{ hintText }}
    </div>
    <!-- sgv4：last_resort 理由标签（R1：打字例外必须显式说明为什么） -->
    <div v-if="lastResort" class="si-lastresort" data-soc-ix-last-resort="">
      ⌨️ {{ lastResortZh }}
    </div>
    <!-- sgv4：内容降级声明（R7：拿不到真实教材内容时显式标注，绝不静默编造） -->
    <div v-if="degradedZh" class="si-degraded" data-soc-ix-degraded="">
      ⚠ {{ degradedZh }}
    </div>

    <!-- form 分发（v3 九种 + sgv4 五种免打字形态；未知 form → 降级提示 + 打字回退，永不白屏 R21 精神） -->
    <div class="si-body" :class="{ 'is-used': used }">
      <AnnotateCanvas v-if="form === 'annotate'" :spec="spec" @submit="onSubmit" />
      <TriageBoard v-else-if="form === 'triage'" :spec="spec" @submit="onSubmit" />
      <RestateCheck v-else-if="form === 'restate_check'" :spec="spec" @submit="onSubmit" />
      <SequenceBoard v-else-if="form === 'sequence'" :spec="spec" @submit="onSubmit" />
      <ExprAssembler v-else-if="form === 'assemble'" :spec="spec" @submit="onSubmit" @edit="countEdit" />
      <ClozeFill v-else-if="form === 'cloze'" :spec="spec" @submit="onSubmit" @edit="countEdit" />
      <ErrorHunter v-else-if="form === 'errorhunt'" :spec="spec" @submit="onSubmit" />
      <SelfexPick v-else-if="form === 'selfex'" :spec="spec" @submit="onSubmit" @edit="countEdit" />
      <RouteCommit v-else-if="form === 'route_commit'" :spec="spec" @submit="onSubmit" />
      <!-- sgv4 五新形式（§4.1）：判断按钮组 / 数轴标注 / 图上探点 / 滑块试探 / last_resort 式子输入 -->
      <BinaryJudge v-else-if="form === 'binary'" :spec="spec" @submit="onSubmit" @edit="countEdit" />
      <NumLineMark v-else-if="form === 'numline'" :spec="spec" @submit="onSubmit" @edit="countEdit" />
      <FigureProbe v-else-if="form === 'figure_probe'" :spec="spec" @submit="onSubmit" @edit="countEdit" />
      <FigureSlider v-else-if="form === 'figure_slider'" :spec="spec" @submit="onSubmit" @edit="countEdit" />
      <ExprInput v-else-if="form === 'expr_input'" :spec="spec" :disabled="used" @submit="onSubmit" @edit="countEdit" />
      <!-- free_text（sgv4 收窄为 last_resort 专用 §3.3）：主通道文本输入 + 符号面板，
           走 attempt 文本判答（_judge 九字段，§4.1），不经 interact 判定器 -->
      <div v-else-if="form === 'free_text'" class="si-ftmain">
        <input
          v-model="draft" class="si-input si-input-main" maxlength="300"
          placeholder="把你这一步的想法写下来（也可以点符号面板）" :disabled="used"
          data-soc-ix-ft-input=""
          @keydown.enter.prevent="sendText"
        />
        <SymbolPalette :keys="keypadKeys" palette-id="ft-main" @press="tapPaletteKey" />
        <div class="si-ft-actions">
          <button type="button" class="si-send" :disabled="!draft.trim() || used" @click="sendText">发出去</button>
        </div>
      </div>
      <div v-else class="si-unknown">这一步的交互形式（{{ form || '未知' }}）暂不支持——直接打字告诉我你的想法 👇</div>
    </div>

    <!-- sgv4：教材溯源出处徽标（R7/A4；detour 讲解/L2 概念卡语境） -->
    <SocraticCitations :citations="citations" />

    <div v-if="used" class="si-usedmark">已作答 ✓ · 看老师上面怎么说</div>
    <template v-else>
      <!-- 打字回退：永远允许（可及性；语音 LaTeX 回填也走这里）。
           sgv4 视觉降级：结构化形式回退为卡底小字入口（主通道让位给结构化交互）；
           last_resort 形式（free_text/expr_input）主通道已存在 → 不重复渲染回退行 -->
      <div v-if="allowText && !isLastResort" class="si-fallback" :class="{ minor: formSupportStructured }">
        <input
          v-model="draft" class="si-input" maxlength="300"
          :placeholder="fallbackPlaceholder" :disabled="used"
          @keydown.enter.prevent="sendText"
        />
        <button type="button" class="si-send" :disabled="!draft.trim()" @click="sendText">改用打字</button>
      </div>
      <div v-if="allowSkip" class="si-skiprow">
        <button type="button" class="si-skip" @click="$emit('skip', skipLabel)">{{ skipLabel || '跳过这步' }}</button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { FORM_ZH, STAGE_ZH, summarizeInteraction } from './messageModel'
import AnnotateCanvas from './interaction/AnnotateCanvas.vue'
import TriageBoard from './interaction/TriageBoard.vue'
import RestateCheck from './interaction/RestateCheck.vue'
import SequenceBoard from './interaction/SequenceBoard.vue'
import ExprAssembler from './interaction/ExprAssembler.vue'
import ClozeFill from './interaction/ClozeFill.vue'
import ErrorHunter from './interaction/ErrorHunter.vue'
import SelfexPick from './interaction/SelfexPick.vue'
import RouteCommit from './interaction/RouteCommit.vue'
import BinaryJudge from './interaction/BinaryJudge.vue'
import NumLineMark from './interaction/NumLineMark.vue'
import FigureProbe from './interaction/FigureProbe.vue'
import FigureSlider from './interaction/FigureSlider.vue'
import ExprInput from './interaction/ExprInput.vue'
import SymbolPalette from './SymbolPalette.vue'
import SocraticCitations from './SocraticCitations.vue'

const props = defineProps({
  /** CHAIN-DESIGN §6.1 信封 + sgv4 §3.2 扩展（全 optional）：
   *  {card_type, session_id, step_no, interaction_id, form, move, stage, prompt_lead, spec,
   *   allow_text_fallback, allow_skip, skip_label, interaction_reason,
   *   form_source?, last_resort?, hints?, citations?, degraded?, routing_reason?} */
  card: { type: Object, required: true },
  /** 已用态（msg.usedInteractions[ci]，MessageBubble 传入；本地提交后视图置位） */
  used: { type: Boolean, default: false },
})
// submit：{summary, payload, spentMs, editCount}（视图组 tutor_interaction 上下文，interact 协议）
// text：打字回退/free_text 主通道文本；skip：跳过标签文本（两者都走既有 attempt 链路兜底）
const emit = defineEmits(['submit', 'text', 'skip'])

const form = computed(() => String(props.card?.form || '').trim())
const spec = computed(() => (props.card?.spec && typeof props.card.spec === 'object' ? props.card.spec : {}))
const stageZh = computed(() => STAGE_ZH[String(props.card?.stage || '')] || '')
const formZh = computed(() => FORM_ZH[form.value] || '')
const leadText = computed(() => String(props.card?.prompt_lead || '').trim() || '动笔试试这一步')
const allowText = computed(() => props.card?.allow_text_fallback !== false) // 缺省允许（§6.1「永远允许」）
const allowSkip = computed(() => props.card?.allow_skip === true)
const skipLabel = computed(() => String(props.card?.skip_label || '跳过这步'))
const fallbackPlaceholder = computed(
  () => ({ assemble: '也可以直接打字写出这一步（支持 $latex$）', cloze: '也可以打字写出答案' }[form.value] || '也可以直接打字回答'),
)

/* ===== sgv4 §3.2 信封新字段（全 optional，旧卡片缺字段零渲染） ===== */
const hintObj = computed(() => (props.card?.hints && typeof props.card.hints === 'object' ? props.card.hints : null))
const hintText = computed(() => String(hintObj.value?.text || '').trim())
const hintLevelZh = computed(() => {
  const lv = Number(hintObj.value?.level)
  return Number.isFinite(lv) && lv > 0 ? `L${lv}` : ''
})
const lastResort = computed(() => (props.card?.last_resort && typeof props.card.last_resort === 'object' ? props.card.last_resort : null))
const lastResortZh = computed(() => String(lastResort.value?.reason_zh || '').trim())
const keypadKeys = computed(() =>
  (Array.isArray(lastResort.value?.keypad) ? lastResort.value.keypad : []).filter((k) => k != null && String(k) !== ''),
)
const degradedZh = computed(() => {
  const d = props.card?.degraded
  return d && typeof d === 'object' ? String(d.zh || d.message || '').trim() : ''
})
const citations = computed(() => (Array.isArray(props.card?.citations) ? props.card.citations : []))
// last_resort 家族：free_text 与 expr_input 自带主文本通道（§3.3），通用回退行不再重复渲染
const isLastResort = computed(() => form.value === 'free_text' || form.value === 'expr_input')
// 形式徽标 tooltip：交互决策依据（v3）+ 路由决策遥测（sgv4 form_source/routing_reason）
const formBadgeTitle = computed(() => {
  const parts = [String(props.card?.interaction_reason || '').trim()]
  if (props.card?.routing_reason) parts.push(`route:${props.card.routing_reason}`)
  if (props.card?.form_source) parts.push(`form_source:${props.card.form_source}`)
  return parts.filter(Boolean).join(' · ')
})
// 已有结构化主通道的形式（free_text 主通道例外——它本身就是文本）
const formSupportStructured = computed(() => form.value !== 'free_text' && form.value !== '')

/* ===== sgv4 §3.5 edit_count 汇总：子组件 edit 事件计数上行 ===== */
const editCount = ref(0)
function countEdit() {
  editCount.value += 1
}

/* ===== 提交：文本化摘要（历史回显 + LLM 判答兜底双用途 §6.2）+ 原始 payload + 计时 ===== */
const mountedAt = ref(Date.now())
onMounted(() => { mountedAt.value = Date.now() })
function onSubmit(payload) {
  if (props.used) return
  const summary = summarizeInteraction(form.value, spec.value, payload)
  emit('submit', { summary, payload, spentMs: Date.now() - mountedAt.value, editCount: editCount.value })
}

/* ===== 打字回退 / free_text 主通道 ===== */
const draft = ref('')
function sendText() {
  const t = draft.value.trim()
  if (!t || props.used) return
  emit('text', t)
  draft.value = ''
}
/** 符号面板点选插入（free_text 主通道；√ 自动补左括号便于续写） */
function tapPaletteKey(p) {
  const text = { '√': '√(', sqrt: '√(' }[p.v] ?? String(p.v)
  draft.value += text
}
</script>

<style scoped>
.soc-ix {
  margin-top: 10px; padding: 12px 14px; border-radius: var(--radius-md);
  border: 1px solid rgba(91, 91, 214, 0.3); background: rgba(250, 250, 255, 0.7);
}
.si-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 9px; }
.si-stage {
  font-size: 10.5px; font-weight: 800; color: #fff; border-radius: 999px; padding: 1px 8px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6); letter-spacing: .02em;
}
.si-lead { font-size: 13.5px; font-weight: 700; color: var(--text-primary); flex: 1; min-width: 120px; }
.si-form {
  font-size: 10.5px; color: #5b5fc7; background: #eef2ff; border: 1px solid rgba(99, 102, 241, 0.25);
  border-radius: 999px; padding: 1px 8px; cursor: help; white-space: nowrap;
}
.si-body.is-used { opacity: 0.55; pointer-events: none; filter: grayscale(0.3); }
.si-usedmark { margin-top: 8px; font-size: 11.5px; font-weight: 700; color: #059669; }
.si-unknown { font-size: 12.5px; color: var(--text-muted); padding: 6px 0; }
/* sgv4：L1 高亮线索随卡 */
.si-hint {
  font-size: 12.5px; color: #92400e; background: #fffbeb; border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: var(--radius-sm); padding: 6px 10px; margin-bottom: 8px;
}
.si-hint-level {
  font-size: 10px; font-weight: 800; color: #b45309; background: #fef3c7;
  border-radius: 999px; padding: 1px 6px; margin-right: 6px;
}
/* sgv4：last_resort 理由标签（R1 显式例外） */
.si-lastresort {
  font-size: 12px; font-weight: 600; color: #6d28d9; background: #f5f3ff;
  border: 1px dashed rgba(139, 92, 246, 0.45); border-radius: var(--radius-sm);
  padding: 5px 10px; margin-bottom: 8px;
}
/* sgv4：内容降级声明（R7 显式降级不静默） */
.si-degraded {
  font-size: 12px; font-weight: 600; color: #b45309; background: #fffbeb;
  border: 1px solid rgba(217, 119, 6, 0.4); border-radius: var(--radius-sm);
  padding: 5px 10px; margin-bottom: 8px;
}
/* sgv4：free_text last_resort 主通道（文本输入 + 按题裁剪符号面板） */
.si-ftmain { display: flex; flex-direction: column; gap: 8px; }
.si-input-main {
  border-color: rgba(139, 92, 246, 0.5); font-weight: 600;
}
.si-ft-actions { display: flex; justify-content: flex-end; }
/* 打字回退（沿 SocraticDetourCard sd-input 纪律）；sgv4：结构化形式视觉降级为小字入口 */
.si-fallback { display: flex; gap: 8px; margin-top: 9px; }
.si-fallback.minor { margin-top: 7px; padding-top: 7px; border-top: 1px dashed var(--border); opacity: 0.75; }
.si-fallback.minor .si-input { padding: 4px 8px; font-size: 12px; }
.si-fallback.minor .si-send { padding: 4px 10px; font-size: 11.5px; }
.si-input {
  flex: 1; min-width: 0; border: 1px solid var(--border); border-radius: var(--radius-sm);
  padding: 7px 10px; font-family: var(--font); font-size: 13px; outline: none;
  background: var(--bg-white); color: var(--text-primary);
}
.si-input:focus { border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15); }
.si-send {
  flex: 0 0 auto; padding: 7px 13px; border-radius: var(--radius-sm); cursor: pointer;
  border: 1px solid var(--border); background: var(--bg-white); color: var(--text-secondary); font-size: 12.5px; font-weight: 600;
}
.si-send:hover:not(:disabled) { border-color: #8b5cf6; color: #6d28d9; }
.si-send:disabled { opacity: 0.45; cursor: not-allowed; }
.si-skiprow { margin-top: 7px; }
.si-skip {
  border: none; background: none; cursor: pointer; font-size: 11.5px; color: var(--text-muted);
  text-decoration: underline dotted; padding: 2px 4px;
}
.si-skip:hover { color: var(--text-secondary); }
</style>
