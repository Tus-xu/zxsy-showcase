<template>
  <StudentThemeScope class="page library">
    <header class="lib-head">
      <div>
        <h1 class="page-title">知识库 <span class="ms-tag">个人资料</span></h1>
        <p class="page-sub">
          随包自撰短材料：入库后生成切片；提问时先选中资料，回答只引用材料原文，并可跳转定位到对应段落。
        </p>
      </div>
      <div class="lib-head__right">
        <span class="lib-badge-note">演示包内置 3 份自撰材料（非教材）</span>
      </div>
    </header>

    <!-- 统计 -->
    <section class="lib-stats">
      <div class="lib-stat ms-card">
        <span>资料总数</span>
        <b>{{ libraryMaterials.length }}</b>
      </div>
      <div class="lib-stat ms-card">
        <span>已入库 / 就绪</span>
        <b :class="{ 'is-ok': readyCount > 0 }">{{ readyCount }}<small>/{{ libraryMaterials.length }}</small></b>
      </div>
      <div class="lib-stat ms-card">
        <span>可检索切片</span>
        <b>{{ sliceCount }}</b>
      </div>
      <div class="lib-stat ms-card">
        <span>引用定位</span>
        <b>{{ citationCount }}</b>
      </div>
    </section>

    <!-- 筛选 -->
    <nav class="lib-tabs">
      <button
        v-for="tab in statusTabs"
        :key="tab.key"
        class="lib-tab"
        :class="{ active: ls.filter === tab.key }"
        :data-qa="`library-tab-${tab.key}`"
        @click="ls.filter = tab.key"
      >
        {{ tab.label }}<span>{{ tab.count }}</span>
      </button>
      <span class="lib-tabs__hint">入库 → 就绪 → 查看切片 → 选中资料提问 → 回答引用原文并可定位</span>
    </nav>

    <div class="lib-main">
      <!-- 左：资料列表 -->
      <aside class="lib-materials ms-card">
        <div class="lib-panel-head"><b>我的资料</b><span>{{ filteredMaterials.length }} 份</span></div>
        <div class="lib-mat-list">
          <button
            v-for="m in filteredMaterials"
            :key="m.id"
            class="lib-mat"
            :class="{ active: ls.selectedId === m.id }"
            :data-qa="`library-material-${m.id}`"
            @click="selectMaterial(m.id)"
          >
            <div class="lib-mat__head">
              <span class="lib-mat__title">{{ m.title }}</span>
              <span class="lib-mat__status" :class="statusOf(m.id) === 'ready' ? 'is-ready' : 'is-new'">
                {{ statusOf(m.id) === 'ready' ? '已就绪' : '未入库' }}
              </span>
            </div>
            <div class="lib-mat__meta">
              <span class="ms-tag ms-tag--gray">{{ m.category }}</span>
              <template v-if="statusOf(m.id) === 'ready'">
                <span>{{ m.slices.length }} 切片</span>
                <span>·</span>
                <span>{{ m.paragraphs.length }} 段</span>
              </template>
              <template v-else>
                <span>{{ m.paragraphs.length }} 段 · 待解析</span>
              </template>
            </div>
            <div class="lib-mat__actions" @click.stop>
              <button
                v-if="statusOf(m.id) !== 'ready'"
                class="ms-btn ms-btn--sm ms-btn--primary"
                :data-qa="`library-ingest-${m.id}`"
                @click="ingest(m.id)"
              >
                入库
              </button>
              <button
                v-else
                class="ms-btn ms-btn--sm"
                :data-qa="`library-slices-${m.id}`"
                @click="viewSlices(m.id)"
              >
                查看切片
              </button>
            </div>
          </button>
          <p v-if="!filteredMaterials.length" class="lib-mat-empty">
            {{ ls.filter === 'new' ? '所有资料都已入库。' : '当前筛选下没有资料。' }}
          </p>
        </div>
      </aside>

      <!-- 中：资料原文 / 切片 -->
      <section class="lib-reader ms-card">
        <template v-if="selectedMaterial">
          <div class="lib-panel-head">
            <div class="lib-panel-head__title">
              <b>{{ selectedMaterial.title }}</b>
              <span class="ms-tag ms-tag--gray">{{ selectedMaterial.source }}</span>
            </div>
            <span class="lib-reader__status" :class="selectedReady ? 'is-ready' : 'is-new'">
              {{ selectedReady ? `已就绪 · ${selectedMaterial.slices.length} 切片` : '未入库' }}
            </span>
          </div>

          <div v-if="!selectedReady" class="lib-ingest-cta" data-qa="library-ingest-cta">
            <b>这份资料还没有入库</b>
            <p>入库会在本地把材料切成可检索的切片（不联网、不上传）。入库后可以查看切片、选中提问并按原文定位。</p>
            <button class="ms-btn ms-btn--primary" :data-qa="`library-ingest-cta-${selectedMaterial.id}`" @click="ingest(selectedMaterial.id)">
              入库并生成切片
            </button>
          </div>

          <template v-else>
            <div class="lib-reader__tabs">
              <button
                class="lib-reader__tab"
                :class="{ active: ls.detailTab === 'text' }"
                data-qa="library-tab-text"
                @click="ls.detailTab = 'text'"
              >
                原文
              </button>
              <button
                class="lib-reader__tab"
                :class="{ active: ls.detailTab === 'slices' }"
                data-qa="library-tab-slices"
                @click="ls.detailTab = 'slices'"
              >
                切片（{{ selectedMaterial.slices.length }}）
              </button>
              <span class="lib-reader__hint">{{ selectedMaterial.summary }}</span>
            </div>

            <div v-if="ls.detailTab === 'text'" class="lib-paras ms-scroll" ref="readerEl">
              <article
                v-for="(p, i) in selectedMaterial.paragraphs"
                :id="paraDomId(selectedMaterial.id, p.id)"
                :key="p.id"
                class="lib-para"
                :class="{ 'is-hit': isHighlight(selectedMaterial.id, p.id) }"
              >
                <div class="lib-para__head">
                  <span class="lib-para__idx">§{{ i + 1 }}</span>
                  <b>{{ p.heading }}</b>
                  <span class="lib-para__id">{{ p.id }}</span>
                  <button
                    class="lib-para__ask"
                    :data-qa="`library-ask-para-${p.id}`"
                    @click="askAboutParagraph(p)"
                  >
                    就这段提问
                  </button>
                </div>
                <p class="lib-para__text" :data-qa="`library-para-text-${p.id}`">{{ p.text }}</p>
              </article>
            </div>

            <div v-else class="lib-slices ms-scroll">
              <button
                v-for="s in selectedMaterial.slices"
                :key="s.id"
                class="lib-slice"
                :data-qa="`library-slice-${s.id}`"
                @click="jumpToParagraph(selectedMaterial.id, s.paragraphId)"
              >
                <div class="lib-slice__head">
                  <span class="lib-slice__id">{{ s.id }}</span>
                  <span>对应段落 {{ s.paragraphId }}</span>
                  <span>{{ s.chars }} 字</span>
                </div>
                <p>{{ s.text }}</p>
              </button>
            </div>
          </template>
        </template>
        <div v-else class="lib-reader__empty">
          从左侧选择一份资料；未入库的资料会显示入库入口。
        </div>
      </section>

      <!-- 右：提问 -->
      <section class="lib-ask ms-card">
        <div class="lib-panel-head">
          <b>提问</b>
          <button v-if="ls.chat.length" class="lib-ask__clear" data-qa="library-clear" @click="clearChat">清空对话</button>
        </div>

        <div class="lib-ask__target" data-qa="library-selected-material">
          <span>当前资料</span>
          <b v-if="selectedMaterial">{{ selectedMaterial.title }}</b>
          <b v-else class="is-muted">未选择</b>
          <span v-if="selectedMaterial" class="lib-ask__target-status" :class="selectedReady ? 'is-ready' : 'is-new'">
            {{ selectedReady ? '可引用' : '未入库' }}
          </span>
        </div>

        <div class="lib-chat ms-scroll" ref="chatEl">
          <div v-if="!ls.chat.length" class="lib-chat__empty" data-qa="library-chat-empty">
            选中一份已入库资料后提问。回答只引用材料原文，点引用可跳转定位；资料中没有依据时会明确提示“未在资料中找到”。
          </div>
          <div
            v-for="(m, i) in ls.chat"
            :key="i"
            class="lib-msg"
            :class="m.role === 'student' ? 'lib-msg--student' : 'lib-msg--ai'"
          >
            <div v-if="m.role === 'ai'" class="lib-msg__avatar">📚</div>
            <div class="lib-msg__bubble">
              <template v-if="m.role === 'ai'">
                <div v-if="m.kind === 'not-found'" class="lib-msg__notfound" data-qa="library-notfound">
                  <b>{{ m.text }}</b>
                  <span>可以试试这些本资料收录的问法：</span>
                  <button
                    v-for="(s, si) in m.suggestions || []"
                    :key="si"
                    class="lib-msg__suggest"
                    @click="askQuestion(s)"
                  >
                    {{ s }}
                  </button>
                </div>
                <template v-else>
                  <div class="lib-msg__answer" data-qa="library-answer"><MathText :text="m.text" block /></div>
                  <div v-if="m.citations && m.citations.length" class="lib-msg__cites">
                    <span class="lib-msg__cites-label">原文引用</span>
                    <button
                      v-for="(c, ci) in m.citations"
                      :key="ci"
                      class="lib-cite"
                      :data-qa="`library-cite-${ci}`"
                      @click="jumpToCitation(c)"
                    >
                      <span class="lib-cite__loc">{{ c.paragraphHeading }} · {{ c.paragraphId }}</span>
                      <span class="lib-cite__quote">“{{ c.quote }}”</span>
                      <span class="lib-cite__go">定位原文 ›</span>
                    </button>
                  </div>
                  <div v-else class="lib-msg__nocite">（该问题未返回可定位的引用）</div>
                </template>
              </template>
              <template v-else>{{ m.text }}</template>
              <div class="lib-msg__time">{{ formatTime(m.at) }}</div>
            </div>
          </div>
        </div>

        <div class="lib-ask__suggest">
          <span>试试这样问</span>
          <div class="lib-ask__chips">
            <button
              v-for="(q, qi) in suggestedQuestions"
              :key="qi"
              class="lib-chip"
              :data-qa="`library-suggest-${qi}`"
              :disabled="!selectedReady"
              @click="askQuestion(q)"
            >
              {{ q }}
            </button>
          </div>
        </div>

        <div class="lib-ask__composer">
          <input
            v-model="draft"
            class="lib-input"
            :placeholder="selectedReady ? '就选中的资料提问…' : '请先把选中的资料入库'"
            :disabled="!selectedReady"
            data-qa="library-input"
            @keydown.enter.prevent="ask"
          />
          <button class="ms-btn ms-btn--primary" :disabled="!selectedReady || !draft.trim()" data-qa="library-send" @click="ask">
            提问
          </button>
        </div>
      </section>
    </div>
  </StudentThemeScope>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import MathText from '../../components/MathText.vue'
