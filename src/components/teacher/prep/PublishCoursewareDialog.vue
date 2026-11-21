<!-- 发布课堂对话框：班级选择 → 准备态 → 发布中 → 成功 / 失败（写入 store.teacher.publish.records） -->
<template>
  <Teleport to="body">
    <div v-if="open" class="publish-mask" data-testid="publish-dialog" @click.self="onMask">
      <div class="publish-dialog" role="dialog" aria-modal="true" aria-label="发布课堂">
        <div class="publish-dialog__head">
          <div>
            <b>发布课堂</b>
            <span>把当前版本的课件发布到班级 · 学生端课堂可见</span>
          </div>
          <button class="publish-dialog__close" type="button" title="关闭" :disabled="phase === 'publishing'" @click="close">×</button>
        </div>

        <!-- 准备态 -->
        <div v-if="phase === 'ready'" class="publish-body" data-testid="publish-ready">
          <div class="publish-deck">
            <div class="publish-deck__cover">PPT</div>
            <div class="publish-deck__meta">
              <b>{{ deckTitle }}</b>
              <span>{{ deckSubtitle }} · 共 {{ slideCount }} 页 · 当前编辑版本</span>
              <span class="publish-deck__hint">发布的是点击“开始发布”瞬间的课件快照；之后未发布的修改不会进入该版本。</span>
            </div>
          </div>

          <div class="publish-section-title">选择发布班级</div>
          <div class="publish-classes">
            <button
              v-for="c in classOptions"
              :key="c"
              type="button"
              class="publish-class"
              :class="{ 'is-active': className === c }"
              :data-testid="`publish-class-${c}`"
              @click="className = c"
            >
              <span class="publish-class__radio"><i /></span>
              <span class="publish-class__name">{{ c }}</span>
              <span v-if="c === defaultClass" class="publish-class__tag">本课时班级</span>
            </button>
          </div>

          <div class="publish-version">
            本次发布版本：<b data-testid="publish-next-version">v{{ nextVersion }}</b>
            <span>（同一课时的历史版本会保留，可在备课历史中查看）</span>
          </div>

          <div v-if="phaseError" class="publish-error">{{ phaseError }}</div>

          <div class="publish-dialog__foot">
            <button class="pv-btn" type="button" @click="close">取消</button>
            <button
              class="pv-btn pv-btn--primary"
              type="button"
              :disabled="!className"
              data-testid="publish-confirm"
              @click="startPublish"
            >
              开始发布
            </button>
          </div>
        </div>

        <!-- 发布中 -->
        <div v-else-if="phase === 'publishing'" class="publish-body" data-testid="publish-publishing">
          <div class="publish-progress">
            <div class="publish-spinner" />
            <div>
              <b>正在发布到 {{ className }}…</b>
              <span>请稍候，正在生成课件快照并写入班级课堂。</span>
            </div>
          </div>
          <ol class="publish-steps">
            <li v-for="(s, i) in steps" :key="s" :class="{ 'is-done': i < stepIndex, 'is-active': i === stepIndex }">
              <span class="publish-step__dot">{{ i < stepIndex ? '✓' : i + 1 }}</span>
              <span>{{ s }}</span>
            </li>
          </ol>
        </div>

        <!-- 成功 -->
        <div v-else-if="phase === 'success'" class="publish-body" data-testid="publish-success">
          <div class="publish-success">
            <div class="publish-success__icon">✓</div>
            <div>
              <b>发布成功</b>
              <p data-testid="publish-success-text">
                已发布到 <b>{{ record.className }}</b> · 版本 <b>{{ record.meta?.versionLabel }}</b>
              </p>
            </div>
          </div>
          <div class="publish-result">
            <div class="publish-result__row"><span>课件</span><b>{{ record.deckTitle }}</b></div>
            <div class="publish-result__row"><span>页数</span><b>{{ record.slides.length }} 页</b></div>
            <div class="publish-result__row"><span>发布时间</span><b>{{ record.meta?.publishedAtText }}</b></div>
            <div class="publish-result__row"><span>发布人</span><b>{{ record.editor }}</b></div>
            <div class="publish-result__row"><span>记录 ID</span><b class="publish-result__id">{{ record.id }}</b></div>
          </div>
          <div class="publish-success__hint">
            published · 学生端「课堂 → 老师课堂」现在可以打开这一版本，旧版本仍保留在发布记录中。
          </div>
          <div class="publish-dialog__foot">
            <button class="pv-btn" type="button" data-testid="publish-continue" @click="close">继续编辑</button>
            <button class="pv-btn pv-btn--primary" type="button" data-testid="publish-done" @click="close">完成</button>
          </div>
        </div>

        <!-- 失败 -->
        <div v-else class="publish-body" data-testid="publish-error">
          <div class="publish-fail">
            <div class="publish-fail__icon">!</div>
            <div>
              <b>发布没有完成</b>
              <p>{{ errorMessage }}</p>
            </div>
          </div>
          <div class="publish-fail__hint">课件内容仍保留在本机编辑状态中，可重试发布；失败不会写入发布记录。</div>
          <div class="publish-dialog__foot">
            <button class="pv-btn" type="button" @click="close">取消</button>
            <button class="pv-btn pv-btn--primary" type="button" data-testid="publish-retry" @click="startPublish">重试</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { PUBLISH_CLASSES, publishPrepSession } from '../../../data/prepPublish'

