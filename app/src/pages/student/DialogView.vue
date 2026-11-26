<template>
  <div class="view dialog-page">
    <div
      class="dialog-main"
      @dragenter.prevent="onDragOver"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <header class="dialog-header">
        <div class="dialog-heading">
          <span class="dialog-heading-icon" aria-hidden="true">π</span>
          <div class="dialog-heading-text">
            <h1 class="ttl" :title="activeTitle">{{ activeTitle }}</h1>
            <p class="dialog-sub">{{ dialogSub }}</p>
          </div>
        </div>
        <div class="dialog-badges">
          <details v-if="offline" class="dialog-mode" @keydown.esc.stop="$event.currentTarget.open = false">
            <summary>离线体验</summary>
            <p>这里提供预设练习和已录制的讲解。可以现场发送、看图和作答，其他提问会提示可用范围。</p>
          </details>
        </div>
      </header>

      <div ref="listRef" class="dialog-messages" tabindex="0" aria-label="对话记录" @scroll.passive="onListScroll">
        <div v-if="chat.msgLoading.value" class="list-loading" role="status"><span class="spinner"></span> 正在打开对话…</div>

        <div v-else-if="chat.messages.value.length" ref="threadRef" class="dialog-thread">
          <!-- 历史向上分页 -->
          <div v-if="chat.historyHasMore.value" class="history-more">
            <button class="history-btn" :disabled="chat.historyLoading.value" @click="onLoadOlder">
              <span v-if="chat.historyLoading.value" class="spinner"></span>
              {{ chat.historyLoading.value ? '加载中…' : '加载更早消息' }}
            </button>
          </div>
          <MessageBubble
            v-for="m in chat.messages.value"
            :key="m.key"
            :live="m.key === lastAiKey && !chat.streaming.value"
            :msg="m"
            student-dialog
            :offline-origin="offline ? (isShowcaseConv || isExperienceConv ? 'prepared' : 'recorded') : ''"
            @clarify="sendText"
            @socratic-choice="onSocraticChoice"
            @regenerate="chat.regenerate"
            @feedback="onFeedback"
            @edit="onEditMessage"
            @version-switch="onVersionSwitch"
            @quiz-enter="onQuizEnter"
            @quiz-explain="onQuizExplain"
            @quiz-answered="onQuizAnswered"
            @quiz-more="onQuizMore"
            @quiz-chain-action="onChainAction"
            @tutor-action="onTutorAction"
            @answer-confirm="onAnswerConfirm"
            @think-more="onThinkMore"
            @action="onActionClick"
            @complete-action="onCompleteAction"
            @interaction-submit="onInteractionSubmit"
            @need-problem="onNeedProblem"
          />

        </div>

        <div v-else-if="isExperienceConv" class="empty-state experience-welcome">
          <ExperienceCover :meta="experience" />
        </div>

        <div v-else class="empty-state welcome home-welcome">
          <div class="home-grid">
            <section class="home-hero">
              <p class="hero-greet">{{ heroGreet }}，{{ auth.nickname || '同学' }}</p>
              <h2 class="hero-title">今天想搞定什么<span>数学题</span>？</h2>
              <p class="hero-sub">拍照、贴图、上传资料，AI 不直接给答案，一步步带你自己想出来。</p>
              <div class="hero-entries">
                <button type="button" class="he-card" @click="heroPhoto"><UiIcon name="camera" :size="19" />拍一道不会的题</button>
                <button type="button" class="he-card" @click="heroGo('/library')"><UiIcon name="book" :size="19" />上传我的资料</button>
                <button type="button" class="he-card" @click="heroGo('/practice')"><UiIcon name="edit" :size="19" />开始今日练题</button>
                <button type="button" class="he-card" @click="heroGo('/errors')"><UiIcon name="file" :size="19" />复习到期错题</button>
              </div>
              <section v-if="recentConvs.length" class="hero-recent" aria-label="最近学习">
                <h3 class="hr-title">最近学习</h3>
                <button v-for="cv in recentConvs" :key="cv.id" type="button" class="hr-item" @click="heroOpenConv(cv.id)">
                  <span class="hr-name">{{ cv.title || '未命名对话' }}</span>
                  <UiIcon name="chevron-right" :size="15" />
                </button>
              </section>
            </section>
            <HomeLearningPanel
              :pulse="pulse"
              @review="startReview"
              @ask="onPulseAsk"
              @refresh="snapshot.load"
            />
          </div>
        </div>
      </div>

      <!-- 拖拽上传遮罩 -->
      <div v-if="dragOver" class="drop-mask">
        <div class="drop-inner">
          <UiIcon name="paperclip" :size="28" />
          <div>松开鼠标上传附件</div>
          <div class="drop-sub">{{ offline ? '支持随包提供的三张题图' : 'pdf / 图片 / office / md / txt，≤20MB，最多 3 个' }}</div>
        </div>
      </div>

      <footer class="dialog-dock">
        <div class="dialog-dock-inner">
          <button v-if="showBackBtn" type="button" class="back-bottom" @click="onBackBottom">
            <UiIcon name="arrow-down" :size="15" />
            {{ hasNew ? '查看新回复' : '回到最新' }}
          </button>
          <div v-if="relatedConversation" class="dialog-next">
            <span>接着学</span>
            <button type="button" @click="heroOpenConv(relatedConversation.id)">
              {{ relatedConversation.label }} <UiIcon name="chevron-right" :size="13" />
            </button>
          </div>
          <SuggestionsGrid
            v-else-if="!isShowcaseConv && !isExperienceConv"
            :key="conv.activeId"
            :collapsed="offline || chat.messages.value.length > 0"
            :disabled="chat.streaming.value"
            :preset-only="offline"
            :personalized="personalizedSuggestions"
            @pick="onSuggest"
          />
          <ChatInput
            ref="inputRef"
            :offline="offline"
            :streaming="chat.streaming.value"
            :prefill-attachment="experienceAttachment"
            :tasks="upload.tasks"
            :rate-limited-until="upload.state.rateLimitedUntil"
            :kb-docs="selectedKbDocs"
            v-model:thinking="chat.thinkingOn.value"
            v-model:webSearch="chat.webSearchOn.value"
            :web-search-enabled="chat.webSearchOptInEnabled.value"
            @send="onSend"
            @stop="chat.stopStreaming"
            @pick-files="onPickFiles"
            @remove-attachment="upload.removeTask"
            @retry-attachment="upload.retry"
            @toggle-kb-doc="toggleKbDoc"
            @remove-kb-doc="removeKbDoc"
            @remove-prefill="experienceAttachment = null"
          />
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToastStore } from '@/stores/toast'
import { useSkillStore } from '@/stores/skill'
import { useConvStore } from '@/stores/conv'
import { SKILL_ID_BY_KEY } from '@/config/skills'
import { KP_ZH } from '@/components/student/labels'
import MessageBubble from '@/components/chat/MessageBubble.vue'
import ChatInput from '@/components/chat/ChatInput.vue'
import ExperienceCover from '@/components/chat/ExperienceCover.vue'
import SuggestionsGrid from '@/components/chat/SuggestionsGrid.vue'
import HomeLearningPanel from '@/components/student/HomeLearningPanel.vue'
import UiIcon from '@/components/common/UiIcon.vue'
import { useFileUpload } from '@/components/chat/useFileUpload'
import { useChat } from '@/composables/useChat'
import { isShowcaseId, SHOWCASE_BY_ID } from '@/offline/showcase/catalog'
import { isExperienceId, experienceMeta } from '@/offline/experience/catalog'
import { resetExperience, experiencePrefill } from '@/offline/experience/runtime'
import { useLearningSnapshot } from '@/composables/useLearningSnapshot'
import { studentApi } from '@/api'
import { useConfirm } from '@/composables/useConfirm'
import { markChoiceUsed, markInteractionUsed, uuid } from '@/components/chat/messageModel'
import { openImmersive } from '@/composables/useImmersive'