import StudentThemeScope from '../../components/student/StudentThemeScope.vue'
import { answerLibraryQuestion, findMaterial, libraryMaterials } from '../../data/library'
import { store } from '../../state/demo'

/* ---------------- 持久化状态 ---------------- */
function ensureLibraryExt() {
  if (!store.ext.studentLibrary || typeof store.ext.studentLibrary !== 'object') {
    store.ext.studentLibrary = { materials: {}, selectedId: null, detailTab: 'text', chat: [], highlight: null, filter: 'all' }
  }
  const s = store.ext.studentLibrary
  if (!s.materials || typeof s.materials !== 'object') s.materials = {}
  if (!Array.isArray(s.chat)) s.chat = []
  if (!['all', 'new', 'ready'].includes(s.filter)) s.filter = 'all'
  if (!['text', 'slices'].includes(s.detailTab)) s.detailTab = 'text'
  if (s.selectedId && !findMaterial(s.selectedId)) s.selectedId = null
  return s
}
const ls = ensureLibraryExt()

const draft = ref('')
const chatEl = ref(null)
const readerEl = ref(null)

/* ---------------- 状态派生 ---------------- */
function statusOf(materialId) {
  return ls.materials[materialId] && ls.materials[materialId].status === 'ready' ? 'ready' : 'new'
}
const readyCount = computed(() => libraryMaterials.filter((m) => statusOf(m.id) === 'ready').length)
const sliceCount = computed(() =>
  libraryMaterials.reduce((sum, m) => sum + (statusOf(m.id) === 'ready' ? m.slices.length : 0), 0),
)
const citationCount = computed(() =>
  ls.chat.reduce((sum, m) => sum + (m.role === 'ai' && Array.isArray(m.citations) ? m.citations.length : 0), 0),
)
const statusTabs = computed(() => [
  { key: 'all', label: '全部资料', count: libraryMaterials.length },
  { key: 'new', label: '未入库', count: libraryMaterials.filter((m) => statusOf(m.id) === 'new').length },
  { key: 'ready', label: '已就绪', count: readyCount.value },
])
const filteredMaterials = computed(() => {
  if (ls.filter === 'new') return libraryMaterials.filter((m) => statusOf(m.id) === 'new')
  if (ls.filter === 'ready') return libraryMaterials.filter((m) => statusOf(m.id) === 'ready')
  return libraryMaterials
})
const selectedMaterial = computed(() => (ls.selectedId ? findMaterial(ls.selectedId) : null))
const selectedReady = computed(() => !!selectedMaterial.value && statusOf(selectedMaterial.value.id) === 'ready')
const suggestedQuestions = computed(() => (selectedMaterial.value ? selectedMaterial.value.suggestedQuestions : []))