const props = defineProps({
  open: { type: Boolean, default: false },
  sessionId: { type: String, default: '' },
  deckTitle: { type: String, default: '' },
  deckSubtitle: { type: String, default: '' },
  defaultClass: { type: String, default: '' },
  slideCount: { type: Number, default: 0 },
  nextVersion: { type: Number, default: 1 },
})

const emit = defineEmits(['close', 'published'])

const phase = ref('ready')
const className = ref(props.defaultClass || PUBLISH_CLASSES[0])
const record = ref(null)
const errorMessage = ref('')
const phaseError = ref('')
const stepIndex = ref(0)
const steps = [
  '生成当前编辑内容的课件快照（深拷贝）',
  '写入班级课堂发布记录（追加新版本）',
  '同步发布状态到备课会话',
]
const classOptions = PUBLISH_CLASSES

watch(
  () => props.open,
  (open) => {
    if (open) {
      phase.value = 'ready'
      className.value = props.defaultClass || PUBLISH_CLASSES[0]
      record.value = null
      errorMessage.value = ''
      phaseError.value = ''
      stepIndex.value = 0
    }
  },
  { immediate: true },
)

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function startPublish() {
  if (phase.value === 'publishing') return
  if (!className.value) {
    phaseError.value = '请选择要发布的班级'
    return
  }
  phaseError.value = ''
  phase.value = 'publishing'
  stepIndex.value = 0
  try {
    await sleep(260)
    stepIndex.value = 1
    // 第 1 步结束：真实执行发布（快照 + 写入 records + 同步发布态）
    const published = publishPrepSession(props.sessionId, className.value)
    await sleep(320)
    stepIndex.value = 2
    await sleep(260)
    stepIndex.value = 3
    record.value = published
    phase.value = 'success'
    emit('published', published)
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : String(err)
    phase.value = 'error'
  }
}

function close() {
  if (phase.value === 'publishing') return
  emit('close')
}

function onMask() {
  close()
}
</script>

