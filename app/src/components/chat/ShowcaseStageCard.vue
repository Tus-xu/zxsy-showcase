<template>
  <!--
    离线教学示例的导学阶段卡（card.type === 'showcase_stage'）。

    为什么单独一张卡：读题要「题干线索 ↔ 解题任务」两列连线，推导要「候选点 + 当前依据 +
    选项」的结构化版式，这两件事现有卡片（socratic_step_choice / socratic_detour）都表达不了。
    其余能力一律复用现役组件：公式走 MarkdownView，图形走 MathFigure，出处走 SocraticCitations。

    交互契约与 socratic_step_choice 完全一致：点选项/动作 = 把可读标签作为学生作答发出去，
    因此父层不需要新的发送通道。历史里的旧卡通过 `used` 变成静态回看，不再向当前步骤注入事件。
  -->
  <div class="ssc" :class="[`ssc-${card.variant}`, { used }]" :data-showcase-card="card.variant">
    <div class="ssc-head">
      <span class="ssc-title">{{ card.title || '导学' }}</span>
      <span v-if="card.pauseAt" class="ssc-pause">原题暂停在 · {{ card.pauseAt }}</span>
    </div>

    <!-- 知识定位：题干节选 + 高亮词 -->
    <div v-if="card.snippet" class="ssc-snippet">
      <span
        v-for="(m, i) in marks"
        :key="'m' + i"
        class="ssc-mark"
        :class="{ 'ssc-mark-in': animate }"
        :style="{ '--i': i }"
      >{{ m }}</span>
      <span class="ssc-snippet-text">{{ card.snippet }}</span>
    </div>

    <!-- 题眼关系（选对题型后展开） -->
    <div v-if="card.relation" class="ssc-relation">
      <span class="ssc-rel-chain">{{ card.relation.chain }}</span>
      <span class="ssc-rel-focus">{{ card.relation.focus }}</span>
      <span v-if="card.relation.note" class="ssc-rel-note">{{ card.relation.note }}</span>
    </div>

    <!-- 读题：题干线索 ↔ 解题任务 -->
    <table v-if="card.clues?.length" class="ssc-clues">
      <thead>
        <tr><th>题干线索</th><th>这一步在确认什么</th></tr>
      </thead>
      <tbody>
        <tr v-for="(r, i) in card.clues" :key="'c' + i">
          <td class="ssc-clue-left">{{ r.left }}</td>
          <td class="ssc-clue-right">{{ r.right }}</td>
        </tr>
      </tbody>
    </table>

    <!-- 方法双卡：每张卡一个副句，点卡片即选这一路 -->
    <div v-if="card.methods?.length" class="ssc-methods">
      <button
        v-for="m in card.methods"
        :key="m.id"
        type="button"
        class="ssc-method"
        :disabled="!interactive"
        @click.stop="send({ id: m.id, label: m.label })"
      >
        <span class="ssc-method-label">{{ m.label }}</span>
        <span class="ssc-method-sub">{{ m.sub }}</span>
      </button>
    </div>

    <!-- 候选点徽标（确认后才显示） -->
    <div v-if="card.candidates?.length" class="ssc-cands">
      <span class="ssc-cands-label">已找到候选点</span>
      <span v-for="(c, i) in card.candidates" :key="'k' + i" class="ssc-cand">{{ c }}</span>
    </div>

    <!-- 当前依据 / 题干式子 -->
    <div v-if="card.basis" class="ssc-basis"><span class="ssc-basis-tag">当前依据</span>{{ card.basis }}</div>

    <!-- 关系图（小课） -->
    <div v-if="card.relations?.length" class="ssc-rels">
      <div v-for="(r, i) in card.relations" :key="'r' + i" class="ssc-rel">
        <span class="ssc-rel-left">{{ r.left }}</span>
        <span class="ssc-rel-arrow" aria-hidden="true">→</span>
        <span class="ssc-rel-right">{{ r.right }}</span>
        <span class="ssc-rel-legend">{{ r.legend }}</span>
      </div>
    </div>

    <!-- 极限支线：三步关系 -->
    <div v-if="card.chain?.length" class="ssc-chain">
      <template v-for="(c, i) in card.chain" :key="'ch' + i">
        <span class="ssc-chain-item">{{ c }}</span>
        <span v-if="i < card.chain.length - 1" class="ssc-chain-sep" aria-hidden="true">→</span>
      </template>
    </div>

    <!-- 三段符号表（组合会话 C1） -->
    <table v-if="card.triples?.length" class="ssc-triples">
      <thead><tr><th>区间</th><th>导数符号</th><th>函数</th></tr></thead>
      <tbody>
        <tr v-for="(t, i) in card.triples" :key="'t' + i">
          <td>{{ t.seg }}</td>
          <td class="ssc-sign">{{ t.sign }}</td>
          <td>{{ t.move }}</td>
        </tr>
      </tbody>
    </table>

    <!-- 结论对照（两处候选的极值） -->
    <div v-if="card.pairs?.length" class="ssc-pairs">
      <div v-for="(p, i) in card.pairs" :key="'p' + i" class="ssc-pair" :class="p.kind.includes('极大') ? 'is-max' : 'is-min'">
        <span class="ssc-pair-at">{{ p.at }}</span>
        <span class="ssc-pair-val">{{ p.value }}</span>
        <span class="ssc-pair-kind">{{ p.kind }}</span>
      </div>
    </div>

    <!-- 题目正文（重选一次 / 错题本） -->
    <div v-if="card.question" class="ssc-question">
      <span class="ssc-q">题目</span>{{ card.question }}
    </div>

    <!-- 说明句 -->
    <p v-if="card.note" class="ssc-note">{{ card.note }}</p>

    <!-- 例图（小课 / 极限）：静态图，不抢焦点 -->
    <figure v-if="card.figure && card.figure.dataUri" class="ssc-figure">
      <img :src="card.figure.dataUri" :alt="card.figure.caption || '示意图'" loading="lazy" />
      <figcaption v-if="card.figure.caption">{{ card.figure.caption }}</figcaption>
    </figure>

    <!-- 演示帧（S1 看图解释）：复用 MathFigure，播放/暂停/重播与图注都走同一滚动区 -->
    <div v-if="card.figure && card.figure.frames?.length && figOpen" class="ssc-frames">
      <MathFigure :figure="card.figure" />
    </div>

    <!-- 极限例子数值 -->
    <div v-if="card.example?.length" class="ssc-example">
      <span v-for="(e, i) in card.example" :key="'e' + i" class="ssc-ex">
        <span class="ssc-ex-h">{{ e.h }}</span>
        <span class="ssc-ex-q">{{ e.q }}</span>
      </span>
    </div>

    <!-- 错题本：首答 / 订正 / 错因 -->
    <div v-if="card.reason" class="ssc-reason">
      <div class="ssc-choices-line">
        <span class="ssc-chip bad">首答 {{ card.first }}</span>
        <span class="ssc-chip good">订正 {{ card.fixed }}</span>
      </div>
      <p class="ssc-reason-text">{{ card.reason }}</p>
    </div>

    <!-- 选项 -->
    <div v-if="card.options?.length" class="ssc-options" :class="{ static: !interactive }">
      <button
        v-for="(o, oi) in optionList"
        :key="'o' + oi"
        type="button"
        class="ssc-opt"
        :class="{ picked: card.readonly && card.chosen === o.id }"
        :disabled="!interactive"
        :aria-pressed="card.readonly && card.chosen === o.id ? 'true' : 'false'"
        @click.stop="pick(o)"
      >
        <span v-if="isLetter(o)" class="ssc-opt-key">{{ o.id }}</span>
        <span class="ssc-opt-label">{{ o.label }}</span>
        <span v-if="card.readonly && card.chosen === o.id" class="ssc-opt-mark">你的首答</span>
      </button>
    </div>

    <!-- 展开式反例（S3「如果两侧同号呢？」/ 主按钮式揭示） -->
    <div v-if="card.reveal" class="ssc-reveal">
      <p v-if="revealOpen" class="ssc-reveal-text">{{ card.reveal }}</p>
    </div>

    <!-- 小结：只回顾实际发生的事件 -->
    <ul v-if="card.lines?.length" class="ssc-lines">
      <li v-for="(l, i) in card.lines" :key="'l' + i">{{ l }}</li>
    </ul>
    <div v-if="card.variant === 'summary'" class="ssc-done-mark" :class="{ on: card.corrected }">
      {{ card.corrected ? '已订正' : '本题已完成' }}
    </div>

    <!-- 动作 / 次动作 -->
    <div v-if="actionList.length || hintList.length" class="ssc-actions">
      <button
        v-for="a in actionList"
        :key="a.id"
        type="button"
        class="ssc-btn"
        :class="{ primary: a.primary, ghost: !a.primary }"
        :disabled="!interactive"
        @click.stop="send(a)"
      >
        {{ a.label }}
      </button>
      <button
        v-for="h in hintList"
        :key="h.id"
        type="button"
        class="ssc-link"
        :disabled="!interactive"
        @click.stop="send(h)"
      >
        {{ h.label }}
      </button>
    </div>

    <!-- 教材溯源出处（自编讲义，可展开可收起） -->
    <SocraticCitations :citations="card.citations || []" />

  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import MathFigure from './MathFigure.vue'