/* ---------------- 交互 ---------------- */
function selectMaterial(materialId) {
  ls.selectedId = materialId
  ls.detailTab = 'text'
  nextTick(() => {
    if (readerEl.value) readerEl.value.scrollTop = 0
  })
}

function ingest(materialId) {
  const material = findMaterial(materialId)
  if (!material) return
  ls.materials[materialId] = { status: 'ready', readyAt: Date.now() }
  ls.selectedId = materialId
  ls.detailTab = 'text'
  ls.highlight = null
  const slices = material.slices.length
  ls.chat.push({
    role: 'ai',
    kind: 'system',
    text: `已把《${material.title}》入库：本地解析出 ${slices} 个切片、共 ${material.paragraphs.length} 段。你可以查看切片，或就这份资料提问。`,
    at: Date.now(),
  })
}

function viewSlices(materialId) {
  ls.selectedId = materialId
  if (statusOf(materialId) !== 'ready') return
  ls.detailTab = 'slices'
}

function clearChat() {
  ls.chat = []
  ls.highlight = null
}

function ask() {
  const q = draft.value.trim()
  if (!q) return
  askQuestion(q)
  draft.value = ''
}

function askQuestion(question) {
  const material = selectedMaterial.value
  if (!material) {
    ls.chat.push({ role: 'ai', kind: 'system', text: '请先在左侧选择一份资料，再提问。', at: Date.now() })
    scrollChat()
    return
  }
  if (!selectedReady.value) {
    ls.chat.push({
      role: 'ai',
      kind: 'system',
      text: `《${material.title}》还没有入库，入库后才能检索并引用原文。`,
      at: Date.now(),
    })
    scrollChat()
    return
  }
  ls.chat.push({ role: 'student', text: question, at: Date.now() })
  const res = answerLibraryQuestion(material, question)
  if (res.found) {
    ls.chat.push({
      role: 'ai',
      kind: res.kind,
      text: res.answer,
      citations: res.citations,
      at: Date.now(),
    })
  } else {
    ls.chat.push({
      role: 'ai',
      kind: 'not-found',
      text: res.message || '未在资料中找到可引用的段落。',
      suggestions: res.suggestions || [],
      at: Date.now(),
    })
  }
  draft.value = ''
  scrollChat()
}