const route = useRoute()

const router = useRouter()
const toast = useToastStore()
const offline = import.meta.env.VITE_OFFLINE === '1'
const upload = useFileUpload(toast)
const skillStore = useSkillStore()
const conv = useConvStore()
const { confirm } = useConfirm()

const listRef = ref(null)
const threadRef = ref(null)
const inputRef = ref(null)

/* ===== 体验播放器（exp-*）：封面 + 预填 + 流式 + 下一条预填 ===== */
const experienceAttachment = ref(null)
const pendingExperiencePrefill = ref(null)
const experienceDone = ref(false)
const experience = computed(() => experienceMeta(conv.activeId))
const isExperienceConv = computed(() => !!experience.value)

function applyExperiencePrefill() {
  const p = pendingExperiencePrefill.value
  if (!p || !isExperienceConv.value || chat.streaming.value) return
  pendingExperiencePrefill.value = null
  inputRef.value?.setDraft(p.text || '')
  experienceAttachment.value = p.attachment || null
  nextTick(syncScroll)
}

async function enterExperience(id) {
  resetExperience(id)
  experienceDone.value = false
  pendingExperiencePrefill.value = null
  experienceAttachment.value = null
  if (chat.streaming.value) await chat.stopStreaming()
  await chat.openConversation(id)
  conv.select(id)
  placeHistory()
  const p = experiencePrefill(id)
  if (p) {
    pendingExperiencePrefill.value = { text: p.text, attachment: p.attachment }
    setTimeout(applyExperiencePrefill, 260)
  }
}

/* ===== 滚动状态 ===== */
const showBackBtn = ref(false)
const hasNew = ref(false)
const dragOver = ref(false)
let dragDepth = 0
let followLatest = true
let scrollObserver
let pendingReplaySubmission = null

/* ===== useChat：仅负责消息与 SSE 流控（会话列表由 conv store 统一管理） ===== */
const chat = useChat({
  manageConversations: false,
  hooks: {
    onEvent: onSseActivity,
    onConversationId: (id) => {
      conv.select(id)
      history.replaceState(null, '', `/dialog/${id}`)
      // 新会话由后端在首次对话时才创建：立即刷新侧栏列表，
      // 否则列表停留在"暂无会话"，要手动刷新页面才能看到历史（2026-08-29 N4 回归发现）
      conv.load().catch(() => {})
    },
    onTitle: (t) => conv.updateTitle(conv.activeId, t),
    onAction: handleAction,
    onLatex: (d) => {
      if (d?.latex) inputRef.value?.insertText(`$${d.latex}$`)
      if (d?.ambiguous) toast.info('公式可能有歧义，请核对草稿后再发送')
    },
    onFileParsed: (d) => {
      const t = upload.tasks.find((x) => x.fileId === d.file_id)
      if (t && d.status === 'parsed') {
        t.status = 'parsed'
        t.engine = d.parse_engine || t.engine
      }
      toast.success(`文件《${d.filename}》解析完成`)
    },
    resolveSkills: (keys) => keys.map((k) => SKILL_ID_BY_KEY[k]).filter(Boolean),
  },
})
// ===== S1 首页 hero（V2 文档：首页即对话学习） =====
import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore()

/* ===== 首页学情脉搏：BKT + FSRS 真实数据，对话为空时作为“下一步”入口 ===== */
const snapshot = useLearningSnapshot()
const pulse = computed(() => ({
  loading: snapshot.loading.value,
  mastery: snapshot.mastery.value,
  masteredCount: snapshot.masteredCount.value,
  totalKpCount: snapshot.totalKpCount.value,
  streakDays: snapshot.streakDays.value,
  weekAnswered: snapshot.weekAnswered.value,
  weekAccuracy: snapshot.weekAccuracy.value,
  delta7d: snapshot.delta7d.value,
  dueCount: snapshot.dueCount.value,
  weakest: snapshot.weakest.value,
  topWeak: snapshot.topWeak.value,
  topDue: snapshot.topDue.value,
  hasData: snapshot.hasData.value,
}))
const offlineSuggestions = [
  { text: '从提问到订正，学一遍导数', conversationId: 'sc-combo' },
  { text: '在曲线上看导数怎么变', conversationId: 'sc-s3' },
  { text: '试试三道极值变式题', conversationId: 'sc-s4' },
]
const personalizedSuggestions = computed(() => offline
  ? offlineSuggestions
  : snapshot.suggestions.value.map((suggestion) => ({
      ...suggestion,
      reason: { 'FSRS 到期': '复习时间已到', 'BKT 薄弱点': '需要巩固' }[suggestion.reason] || suggestion.reason,
    })),
)

