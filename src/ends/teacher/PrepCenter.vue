<template>
  <div class="prep-center" data-testid="prep-center">
    <div class="prep-center__inner">
      <header class="prep-center__head">
        <div>
          <h1 class="prep-center__title">备课中心</h1>
          <p class="prep-center__sub">AI 助力，让备课更高效 · 离线演示收录 3 个课时（内容依据已复核教学蓝图）</p>
        </div>
        <div class="prep-center__head-actions">
          <button class="pc-btn" type="button" @click="router.push('/teacher/resources')">教学资源库</button>
          <button class="pc-btn" type="button" @click="goHistory">最近使用</button>
          <button class="pc-btn pc-btn--primary" type="button" data-testid="prep-new-btn" @click="openNewDialog">＋ 新建备课</button>
        </div>
      </header>

      <!-- 自然语言备课输入（真实创建会话；只支持演示收录的三节课） -->
      <section class="nl-bar" :class="{ 'is-focused': nlFocused }">
        <div class="nl-bar__row">
          <div class="nl-class">
            <button class="nl-class__btn" type="button" data-testid="class-picker" @click.stop="classMenu = !classMenu">
              {{ selectedClass }}
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="m4 6 4 4 4-4" /></svg>
            </button>
            <div v-if="classMenu" class="nl-class__menu" @click.stop>
              <button
                v-for="c in PUBLISH_CLASSES"
                :key="c"
                type="button"
                :class="{ 'is-active': c === selectedClass }"
                @click="pickClass(c)"
              >
                {{ c }}
              </button>
            </div>
          </div>
          <input
            v-model="nlText"
            class="nl-bar__input"
            data-testid="prep-nl-input"
            placeholder="告诉 AI 你今天要准备什么课…（试试：椭圆第一课时 / 二次函数配方 / 集合关系）"
            @focus="nlFocused = true"
            @blur="nlFocused = false"
            @keyup.enter="startFromNl"
          />
          <button class="nl-bar__send" type="button" data-testid="prep-nl-send" title="开始备课" @click="startFromNl">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" /></svg>
          </button>
        </div>
        <div v-if="nlHint" class="nl-bar__hint" :class="{ 'is-error': nlHintError }" data-testid="prep-nl-hint">{{ nlHint }}</div>
        <div class="nl-bar__chips">
          <span>快速开始：</span>
          <button v-for="d in lessonChoices" :key="d.deckId" type="button" data-testid="prep-quick-start" @click="startNew(d.deckId)">
            {{ d.title }}
          </button>
        </div>
      </section>

      <!-- 三课时卡片 -->
      <section class="prep-section">
        <div class="prep-section__head">
          <h2>课时课件</h2>
          <span>三节课均可编辑一页并导出 PPTX / PDF / 教案</span>
        </div>
        <div class="lesson-grid">
          <button
            v-for="(s, i) in lessons"
            :key="s.sessionId"
            class="lesson-card"
            type="button"
            :data-testid="`lesson-card-${i}`"
            @click="openSession(s.sessionId, s.tab)"
          >
            <div class="lesson-card__top">
              <div class="lesson-card__thumb" :class="`lesson-card__thumb--${s.deckId}`">
                <svg v-if="s.deckId === 'deck-ellipse'" viewBox="0 0 120 68" aria-hidden="true">
                  <line x1="8" y1="34" x2="112" y2="34" stroke="#c7d7ee" stroke-width="1" />
                  <ellipse cx="60" cy="34" rx="42" ry="22" fill="none" stroke="#2563eb" stroke-width="1.8" />
                  <circle cx="36" cy="34" r="2.6" fill="#dc2626" />
                  <circle cx="84" cy="34" r="2.6" fill="#dc2626" />
                </svg>
                <svg v-else-if="s.deckId === 'deck-quadratic'" viewBox="0 0 120 68" aria-hidden="true">
                  <line x1="8" y1="34" x2="112" y2="34" stroke="#c7d7ee" stroke-width="1" />
                  <line x1="60" y1="8" x2="60" y2="62" stroke="#c7d7ee" stroke-width="1" />
                  <path d="M20 14 Q60 78 100 14" fill="none" stroke="#2563eb" stroke-width="1.8" />
                  <circle cx="60" cy="46" r="2.8" fill="#dc2626" />
                </svg>
                <svg v-else viewBox="0 0 120 68" aria-hidden="true">
                  <circle cx="60" cy="30" r="21" fill="#eff6ff" stroke="#2563eb" stroke-width="1.6" />
                  <circle cx="60" cy="30" r="10" fill="#dbeafe" stroke="#2563eb" stroke-width="1.6" />
                  <text x="60" y="61" text-anchor="middle" font-size="9" fill="#2563eb">A ⊆ B</text>
                </svg>
              </div>
              <div class="lesson-card__status">
                <span class="pc-tag" :class="statusClass(s)">{{ statusLabel(s) }}</span>
              </div>
            </div>
            <div class="lesson-card__body">
              <b class="lesson-card__title">{{ s.title }}</b>
              <span class="lesson-card__subtitle">{{ s.subtitle }}</span>
              <p class="lesson-card__meta">{{ s.meta.textbook }}</p>
              <div class="lesson-card__tags">
                <span class="pc-tag pc-tag--gray">{{ s.meta.className }}</span>
                <span class="pc-tag pc-tag--gray">{{ s.meta.duration }}</span>
                <span class="pc-tag pc-tag--gray">{{ s.slideCount }} 页</span>
              </div>
            </div>
            <div class="lesson-card__foot">
              <span class="lesson-card__when">{{ s.updatedAt ? `更新于 ${formatWhen(s.updatedAt)}` : '尚未编辑' }}</span>
              <span class="lesson-card__go">进入工作台 ›</span>
            </div>
          </button>
        </div>
      </section>

      <!-- 最近会话 + 快捷入口 -->
      <div class="prep-columns">
        <section class="recent-card">
          <div class="recent-card__head">
            <b>最近会话</b>
            <button class="pc-link" type="button" data-testid="recent-all" @click="goHistory">查看全部 ›</button>
          </div>
          <button
            v-for="(r, i) in recent"
            :key="r.sessionId"
            class="recent-row"
            type="button"
            :data-testid="`recent-row-${i}`"
            @click="openSession(r.sessionId, r.tab)"
          >
            <span class="recent-row__icon" :class="`recent-row__icon--${r.deckId}`">{{ deckGlyph(r.deckId) }}</span>
            <span class="recent-row__meta">
              <b>{{ r.title }} · {{ r.subtitle }}</b>
              <span>{{ r.meta.className }} · {{ statusLabel(r) }} · {{ r.slideCount }} 页</span>
            </span>
            <span class="recent-row__time">{{ formatWhen(r.updatedAt) }}</span>
            <span class="recent-row__go">继续编辑</span>
          </button>
          <div v-if="!recent.length" class="recent-card__empty">还没有备课会话，点击“新建备课”开始。</div>
        </section>

        <aside class="quick-card">
          <b class="quick-card__title">快捷入口</b>
          <button class="quick-item" type="button" @click="openNewDialog">
            <span class="quick-item__icon">＋</span>
            <span><b>新建备课</b><small>选择课时与班级，生成新的备课会话</small></span>
            <span class="quick-item__go">›</span>
          </button>
          <button class="quick-item" type="button" @click="goHistory">
            <span class="quick-item__icon">🕘</span>
            <span><b>备课历史</b><small>查看全部会话、发布版本与最近更新</small></span>
            <span class="quick-item__go">›</span>
          </button>
          <button class="quick-item" type="button" @click="router.push('/teacher/resources')">
            <span class="quick-item__icon">📚</span>
            <span><b>教学资源库</b><small>查看教师端资源与教材说明</small></span>
            <span class="quick-item__go">›</span>
          </button>
          <p class="quick-card__note">
            发布快照写入本机 <code>store.teacher.publish.records</code>，学生端课堂读取最新已发布版本。
          </p>
        </aside>
      </div>
    </div>

    <!-- 新建备课对话框 -->
    <div v-if="newOpen" class="new-mask" data-testid="prep-new-dialog" @click.self="newOpen = false">
      <div class="new-dialog" role="dialog" aria-modal="true" aria-label="新建备课">
        <div class="new-dialog__head">
          <div>
            <b>新建备课</b>
            <span>选择课时主题与授课班级 · 会创建独立的编辑会话</span>
          </div>
          <button class="new-dialog__close" type="button" @click="newOpen = false">×</button>
        </div>
        <div class="new-dialog__label">课时主题</div>
        <div class="new-lessons">
          <button
            v-for="d in lessonChoices"
            :key="d.deckId"
            type="button"
            class="new-lesson"
            :class="{ 'is-active': newDeckId === d.deckId }"
            :data-testid="`new-deck-${d.deckId}`"
            @click="newDeckId = d.deckId"
          >
            <span class="new-lesson__radio"><i /></span>
            <span class="new-lesson__meta">
              <b>{{ d.title }} · {{ d.subtitle }}</b>
              <small>{{ d.meta.textbook }}</small>
            </span>
          </button>
        </div>
        <div class="new-dialog__label">授课班级</div>
        <div class="new-classes">
          <button
            v-for="c in PUBLISH_CLASSES"
            :key="c"
            type="button"
            class="new-class"
            :class="{ 'is-active': newClass === c }"
            :data-testid="`new-class-${c}`"
            @click="newClass = c"
          >
            {{ c }}
          </button>
        </div>
        <div class="new-dialog__foot">
          <button class="pc-btn" type="button" @click="newOpen = false">取消</button>
          <button class="pc-btn pc-btn--primary" type="button" data-testid="new-confirm" @click="createFromDialog">开始备课</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  PUBLISH_CLASSES,
  allSessionSummaries,
  builtinSummaries,
  createPrepSession,
  formatWhen,
} from '../../data/prepPublish'
import { coursewareDecks } from '../../data/courseware'

