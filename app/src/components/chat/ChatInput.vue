<template>
  <!-- 输入区：附件/引用行 + 自动长高 textarea + 附件/知识库/拍照/语音/思考开关 + 字数 + 发送/停止 -->
  <div class="chat-input">
    <div v-if="tasks.length" class="ci-attach-row">
      <AttachmentCard
        v-for="t in tasks"
        :key="t.localId"
        :task="t"
        :offline="offline"
        @remove="$emit('removeAttachment', t)"
        @retry="$emit('retryAttachment', t)"
      />
    </div>
    <div v-if="kbDocs.length" class="ci-attach-row">
      <span v-for="d in kbDocs" :key="d.id" class="ci-kb-chip" :title="d.title">
        <UiIcon name="book" :size="12" />
        <span class="ci-kb-chip__title">{{ d.title }}</span>
        <button type="button" class="ci-kb-chip__x" aria-label="移除引用" @click="$emit('removeKbDoc', d.id)">×</button>
      </span>
    </div>

    <div class="ci-box">
      <textarea
        ref="taRef"
        v-model="draft"
        class="ci-ta"
        rows="2"
        maxlength="4000"
        aria-label="输入数学问题"
        placeholder="写下你的问题，也可以粘贴题目截图"
        @keydown.enter.exact="onEnter"
        @paste="onPaste"
      ></textarea>

      <div class="ci-btns">
        <button type="button" class="icon-btn" :disabled="attachDisabled" :title="offline ? '添加随包题图' : '上传附件（pdf/图片/office/md/txt，≤20MB）'" @click="fileRef.click()">
          <UiIcon name="paperclip" :size="17" />
        </button>
        <input ref="fileRef" type="file" hidden multiple :accept="acceptExts" @change="onPick($event, false)" />

        <button type="button" class="icon-btn" :disabled="attachDisabled" title="拍照识题" @click="photoRef.click()">
          <UiIcon name="camera" :size="17" />
        </button>
        <input ref="photoRef" type="file" hidden accept="image/jpeg,image/png" capture="environment" @change="onPick($event, true)" />

        <!-- 知识库引用（ima 式）：勾选本人资料随消息携带，回答基于真实切片并可回溯 -->
        <button type="button" class="icon-btn" :class="{ 'ci-kb-on': kbDocs.length }" :aria-expanded="kbOpen" :disabled="streaming" title="引用知识库资料" @click="kbOpen = !kbOpen">
          <UiIcon name="book" :size="17" />
        </button>
        <KbPicker :open="kbOpen" :selected="kbDocs" @close="kbOpen = false" @toggle="onKbToggle" />

        <VoiceInputButton v-if="!offline" :disabled="streaming" @insert="insertText" />

        <!-- 思考模式开关（M2.2）：开=深度推理+思考面板，关=更快响应 -->
        <button
          v-if="!offline"
          type="button"
          class="icon-btn ci-thinking"
          :class="{ 'ci-thinking-on': thinking }"
          :aria-pressed="thinking"
          title="思考模式"
          @click="$emit('update:thinking', !thinking)"
        >
          <UiIcon name="brain" :size="17" />
        </button>

        <!-- 联网搜索开关（阶段 6A 预接线）：仅能力标志开启时渲染；单条请求授权，发送后复位 -->
        <button
          v-if="webSearchEnabled && !offline"
          class="icon-btn ci-websearch"
          :class="{ 'ci-websearch-on': webSearch }"
          :title="webSearch ? '联网搜索：开（本次发送生效，发送后自动关闭）' : '联网搜索：关\n点击开启，本次发送将携带联网授权'"
          @click="$emit('update:webSearch', !webSearch)"
        >
          <UiIcon name="search" :size="17" />
        </button>

        <span v-if="attachLimited" class="ci-cool text-muted text-sm">操作频繁，稍后可传</span>
        <div class="ci-submit">
          <span v-if="draft" class="ci-count" :class="{ warn: draft.length > 3500 }">{{ draft.length }}/4000</span>
          <span v-else-if="!streaming" class="ci-tip">Enter 发送 · Shift+Enter 换行</span>
          <button v-if="streaming" type="button" class="btn btn-sm ci-stop" title="停止回复" @click="$emit('stop')">
            <UiIcon name="stop" :size="14" /> 停止
          </button>
          <button v-else type="button" class="btn btn-primary btn-sm ci-send" :disabled="!canSend" title="发送" @click="trySend">
            <UiIcon name="send" :size="15" /> 发送
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import AttachmentCard from './AttachmentCard.vue'
import VoiceInputButton from './VoiceInputButton.vue'
import KbPicker from './KbPicker.vue'
import UiIcon from '@/components/common/UiIcon.vue'
import { ACCEPT_EXTS } from './useFileUpload'

