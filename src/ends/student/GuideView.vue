<template>
  <div class="guide" v-if="cs">
    <!-- 顶部：题目上下文 -->
    <header class="guide__head">
      <button class="guide__back" @click="router.push('/student/dialog')">← 返回首页</button>
      <div class="guide__title">
        <span class="guide__code">{{ cs.code }}</span>
        <b>{{ cs.title }}</b>
        <span class="ms-tag ms-tag--gray">{{ cs.chip }}</span>
      </div>
      <div class="guide__steps">
        <span
          v-for="(s, i) in cs.steps"
          :key="s.id"
          class="guide__step-dot"
          :class="{ done: i < sess.stepIndex, current: i === sess.stepIndex && !sess.finished }"
        >{{ i + 1 }}</span>
      </div>
    </header>

    <!-- 未上传：文件选择器 -->
    <div v-if="!sess.uploaded" class="guide__upload">
      <div class="ms-card guide__upload-card">
        <div class="guide__upload-icon">📷</div>
        <h2>从文件选择器上传题图</h2>
        <p>支持 PNG / JPG。演示版按文件内容哈希绑定三张指定原图，改名仍可识别；上传其它图片会给出可恢复提示。</p>
        <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp" class="guide__file" @change="onFile" />
        <button class="ms-btn ms-btn--primary" style="height: 42px; padding: 0 26px" @click="fileInput.click()">
          选择题目图片
        </button>
        <div v-if="uploadError" class="guide__upload-error">
          <b>无法识别这张图片</b>
          <span>{{ uploadError }}</span>
          <span class="guide__upload-tip">请重新选择；当前草稿与页面状态已保留。</span>
        </div>
        <div class="guide__upload-hint">
          本演示收录：题1（双曲线离心率）、题2（正三棱柱线面关系）、题3（有放回取球的期望）
        </div>
      </div>
    </div>

    <!-- 已上传：对话 + 交互区 -->
    <div v-else class="guide__body">
      <div class="guide__paper">
        <img :src="cs.image" :alt="cs.title" />
        <div class="guide__paper-meta">
          <span class="ms-tag ms-tag--ok">已上传 · 内容匹配</span>
          <span>{{ sess.fileName }}</span>
          <span>SHA-256 前 8 位：{{ cs.sha256.slice(0, 8) }}</span>
        </div>
      </div>

      <div class="guide__right">
        <div class="guide__chat ms-scroll" ref="chatEl">
          <div
            v-for="(m, i) in sess.messages"
            :key="i"
            class="guide__msg"
            :class="m.role === 'student' ? 'guide__msg--student' : 'guide__msg--ai'"
          >
            <div v-if="m.role === 'ai'" class="guide__avatar">π</div>
            <div class="guide__bubble">
              <div v-if="m.kind === 'ocr'" class="guide__ocr">
                <div class="guide__ocr-head">平台识别结果</div>
                <pre>{{ cs.ocrText }}</pre>
                <div class="guide__ocr-note">识别内容已与封存基准核对。</div>
              </div>
              <MathText v-else :text="m.text" />
              <div v-if="m.role === 'student'" class="guide__msg-time">{{ m.time }}</div>
            </div>
            <div v-if="m.role === 'student'" class="guide__avatar guide__avatar--student">林</div>
          </div>

          <!-- 结论 -->
          <div v-if="sess.finished" class="guide__final ms-card">
            <div class="guide__final-head">✅ 已完成本题</div>
            <h3><MathText :text="cs.final.title" /></h3>
            <div class="guide__final-lines">
              <p v-for="(line, i) in cs.final.lines" :key="i"><MathText :text="line" /></p>
            </div>
            <div class="guide__final-key">
              <b>要点</b>
              <MathText :text="cs.final.keyPoint" />
            </div>
            <div class="guide__final-actions">
              <button class="ms-btn ms-btn--primary" @click="openVariant">举一反三</button>
              <button class="ms-btn" @click="dynOpen = !dynOpen">📐 动态数学</button>
              <button class="ms-btn" @click="restartCase">重新做一遍</button>
              <button class="ms-btn" @click="router.push('/student/dialog')">返回首页</button>
            </div>
            <div v-if="dynOpen" class="guide__dyn">
              <DynamicFigures :kind="dynKind" />
            </div>
            <div v-if="sess.wrongCount > 0" class="guide__final-wrong">
              本题你出现过 {{ sess.wrongCount }} 次错答，已自动进入错题本。
            </div>
          </div>

          <!-- 变式 -->
          <div v-if="sess.finished && sess.variantIndex >= 0" class="guide__variant ms-card">
            <div class="guide__variant-head">
              <span class="ms-tag">举一反三</span>
              <b>{{ currentVariant.title }}</b>
            </div>
            <MathText :text="currentVariant.question" block />
            <div v-if="currentVariant.type === 'single'" class="guide__choices">
              <button
                v-for="opt in currentVariant.options"
                :key="opt.key"
                class="guide__choice"
                :class="{ selected: variantPick === opt.key }"
                @click="variantPick = opt.key"
              >
                <span class="guide__choice-key">{{ opt.key }}</span>
                <MathText :text="opt.text" />
              </button>
            </div>
            <div v-else class="guide__input-row">
              <input v-model="variantDraft" class="guide__input" placeholder="输入答案" @keydown.enter.prevent="checkVariant" />
            </div>
            <div class="guide__input-row" style="margin-top: 10px">
              <button class="ms-btn ms-btn--primary" @click="checkVariant">判分</button>
              <button class="ms-btn" @click="nextVariant" v-if="cs.variants.length > 1">换一个变式</button>
            </div>
            <div v-if="variantResult" class="guide__variant-result" :class="variantResult.ok ? 'is-ok' : 'is-bad'">
              {{ variantResult.text }}
            </div>
            <div v-if="variantResult && variantResult.showSolution" class="guide__variant-sol">
              <MathText :text="currentVariant.solution" block />
            </div>
          </div>
        </div>

        <!-- 固定输入区：不随对话滚动离开视口 -->
        <div v-if="!sess.finished" class="guide__composer-wrap">
          <div class="guide__composer">
            <div class="guide__ask">
              <span class="guide__ask-label">本轮</span>
              <MathText :text="currentStep.ask" />
            </div>

            <div v-if="currentStep.ui === 'text' || currentStep.ui === 'fill'" class="guide__input-row">
              <input
                v-model="draft"
                class="guide__input"
                :placeholder="currentStep.placeholder || '输入你的回答…'"
                @keydown.enter.prevent="submitText"
              />
              <button class="ms-btn ms-btn--primary" :disabled="!draft.trim()" @click="submitText">发送</button>
            </div>

            <div v-else class="guide__choices" :class="{ 'guide__choices--multi': currentStep.ui === 'multi' }">
              <button
                v-for="opt in stepOptions"
                :key="opt.key"
                class="guide__choice"
                :class="{ selected: selected.includes(opt.key) }"
                @click="toggleOption(opt.key)"
              >
                <span class="guide__choice-key">{{ opt.key }}</span>
                <MathText :text="opt.text" />
              </button>
              <button class="ms-btn ms-btn--primary" :disabled="!selected.length" @click="submitChoice">
                提交{{ currentStep.ui === 'multi' ? '（多选）' : '' }}
              </button>
            </div>

            <div class="guide__tools">
              <button class="guide__tool" @click="askHelp">🙋 给个提示</button>
              <button class="guide__tool" @click="askSocratic">🤔 我还是不懂，换个问法</button>
              <span v-if="sess.lastHint" class="guide__hint-inline">{{ sess.lastHint }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="ms-empty">未找到该案例。</div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MathText from '../../components/MathText.vue'
import DynamicFigures from '../../components/math/DynamicFigures.vue'
import { findGuidanceCase } from '../../data/guidance'
import { addErrorRecord, caseGuidance } from '../../state/demo'
import { sha256File } from '../../lib/sha256'
import { initGuidanceSession } from '../../lib/guidanceFlow'

const route = useRoute()
const router = useRouter()
const cs = computed(() => findGuidanceCase(String(route.params.caseId)))
const sess = computed(() => (cs.value ? caseGuidance(cs.value.id) : null))

const fileInput = ref(null)
const chatEl = ref(null)
const draft = ref('')
const selected = ref([])
const uploadError = ref('')
const variantPick = ref('')
const variantDraft = ref('')
const variantResult = ref(null)
const dynOpen = ref(false)
const dynKind = computed(() => (cs.value?.id === 'B' ? 'prism' : cs.value?.id === 'C' ? 'draw' : 'hyperbola'))

const currentStep = computed(() => {
  if (!cs.value || !sess.value) return null
  return cs.value.steps[Math.min(sess.value.stepIndex, cs.value.steps.length - 1)]
})
const stepOptions = computed(() => {
  if (!currentStep.value) return []
  const keys = currentStep.value.optionKeys || cs.value.options.map((o) => o.key)
  return cs.value.options.filter((o) => keys.includes(o.key))
})
const currentVariant = computed(() => (sess.value && sess.value.variantIndex >= 0 ? cs.value.variants[sess.value.variantIndex] : null))

function nowText() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function pushAi(text, kind) {
  sess.value.messages.push({ role: 'ai', text, kind, time: nowText() })
}
function pushStudent(text) {
  sess.value.messages.push({ role: 'student', text, time: nowText() })
}
function scrollBottom() {
  nextTick(() => {
    if (chatEl.value) chatEl.value.scrollTop = chatEl.value.scrollHeight
  })
}

onMounted(() => {
  if (!cs.value) return
  if (sess.value.startedAt && sess.value.messages.length && !sess.value.finished) {
    selected.value = sess.value.selected?.slice() || []
  }
  scrollBottom()
})

/* ---------- 上传与哈希绑定 ---------- */
async function onFile(e) {
  const file = e.target.files && e.target.files[0]
  if (!file) return
  uploadError.value = ''
  try {
    const hash = await sha256File(file)
    if (hash !== cs.value.sha256) {
      uploadError.value = `文件内容与「${cs.value.code}」不匹配（SHA-256 前 8 位：${hash.slice(0, 8)}）。`
      e.target.value = ''
      return
    }
    sess.value.uploaded = true
    sess.value.fileHash = hash
    initGuidanceSession(cs.value, sess.value, file.name)
    sess.value.fileHash = hash
    e.target.value = ''
    scrollBottom()
  } catch (err) {
    uploadError.value = '读取文件失败，请重试。'
    e.target.value = ''
  }
}

/* ---------- 判答 ---------- */
function normalize(s) {
  return String(s)
    .toLowerCase()
    .replace(/[\uFF21-\uFF3A\uFF41-\uFF5A\uFF10-\uFF19]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[\s\u3000]/g, '')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/[−–—]/g, '-')
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/[，]/g, ',')
    .replace(/[。]/g, '.')
}