const router = useRouter()

const lessons = computed(() => builtinSummaries())
const recent = computed(() => {
  const builtin = builtinSummaries()
  const customs = allSessionSummaries().filter((s) => s.isCustom)
  return [...builtin, ...customs]
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, 4)
})
const lessonChoices = coursewareDecks.map((d) => ({
  deckId: d.id,
  title: d.title,
  subtitle: d.subtitle,
  meta: d.meta,
}))

const selectedClass = ref(PUBLISH_CLASSES[0])
const classMenu = ref(false)
const nlText = ref('')
const nlFocused = ref(false)
const nlHint = ref('')
const nlHintError = ref(false)
const newOpen = ref(false)
const newDeckId = ref('deck-ellipse')
const newClass = ref(PUBLISH_CLASSES[0])

function statusLabel(s) {
  if (s.status === 'published') return `已发布 v${s.publishedVersion}`
  if (s.status === 'editing') return '编辑中'
  return '待开始'
}
function statusClass(s) {
  if (s.status === 'published') return 'pc-tag--ok'
  if (s.status === 'editing') return 'pc-tag--blue'
  return 'pc-tag--gray'
}
function deckGlyph(deckId) {
  if (deckId === 'deck-ellipse') return '◯'
  if (deckId === 'deck-quadratic') return '∪'
  return '⊆'
}

