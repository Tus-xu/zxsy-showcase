<template>
  <div class="soc-confirm" :class="`is-${context}`" :data-soc-confirm="context">
    <!-- sgv4（DESIGN §3.4b Z2-Z5 / §5.3 T0b/T-DEMO/T10 / F8）确认/引导按钮卡族。
         同一组件三语境（消灭「回复『好』」式文本确认，R-出口按钮化）：
         · socratic_exit_offer 出口确认（T10/揭示前确认——学生确认制，绝不自动揭示）
         · socratic_confirm 示范确认（Z4 预算耗尽示范预告按钮化）
         · socratic_nudge 对话回合收尾（Z2 澄清 / Z3 跑题 / Z5 检验澄清——文本回应后必有可点选卡）
         动作经 tutor_action 白名单透传（nudge_resume/nudge_hint/demo_confirm/demo_retry…），
         无对错判定、不计轮次预算；按钮 data-sbj-action 为 DOM 级验收锚点。
         卡片自带 actions（后端下发）优先；缺省按语境给默认按钮组（防御旧后端/物料 fail-open）。 -->
    <div v-if="leadText" class="scf-lead">{{ leadIcon }} {{ leadText }}</div>
    <div class="scf-btns">
      <button
        v-for="(a, i) in actions" :key="a.id" type="button"
        class="scf-btn" :class="{ primary: a.primary }"
        :data-sbj-action="a.id"
        @click="$emit('act', a.id)"
      >{{ a.label }}</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** sgv4 确认/引导卡：{card_type, lead?/text?/question?, actions?:[{id,label,primary?}]} */
  card: { type: Object, required: true },
})
// act：动作 id（MessageBubble 转 tutorAction；DialogView/DualView 映射为
// tutor_action 白名单值或本地聚焦，无对错判定不计轮次——§3.4b 卡协议）
defineEmits(['act'])

const context = computed(() => {
  const t = String(props.card?.card_type || props.card?.type || '')
  if (t === 'socratic_exit_offer') return 'exit_offer'
  if (t === 'socratic_confirm') return 'confirm'
  return 'nudge'
})

const leadText = computed(() =>
  String(props.card?.lead || props.card?.text || props.card?.question || '').trim())
const leadIcon = computed(() => ({ exit_offer: '🗝️', confirm: '🎬', nudge: '👆' }[context.value] || '👆'))

/** 语境默认按钮组：卡片自带 actions 优先（后端可定制文案/顺序），缺省按 §3.4b/§5.3 协议 */
const DEFAULT_ACTIONS = {
  // T10/T0b 出口确认：确认词「好」命中既有 EXIT_CONFIRM_RE（正则文本路径兼容保留），
  // 拒绝 = 再试一轮（attempt 文本，stall 语义不变）
  exit_offer: [
    { id: 'exit_confirm', label: '好，讲这一步吧', primary: true },
    { id: 'keep_trying', label: '我再试试' },
  ],
  // Z4 示范确认：确认进示范交互链；拒绝 demo_retry（限 1 次，后端 demo_deferrals 计数）
  confirm: [
    { id: 'demo_confirm', label: '好，做给我看', primary: true },
    { id: 'demo_retry', label: '我再试试' },
  ],
  // Z2/Z3/Z5 对话回合收尾：回到未答交互卡（本地聚焦）/ 既有 hint 通道 / 换道题（new_problem 判定）
  nudge: [
    { id: 'nudge_resume', label: '回到这一步', primary: true },
    { id: 'nudge_hint', label: '给我点提示' },
  ],
}
const actions = computed(() => {
  const custom = Array.isArray(props.card?.actions)
    ? props.card.actions.filter((a) => a && a.id && a.label)
    : []
  if (custom.length) return custom.map((a) => ({ id: String(a.id), label: String(a.label), primary: a.primary === true }))
  return DEFAULT_ACTIONS[context.value] || DEFAULT_ACTIONS.nudge
})
</script>

<style scoped>
.soc-confirm {
  margin-top: 10px; padding: 11px 13px; border-radius: var(--radius-md);
  border: 1px solid rgba(99, 102, 241, 0.3); background: rgba(250, 250, 255, 0.75);
}
.soc-confirm.is-exit_offer { border-color: rgba(245, 158, 11, 0.4); background: rgba(255, 251, 235, 0.7); }
.soc-confirm.is-confirm { border-color: rgba(99, 102, 241, 0.4); background: rgba(250, 250, 255, 0.8); }
.scf-lead { font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 9px; }
.scf-btns { display: flex; flex-wrap: wrap; gap: 8px; }
.scf-btn {
  padding: 8px 16px; border-radius: var(--radius-md); cursor: pointer; font-size: 13px; font-weight: 700;
  border: 1.5px solid var(--border); background: var(--bg-white); color: var(--text-primary);
  transition: all .14s; touch-action: manipulation;
}
.scf-btn:hover { border-color: #8b5cf6; background: #f5f3ff; }
.scf-btn.primary {
  border-color: rgba(139, 92, 246, 0.5); color: #fff;
  background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%);
}
.scf-btn.primary:hover { filter: brightness(1.06); }
</style>