const heroGreet = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '上午好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})
const recentConvs = computed(() => {
  // B3（V2 文档）：按标题去重（两条同名会话只留最新一条），再取前 3
  const seen = new Set()
  return (conv?.items || []).filter((c) => {
    const k = (c.title || '').trim()
    if (!k || seen.has(k)) return false
    seen.add(k)
    return true
  }).slice(0, 3)
})
function heroPhoto() {
  document.querySelector('button[title="拍照识题"]')?.click()
}
function heroGo(path) {
  router.push(path)
}
function heroOpenConv(id) {
  router.push(`/dialog/${id}`)
}

const activeTitle = computed(
  () => experience.value?.title || conv.items.find((c) => c.id === conv.activeId)?.title || '新对话'
)

const isShowcaseConv = computed(() => isShowcaseId(conv.activeId))
const relatedConversations = new Map([
  ['sc-s1', { id: 'sc-s5', label: '一步步求离心率' }],
  ['sc-s2', { id: 'sc-s3', label: '在曲线上看导数与极值' }],
  ['sc-s3', { id: 'sc-s4', label: '试试三道变式题' }],
])
const relatedConversation = computed(() => relatedConversations.get(conv.activeId))

/** 只有最后一条 AI 消息的卡片可交互；历史旧卡只回看，不向当前步骤注入事件（方案 §6） */
const lastAiKey = computed(() => {
  const list = chat.messages.value
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i]?.role === 'assistant') return list[i].key
  }
  return ''
})
/** 页头副标题：区分「示例会话 / 离线自由问答 / 采证录制」，避免把自由问答说成录制讲解 */
const dialogSub = computed(() => {
  if (!offline) return '学习对话 · 基于当前上下文与学情回应'
  if (isExperienceConv.value) return `${experience.value?.subtitle || '体验'} · 点发送推进`
  if (isShowcaseConv.value) return '示例会话 · 预设讲解，可现场作答'
  if (String(conv.activeId || '').startsWith('offline-')) return '离线体验 · 自由问答（导数与极值）'
  return '录制讲解 · 可回看与继续作答'
})

/* ===== 滚动管理 ===== */
function syncScroll() {
  const list = listRef.value
  if (!list) return
  if (followLatest) list.scrollTop = list.scrollHeight
  else showBackBtn.value = list.scrollHeight - list.scrollTop - list.clientHeight > 72
}

function scrollBottom() {
  followLatest = true
  showBackBtn.value = false
  hasNew.value = false
  void nextTick(syncScroll)
}

function placeHistory() {
  if (!relatedConversation.value || chat.messages.value.length > SHOWCASE_BY_ID[conv.activeId].seeded) {
    scrollBottom()
    return
  }
  followLatest = false
  hasNew.value = false
  void nextTick(() => {
    const list = listRef.value
    if (!list) return
    list.scrollTop = 0
    syncScroll()
  })
}

function onSseActivity(event, data, message) {
  if (isExperienceConv.value) {
    if (event === 'prefill') {
      pendingExperiencePrefill.value = data
      return
    }
    if (event === 'complete') experienceDone.value = true
    if (event === 'stream_end') setTimeout(applyExperiencePrefill, 360)
  }
  const pending = pendingReplaySubmission
  if (pending && pending.clientMsgId === message?.clientMsgId) {
    if (event === 'meta') pending.markUsed()
    if (event === 'meta' || event === 'stream_end') pendingReplaySubmission = null
  }
  if (!followLatest && event !== 'stream_end' && event !== 'done') hasNew.value = true
  void nextTick(syncScroll)
}

watch(chat.streaming, (v) => {
  // 只有学生本来就在底部时才跟随；上翻回看历史时不被强行拉回（followPaused 语义）
  if (v && followLatest) scrollBottom()
})

watch(threadRef, (thread, previous) => {
  if (previous) scrollObserver?.unobserve(previous)
  if (thread) scrollObserver?.observe(thread)
}, { flush: 'post' })

function onListScroll() {
  const el = listRef.value
  if (!el || !chat.messages.value.length || chat.msgLoading.value) return
  const dist = el.scrollHeight - el.scrollTop - el.clientHeight
  followLatest = dist <= 72
  showBackBtn.value = !followLatest
  if (followLatest) hasNew.value = false
  if (el.scrollTop < 80 && chat.historyHasMore.value && !chat.historyLoading.value && !chat.msgLoading.value) {
    onLoadOlder()
  }
}

async function onLoadOlder() {
  const el = listRef.value
  const prevH = el?.scrollHeight || 0
  const prevTop = el?.scrollTop || 0
  const added = await chat.loadOlderMessages()
  if (added > 0 && el) {
    nextTick(() => { el.scrollTop = el.scrollHeight - prevH + prevTop })
  }
}

function onBackBottom() {
  scrollBottom()
  listRef.value?.focus({ preventScroll: true })
}