import SocraticCitations from './SocraticCitations.vue'

const props = defineProps({
  /** showcase_stage 卡：variant / stage / title / …；字段见 offline/showcase/engine.js 的卡片构造 */
  card: { type: Object, required: true },
  /** 历史里的旧卡：只回看，不再向当前步骤注入事件 */
  used: { type: Boolean, default: false },
  /** 卡片稳定键（会话消息 key + 卡序），用于「动效只播一次」的记忆 */
  cardKey: { type: String, default: '' },
})

const emit = defineEmits(['choose'])

const figOpen = ref(false)
const revealOpen = ref(false)

/**
 * 知识定位的 2 步短动效（方案 §6「首次知识定位」）：
 * - 只在首次进入该步播一次，刷新或打开历史不抢焦点、不自动重播（sessionStorage 记一次）；
 * - 用户设置了减弱动效时直接给静态形态（同样的文字与方向，不靠动画表达含义）。
 */
const animate = ref(false)

onMounted(() => {
  if (props.used || !marks.value.length) return
  const key = `ssc-anim:${props.cardKey || ''}`
  try {
    if (!props.cardKey || sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
  } catch {
    return
  }
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!reduce) animate.value = true
})

const marks = computed(() => props.card.marks || [])

/** 选项兼容两种写法：{id,label} 与现役题库的 'A. −1' 纯文本 */
const optionList = computed(() =>
  (props.card.options || []).map((o, i) => {
    if (o && typeof o === 'object') return o
    const m = /^([A-D])[.、．]\s*(.+)$/.exec(String(o).trim())
    return m ? { id: m[1], label: m[2] } : { id: String.fromCharCode(65 + i), label: String(o) }
  })
)
const interactive = computed(() => !props.used && !props.card.readonly)