function numValue(norm) {
  if (/^-?\d+(\.\d+)?$/.test(norm)) return Number(norm)
  const m = norm.match(/^(-?\d+)\/(\d+)$/)
  if (m && Number(m[2]) !== 0) return Number(m[1]) / Number(m[2])
  return null
}

/** 变式判分：严格匹配（不做双向子串），数值答案仅接受精确等值。 */
function variantMatches(v, input) {
  const norm = normalize(input).replace(/[。．.!！?？;；]+$/g, '')
  const list = []
  for (const a of v.accepts || []) list.push(normalize(a).replace(/[。．.!！?？;；]+$/g, ''))
  if (v.answer != null) list.push(normalize(String(v.answer)).replace(/[。．.!！?？;；]+$/g, ''))
  if (v.answerDisplay != null) list.push(normalize(String(v.answerDisplay)).replace(/[。．.!！?？;；]+$/g, ''))
  if (list.some((a) => a === norm)) return true
  const val = numValue(norm)
  if (val !== null) {
    for (const a of list) {
      const av = numValue(a)
      if (av !== null && Math.abs(av - val) <= 1e-9) return true
    }
  }
  return false
}

function matchTextStep(step, text) {
  const n = normalize(text)
  for (const rule of step.accept || []) {
    if (rule.regex && new RegExp(rule.regex, 'i').test(n)) return rule
  }
  for (const rule of step.partial || []) {
    if (rule.regex && new RegExp(rule.regex, 'i').test(n)) return { ...rule, kind: 'partial' }
  }
  return null
}

