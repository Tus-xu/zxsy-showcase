<template>
  <section class="self-panel ms-card" data-test="self-class-panel">
    <header class="self-panel__head">
      <div class="self-panel__icon">🎬</div>
      <div class="self-panel__title">
        <h3>AI 双师课堂</h3>
        <p>输入想学的知识点，AI 主讲逐页讲解；也可以上传我的材料，生成针对性课堂。</p>
      </div>
    </header>

    <div class="self-panel__input-row">
      <input
        v-model="topicInput"
        class="self-panel__input"
        data-test="self-topic-input"
        type="text"
        placeholder="输入想学的知识点，例如：椭圆的标准方程"
        @keyup.enter="startByTopic"
      />
      <button type="button" class="ms-btn ms-btn--primary" data-test="self-topic-enter" @click="startByTopic">进入课堂 →</button>
    </div>
    <p v-if="hint" class="self-panel__hint" :class="{ 'is-err': hintErr }" data-test="self-topic-hint">{{ hint }}</p>

    <div class="self-panel__section-label">自主课题 · 3 个 + 我上传的材料</div>
    <div class="self-panel__topics">
      <button
        v-for="t in topics"
        :key="t.id"
        type="button"
        class="self-topic"
        :class="{ 'self-topic--material': t.kind === 'material' }"
        :data-test="`self-topic-${t.id}`"
        @click="$emit('open', t)"
      >
        <span class="self-topic__icon">{{ t.icon }}</span>
        <span class="self-topic__main">
          <b>{{ t.title }}</b>
          <small>{{ t.kicker }} · {{ t.duration }}</small>
        </span>
        <span class="self-topic__go">›</span>
      </button>
    </div>

    <div class="self-panel__upload">
      <input
        ref="fileInput"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style="display: none"
        data-test="material-upload-input"
        @change="onFile"
      />
      <button type="button" class="ms-btn" :disabled="busy" @click="fileInput.click()">
        📷 {{ busy ? '识别中…' : '上传材料，生成课堂' }}
      </button>
      <button type="button" class="ms-btn ms-btn--ghost" @click="$emit('open', materialTopic)">使用演示材料 →</button>
      <span class="self-panel__upload-hint">
        按文件内容哈希匹配演示材料（题 2 原图），改名也能识别
      </span>
    </div>

    <div v-if="upload" class="self-panel__recent" data-test="material-recognized">
      <span class="self-panel__recent-tag">已上传</span>
      <span class="self-panel__recent-name">📎 {{ upload.fileName }}</span>
      <span class="self-panel__recent-note">已识别为「正三棱柱线面关系」材料</span>
      <button type="button" class="self-panel__recent-btn" @click="$emit('open', materialTopic)">进入材料课堂 →</button>
    </div>
    <p v-if="uploadMsg" class="self-panel__upload-msg" :class="{ 'is-err': uploadMsgErr }" data-test="material-upload-msg">{{ uploadMsg }}</p>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { selfClassTopics, materialSource } from '../../../data/classroom'
import { sha256File } from '../../../lib/sha256'
import { materialUpload, setMaterialUpload } from './progress'

const emit = defineEmits(['open'])

const topics = selfClassTopics
const materialTopic = topics.find((t) => t.kind === 'material')
const topicInput = ref('')
const hint = ref('')
const hintErr = ref(false)
const fileInput = ref(null)
const busy = ref(false)
const uploadMsg = ref('')
const uploadMsgErr = ref(false)
const upload = computed(() => materialUpload())

const TOPIC_KEYS = {
  'self-ellipse': ['椭圆', '离心率', '标准方程', '圆锥曲线', '焦点'],
  'self-quadratic': ['二次函数', '配方', '顶点', '抛物线', '最值'],
  'self-set': ['集合', '子集', '真子集', '集合的关系', '空集'],
  'self-material': ['材料', '三棱柱', '线面', '上传', '第9题', '第 9 题'],
}

function startByTopic() {
  const raw = topicInput.value.trim()
  if (!raw) {
    hint.value = '先输入一个知识点，或直接选择下方课题。'
    hintErr.value = true
    return
  }
  const n = raw.replace(/\s+/g, '')
  const matched = topics.find((t) => (TOPIC_KEYS[t.id] || []).some((k) => n.includes(k.replace(/\s+/g, ''))))
  if (!matched) {
    hint.value = '这个知识点没有收录进本次离线演示（内置 3 个课题 + 1 个上传材料课堂）。请从下方选择，或换一个说法。'
    hintErr.value = true
    return
  }
  topicInput.value = ''
  hint.value = `已匹配到「${matched.title}」，正在进入…`
  hintErr.value = false
  emit('open', matched)
}