/** 主动作与次动作分两栏：主动作按主色实心，次动作是文字链接 */
const actionList = computed(() => props.card.actions || [])
const hintList = computed(() => {
  const h = props.card.hint
  return h ? [h] : []
})

function isLetter(o) {
  return /^[A-D]$/.test(String(o.id || ''))
}

function pick(o) {
  if (!interactive.value) return
  emit('choose', o.label)
}

function send(a) {
  if (!interactive.value) return
  // 卡内就地展开的两类动作：不发送消息，只改变本卡显示
  if (a.id === 'toggle_fig') {
    figOpen.value = true
    return
  }
  if (a.id === 'same_sign') {
    revealOpen.value = true
    return
  }
  emit('choose', a.label)
}
</script>

<style scoped>
.ssc { margin-top: 16px; padding: 0; border: 0; background: transparent; }

.ssc-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.ssc-title { font-size: 15px; font-weight: 700; color: var(--ink); letter-spacing: .1px; }
.ssc-pause {
  font-size: 11px; color: var(--warn-deep); background: var(--warn-bg);
  border: 1px solid var(--warn-border); border-radius: 999px; padding: 1px 8px;
}

/* 知识定位 */
.ssc-snippet {
  display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
  padding: 8px 10px; margin-bottom: 8px; border-radius: var(--radius);
  background: #fff; border: 1px solid var(--border);
}
.ssc-snippet-text { font-size: 12.5px; color: var(--ink2); }
.ssc-mark {
  font-size: 11.5px; font-weight: 700; color: var(--purple);
  background: var(--purple-soft); border: 1px solid var(--purple-border);
  border-radius: 6px; padding: 1px 6px;
}
.ssc-relation {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
  padding: 9px 11px; margin-bottom: 8px; border-radius: var(--radius);
  background: var(--purple-soft); border: 1px solid var(--purple-border);
}
.ssc-rel-chain { font-size: 12.5px; font-weight: 600; color: var(--ink2); }
.ssc-rel-focus {
  font-size: 12px; font-weight: 700; color: #fff; background: var(--purple);
  border-radius: 6px; padding: 1px 8px;
}
.ssc-rel-note { font-size: 11.5px; color: var(--ink3); }