const TA_MAX_H = 200 // 输入框自动长高上限（4.6）

const props = defineProps({
  offline: { type: Boolean, default: false },
  streaming: { type: Boolean, default: false },
  tasks: { type: Array, default: () => [] },
  rateLimitedUntil: { type: Number, default: 0 },
  thinking: { type: Boolean, default: true },
  webSearch: { type: Boolean, default: false },
  webSearchEnabled: { type: Boolean, default: false },
  kbDocs: { type: Array, default: () => [] },
})
const emit = defineEmits(['send', 'stop', 'pickFiles', 'removeAttachment', 'retryAttachment', 'update:thinking', 'update:webSearch', 'toggleKbDoc', 'removeKbDoc'])

const draft = ref('')
const taRef = ref(null)
const fileRef = ref(null)
const photoRef = ref(null)
const kbOpen = ref(false)
const acceptExts = ACCEPT_EXTS

const now = ref(Date.now())
let coolTimer = null
const attachLimited = computed(() => now.value < props.rateLimitedUntil)
const attachDisabled = computed(() => props.streaming || attachLimited.value)
const canSend = computed(
  () =>
    !props.streaming &&
    (draft.value.trim().length > 0 || props.tasks.some((t) => t.status === 'parsed') || props.kbDocs.length > 0)
)

function onKbToggle(doc) {
  if (props.kbDocs.some((d) => d.id === doc.id)) {
    emit('removeKbDoc', doc.id)
  } else if (props.kbDocs.length < 5) {
    emit('toggleKbDoc', doc)
  }
}

watch(attachLimited, (v) => {
  clearInterval(coolTimer)
  if (v) {
    coolTimer = setInterval(() => {
      now.value = Date.now()
      if (!attachLimited.value) clearInterval(coolTimer)
    }, 1000)
  }
}, { immediate: true })
onBeforeUnmount(() => clearInterval(coolTimer))

/* 输入框随内容自动长高（上限 200px，超高内部滚动） */
watch(draft, () => nextTick(autoGrow))
function autoGrow() {
  const ta = taRef.value
  if (!ta) return
  ta.style.height = 'auto'
  ta.style.height = Math.min(ta.scrollHeight, TA_MAX_H) + 'px'
}

function onEnter(event) {
  if (event.isComposing || event.keyCode === 229) return
  event.preventDefault()
  trySend()
}

function trySend() {
  if (!canSend.value) return
  // 有就绪附件/知识库引用但没写字时，补一句默认指令（后端 message 必填）
  const text =
    draft.value.trim() ||
    (props.kbDocs.length ? '请基于我引用的知识库资料回答问题' : '请分析我上传的文件')
  emit('send', text)
  draft.value = ''
  nextTick(() => {
    autoGrow()
    taRef.value?.focus()
  })
}

function onPick(e, isPhoto) {
  const files = [...(e.target.files || [])]
  e.target.value = ''
  if (files.length) emit('pickFiles', { files, isPhoto })
}

/** 粘贴截图直传（4.4）：clipboardData.files 有图则拦截，走拍照压缩链路 */
function onPaste(e) {
  const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'))
  if (!files.length) return // 纯文本粘贴走默认行为
  e.preventDefault()
  // 粘贴板文件名缺失（截图），补时间戳文件名
  const named = files.map((f, i) => {
    if (f.name && f.name !== 'image.png') return f
    const ext = (f.type.split('/')[1] || 'png').replace('jpeg', 'jpg')
    return new File([f], `截图_${new Date().toISOString().slice(11, 19).replace(/:/g, '')}${i ? '_' + i : ''}.${ext}`, { type: f.type })
  })
  emit('pickFiles', { files: named, isPhoto: true })
}