function advance() {
  const step = currentStep.value
  if (step.accept?.some((r) => r.next === 'final') || step.nextIsFinal) {
    finish()
    return
  }
  // 判定本步正确规则里是否要求推进
  const nextId = step._nextId || null
  sess.value.stepIndex += 1
  sess.value.selected = []
  selected.value = []
  draft.value = ''
  sess.value.lastHint = null
  if (sess.value.stepIndex >= cs.value.steps.length) {
    finish()
    return
  }
  pushAi(cs.value.steps[sess.value.stepIndex].ask)
  scrollBottom()
}

function finish() {
  sess.value.finished = true
  sess.value.stepIndex = cs.value.steps.length
  sess.value.selected = []
  scrollBottom()
}

function handleRule(rule) {
  for (const r of rule.reply || []) pushAi(r)
  if (rule.stay) {
    scrollBottom()
    return
  }
  if (rule.kind === 'correct') {
    const step = currentStep.value
    if (rule.next === 'final') {
      finish()
    } else if (rule.next) {
      const idx = cs.value.steps.findIndex((s) => s.id === rule.next)
      if (idx >= 0) {
        sess.value.stepIndex = idx
        sess.value.selected = []
        selected.value = []
        draft.value = ''
        sess.value.lastHint = null
        pushAi(cs.value.steps[idx].ask)
      } else {
        finish()
      }
    } else {
      advance()
    }
    scrollBottom()
    return
  }
  if (rule.next) {
    // 错答后仍推进（例如“选 C”之后的澄清问题，推进到下一节点）
    const idx = cs.value.steps.findIndex((s) => s.id === rule.next)
    if (idx >= 0) {
      sess.value.stepIndex = idx
      sess.value.selected = []
      selected.value = []
      draft.value = ''
      sess.value.lastHint = null
      pushAi(cs.value.steps[idx].ask)
    }
  }
  scrollBottom()
}