/* 读题连线表 */
.ssc-clues, .ssc-triples {
  width: 100%; border-collapse: collapse; margin-bottom: 8px;
  font-size: 12.5px; background: #fff; border-radius: var(--radius); overflow: hidden;
}
.ssc-clues th, .ssc-triples th {
  text-align: left; font-weight: 600; font-size: 11.5px; color: var(--ink3);
  padding: 6px 10px; background: var(--line2); border-bottom: 1px solid var(--border);
}
.ssc-clues td, .ssc-triples td { padding: 7px 10px; border-bottom: 1px solid var(--line2); vertical-align: top; }
.ssc-clues tr:last-child td, .ssc-triples tr:last-child td { border-bottom: 0; }
.ssc-clue-left { color: var(--ink); font-weight: 600; white-space: nowrap; }
.ssc-clue-right { color: var(--ink2); }
.ssc-sign { font-weight: 700; color: var(--purple); text-align: center; }

/* 方法双卡 */
.ssc-method {
  display: flex; flex-direction: column; gap: 3px; text-align: left; cursor: pointer;
  padding: 10px 12px; border-radius: var(--radius); border: 1px solid var(--border-strong);
  background: #fff; transition: border-color .14s, background .14s;
}
.ssc-method:hover:not(:disabled) { border-color: var(--purple); background: var(--purple-soft); }
.ssc-method:focus-visible { outline: 2px solid var(--purple); outline-offset: 2px; }
.ssc-method:disabled { cursor: default; opacity: .92; }
.ssc-method-label { font-size: 13px; font-weight: 700; color: var(--ink); }
.ssc-method-sub { font-size: 11.5px; color: var(--ink3); line-height: 1.5; }

/* 方法双卡 */
.ssc-methods { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
.ssc-method {
  display: flex; flex-direction: column; gap: 3px; text-align: left; cursor: pointer;
  padding: 10px 12px; border-radius: var(--radius); border: 1px solid var(--border-strong);
  background: #fff; transition: border-color .14s, background .14s;
}
.ssc-method:hover:not(:disabled) { border-color: var(--purple); background: var(--purple-soft); }
.ssc-method:focus-visible { outline: 2px solid var(--purple); outline-offset: 2px; }
.ssc-method:disabled { cursor: default; opacity: .92; }
.ssc-method-label { font-size: 13px; font-weight: 700; color: var(--ink); }
.ssc-method-sub { font-size: 11.5px; color: var(--ink3); line-height: 1.5; }

/* 知识定位的一次性分段高亮（整段约 780ms，末态停住；纯视觉，不影响点击） */
.ssc-mark-in { animation: ssc-mark-in 340ms ease-out both; animation-delay: calc(var(--i) * 260ms); }
@keyframes ssc-mark-in {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(124, 58, 237, 0); }
  45% { transform: scale(1.08); box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.22); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(124, 58, 237, 0); }
}
@media (prefers-reduced-motion: reduce) {
  .ssc-mark-in { animation: none; }
}