function pickClass(c) {
  selectedClass.value = c
  classMenu.value = false
}

function matchDeck(text) {
  const t = String(text || '')
  if (/椭圆|焦点|长轴|离心率/.test(t)) return coursewareDecks.find((d) => d.id === 'deck-ellipse')
  if (/二次|配方|抛物线|顶点/.test(t)) return coursewareDecks.find((d) => d.id === 'deck-quadratic')
  if (/集合|子集|包含|韦恩|venn/i.test(t)) return coursewareDecks.find((d) => d.id === 'deck-set')
  return null
}

function openSession(sessionId, tab) {
  router.push(`/teacher/prep/w/${sessionId}/${tab || 'classroom'}`)
}

function goHistory() {
  router.push('/teacher/prep/history')
}

function openNewDialog() {
  newOpen.value = true
  nlHint.value = ''
}

function startNew(deckId) {
  const created = createPrepSession({ deckId, className: selectedClass.value, tab: 'classroom' })
  if (!created) {
    nlHint.value = '无法创建该课时的备课会话'
    nlHintError.value = true
    return
  }
  nlHint.value = ''
  router.push(`/teacher/prep/w/${created.sessionId}/classroom`)
}

function startFromNl() {
  const text = nlText.value.trim()
  if (!text) {
    openNewDialog()
    return
  }
  const deck = matchDeck(text)
  if (!deck) {
    nlHint.value =
      '离线演示只收录三节课：椭圆及其标准方程 / 二次函数与配方法 / 集合间的基本关系。可输入含“椭圆”“配方”“集合”的课题，或从下方课时卡片进入。'
    nlHintError.value = true
    return
  }
  const created = createPrepSession({ deckId: deck.id, className: selectedClass.value, tab: 'classroom' })
  nlHint.value = `已按「${text}」创建《${deck.title}》备课会话`
  nlHintError.value = false
  nlText.value = ''
  if (created) router.push(`/teacher/prep/w/${created.sessionId}/classroom`)
}