function askAboutParagraph(p) {
  const material = selectedMaterial.value
  if (!material || !selectedReady.value) return
  const slice = material.slices.find((s) => s.paragraphId === p.id)
  ls.chat.push({ role: 'student', text: `请定位「${p.heading}」这一段`, at: Date.now() })
  ls.chat.push({
    role: 'ai',
    kind: 'paragraph',
    text: `这一段是本资料第 ${material.paragraphs.findIndex((x) => x.id === p.id) + 1} 段，原文如下。需要结论时请以原文为准，可点下面的引用在原文中定位。`,
    citations: [
      {
        materialId: material.id,
        materialTitle: material.title,
        paragraphId: p.id,
        paragraphHeading: p.heading,
        sliceId: slice ? slice.id : null,
        quote: p.text,
      },
    ],
    at: Date.now(),
  })
  scrollChat()
}

function scrollChat() {
  nextTick(() => {
    if (chatEl.value) chatEl.value.scrollTop = chatEl.value.scrollHeight
  })
}

/* ---------------- 原文定位跳转 ---------------- */
function paraDomId(materialId, paragraphId) {
  return `lib-para-${materialId}-${paragraphId}`
}
function isHighlight(materialId, paragraphId) {
  return !!ls.highlight && ls.highlight.materialId === materialId && ls.highlight.paragraphId === paragraphId
}