<style scoped>
.publish-mask {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(15, 23, 42, 0.44);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.publish-dialog {
  width: 560px;
  max-width: 94vw;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 30px 80px rgba(15, 23, 42, 0.3);
  overflow: hidden;
  animation: publish-in 0.16s ease-out;
}
@keyframes publish-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.99);
  }
}
.publish-dialog__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 18px 22px 14px;
  border-bottom: 1px solid #eef2f7;
}
.publish-dialog__head b {
  display: block;
  font-size: 16px;
  color: #0f172a;
}
.publish-dialog__head span {
  display: block;
  font-size: 12px;
  color: #94a3b8;
  margin-top: 3px;
}
.publish-dialog__close {
  border: 0;
  background: none;
  font-size: 20px;
  line-height: 1;
  color: #94a3b8;
  padding: 0 2px;
}
.publish-dialog__close:hover:not(:disabled) {
  color: #475569;
}
.publish-body {
  padding: 18px 22px 20px;
}
.publish-deck {
  display: flex;
  gap: 14px;
  padding: 12px;
  border: 1px solid #e8edf6;
  border-radius: 12px;
  background: #f8fbff;
}
.publish-deck__cover {
  width: 68px;
  height: 44px;
  border-radius: 8px;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: grid;
  place-items: center;
  letter-spacing: 0.08em;
  flex: none;
}
.publish-deck__meta {
  min-width: 0;
}
.publish-deck__meta b {
  display: block;
  font-size: 14px;
  color: #0f172a;
}
.publish-deck__meta span {
  display: block;
  font-size: 11.5px;
  color: #64748b;
  line-height: 1.6;
}
.publish-deck__hint {
  margin-top: 3px;
  color: #94a3b8 !important;
}
.publish-section-title {
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  margin: 16px 0 8px;
  letter-spacing: 0.02em;
}
.publish-classes {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.publish-class {
  display: flex;
  align-items: center;
  gap: 9px;
  border: 1px solid #e5e9f2;
  background: #fff;
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 13px;
  color: #1f2937;
  text-align: left;
}
.publish-class:hover {
  border-color: #bfdbfe;
  background: #f8fbff;
}
.publish-class.is-active {
  border-color: #2563eb;
  background: #eff4ff;
  color: #1d4ed8;
  font-weight: 600;
}
.publish-class__radio {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  border: 1.5px solid #cbd5e1;
  display: grid;
  place-items: center;
  flex: none;
}
.publish-class__radio i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: transparent;
}
.publish-class.is-active .publish-class__radio {
  border-color: #2563eb;
}
.publish-class.is-active .publish-class__radio i {
  background: #2563eb;
}
.publish-class__name {
  flex: 1;
}
.publish-class__tag {
  font-size: 10.5px;
  color: #64748b;
  background: #f1f5f9;
  border-radius: 999px;
  padding: 1px 7px;
  font-weight: 500;
}
.publish-version {
  margin-top: 14px;
  font-size: 12px;
  color: #475569;
  background: #f8fafc;
  border: 1px dashed #e2e8f0;
  border-radius: 9px;
  padding: 8px 11px;
}
.publish-version b {
  color: #2563eb;
}
.publish-version span {
  color: #94a3b8;
  margin-left: 4px;
}
.publish-error {
  margin-top: 10px;
  font-size: 12px;
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 8px 10px;
}
.publish-dialog__foot {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
  margin-top: 18px;
}
.pv-btn {
  height: 34px;
  padding: 0 16px;
  border-radius: 9px;
  border: 1px solid #dbe3ef;
  background: #fff;
  color: #334155;
  font-size: 13px;
  font-weight: 500;
}
.pv-btn:hover:not(:disabled) {
  border-color: #2563eb;
  color: #2563eb;
}
.pv-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.pv-btn--primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}
.pv-btn--primary:hover:not(:disabled) {
  background: #1d4ed8;
  border-color: #1d4ed8;
  color: #fff;
}
.publish-progress {
  display: flex;
  gap: 13px;
  align-items: center;
  padding: 12px;
  background: #f8fbff;
  border: 1px solid #e8edf6;
  border-radius: 12px;
}
.publish-spinner {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 3px solid #dbeafe;
  border-top-color: #2563eb;
  animation: pv-spin 0.8s linear infinite;
  flex: none;
}
@keyframes pv-spin {
  to {
    transform: rotate(360deg);
  }
}
.publish-progress b {
  display: block;
  font-size: 13.5px;
  color: #0f172a;
}
.publish-progress span {
  font-size: 11.5px;
  color: #94a3b8;
}
.publish-steps {
  list-style: none;
  margin: 16px 0 0;
  padding: 0 4px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.publish-steps li {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 12.5px;
  color: #94a3b8;
}
.publish-steps li.is-active {
  color: #1d4ed8;
  font-weight: 600;
}
.publish-steps li.is-done {
  color: #047857;
}
.publish-step__dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid #dbe3ef;
  display: grid;
  place-items: center;
  font-size: 11px;
  flex: none;
}
.publish-steps li.is-done .publish-step__dot {
  background: #ecfdf5;
  border-color: #a7f3d0;
}
.publish-steps li.is-active .publish-step__dot {
  border-color: #2563eb;
  color: #2563eb;
}
.publish-success {
  display: flex;
  gap: 13px;
  align-items: center;
  padding: 14px;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 12px;
}
.publish-success__icon {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #10b981;
  color: #fff;
  font-size: 20px;
  display: grid;
  place-items: center;
  flex: none;
}
.publish-success b {
  font-size: 15px;
  color: #065f46;
}
.publish-success p {
  margin: 2px 0 0;
  font-size: 12.5px;
  color: #047857;
}
.publish-result {
  margin-top: 12px;
  border: 1px solid #eef2f7;
  border-radius: 10px;
  overflow: hidden;
}
.publish-result__row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 12px;
  font-size: 12px;
  border-bottom: 1px solid #f1f5f9;
}
.publish-result__row:last-child {
  border-bottom: 0;
}
.publish-result__row span {
  color: #94a3b8;
}
.publish-result__row b {
  color: #1f2937;
  font-weight: 600;
}
.publish-result__id {
  font-family: 'Consolas', monospace;
  font-size: 11px;
  color: #64748b !important;
}
.publish-success__hint {
  margin-top: 10px;
  font-size: 11.5px;
  color: #047857;
  background: #f0fdf4;
  border-radius: 8px;
  padding: 7px 10px;
}
.publish-fail {
  display: flex;
  gap: 13px;
  align-items: center;
  padding: 14px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
}
.publish-fail__icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #dc2626;
  color: #fff;
  font-size: 19px;
  font-weight: 700;
  display: grid;
  place-items: center;
  flex: none;
}
.publish-fail b {
  font-size: 14.5px;
  color: #991b1b;
}
.publish-fail p {
  margin: 2px 0 0;
  font-size: 12.5px;
  color: #b91c1c;
}
.publish-fail__hint {
  margin-top: 10px;
  font-size: 11.5px;
  color: #94a3b8;
}
</style>