async function onFile(e) {
  const file = e.target.files && e.target.files[0]
  if (e.target) e.target.value = ''
  if (!file) return
  uploadMsg.value = ''
  uploadMsgErr.value = false
  busy.value = true
  try {
    const hash = await sha256File(file)
    if (String(hash).toLowerCase() !== String(materialSource.sha256).toLowerCase()) {
      uploadMsg.value = '这份材料不在本次演示的素材清单中（按内容哈希匹配）。可以点“使用演示材料”直接进入材料课堂。'
      uploadMsgErr.value = true
      return
    }
    setMaterialUpload({ fileName: file.name, hash, at: Date.now() })
    uploadMsg.value = `已识别为我上传的材料（${file.name}）`
    uploadMsgErr.value = false
    emit('open', materialTopic)
  } catch {
    uploadMsg.value = '读取文件失败，请重试。'
    uploadMsgErr.value = true
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.self-panel {
  padding: 18px 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.self-panel__head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.self-panel__icon {
  width: 42px;
  height: 42px;
  border-radius: 13px;
  background: linear-gradient(135deg, #eef2ff, #ecfeff);
  border: 1px solid #dfe5ff;
  display: grid;
  place-items: center;
  font-size: 20px;
  flex: none;
}
.self-panel__title h3 {
  margin: 0 0 2px;
  font-size: 15.5px;
  font-weight: 800;
}
.self-panel__title p {
  margin: 0;
  font-size: 12px;
  color: var(--ink3, #94a3b8);
  line-height: 1.65;
}
.self-panel__input-row {
  display: flex;
  gap: 9px;
}
.self-panel__input {
  flex: 1;
  min-width: 0;
  height: 38px;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 10px;
  padding: 0 13px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  color: var(--ink, #0f172a);
  background: #fff;
}
.self-panel__input:focus {
  border-color: var(--brand, #4f46e5);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
}
.self-panel__hint {
  margin: -4px 0 0;
  font-size: 11.5px;
  color: var(--brand-deep, #4338ca);
}
.self-panel__hint.is-err {
  color: #b45309;
}
.self-panel__section-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--ink3, #94a3b8);
}
.self-panel__topics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.self-topic {
  display: flex;
  align-items: center;
  gap: 9px;
  text-align: left;
  padding: 9px 11px;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 11px;
  background: #fff;
  font-family: inherit;
  transition: all 0.16s ease;
}
.self-topic:hover {
  border-color: var(--brand, #4f46e5);
  background: #fafbff;
}
.self-topic--material {
  grid-column: span 2;
  border-style: dashed;
  background: #fcfdff;
}
.self-topic__icon {
  width: 28px;
  height: 28px;
  border-radius: 9px;
  background: var(--bg2, #f1f5f9);
  display: grid;
  place-items: center;
  font-size: 15px;
  flex: none;
}
.self-topic__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}
.self-topic__main b {
  font-size: 12.5px;
  color: var(--ink, #0f172a);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.self-topic__main small {
  font-size: 10.5px;
  color: var(--ink3, #94a3b8);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.self-topic__go {
  color: var(--ink3, #94a3b8);
  font-size: 16px;
  flex: none;
}
.self-panel__upload {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-wrap: wrap;
  padding-top: 10px;
  border-top: 1px dashed var(--line, #e2e8f0);
}
.self-panel__upload-hint {
  font-size: 10.5px;
  color: var(--ink3, #94a3b8);
}
.self-panel__recent {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 11px;
  border-radius: 10px;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  font-size: 11.5px;
  color: var(--ink2, #334155);
  flex-wrap: wrap;
}
.self-panel__recent-tag {
  font-weight: 700;
  color: var(--ok-deep, #047857);
  background: #fff;
  border-radius: 5px;
  padding: 1px 6px;
}
.self-panel__recent-name {
  font-weight: 700;
}
.self-panel__recent-note {
  color: var(--ok-deep, #047857);
}
.self-panel__recent-btn {
  margin-left: auto;
  border: 0;
  background: none;
  color: var(--brand-deep, #4338ca);
  font-size: 11.5px;
  font-weight: 700;
  font-family: inherit;
}
.self-panel__upload-msg {
  margin: 0;
  font-size: 11.5px;
  color: var(--ok-deep, #047857);
}
.self-panel__upload-msg.is-err {
  color: #b91c1c;
}
</style>