function jumpToCitation(citation) {
  if (!citation) return
  iterateMaterial(citation.materialId, citation.paragraphId)
}
function jumpToParagraph(materialId, paragraphId) {
  iterateMaterial(materialId, paragraphId)
}
function iterateMaterial(materialId, paragraphId) {
  const material = findMaterial(materialId)
  if (!material) return
  ls.selectedId = materialId
  ls.detailTab = 'text'
  ls.highlight = { materialId, paragraphId, at: Date.now() }
  nextTick(() => {
    if (readerEl.value) {
      const el = document.getElementById(paraDomId(materialId, paragraphId))
      if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  })
}

/* ---------------- 展示辅助 ---------------- */
function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
.page.library {
  padding: 22px 26px 30px;
}
.lib-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 12px;
}
.lib-head .page-title {
  margin-bottom: 2px;
}
.lib-head .page-sub {
  margin-bottom: 0;
  font-size: 13px;
  max-width: 900px;
  color: var(--ink2);
}
.lib-badge-note {
  font-size: 11.5px;
  color: var(--ink3);
  padding: 6px 12px;
  border-radius: 99px;
  border: 1px dashed var(--line);
  background: var(--card);
}
.lib-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}
.lib-stat {
  padding: 10px 16px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.lib-stat span {
  font-size: 11.5px;
  color: var(--ink3);
}
.lib-stat b {
  font-size: 22px;
  font-family: var(--font-num, inherit);
  color: var(--ink);
}
.lib-stat b.is-ok {
  color: var(--ok-deep);
}
.lib-stat b small {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--ink3);
}
.lib-tabs {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.lib-tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 13px;
  border-radius: 99px;
  border: 1px solid var(--line);
  background: var(--card);
  font-size: 12.5px;
  color: var(--ink2);
}
.lib-tab span {
  font-size: 10.8px;
  min-width: 17px;
  text-align: center;
  padding: 0 5px;
  border-radius: 99px;
  background: var(--bg2);
  color: var(--ink2);
}
.lib-tab.active {
  border-color: var(--brand);
  background: var(--brand-soft);
  color: var(--brand-deep);
  font-weight: 700;
}
.lib-tab.active span {
  background: var(--brand);
  color: #fff;
}
.lib-tabs__hint {
  margin-left: auto;
  font-size: 11.3px;
  color: var(--ink3);
}
.lib-main {
  display: grid;
  grid-template-columns: 292px minmax(0, 1fr) 384px;
  gap: 12px;
  align-items: start;
}
.lib-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 9px;
  margin-bottom: 10px;
  border-bottom: 1px solid var(--line2, var(--line));
}
.lib-panel-head b {
  font-size: 13.5px;
}
.lib-panel-head > span {
  font-size: 11px;
  color: var(--ink3);
}
.lib-panel-head__title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}
.lib-materials {
  padding: 14px 13px;
  max-height: calc(100vh - 258px);
  overflow-y: auto;
}
.lib-mat-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.lib-mat {
  text-align: left;
  border: 1px solid var(--line);
  background: var(--card);
  border-radius: 11px;
  padding: 10px 11px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: all 0.15s ease;
}
.lib-mat:hover {
  border-color: var(--brand);
}
.lib-mat.active {
  border-color: var(--brand);
  background: var(--brand-soft);
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
}
.lib-mat__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.lib-mat__title {
  font-size: 13.2px;
  font-weight: 700;
  color: var(--ink);
  line-height: 1.45;
}
.lib-mat__status {
  flex: none;
  font-size: 10.5px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 99px;
}
.lib-mat__status.is-ready {
  background: var(--ok-bg);
  color: var(--ok-deep);
}
.lib-mat__status.is-new {
  background: var(--bg2);
  color: var(--ink3);
}
.lib-mat__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10.8px;
  color: var(--ink3);
  flex-wrap: wrap;
}
.lib-mat__actions {
  display: flex;
  justify-content: flex-end;
}
.lib-mat-empty {
  font-size: 12px;
  color: var(--ink3);
  margin: 8px 0;
}
.lib-reader {
  padding: 14px 16px;
  max-height: calc(100vh - 258px);
  display: flex;
  flex-direction: column;
  min-height: 420px;
}
.lib-reader .lib-panel-head {
  flex: none;
}
.lib-reader__status {
  flex: none;
  font-size: 10.8px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 99px;
}
.lib-reader__status.is-ready {
  background: var(--ok-bg);
  color: var(--ok-deep);
}
.lib-reader__status.is-new {
  background: var(--bg2);
  color: var(--ink3);
}
.lib-ingest-cta {
  margin: 18px 4px;
  padding: 18px 18px;
  border: 1px dashed var(--line);
  border-radius: 13px;
  background: var(--bg2);
}
.lib-ingest-cta b {
  font-size: 14.5px;
}
.lib-ingest-cta p {
  margin: 7px 0 12px;
  font-size: 12.5px;
  color: var(--ink2);
  line-height: 1.8;
  max-width: 560px;
}
.lib-reader__tabs {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 9px;
  flex-wrap: wrap;
}
.lib-reader__tab {
  border: 1px solid var(--line);
  background: var(--card);
  border-radius: 8px;
  padding: 5px 11px;
  font-size: 12px;
  color: var(--ink2);
}
.lib-reader__tab.active {
  border-color: var(--brand);
  background: var(--brand-soft);
  color: var(--brand-deep);
  font-weight: 700;
}
.lib-reader__hint {
  font-size: 10.8px;
  color: var(--ink3);
  line-height: 1.6;
  flex: 1;
  min-width: 120px;
}
.lib-paras {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
  display: flex;
  flex-direction: column;
  gap: 11px;
}
.lib-para {
  border: 1px solid var(--line);
  border-radius: 11px;
  padding: 11px 13px;
  background: var(--card);
  transition: all 0.2s ease;
}
.lib-para.is-hit {
  border-color: var(--brand);
  background: var(--brand-soft);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.14);
  animation: libHit 1.2s ease;
}
@keyframes libHit {
  0% {
    transform: translateY(-2px);
  }
  100% {
    transform: translateY(0);
  }
}
.lib-para__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}
.lib-para__idx {
  font-size: 10.8px;
  font-weight: 800;
  color: var(--brand-deep);
  background: var(--brand-soft);
  border-radius: 5px;
  padding: 1px 6px;
}
.lib-para__head b {
  font-size: 12.8px;
}
.lib-para__id {
  font-size: 10.5px;
  color: var(--ink3);
  font-family: 'SF Mono', Consolas, monospace;
}
.lib-para__ask {
  margin-left: auto;
  border: 1px dashed var(--line);
  background: transparent;
  border-radius: 7px;
  padding: 3px 9px;
  font-size: 11px;
  color: var(--ink3);
}
.lib-para__ask:hover {
  color: var(--brand-deep);
  border-color: var(--brand);
}
.lib-para__text {
  margin: 0;
  font-size: var(--st-read, 13.5px);
  line-height: 1.95;
  color: var(--ink2);
}
.lib-slices {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 4px;
}
.lib-slice {
  text-align: left;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--card);
  padding: 9px 11px;
}
.lib-slice:hover {
  border-color: var(--brand);
}
.lib-slice__head {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 10.6px;
  color: var(--ink3);
  margin-bottom: 4px;
}
.lib-slice__id {
  font-family: 'SF Mono', Consolas, monospace;
  color: var(--brand-deep);
  background: var(--brand-soft);
  border-radius: 5px;
  padding: 1px 6px;
  font-size: 10.4px;
}
.lib-slice p {
  margin: 0;
  font-size: 12.3px;
  line-height: 1.8;
  color: var(--ink2);
}
.lib-reader__empty {
  padding: 60px 20px;
  text-align: center;
  font-size: 12.5px;
  color: var(--ink3);
}
.lib-ask {
  padding: 14px 15px;
  max-height: calc(100vh - 258px);
  display: flex;
  flex-direction: column;
  min-height: 420px;
}
.lib-ask__clear {
  border: 0;
  background: none;
  color: var(--ink3);
  font-size: 11.5px;
}
.lib-ask__clear:hover {
  color: var(--err);
}
.lib-ask__target {
  flex: none;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 10px;
  border-radius: 9px;
  background: var(--bg2);
  border: 1px solid var(--line2, var(--line));
  font-size: 11.5px;
  color: var(--ink3);
  margin-bottom: 9px;
  flex-wrap: wrap;
}
.lib-ask__target b {
  font-size: 12.5px;
  color: var(--ink);
}
.lib-ask__target b.is-muted {
  color: var(--ink3);
  font-weight: 500;
}
.lib-ask__target-status {
  margin-left: auto;
  font-size: 10.5px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 99px;
}
.lib-ask__target-status.is-ready {
  background: var(--ok-bg);
  color: var(--ok-deep);
}
.lib-ask__target-status.is-new {
  background: var(--warn-bg);
  color: var(--warn-deep);
}
.lib-chat {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 2px 2px 8px;
}
.lib-chat__empty {
  font-size: 11.8px;
  line-height: 1.85;
  color: var(--ink3);
  padding: 14px;
  border: 1px dashed var(--line);
  border-radius: 10px;
  background: var(--bg2);
}
.lib-msg {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.lib-msg--student {
  justify-content: flex-end;
}
.lib-msg__avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--brand-soft);
  display: grid;
  place-items: center;
  font-size: 13px;
  flex: none;
}
.lib-msg__bubble {
  max-width: 92%;
  border: 1px solid var(--line);
  background: var(--card);
  border-radius: 12px;
  padding: 8px 11px;
  font-size: 12.5px;
  line-height: 1.8;
  color: var(--ink2);
}
.lib-msg--student .lib-msg__bubble {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
}
.lib-msg__time {
  margin-top: 3px;
  font-size: 10px;
  opacity: 0.6;
}
.lib-msg__answer {
  font-size: var(--st-read, 12.8px);
}
.lib-msg__cites {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.lib-msg__cites-label {
  font-size: 10.5px;
  color: var(--ink3);
  letter-spacing: 0.04em;
}
.lib-cite {
  text-align: left;
  border: 1px dashed var(--brand);
  border-radius: 9px;
  background: var(--brand-soft);
  padding: 7px 9px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.lib-cite:hover {
  background: var(--brand-faint);
}
.lib-cite__loc {
  font-size: 10.8px;
  font-weight: 700;
  color: var(--brand-deep);
}
.lib-cite__quote {
  font-size: 11.6px;
  color: var(--ink2);
  line-height: 1.65;
}
.lib-cite__go {
  font-size: 10.5px;
  color: var(--brand-deep);
  text-align: right;
}
.lib-msg__nocite {
  margin-top: 6px;
  font-size: 10.8px;
  color: var(--ink3);
}
.lib-msg__notfound {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--err-deep);
}
.lib-msg__notfound b {
  font-size: 12.8px;
}
.lib-msg__notfound span {
  font-size: 11px;
  color: var(--ink3);
}
.lib-msg__suggest {
  text-align: left;
  border: 1px solid var(--line);
  background: var(--card);
  border-radius: 8px;
  padding: 5px 9px;
  font-size: 11.5px;
  color: var(--ink2);
}
.lib-msg__suggest:hover {
  border-color: var(--brand);
  color: var(--brand-deep);
}
.lib-ask__suggest {
  flex: none;
  padding: 8px 0 4px;
  border-top: 1px dashed var(--line);
}
.lib-ask__suggest > span {
  font-size: 10.8px;
  color: var(--ink3);
}
.lib-ask__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 5px;
}
.lib-chip {
  border: 1px solid var(--line);
  background: var(--bg2);
  border-radius: 99px;
  padding: 4px 10px;
  font-size: 11.2px;
  color: var(--ink2);
}
.lib-chip:hover:not(:disabled) {
  border-color: var(--brand);
  color: var(--brand-deep);
}
.lib-chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.lib-ask__composer {
  flex: none;
  display: flex;
  gap: 8px;
  margin-top: 6px;
}
.lib-input {
  flex: 1;
  height: 36px;
  border: 1px solid var(--line);
  border-radius: 9px;
  padding: 0 11px;
  font-size: 12.8px;
  font-family: inherit;
  background: var(--card);
  color: var(--ink);
  outline: none;
}
.lib-input:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
}
.lib-input:disabled {
  background: var(--bg2);
}
</style>