function submitText() {
  const text = draft.value.trim()
  if (!text) return
  pushStudent(text)
  const step = currentStep.value
  const rule = matchTextStep(step, text)
  if (rule) {
    if (rule.kind === 'correct') {
      handleRule(rule)
    } else if (rule.kind === 'wrong') {
      sess.value.wrongCount += 1
      addErrorRecord(cs.value.id, text, step.id)
      handleRule(rule)
    } else {
      handleRule({ ...rule, reply: rule.reply, kind: 'partial' })
      scrollBottom()
    }
  } else {
    pushAi(
      '我保留你的这个表述，但它还不足以让我判断。请补一个可核对的中间量，或换一种写法（例如写出一个等式/概率分数）；也可以点“给个提示”。',
    )
  }
  draft.value = ''
  scrollBottom()
}

function toggleOption(key) {
  const step = currentStep.value
  if (step.ui === 'single') {
    selected.value = [key]
  } else {
    const i = selected.value.indexOf(key)
    if (i >= 0) selected.value.splice(i, 1)
    else selected.value.push(key)
  }
}

function submitChoice() {
  const keys = selected.value.slice().sort()
  pushStudent('我选择：' + keys.join('、'))
  const step = currentStep.value
  let matched = null
  for (const rule of step.accept || []) {
    if (rule.keys && String(rule.keys.slice().sort()) === String(keys)) {
      matched = rule
      break
    }
  }
  if (matched) {
    if (matched.kind === 'correct') handleRule(matched)
    else {
      if (matched.kind === 'partial') handleRule(matched)
      else {
        sess.value.wrongCount += 1
        addErrorRecord(cs.value.id, keys.join(','), step.id)
        handleRule(matched)
      }
    }
  } else {
    sess.value.wrongCount += 1
    addErrorRecord(cs.value.id, keys.join(','), step.id)
    pushAi('这个组合还不对。不要只看图形“像不像”，回到线面垂直/平行的判定条件逐项核对。')
    selected.value = []
    sess.value.selected = []
  }
  scrollBottom()
}

function askHelp() {
  if (sess.value.finished) return
  pushStudent('（求助）这里不太会，给个提示。')
  sess.value.helpCount += 1
  sess.value.lastHint = currentStep.value.hint
  pushAi(currentStep.value.hint)
  scrollBottom()
}
function askSocratic() {
  if (sess.value.finished) return
  pushStudent('（追问）我还是不懂，能不能换个问法？')
  sess.value.helpCount += 1
  const step = currentStep.value
  pushAi(step.altAsk || `换个角度：${step.hint}`)
  scrollBottom()
}

/* ---------- 变式 ---------- */
function openVariant() {
  sess.value.variantIndex = 0
  variantResult.value = null
  variantPick.value = ''
  variantDraft.value = ''
}
function nextVariant() {
  const n = cs.value.variants.length
  sess.value.variantIndex = (sess.value.variantIndex + 1) % n
  variantResult.value = null
  variantPick.value = ''
  variantDraft.value = ''
}
function checkVariant() {
  const v = currentVariant.value
  let input = ''
  if (v.type === 'single') {
    if (!variantPick.value) return
    input = variantPick.value
  } else {
    input = variantDraft.value.trim()
    if (!input) return
  }
  let ok = false
  if (v.type === 'single') {
    ok = input.toUpperCase() === String(v.answer).toUpperCase()
  } else {
    ok = variantMatches(v, input)
  }
  variantResult.value = {
    ok,
    showSolution: true,
    text: ok ? '✔ 回答正确。' : '✘ 还不对。对照下面的解法检查关键一步。',
  }
}
function restartCase() {
  sess.value.stepIndex = 0
  sess.value.finished = false
  sess.value.messages = []
  sess.value.wrongCount = 0
  sess.value.helpCount = 0
  sess.value.variantIndex = -1
  variantResult.value = null
  pushAi('我们重新来一遍。' + currentStep.value.ask)
}
</script>