function insertText(t) {
  draft.value = draft.value ? `${draft.value} ${t}` : t
  taRef.value?.focus()
}

function focus() {
  taRef.value?.focus()
}

defineExpose({ insertText, focus })
</script>

<style scoped>
/* z-index 压过 AI 管家悬浮球（.fb-root fixed z-1300）——真机实测悬浮球
   遮住发送按钮，点击发送被球截胡；输入条整体抬到其上 */
.chat-input { width: 100%; min-width: 0; position: relative; z-index: 1301; }
.ci-attach-row {
  display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;
  max-height: min(126px, 20dvh); overflow: auto;
}
.ci-box {
  padding: 12px 12px 9px;
  border: 1px solid var(--border-strong); border-radius: var(--radius-lg);
  background: var(--card); box-shadow: var(--shadow-sm);
}
.ci-box:focus-within { border-color: var(--brand-mist); box-shadow: 0 0 0 3px var(--brand-soft), var(--shadow-sm); }
.ci-ta {
  width: 100%; border: none; outline: none; resize: none; background: transparent;
  font: inherit; font-size: 15px; line-height: 1.6; color: var(--text-primary); padding: 1px 4px;
  max-height: min(200px, 26dvh); min-height: 48px; display: block;
}
.ci-ta::placeholder { color: var(--ma-text-muted, var(--ink2)); }
.ci-btns { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; margin-top: 2px; }
.ci-submit { display: flex; align-items: center; gap: 9px; margin-inline-start: auto; }
.icon-btn {
  width: 36px; height: 36px; border-radius: var(--radius-sm); border: 1px solid transparent;
  background: none; cursor: pointer; color: var(--text-secondary);
  display: inline-flex; align-items: center; justify-content: center;
}
.icon-btn:hover:not(:disabled) { background: var(--brand-soft); color: var(--brand-deep); }
.icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.ci-stop, .ci-send { gap: 6px; min-height: 36px; padding-inline: 12px; border-radius: var(--radius-sm); }
.ci-stop { color: var(--err-deep); border-color: var(--err-border); }
.ci-stop:hover { background: var(--err-bg); color: var(--err-deep); }
.ci-send { background: var(--brand); background-image: none; }
.ci-send:hover:not(:disabled) { background: var(--brand-deep); }
.ci-send:disabled { background: var(--bg2); border-color: var(--line); color: var(--ink2); opacity: .8; box-shadow: none; }
.ci-cool { margin-right: 4px; }
.ci-count, .ci-tip { font-size: 11px; color: var(--ink2); user-select: none; }
.ci-count.warn { color: var(--warn-deep); }
.ci-thinking { opacity: 0.45; }
.ci-thinking-on {
  opacity: 1; color: var(--primary);
  background: var(--primary-subtle);
  box-shadow: inset 0 0 0 1px var(--primary-border);
}
.ci-websearch { opacity: 0.45; }
.ci-websearch-on {
  opacity: 1; color: var(--primary);
  background: var(--primary-subtle);
  box-shadow: inset 0 0 0 1px var(--primary-border);
}
.ci-kb-on {
  opacity: 1; color: var(--primary);
  background: var(--primary-subtle);
  box-shadow: inset 0 0 0 1px var(--primary-border);
}
.ci-kb-chip {
  display: inline-flex; align-items: center; gap: 6px; max-width: 260px;
  padding: 6px 8px; border-radius: 10px; background: #eef1ff;
  color: var(--primary, #4f46e5); font-size: 12px; font-weight: 600;
}
.ci-kb-chip__title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ci-kb-chip__x {
  border: none; background: transparent; cursor: pointer; padding: 0 2px;
  color: inherit; font-size: 14px; line-height: 1; border-radius: 6px;
}
.ci-kb-chip__x:hover { background: rgba(79, 70, 229, 0.12); }
@media (max-width: 780px) {
  .ci-tip { display: none; }
}
</style>