/* ===== 拖拽上传 ===== */
function hasFiles(e) {
  return [...(e.dataTransfer?.types || [])].includes('Files')
}
function onDragOver(e) {
  if (!hasFiles(e) || chat.streaming.value) return
  if (e.type === 'dragenter') dragDepth++
  dragOver.value = true
}
function onDragLeave() {
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) dragOver.value = false
}
function onDrop(e) {
  dragDepth = 0
  dragOver.value = false
  if (chat.streaming.value) return
  const files = [...(e.dataTransfer?.files || [])]
  if (files.length) {
    const hasImg = files.some((f) => /^image\//.test(f.type || ''))
    upload.addFiles(files, { purpose: hasImg ? 'question_photo' : 'chat_attachment' })
  }
}

/* ===== 发送 ===== */
function onSend(text) {
  const baseAtts = upload.parsedAttachments().map((a) => {
    const t = upload.tasks.find((x) => x.fileId === a.file_id)
    return {
      ...a,
      localUrl: t?.file && a.kind === 'image' ? URL.createObjectURL(t.file) : '',
    }
  })
  const prefill = experienceAttachment.value
  const atts = prefill ? [...baseAtts, prefill] : baseAtts
  const attachmentTexts = baseAtts
    .map((a) => (upload.tasks || []).find((t) => t.fileId === a.file_id)?.ocrText || '')
    .filter(Boolean)
  const kbIds = selectedKbDocs.value.map((d) => d.id)
  chat.doSend(text, { attachments: atts, attachmentTexts, displayText: text, skillKeys: [...skillStore.activeKeys], kbDocIds: kbIds })
  if (prefill) experienceAttachment.value = null
  if (baseAtts.length) upload.clearSent()
  // 引用的知识库资料保持选中（ima 式）：后续追问继续携带，直到学生手动移除
}

/* ===== 知识库引用选择（ima 式） ===== */
const selectedKbDocs = ref([])
function toggleKbDoc(doc) {
  if (selectedKbDocs.value.some((d) => d.id === doc.id)) return
  if (selectedKbDocs.value.length >= 5) return
  selectedKbDocs.value = [...selectedKbDocs.value, { id: doc.id, title: doc.title }]
}
function removeKbDoc(docId) {
  selectedKbDocs.value = selectedKbDocs.value.filter((d) => d.id !== docId)
}

function sendText(text) {
  if (!text || chat.streaming.value) return
  chat.doSend(text, {})
}

function markAfterReplayMatch(mark, msgKey, cardIndex) {
  if (!Number.isInteger(cardIndex)) return undefined
  const markUsed = () => mark(chat.messages.value, msgKey, cardIndex)
  if (!offline || isShowcaseConv.value) {
    markUsed()
    return undefined
  }
  // 录制讲解只有匹配到已有答复才发出 meta。范围提示不会把原作答卡锁住。
  const clientMsgId = uuid()
  pendingReplaySubmission = { clientMsgId, markUsed }
  return clientMsgId
}

/** 引导选项卡：带上原会话/步骤，避免把选项当成一道新题。
 * sgv2（DESIGN §8.2）：透传 cardIndex 供已用态——在真实发送（流式守卫通过）时置位
 * msg.usedChoices[cardIndex]（模型层契约 markChoiceUsed，与 DualView 同源），
 * 流式中点击被拒不置灰，不留「已选未发送」假状态；
 * 检验题作答（stepNo=null）与历史步重放卡同走本路径。 */
function onSocraticChoice(payload) {
  const text = typeof payload === 'string' ? payload : payload?.text
  if (!text || chat.streaming.value) return
  const clientMsgId = markAfterReplayMatch(markChoiceUsed, payload?.msgKey, payload?.cardIndex)
  // 导航类动作（返回题卡/回到原题）不是学生发言：渲染为居中提示，避免「自问自答」气泡
  const isUiAction = /^(返回题卡订正|回到这题|返回原题|回到原题|回到题卡|订正)$/.test(String(text).trim())
  chat.doSend(text, {
    system: isUiAction,
    clientMsgId,
    // 卡片「跳过」是阶段推进动作，不是作答：独立 skip 动作避免在 solve 未就绪时
    // 被当成步作答（真实会话：点「我读完了，直接开始」→「这道题已经走完了」）。
    tutorAction: payload?.action === 'skip' ? 'skip' : 'attempt',
    tutorSessionId: payload?.sessionId || '',
    tutorStepNo: payload?.stepNo || null,
    skillKeys: ['socratic'],
  })
}

function onSuggest(s) {
  const text = typeof s === 'string' ? s : s?.text
  const key = typeof s === 'object' ? s?.skill || '' : ''
  if (!text || chat.streaming.value) return
  if (offline && s?.conversationId) {
    heroOpenConv(s.conversationId)
    return
  }
  // 学情推荐里的“复习到期错题”直接走 FSRS 复习链路，而不是把标题当提问发出去
  if (typeof s === 'object' && s?.action === 'review' && s?.item) {
    void startReview(s.item)
    return
  }
  const ask = (typeof s === 'object' && s?.ask) || text
  if (key) chat.doSend(ask, { displayText: text, skillKeys: [SKILL_ID_BY_KEY[key]].filter(Boolean) })
  else chat.doSend(ask, { displayText: text })
}

/**
 * sgv3（CHAIN-DESIGN §6.2 上行）：免打字交互卡提交——与 onSocraticChoice 并列纪律，
 * 真实发送（流式守卫通过）时置位 msg.usedInteractions[cardIndex]（markInteractionUsed
 * 模型层单一事实源，与 DualView.onAskInteractionSubmit 同源）。
 * 发送契约：summary 文本化摘要作 message（历史回显 + LLM 判答兜底双用途），
 * tutor_action:"interact" + tutor_interaction{interaction_id, form, payload, spent_ms}。
 */
function onInteractionSubmit(payload) {
  if (!payload?.summary || chat.streaming.value) return
  const clientMsgId = markAfterReplayMatch(markInteractionUsed, payload.msgKey, payload.cardIndex)
  chat.doSend(payload.summary, {
    clientMsgId,
    tutorAction: 'interact',
    tutorSessionId: payload.sessionId || '',
    tutorStepNo: payload.stepNo || null,
    tutorInteraction: {
      interactionId: payload.interactionId || '',
      form: payload.form || '',
      payload: payload.payload || {},
      spentMs: payload.spentMs || 0,
      editCount: payload.editCount || 0, // sgv4 §3.5/R5：改选/编辑次数（脆弱掌握判据）
    },
    skillKeys: ['socratic'],
  })
}

/**
 * sgv3（CHAIN-DESIGN §9.1/§9.3）门禁卡四入口：前端不做拦截判定只改入口语义
 * （避免双端规则漂移，门禁放后端单点闸）。upload=拍照识题、type=聚焦输入框、
 * pick=题库按薄弱点选题（练习中心）、quiz=先让 smart_quiz 出题（题干就位后门禁自然放行）。
 */
function onNeedProblem(action) {
  const kind = String(action || '')
  if (kind === 'upload' || kind === 'trigger_upload') {
    document.querySelector('button[title="拍照识题"]')?.click()
  } else if (kind === 'type' || kind === 'focus_input') {
    inputRef.value?.focus()
  } else if (kind === 'pick' || kind === 'open_kp_picker') {
    router.push('/practice')
  } else if (kind === 'quiz' || kind === 'route_quiz') {
    if (chat.streaming.value) return
    chat.doSend('给我出一道适合我当前水平的高中数学题（先出题），出完我再用引导式一步步解它。', {
      displayText: '🎲 让 AI 出一道，再带我一步步解',
      skillKeys: ['quiz_gen'],
    })
  }
}

/* ===== AI 管家：功能直达 action（路由映射到 v4 页面） ===== */
const PATH_MAP = {
  '/student/error-book': '/errors',
  '/student/mastery': '/report',
  '/student/graph': '/graph',
  '/student/practice-lab': '/practice',
  '/student/practice': '/practice',
  '/student/exam': '/exam',
  '/student/chat': '/dialog',
  '/student/classes': '/class',
  '/student/tasks': '/tasks',
  '/student/classroom': '/dual',
  '/student/resources': '/resources',
}
function mapPath(to) {
  const base = String(to || '').split('?')[0]
  return PATH_MAP[base] || to
}
const ACTION_ALLOWED_PREFIXES = ['/student/', '/admin/', '/dialog', '/overview', '/practice', '/errors', '/report', '/graph', '/exam', '/class', '/tasks', '/dual', '/resource']

async function handleAction(data) {
  const { kind, to, label, params } = data || {}
  if (kind !== 'open_page' || !to) return
  const target = mapPath(to)
  if (!ACTION_ALLOWED_PREFIXES.some((p) => String(target).startsWith(p))) {
    toast.error(`无法跳转到该页面（${to}）`)
    return
  }
  const ok = await confirm({
    title: '页面跳转',
    message: `是否前往「${label || to}」？`,
    confirmText: '前往',
  })
  if (ok) router.push(target + (params || '')).catch(() => toast.error('页面跳转失败'))
}

function onActionClick(action) {
  const { kind, to, params } = action || {}
  if (kind !== 'open_page' || !to) return
  const target = mapPath(to)
  if (!ACTION_ALLOWED_PREFIXES.some((p) => String(target).startsWith(p))) {
    toast.error(`无法跳转到该页面（${to}）`)
    return
  }
  router.push(target + (params || '')).catch(() => toast.error('页面跳转失败'))
}

/* ===== 消息操作 ===== */
function onFeedback(msg, val, reason) {
  chat.submitFeedback(msg, val, reason)
}
function onEditMessage(msg, newText) {
  chat.editUserMessage(msg, newText)
}
function onVersionSwitch(msg, targetId) {
  chat.activateVersion(msg, targetId)
}

/* ===== 引导式解题 ===== */
// sgv2（DESIGN §6.1/§3.5）：detour_skip / resume（补课卡两按钮）与
// stuck（「我没思路」显式求助强信号——sgv4 F13：改走 tutor_action:"help" 结构化信号，
// 不再以文本 attempt 模式发送）；
// sgv4（DESIGN §3.4b/§5.3/F8）：确认/引导按钮卡族动作映射——exit_confirm/keep_trying
// （出口确认，确认词「好」命中既有 EXIT_CONFIRM_RE 正则路径，正则兼容保留）、
// demo_confirm/demo_retry（示范确认卡 Z4，限次拒绝由后端 demo_deferrals 计数）、
// nudge_resume（对话回合收尾 Z2/Z3/Z5：本地聚焦未答交互卡，不发请求）、
// nudge_hint（既有 hint 通道）、new_problem（换道题，judge 判定）、
// concept_continue（L2 概念卡唯一出口 → 检验/练习交互）。
// 选项卡在消息内渲染、点选即作为 attempt 发送（V2 单发纪律：每步最多一次，见 MessageBubble）
function onTutorAction(action) {
  if (action === 'hint' || action === 'nudge_hint') chat.doSend('来点提示', { tutorAction: 'hint' })
  else if (action === 'answer') chat.doSend('直接看答案', { tutorAction: 'answer' })
  else if (action === 'detour_skip') chat.doSend('跳过补课，看这步怎么做', { tutorAction: 'detour_skip' })
  else if (action === 'resume') chat.doSend('回到原题', { tutorAction: 'resume' })
  else if (action === 'stuck') chat.doSend('我没思路', { tutorAction: 'help', skillKeys: ['socratic'] })
  // sgv4 出口确认（EXIT_CONFIRM_RE 兼容）：确认词「好」原文发送，正则文本路径消费
  else if (action === 'exit_confirm') chat.doSend('好', { tutorAction: 'attempt', skillKeys: ['socratic'] })
  else if (action === 'keep_trying') chat.doSend('我再试试', { tutorAction: 'attempt', skillKeys: ['socratic'] })
  // sgv4 示范确认卡（Z4）：新 tutor_action 值（agent_router 白名单同步为后端 B6 契约）
  else if (action === 'demo_confirm') chat.doSend('好，做给我看', { tutorAction: 'demo_confirm', skillKeys: ['socratic'] })
  else if (action === 'demo_retry') chat.doSend('我再试试', { tutorAction: 'demo_retry', skillKeys: ['socratic'] })
  // sgv4 对话回合收尾卡（Z3）：换道题走 judge 的 new_problem 判定
  else if (action === 'new_problem') chat.doSend('我想换一道题', { tutorAction: 'attempt', skillKeys: ['socratic'] })
  // sgv4 L2 概念卡 continue（T12→T13）：新 tutor_action 值（讲完必检验，无旁路）
  else if (action === 'concept_continue') chat.doSend('我看懂了，继续', { tutorAction: 'concept_continue', skillKeys: ['socratic'] })
  // sgv4 nudge_resume（Z2/Z5）：本地聚焦最近一张未答交互卡（不发请求、不占轮次）
  else if (action === 'nudge_resume') focusPendingInteraction()
}

/** sgv4 nudge_resume：滚动到最近一张未作答的 socratic_interaction 卡并短暂高亮 */
function focusPendingInteraction() {
  const cards = document.querySelectorAll('.soc-ix:not(.used)')
  const target = cards[cards.length - 1]
  if (!target) return
  target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  target.classList.add('si-focus-flash')
  setTimeout(() => target.classList.remove('si-focus-flash'), 1600)
}
function onAnswerConfirm(msg) {
  msg.confirmDismissed = true
  chat.doSend('确认查看完整解答', { tutorAction: 'answer_confirm' })
}
function onThinkMore(msg) {
  msg.confirmDismissed = true
  chat.doSend('我再想想', {})
}

/* ===== 出题卡 → 作答：接入沉浸式答题覆盖层 ===== */
function onQuizEnter(card) {
  const qid = card.quiz_id || card.quizId || `local_${uuid()}`
  try {
    sessionStorage.setItem(`quiz_${qid}`, JSON.stringify(card))
  } catch { /* 存储失败不阻断 */ }
  openImmersive()
}

/* ===== 对话内变式作答（判分上报 + 复习排期推进，原逻辑不变） ===== */
async function onQuizAnswered(card, item, idx, outcome) {
  if (!item || !item.question_text) return
  const opts = Array.isArray(item.options) ? item.options : []
  try {
    await studentApi.reportLearningEvent({
      kind: 'quiz_judge',
      question_text: String(item.question_text).slice(0, 2000),
      options: opts.map((o) => String(o)).slice(0, 8),
      answer: item.answer || '',
      chosen: outcome?.chosen || '',
      correct: !!outcome?.correct,
      kp_code: item.kp_code || '',
      kp_name: item.kp_name || '',
      source: 'chat_quiz',
      conversation_id: chat.activeConvId.value || undefined,
    })
  } catch (e) {
    console.warn('[learning-event] 判分上报失败', e)
    if (!outcome?.correct) toast.error('错题自动收录失败，可稍后在错题本手动收录')
  }
  if (reviewCtx.value) {
    const rid = reviewCtx.value.record_id
    reviewCtx.value = null
    try {
      const res = await studentApi.reviewErrorRecord(rid, { result: outcome?.correct ? 'remembered' : 'forgotten' })
      if (outcome?.correct) {
        toast.success(res?.graduated ? '这道错题已完成全部复习，毕业啦 🎓' : '复习完成，已安排下次复习')
      } else {
        toast.info('没关系，已重置这道题的复习计划，明天再试一次')
      }
    } catch { /* 排期推进失败不打断作答 */ }
  }
}

/* ===== 复习对话化（由首页学情脉搏 / 到期队列触发） ===== */
const reviewCtx = ref(null)
const reviewStarting = ref(false)

async function startReview(item) {
  if (!item || chat.streaming.value || reviewStarting.value) return
  reviewStarting.value = true
  reviewCtx.value = { record_id: item.record_id }
  const zh = item.kp_name || KP_ZH[String(item.kp_code || '')] || ''
  const kp = zh ? `「${zh}」` : ''
  chat.doSend(
    `我在复习一道${kp}错题，请基于它出一道变式题（换掉数字或条件，不要出原题）让我重新作答巩固：\n${item.question_text}` +
      (item.file_id ? '\n（原题图片已随消息附上，请先看图再审题）' : ''),
    { displayText: '🔄 错题复习 · 换个条件再试试', skillKeys: ['quiz_gen'], attachments: item.file_id ? [{ file_id: item.file_id, kind: 'image' }] : [], question: { text: item.question_text || '' } },
  )
  reviewStarting.value = false
}

/** 学情脉搏里的“按薄弱点开练/提问”，直接进入对话主链路。 */
function onPulseAsk(payload) {
  const text = String(payload?.text || '').trim()
  if (!text || chat.streaming.value) return
  const key = payload?.skill ? SKILL_ID_BY_KEY[payload.skill] : ''
  chat.doSend(text, { displayText: text, skillKeys: key ? [key] : [] })
}

function onQuizExplain(card, item, idx, outcome) {
  if (chat.streaming.value) return
  const q = String(item?.question_text || '').slice(0, 500)
  const kp = item?.kp_name || KP_ZH[String(item?.kp_code || '')] || ''
  const chosenInfo =
    outcome && !outcome.correct && outcome.chosen
      ? `我刚刚选了 ${outcome.chosen}（错误）`
      : outcome && !outcome.correct
        ? '我刚刚答错了'
        : '我刚刚答过'
  const text = `请讲解这道题并帮我举一反三：${kp ? `（${kp}相关题，` : ''}${chosenInfo}，请先用引导式方式和我互动，我会通过选项方式推进）`
  chat.doSend(text, { displayText: '💬 讲解这道错题 · 举一反三', skillKeys: ['socratic'], question: { text: q || '', options: item?.options || [] }, questionText: q || '' })
}

function onQuizMore(card) {
  if (chat.streaming.value) return
  const it = card?.items?.[0]
  const q = String(it?.question_text || '').slice(0, 400)
  chat.doSend(
    q ? `请基于这道题再来一组难度递进的变式巩固：\n${q}` : '再来一组变式巩固',
    { displayText: '🔄 再来一组变式', skillKeys: ['quiz_gen'], attachments: it?.file_id ? [{ file_id: it.file_id, kind: 'image' }] : [], question: { text: q || '', options: it?.options || [] } },
  )
}

function onChainAction(type, card) {
  if (type === 'variant') {
    onQuizMore(card)
  } else {
    onCompleteAction({ type })
  }
}

function onCompleteAction({ type } = {}) {
  if (type === 'variant') {
    if (chat.streaming.value) return
    chat.doSend('请基于刚才引导完成的这道题，再来一组难度递进的变式（举一反三）', {
      displayText: '🔄 举一反三 · 再来一组变式',
      skillKeys: ['quiz_gen'],
    })
  } else if (type === 'errorBook') {
    router.push('/errors')
  } else if (type === 'mastery') {
    router.push('/report')
  } else if (type === 'quiz_ai') {
    // sgv3（CHAIN-DESIGN §2.1/§10-W7）transfer opt-in 出口：完成卡第五出口「出一道考考 AI」。
    // 发文本进 socratic_solver，后端临时复活会话进 transfer 交互（与历史回点复活同款机制）；
    // 四出口现状全部 KEEP（举一反三/错题本/学情/结束），transfer 是纯增量
    if (chat.streaming.value) return
    chat.doSend('这道题我学会了——现在换我出一道考考你：请引导我改一个条件把它变成新题，然后你来解，我来当老师批改你。', {
      displayText: '🎭 出一道考考 AI',
      skillKeys: ['socratic'],
    })
  } else if (type === 'finish') {
    toast.success('今天辛苦了，明天继续加油 💪')
  }
}

/* ===== 附件 ===== */
function onPickFiles({ files, isPhoto }) {
  upload.addFiles(files, { purpose: isPhoto ? 'question_photo' : 'chat_attachment' })
}

/* ===== 生命周期 ===== */
onMounted(async () => {
  if (typeof ResizeObserver === 'function') {
    scrollObserver = new ResizeObserver(syncScroll)
    if (listRef.value) scrollObserver.observe(listRef.value)
  }
  await conv.load()
  // 首页学情脉搏：与对话历史并行加载，失败只隐藏对应区块
  void snapshot.load()
  // 阶段 6A：加载能力开关（v2 未切流期间 web_search_opt_in_enabled=false，按钮隐藏）
  chat.loadFeatures()
  const initId = String(route.params.id || '')
  if (initId) {
    if (isExperienceId(initId)) {
      await enterExperience(initId)
    } else {
      await chat.openConversation(initId)
      if (route.params.id === initId) {
        conv.select(initId)
        placeHistory()
      }
    }
  }

  const safeDecode = (s) => {
    try {
      return decodeURIComponent(s)
    } catch {
      return s
    }
  }
  const kp = String(route.query.kp || '')
  const explain = String(route.query.explain || '')
  if (explain && !chat.messages.value.length && !chat.streaming.value) {
    const errorType = String(route.query.error_type || '')
    const myAnswer = String(route.query.answer || '')
    const ERROR_TYPE_ZH = {
      concept: '概念不清',
      formula: '公式记错',
      calculation: '计算失误',
      logic: '思路逻辑问题',
      reading: '审题读题偏差',
    }
    const parts = [`请讲解这道错题并帮我举一反三：\n${safeDecode(explain).slice(0, 600)}`]
    if (myAnswer) parts.push(`我当时的作答：${safeDecode(myAnswer).slice(0, 300)}`)
    if (ERROR_TYPE_ZH[errorType]) parts.push(`错因标记：${ERROR_TYPE_ZH[errorType]}`)
    if (kp) parts.push(`（对应知识点「${kp}」）`)
    parts.push('请先用苏格拉底方式引导我理解错在哪，再出 2-3 道变式确认我真正掌握')
    chat.doSend(parts.join('\n'), {
      displayText: '💬 已为你打开错题讲解，逐一举一反三',
      skillKeys: ['socratic'],
    })
  } else if (kp && !chat.messages.value.length && !chat.streaming.value) {
    // sgv3（CHAIN-DESIGN §9.3）kp 深链两步化：先出题（smart_quiz），题干就位后门禁自然
    // 放行引导（题卡带「带我一步步解」入口回流 socratic）——不再把出题意图发给解题技能
    chat.doSend(`请围绕知识点「${kp}」出一道适合我当前水平的典型题（先出题，附解析）。`, {
      displayText: `🎲 围绕「${kp}」先出一道题`,
      skillKeys: ['quiz_gen'],
    })
  }

  // 知识库详情抽屉 → 对话：带上资料标题/题库题目，直接走 AI 提问链路
  const ask = String(route.query.ask || '')
  if (ask && !chat.messages.value.length && !chat.streaming.value) {
    const skill = String(route.query.skill || '')
    const display = String(route.query.display || '📚 基于我的资料提问')
    chat.doSend(safeDecode(ask), {
      displayText: safeDecode(display),
      skillKeys: skill ? [SKILL_ID_BY_KEY[skill]].filter(Boolean) : [],
    })
  }

  const review = String(route.query.review || '')
  if (review && !chat.messages.value.length && !chat.streaming.value) {
    try {
      const data = await studentApi.reviewPlan()
      if (data?.due_items?.length) await startReview(data.due_items[0])
      else toast.info('今天没有到期的错题，保持得不错')
    } catch {
      toast.error('复习计划加载失败，可稍后再试')
    }
  }
})

onBeforeUnmount(() => {
  scrollObserver?.disconnect()
  chat.dispose()
  upload.stopAll()
})

watch(
  () => route.params.id,
  async (id) => {
    const nid = id || ''
    if (nid !== chat.activeConvId.value) {
      // 切换会话时清空知识库引用选择（引用属于当前会话上下文）
      selectedKbDocs.value = []
      if (!isExperienceId(nid)) {
        experienceAttachment.value = null
        pendingExperiencePrefill.value = null
      }
      if (chat.streaming.value) await chat.stopStreaming()
      if (isExperienceId(nid)) {
        await enterExperience(nid)
      } else if (nid) {
        await chat.openConversation(nid)
        if (route.params.id === nid) {
          conv.select(nid)
          placeHistory()
        }
      } else {
        chat.activeConvId.value = ''
        chat.messages.value = []
        conv.select('')
        scrollBottom()
      }
    }
  }
)

/** 同一体验再次点击：V4Layout 用 query.r 作为重置信号，不换路由也能回到封面 */
watch(
  () => route.query.r,
  (r) => {
    const id = String(route.params.id || '')
    if (r && isExperienceId(id)) enterExperience(id)
  }
)
</script>

<style scoped>
.dialog-page {
  --dialog-column: 860px;
  --dialog-gutter: clamp(16px, 3.1vw, 40px);
  height: calc(100vh - var(--topbar-h));
  height: calc(100dvh - var(--topbar-h));
  padding: 0;
}
.dialog-main {
  position: relative; width: 100%; height: 100%; min-width: 0;
  background: transparent; border: 0; border-radius: 0;
}
.dialog-header {
  flex: none; min-height: 64px;
  padding: 10px var(--dialog-gutter);
}
.dialog-heading { display: flex; align-items: center; gap: 11px; min-width: 0; }
.dialog-heading-icon {
  display: grid; place-items: center; flex: none;
  width: 32px; height: 32px; border-radius: 10px;
  background: var(--brand-soft); color: var(--brand-deep);
  font: 700 19px/1 var(--font-serif);
}
.dialog-heading .ttl {
  min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: 17px; font-weight: 700; line-height: 1.45; color: var(--ink);
}
.dialog-badges { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex: none; }
.dialog-stage, .dialog-mode summary {
  display: flex; align-items: center; gap: 5px; min-height: 30px; padding: 2px 10px;
  border: 1px solid var(--line); border-radius: var(--radius-sm);
  background: var(--bg); color: var(--ink2); font-size: 12px; font-weight: 600;
}
.dialog-stage { background: var(--brand-soft); border-color: var(--brand-faint); color: var(--brand-deep); }
.dialog-stage[data-complete="true"] { background: var(--ok-bg); border-color: var(--ok-border); color: var(--ok-deep); }
.dialog-heading-text { min-width: 0; }
.dialog-sub { margin: 1px 0 0; font-size: 12px; color: var(--ink3); line-height: 1.4; }
.dialog-mode { position: relative; z-index: 10; }
.dialog-mode summary { list-style: none; cursor: pointer; }
.dialog-mode summary::-webkit-details-marker { display: none; }
.dialog-mode summary::after {
  content: ''; width: 5px; height: 5px; margin: -2px 2px 0 3px;
  border: solid currentColor; border-width: 0 1.5px 1.5px 0; transform: rotate(45deg);
}
.dialog-mode[open] summary { color: var(--brand-deep); border-color: var(--primary-border); }
.dialog-mode p {
  position: absolute; inset-inline-end: 0; top: calc(100% + 8px);
  width: min(280px, 66vw); margin: 0; padding: 12px 14px;
  border: 1px solid var(--line); border-radius: var(--radius-md);
  background: var(--card); box-shadow: var(--shadow-md);
  color: var(--ink2); font-size: 13px; line-height: 1.7;
}
.dialog-messages {
  display: block; flex: 1 1 0; min-height: 0; min-width: 0;
  padding: 26px var(--dialog-gutter) 12px;
  overscroll-behavior-y: contain; scrollbar-width: thin;
}
.dialog-thread { width: 100%; max-width: var(--dialog-column); margin-inline: auto; padding-bottom: 12px; }
.dialog-thread :deep(.mf-img) { margin-inline: auto; }
.dialog-thread :deep(.mf-debug) { display: none; }
.dialog-thread :deep(.mf-dot) {
  position: relative; display: grid; place-items: center;
  width: 22px; height: 28px; background: none; transform: none;
}
.dialog-thread :deep(.mf-dot::before) {
  content: ''; width: 8px; height: 8px; background: var(--border-strong); border-radius: var(--radius-full);
}
.dialog-thread :deep(.mf-dot.on::before) { background: var(--brand); }
.list-loading { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 40px 0; color: var(--ink2); }
.history-more { display: flex; justify-content: center; margin-bottom: 18px; }
.dialog-dock {
  position: relative; flex: none; padding: 10px var(--dialog-gutter) 15px;
  border-top: 1px solid var(--line2);
}
.dialog-dock-inner { width: 100%; max-width: var(--dialog-column); min-width: 0; margin-inline: auto; }
.dialog-next { display: flex; align-items: center; gap: 9px; padding-bottom: 7px; font-size: 12px; color: var(--ink2); }
.dialog-next button, .back-bottom {
  display: inline-flex; align-items: center; justify-content: center; gap: 5px;
  border: 1px solid var(--line); border-radius: var(--radius-full); background: var(--card);
  color: var(--brand-deep); font: inherit; font-weight: 600; cursor: pointer;
}
.dialog-next button { min-height: 28px; padding: 2px 9px; }
.dialog-next button:hover, .back-bottom:hover { background: var(--brand-soft); border-color: var(--primary-border); }
.back-bottom {
  position: static; display: flex; margin: 0 auto 6px;
  transform: translateX(-50%); z-index: 5; min-height: 34px; padding: 1px 12px;
  box-shadow: var(--shadow-sm); font-size: 12px; white-space: nowrap;
}

.home-welcome { width: 100%; max-width: 1020px; margin: 0 auto; padding: clamp(12px, 3.5vh, 40px) 0 20px; text-align: left; }
.home-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(290px, 330px); gap: 32px; align-items: start; }
.home-hero { min-width: 0; padding-top: 10px; }