function createFromDialog() {
  const created = createPrepSession({ deckId: newDeckId.value, className: newClass.value, tab: 'classroom' })
  if (!created) return
  newOpen.value = false
  router.push(`/teacher/prep/w/${created.sessionId}/classroom`)
}

function closeClassMenu() {
  classMenu.value = false
}
onMounted(() => document.addEventListener('click', closeClassMenu))
onBeforeUnmount(() => document.removeEventListener('click', closeClassMenu))
</script>

<style scoped>
.prep-center {
  height: calc(100vh - 56px - 44px);
  min-height: 560px;
  overflow-y: auto;
  background:
    radial-gradient(620px 320px at 92% -6%, rgba(37, 99, 235, 0.07) 0%, transparent 62%),
    #f6f8fb;
}
.prep-center__inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 20px 28px 40px;
}
.prep-center__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 16px;
}
.prep-center__title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.01em;
}
.prep-center__sub {
  margin: 4px 0 0;
  font-size: 12.5px;
  color: #64748b;
}
.prep-center__head-actions {
  display: flex;
  gap: 8px;
  flex: none;
}
.pc-btn {
  height: 32px;
  padding: 0 13px;
  border-radius: 8px;
  border: 1px solid #dbe3ef;
  background: #fff;
  color: #334155;
  font-size: 12.5px;
  white-space: nowrap;
}
.pc-btn:hover {
  border-color: #2563eb;
  color: #2563eb;
}
.pc-btn--primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}
.pc-btn--primary:hover {
  background: #1d4ed8;
  border-color: #1d4ed8;
  color: #fff;
}
/* ── NL 输入 ── */
.nl-bar {
  background: #fff;
  border: 1px solid #e5e9f2;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  padding: 10px 12px;
  margin-bottom: 18px;
  position: relative;
}
.nl-bar.is-focused {
  border-color: #bfdbfe;
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.08);
}
.nl-bar__row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.nl-class {
  position: relative;
  flex: none;
}
.nl-class__btn {
  height: 32px;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #334155;
  font-size: 12.5px;
  font-weight: 600;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.nl-class__btn:hover {
  border-color: #2563eb;
  color: #2563eb;
}
.nl-class__menu {
  position: absolute;
  left: 0;
  top: 38px;
  width: 156px;
  background: #fff;
  border: 1px solid #e5e9f2;
  border-radius: 10px;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.14);
  padding: 5px;
  z-index: 40;
}
.nl-class__menu button {
  display: block;
  width: 100%;
  border: 0;
  background: none;
  border-radius: 7px;
  text-align: left;
  font-size: 12.5px;
  color: #334155;
  padding: 7px 10px;
}
.nl-class__menu button:hover {
  background: #f1f5f9;
}
.nl-class__menu button.is-active {
  background: #eff4ff;
  color: #2563eb;
  font-weight: 600;
}
.nl-bar__input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 13.5px;
  color: #1f2937;
  padding: 6px 2px;
}
.nl-bar__input::placeholder {
  color: #a8b6c8;
}
.nl-bar__send {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 0;
  background: #2563eb;
  color: #fff;
  display: grid;
  place-items: center;
  flex: none;
}
.nl-bar__send:hover {
  background: #1d4ed8;
}
.nl-bar__hint {
  margin-top: 8px;
  font-size: 11.5px;
  line-height: 1.6;
  color: #047857;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 6px 10px;
}
.nl-bar__hint.is-error {
  color: #b91c1c;
  background: #fef2f2;
  border-color: #fecaca;
}
.nl-bar__chips {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 7px;
  flex-wrap: wrap;
}
.nl-bar__chips span {
  font-size: 11px;
  color: #94a3b8;
}
.nl-bar__chips button {
  border: 1px solid #eef2f7;
  background: #f8fafc;
  border-radius: 999px;
  font-size: 11px;
  color: #475569;
  padding: 2px 10px;
}
.nl-bar__chips button:hover {
  border-color: #bfdbfe;
  color: #2563eb;
  background: #eff4ff;
}
/* ── 课时卡片 ── */
.prep-section {
  margin-bottom: 18px;
}
.prep-section__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
}
.prep-section__head h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}
.prep-section__head span {
  font-size: 11.5px;
  color: #94a3b8;
}
.lesson-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
.lesson-card {
  background: #fff;
  border: 1px solid #e5e9f2;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  padding: 13px 14px 11px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all 0.16s ease;
}
.lesson-card:hover {
  border-color: #a2befd;
  box-shadow: 0 10px 26px rgba(37, 99, 235, 0.1);
  transform: translateY(-1px);
}
.lesson-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.lesson-card__thumb {
  flex: 1;
  height: 82px;
  border-radius: 9px;
  background: #f8fbff;
  border: 1px solid #e8eef8;
  display: grid;
  place-items: center;
  overflow: hidden;
}
.lesson-card__thumb svg {
  width: 100%;
  height: 100%;
}
.lesson-card__status {
  flex: none;
}
.lesson-card__body {
  flex: 1;
}
.lesson-card__title {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}
.lesson-card__subtitle {
  display: block;
  font-size: 11.5px;
  color: #64748b;
  margin-top: 1px;
}
.lesson-card__meta {
  margin: 6px 0 8px;
  font-size: 11.5px;
  color: #94a3b8;
}
.lesson-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.lesson-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid #f1f5f9;
  padding-top: 8px;
}
.lesson-card__when {
  font-size: 10.5px;
  color: #94a3b8;
}
.lesson-card__go {
  font-size: 11.5px;
  font-weight: 600;
  color: #2563eb;
}
/* ── 最近会话 / 快捷入口 ── */
.prep-columns {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}
.recent-card {
  flex: 1;
  min-width: 0;
  background: #fff;
  border: 1px solid #e5e9f2;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  padding: 13px 16px 8px;
}
.recent-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
}
.recent-card__head b {
  font-size: 14px;
  color: #0f172a;
}
.pc-link {
  border: 0;
  background: none;
  color: #2563eb;
  font-size: 11.5px;
  padding: 0;
}
.recent-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 4px;
  border: 0;
  border-top: 1px solid #f1f5f9;
  background: none;
  text-align: left;
}
.recent-row:hover {
  background: #f8fbff;
}
.recent-row__icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: #eff4ff;
  color: #2563eb;
  font-size: 14px;
  display: grid;
  place-items: center;
  flex: none;
}
.recent-row__icon--deck-quadratic {
  background: #f3eefd;
  color: #7c3aed;
}
.recent-row__icon--deck-set {
  background: #ecfdf5;
  color: #059669;
}
.recent-row__meta {
  flex: 1;
  min-width: 0;
}
.recent-row__meta b {
  display: block;
  font-size: 12.5px;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.recent-row__meta span {
  font-size: 10.5px;
  color: #94a3b8;
}
.recent-row__time {
  font-size: 10.5px;
  color: #94a3b8;
  flex: none;
}
.recent-row__go {
  font-size: 11.5px;
  color: #2563eb;
  font-weight: 600;
  flex: none;
}
.recent-card__empty {
  padding: 26px 8px;
  text-align: center;
  font-size: 12px;
  color: #94a3b8;
}
.quick-card {
  width: 296px;
  flex: none;
  background: #fff;
  border: 1px solid #e5e9f2;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  padding: 13px 14px;
}
.quick-card__title {
  display: block;
  font-size: 14px;
  color: #0f172a;
  margin-bottom: 8px;
}
.quick-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  border: 1px solid #eef2f7;
  background: #fbfdff;
  border-radius: 9px;
  padding: 8px 10px;
  margin-bottom: 7px;
  text-align: left;
}
.quick-item:hover {
  border-color: #dbe6fb;
  background: #f5f8ff;
}
.quick-item__icon {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: #eff4ff;
  display: grid;
  place-items: center;
  font-size: 13px;
  flex: none;
}
.quick-item b {
  display: block;
  font-size: 12.5px;
  color: #1f2937;
}
.quick-item small {
  display: block;
  font-size: 10.5px;
  color: #94a3b8;
  line-height: 1.5;
}
.quick-item > span:nth-child(2) {
  flex: 1;
}
.quick-item__go {
  color: #cbd5e1;
}
.quick-card__note {
  margin: 10px 2px 0;
  font-size: 10.5px;
  line-height: 1.6;
  color: #94a3b8;
  border-top: 1px solid #f1f5f9;
  padding-top: 9px;
}
.quick-card__note code {
  background: #f1f5f9;
  border-radius: 4px;
  padding: 0 3px;
  font-size: 10px;
}
/* 标签 */
.pc-tag {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  padding: 1px 8px;
  background: #f1f5f9;
  color: #475569;
}
.pc-tag--ok {
  background: #ecfdf5;
  color: #047857;
}
.pc-tag--blue {
  background: #eff4ff;
  color: #2563eb;
}
.pc-tag--gray {
  background: #f1f5f9;
  color: #64748b;
}
/* ── 新建对话框 ── */
.new-mask {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(15, 23, 42, 0.44);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.new-dialog {
  width: 520px;
  max-width: 94vw;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 30px 80px rgba(15, 23, 42, 0.3);
  overflow: hidden;
  padding-bottom: 16px;
}
.new-dialog__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 18px 22px 12px;
  border-bottom: 1px solid #eef2f7;
}
.new-dialog__head b {
  display: block;
  font-size: 16px;
  color: #0f172a;
}
.new-dialog__head span {
  display: block;
  font-size: 11.5px;
  color: #94a3b8;
  margin-top: 3px;
}
.new-dialog__close {
  border: 0;
  background: none;
  font-size: 20px;
  line-height: 1;
  color: #94a3b8;
}
.new-dialog__label {
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  margin: 14px 22px 8px;
}
.new-lessons {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 0 22px;
}
.new-lesson {
  display: flex;
  align-items: center;
  gap: 9px;
  border: 1px solid #e5e9f2;
  border-radius: 10px;
  background: #fff;
  padding: 9px 12px;
  text-align: left;
}
.new-lesson:hover {
  border-color: #bfdbfe;
  background: #f8fbff;
}
.new-lesson.is-active {
  border-color: #2563eb;
  background: #eff4ff;
}
.new-lesson__radio {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  border: 1.5px solid #cbd5e1;
  display: grid;
  place-items: center;
  flex: none;
}
.new-lesson__radio i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: transparent;
}
.new-lesson.is-active .new-lesson__radio {
  border-color: #2563eb;
}
.new-lesson.is-active .new-lesson__radio i {
  background: #2563eb;
}
.new-lesson__meta b {
  display: block;
  font-size: 12.5px;
  color: #1f2937;
}
.new-lesson__meta small {
  display: block;
  font-size: 10.5px;
  color: #94a3b8;
}
.new-classes {
  display: flex;
  gap: 7px;
  padding: 0 22px;
}
.new-class {
  flex: 1;
  height: 34px;
  border: 1px solid #e5e9f2;
  border-radius: 9px;
  background: #fff;
  font-size: 12.5px;
  color: #334155;
}
.new-class:hover {
  border-color: #bfdbfe;
}
.new-class.is-active {
  border-color: #2563eb;
  background: #eff4ff;
  color: #1d4ed8;
  font-weight: 600;
}
.new-dialog__foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 22px 0;
}
</style>