/* 候选点 */
.ssc-cands { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.ssc-cands-label { font-size: 11.5px; color: var(--ink3); }
.ssc-cand {
  font-size: 12px; font-weight: 600; color: var(--ink); background: #fff;
  border: 1px solid var(--border-strong); border-radius: 999px; padding: 1px 9px;
}

.ssc-basis {
  font-size: 12.5px; color: var(--ink2); padding: 7px 10px; margin-bottom: 8px;
  background: #fff; border: 1px solid var(--border); border-left: 3px solid var(--purple);
  border-radius: var(--radius);
}
.ssc-basis-tag { font-size: 11px; font-weight: 700; color: var(--purple); margin-right: 8px; }

/* 关系图（小课） */
.ssc-rels { display: grid; gap: 6px; margin-bottom: 8px; }
.ssc-rel {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 7px 10px; background: #fff; border: 1px solid var(--border); border-radius: var(--radius);
}
.ssc-rel-left { font-size: 12.5px; font-weight: 600; color: var(--ink); }
.ssc-rel-arrow { color: var(--ink3); }
.ssc-rel-right { font-size: 12.5px; color: var(--ink2); }
.ssc-rel-legend {
  margin-left: auto; font-size: 11px; color: var(--purple);
  background: var(--purple-soft); border-radius: 999px; padding: 0 7px;
}

/* 极限三步 */
.ssc-chain { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.ssc-chain-item {
  font-size: 12px; color: var(--ink2); background: #fff;
  border: 1px solid var(--border); border-radius: 999px; padding: 2px 10px;
}
.ssc-chain-sep { color: var(--ink3); font-size: 12px; }

/* 结论对照 */
.ssc-pairs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
.ssc-pair {
  display: flex; flex-direction: column; gap: 2px; padding: 8px 10px;
  border-radius: var(--radius); background: #fff; border: 1px solid var(--border);
}
.ssc-pair.is-max { border-left: 3px solid var(--peach); }
.ssc-pair.is-min { border-left: 3px solid var(--ok); }
.ssc-pair-at { font-size: 11.5px; color: var(--ink3); }
.ssc-pair-val { font-size: 13px; font-weight: 700; color: var(--ink); }
.ssc-pair-kind { font-size: 11.5px; color: var(--ink2); }

/* 题目 */
.ssc-question {
  font-size: 13px; line-height: 1.65; color: var(--ink); padding: 9px 11px; margin-bottom: 8px;
  background: #fff; border: 1px solid var(--border-strong); border-radius: var(--radius);
}
.ssc-q { font-size: 11px; font-weight: 700; color: var(--ink3); margin-right: 8px; }
.ssc-note { font-size: 12.5px; color: var(--ink2); margin: 0 0 8px; line-height: 1.6; }

/* 图 */
.ssc-figure { margin: 0 0 8px; }
.ssc-figure img {
  width: 100%; height: auto; display: block; border-radius: var(--radius);
  background: #fff; border: 1px solid var(--border);
}
.ssc-figure figcaption { font-size: 11.5px; color: var(--ink3); margin-top: 4px; }
.ssc-frames { margin-bottom: 8px; }

.ssc-example { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.ssc-ex {
  display: flex; flex-direction: column; gap: 2px; padding: 6px 10px;
  background: #fff; border: 1px solid var(--border); border-radius: var(--radius);
}
.ssc-ex-h { font-size: 11.5px; color: var(--ink3); }
.ssc-ex-q { font-size: 12.5px; font-weight: 600; color: var(--ink); }

/* 错题本 */
.ssc-reason { margin-bottom: 8px; }
.ssc-choices-line { display: flex; gap: 6px; margin-bottom: 6px; }
.ssc-chip { font-size: 11.5px; font-weight: 600; border-radius: 999px; padding: 1px 9px; }
.ssc-chip.bad { color: var(--err-deep); background: var(--err-bg); border: 1px solid var(--err-border); }
.ssc-chip.good { color: var(--ok-deep); background: var(--ok-bg); border: 1px solid var(--ok-border); }
.ssc-reason-text { font-size: 12.5px; color: var(--ink2); margin: 0; line-height: 1.6; }

/* 选项 */
.ssc-options { display: grid; gap: 7px; margin-bottom: 10px; max-width: 560px; }
.ssc-opt {
  display: flex; align-items: center; gap: 9px; width: 100%; text-align: left;
  padding: 9px 12px; border-radius: var(--radius); cursor: pointer;
  border: 1px solid var(--border-strong); background: #fff; color: var(--ink);
  font-size: 13px; line-height: 1.5; transition: border-color .14s, background .14s, transform .14s;
}
.ssc-opt:hover:not(:disabled) { border-color: var(--purple); background: var(--purple-soft); }
.ssc-opt:active:not(:disabled) { transform: scale(.995); }
.ssc-opt:disabled { cursor: default; }
.ssc-opt:focus-visible { outline: 2px solid var(--purple); outline-offset: 2px; }
.ssc-opt-key {
  flex: 0 0 auto; width: 20px; height: 20px; border-radius: 6px;
  display: grid; place-items: center; font-size: 11.5px; font-weight: 700;
  color: var(--ink2); background: var(--line2); border: 1px solid var(--border);
}
.ssc-opt-label { flex: 1 1 auto; }
.ssc-opt.picked { border-color: var(--purple); background: var(--purple-soft); }
.ssc-opt.picked .ssc-opt-key { color: #fff; background: var(--purple); border-color: var(--purple); }
.ssc-opt-mark { font-size: 11px; font-weight: 600; color: var(--purple); }
.ssc-options.static .ssc-opt { opacity: .92; }

/* 反例 / 小结 */
.ssc-reveal-text {
  font-size: 12.5px; line-height: 1.7; color: var(--ink2); margin: 0 0 8px;
  padding: 9px 11px; background: #fff; border: 1px solid var(--border); border-radius: var(--radius);
}
.ssc-lines { margin: 0 0 8px; padding-left: 18px; }
.ssc-lines li { font-size: 12.5px; line-height: 1.75; color: var(--ink2); }
.ssc-done-mark {
  display: inline-block; font-size: 11.5px; font-weight: 700; margin-bottom: 8px;
  padding: 2px 10px; border-radius: 999px;
  color: var(--ink3); background: var(--line2); border: 1px solid var(--border);
}
.ssc-done-mark.on { color: var(--ok-deep); background: var(--ok-bg); border-color: var(--ok-border); }

/* 动作区 */
.ssc-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ssc-btn {
  padding: 8px 18px; border-radius: var(--radius-md); font-size: 13px; font-weight: 700;
  cursor: pointer; transition: filter .15s, background .15s;
  border: 1px solid var(--purple); color: #fff;
  background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
}
.ssc-btn.primary:hover:not(:disabled) { filter: brightness(1.06); }
.ssc-btn.ghost { color: var(--ink2); background: #fff; border-color: var(--border-strong); }
.ssc-btn.ghost:hover:not(:disabled) { background: var(--bg2); }
.ssc-btn:disabled { opacity: .5; cursor: default; }
.ssc-btn:focus-visible { outline: 2px solid var(--purple); outline-offset: 2px; }
.ssc-link {
  padding: 6px 2px; font-size: 12.5px; color: var(--ink3); background: none;
  border: 0; border-bottom: 1px dashed var(--border-strong); cursor: pointer;
}
.ssc-link:hover:not(:disabled) { color: var(--purple); border-color: var(--purple); }
.ssc-link:disabled { opacity: .5; cursor: default; }

.ssc-used { margin-top: 8px; font-size: 11.5px; color: var(--ink3); }

/* 窄屏：连线表按行堆叠并保留文字配对 */
@media (max-width: 720px) {
  .ssc-clues thead { display: none; }
  .ssc-clues tr { display: grid; gap: 2px; padding: 6px 0; }
  .ssc-clues td { border: 0; padding: 0 10px; }
  .ssc-clue-left { white-space: normal; }
  .ssc-pairs { grid-template-columns: 1fr; }
  .ssc-methods { grid-template-columns: 1fr; }
}
</style>