.drop-mask {
  position: absolute; inset: 0; z-index: 30; pointer-events: none;
  background: color-mix(in srgb, var(--brand-soft) 84%, transparent);
  display: flex; align-items: center; justify-content: center;
  border: 2px dashed var(--primary-border); border-radius: 16px; margin: 8px;
}
.drop-inner { display: flex; flex-direction: column; align-items: center; gap: 8px; color: var(--brand-deep); font-size: 14px; font-weight: 500; }
.drop-sub { font-size: 12px; color: var(--ink2); font-weight: 400; }
.hero-greet { font-size: 15px; color: var(--ink2); margin-bottom: 9px; }
.hero-title { color: var(--ink); font-size: clamp(25px, 3.2vw, 38px); font-weight: 800; line-height: 1.3; margin: 0 0 10px; }
.hero-title span { color: var(--brand-deep); }
.hero-sub { max-width: 560px; font-size: 15px; color: var(--ink2); margin-bottom: 24px; line-height: 1.7; }
.hero-entries { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 26px; }
.he-card {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  min-height: 78px; padding: 10px 8px; border-radius: var(--radius-md);
  background: var(--card); border: 1px solid var(--line); cursor: pointer;
  font: inherit; font-size: 13px; font-weight: 600; color: var(--ink2);
}
.he-card :deep(.ui-icon), .hr-item :deep(.ui-icon) { color: var(--brand-deep); }
.he-card:hover, .hr-item:hover { border-color: var(--primary-border); background: var(--brand-soft); }
.hero-recent { width: 100%; max-width: 520px; text-align: left; }
.hr-title { font-size: 13px; color: var(--ink2); font-weight: 700; margin-bottom: 6px; }
.hr-item {
  display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px; margin-bottom: 6px;
  background: var(--bg); border: 1px solid var(--line2); border-radius: var(--radius-sm);
  cursor: pointer; font: inherit; font-size: 13px; text-align: left;
}
.hr-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ink); }

.dialog-page :is(button, summary):focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
.dialog-messages:focus-visible { outline: 2px solid var(--primary-border); outline-offset: -2px; }
.dialog-messages :deep(.si-focus-flash) { animation: sgv4-focus-flash 1.6s ease; }
@keyframes sgv4-focus-flash {
  0%, 100% { box-shadow: none; }
  25%, 65% { box-shadow: 0 0 0 4px var(--brand-faint); }
}

@media (max-width: 1100px) {
  .home-welcome { max-width: var(--dialog-column); }
  .home-grid { gap: 18px; }
  .hero-entries { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 900px) {
  .home-grid { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 720px) {
  .dialog-header { gap: 5px; min-height: 54px; }
  .dialog-heading .ttl { font-size: 14px; }
  .dialog-heading-icon { display: none; }
  .dialog-stage, .dialog-mode summary { min-height: 27px; padding-inline: 6px; font-size: 11px; }
  .dialog-badges { gap: 4px; }
  .dialog-messages { padding-top: 18px; }
  .dialog-dock { padding-bottom: 10px; }
}
@media (prefers-reduced-motion: reduce) {
  .dialog-page, .dialog-messages :deep(.si-focus-flash) { animation: none; }
}
</style>
