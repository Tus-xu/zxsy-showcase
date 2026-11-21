<template>
  <div class="res" data-testid="teacher-resources">
    <section class="tv3-hero res__hero">
      <div class="res__hero-main">
        <div class="res__hero-icon">🗂️</div>
        <div>
          <div class="tv3-hero__title">资源中心</div>
          <div class="tv3-hero__sub">随包本地课件 / 教案 / 题图 / 评分细则；全部本地渲染，无外链、无网络请求。</div>
        </div>
      </div>
      <div class="res__hero-right">
        <span class="tv3-tag tv3-tag--primary">本地资源 {{ resources.length }} 份</span>
        <span class="tv3-tag tv3-tag--warn">教材切片缺源</span>
      </div>
    </section>

    <section class="res__missing" data-testid="resources-missing-source">
      <div class="res__missing-icon">⚠️</div>
      <div class="res__missing-main">
        <b>授权教材切片未挂载，本演示使用自撰素材</b>
        <p>
          本机未找到教材切片目录 <code>D:\知识库\AC切片</code>（及 <code>D:\教师端备课中心重构宪法</code>）。
          因此本页课件 / 教案均为演示自撰素材，已按方案登记缺源；界面不引用、不转写、不伪造任何教材原文。
        </p>
      </div>
      <div class="res__missing-side">
        <span class="tv3-tag tv3-tag--danger">缺源登记</span>
        <span class="res__missing-path">源目录：D:\知识库\AC切片</span>
        <span class="res__missing-path">处理：待授权切片挂载后替换</span>
      </div>
    </section>

    <div class="res__toolbar">
      <div class="res__tabs">
        <button
          v-for="f in filters"
          :key="f.key"
          type="button"
          class="res__tab"
          :class="{ 'is-active': filter === f.key }"
          :data-testid="`resources-filter-${f.key}`"
          @click="filter = f.key"
        >
          {{ f.label }}<em>{{ countOf(f.key) }}</em>
        </button>
      </div>
      <input v-model="search" type="search" class="tv3-input res__search" placeholder="搜索资源标题、教材版本或知识点" />
    </div>

    <div class="res__grid">
      <article
        v-for="r in visible"
        :key="r.id"
        class="res__card"
        :class="`is-${r.type}`"
        :data-testid="`resource-card-${r.id}`"
      >
        <div class="res__card-top">
          <span class="res__type" :class="`res__type--${r.type}`">{{ r.typeLabel }}</span>
          <span class="res__card-tag tv3-tag" :class="r.local ? 'tv3-tag--ok' : 'tv3-tag--warn'">{{ r.badge }}</span>
        </div>
        <div class="res__thumb" :class="`res__thumb--${r.type}`">
          <template v-if="r.type === 'question'">
            <img :src="r.image" :alt="r.title" />
          </template>
          <template v-else-if="r.type === 'courseware'">
            <div class="res__slide-stack">
              <span v-for="n in Math.min(3, r.slideCount)" :key="n" class="res__slide" :style="{ left: (n - 1) * 9 + 'px', top: (n - 1) * 6 + 'px' }" />
            </div>
            <span class="res__thumb-label">{{ r.slideCount }} 页课件</span>
          </template>
          <template v-else-if="r.type === 'plan'">
            <div class="res__doc">
              <span class="res__doc-line" style="width: 72%" />
              <span class="res__doc-line" style="width: 90%" />
              <span class="res__doc-line" style="width: 56%" />
              <span class="res__doc-line" style="width: 80%" />
            </div>
            <span class="res__thumb-label">{{ r.sectionCount }} 个章节</span>
          </template>
          <template v-else>
            <div class="res__rubric-thumb">
              <span v-for="i in 3" :key="i" class="res__rubric-row">
                <i />
                <span />
                <em />
              </span>
            </div>
            <span class="res__thumb-label">评分细则 · 3 份提交</span>
          </template>
        </div>
        <div class="res__card-body">
          <b class="res__card-title">{{ r.title }}</b>
          <span class="res__card-sub">{{ r.sub }}</span>
          <span class="res__card-meta">{{ r.meta }}</span>
        </div>
        <div class="res__card-foot">
          <span class="res__source">{{ r.sourceLabel }}</span>
          <button type="button" class="res__go" :data-testid="`resource-open-${r.id}`" @click="openResource(r)">
            {{ r.type === 'rubric' ? '去批改 →' : '本地预览 →' }}
          </button>
        </div>
      </article>

      <article v-if="filter === 'all'" class="res__card res__card--missing" data-testid="resource-card-textbook-slice">
        <div class="res__card-top">
          <span class="res__type res__type--missing">教材切片</span>
          <span class="res__card-tag tv3-tag tv3-tag--danger">缺源</span>
        </div>
        <div class="res__thumb res__thumb--missing">
          <span class="res__missing-mark">未挂载</span>
          <span class="res__thumb-label">D:\知识库\AC切片</span>
        </div>
        <div class="res__card-body">
          <b class="res__card-title">授权教材切片 · 待挂载</b>
          <span class="res__card-sub">本机不存在该目录，未导入任何教材切片</span>
          <span class="res__card-meta">挂载后按授权切片替换演示自撰素材；在挂载前不生成教材原文引用。</span>
        </div>
        <div class="res__card-foot">
          <span class="res__source">来源：方案 §2 / §3 缺源登记</span>
          <button type="button" class="res__go" disabled>等待挂载</button>
        </div>
      </article>

      <div v-if="!visible.length" class="res__empty">当前筛选下没有资源</div>
    </div>

    <div v-if="preview" class="res__mask" data-testid="resource-preview" @click.self="preview = null">
      <div class="res__modal">
        <div class="res__modal-head">
          <div>
            <span class="tv3-tag tv3-tag--primary">{{ preview.typeLabel }}</span>
            <b>{{ preview.title }}</b>
          </div>
          <button type="button" class="tv3-btn tv3-btn--sm" @click="preview = null">关闭</button>
        </div>
        <div class="res__modal-body ms-scroll">
          <template v-if="preview.type === 'courseware'">
            <div class="res__preview-meta">
              {{ preview.deck.meta.textbook }} · {{ preview.deck.meta.className }} · {{ preview.deck.meta.duration }} ·
              {{ preview.deck.slides.length }} 页
            </div>
            <div class="res__preview-source">{{ preview.deck.sourceLabel }}</div>
            <div v-for="(slide, i) in preview.deck.slides" :key="slide.id" class="res__slide-preview">
              <div class="res__slide-no">{{ i + 1 }}</div>
              <div class="res__slide-content">
                <span class="res__slide-kicker">{{ slide.kicker || preview.deck.title }}</span>
                <b class="res__slide-title">{{ slide.title }}</b>
                <p v-if="slide.lead" class="res__slide-lead"><MathText :text="slide.lead" /></p>
                <p v-if="slide.equation" class="res__slide-eq"><MathText :text="'$$' + slide.equation + '$$'" block /></p>
                <ul v-if="slide.bullets" class="res__slide-bullets">
                  <li v-for="(b, bi) in slide.bullets" :key="bi"><MathText :text="b" /></li>
                </ul>
                <p v-if="slide.figure" class="res__slide-figure">图：{{ slide.figure }}</p>
                <p v-if="slide.note" class="res__slide-note">讲稿：{{ slide.note }}</p>
              </div>
            </div>
          </template>

          <template v-else-if="preview.type === 'plan'">
            <div class="res__preview-meta">{{ preview.plan.meta.join(' · ') }}</div>
            <div class="res__preview-source">{{ preview.plan.title }}</div>
            <div v-for="(s, i) in preview.plan.sections" :key="i" class="res__plan-section">
              <b>{{ s.heading }}</b>
              <template v-for="(item, ii) in s.items" :key="ii">
                <div v-if="item.startsWith('## ')" class="res__plan-sub">{{ item.slice(3) }}</div>
                <div v-else-if="item.startsWith('- ')" class="res__plan-item">{{ item.slice(2) }}</div>
                <div v-else class="res__plan-item">{{ item }}</div>
              </template>
            </div>
          </template>

          <template v-else-if="preview.type === 'question'">
            <div class="res__q-preview">
              <img :src="preview.question.image" :alt="preview.title" />
              <div class="res__q-info">
                <div class="res__preview-meta">{{ preview.question.sourceLabel }}</div>
                <p class="res__q-text"><MathText :text="preview.question.questionText" /></p>
                <div v-if="preview.question.options" class="res__q-options">
                  <span v-for="o in preview.question.options" :key="o.key">
                    {{ o.key }}．<MathText :text="o.text" />
                  </span>
                </div>
                <div class="res__q-answer">
                  <b>参考答案</b>
                  <MathText :text="preview.question.final.title.replace(/^[ABC]\s*·\s*结论[:：]\s*/, '')" />
                </div>
                <div class="res__preview-source">
                  题图 SHA-256：{{ preview.question.sha256 }}（与三题手册封存一致）
                </div>
              </div>
            </div>
          </template>
        </div>
        <div class="res__modal-foot">
          <span>本地资源预览 · 不发起网络请求</span>
          <span v-if="preview.type === 'courseware'">{{ preview.deck.sourceLabel }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { coursewareDecks, lessonPlans, findDeck } from '../../data/courseware'
import { guidanceCases } from '../../data/guidance'
import MathText from '../../components/MathText.vue'

const router = useRouter()
const filter = ref('all')
const search = ref('')
const preview = ref(null)

const filters = [
  { key: 'all', label: '全部' },
  { key: 'courseware', label: '课件' },
  { key: 'plan', label: '教案' },
  { key: 'question', label: '题图' },
  { key: 'rubric', label: '评分细则' },
]

const resources = [
  ...coursewareDecks.map((d) => ({
    id: 'deck-' + d.id,
    type: 'courseware',
    typeLabel: '课件',
    title: d.title,
    sub: d.subtitle,
    meta: `${d.meta.textbook} · ${d.meta.className} · ${d.meta.duration}`,
    badge: '本地课件',
    local: true,
    sourceLabel: d.sourceLabel,
    slideCount: d.slides.length,
  })),
  ...lessonPlans.map((p) => ({
    id: 'plan-' + p.deckId,
    type: 'plan',
    typeLabel: '教案',
    title: p.title,
    sub: '第一课时 · 完整教案',
    meta: p.meta.join(' · '),
    badge: '本地教案',
    local: true,
    sourceLabel: '演示自撰教案（教材切片源缺失）',
    sectionCount: p.sections.length,
  })),
  ...guidanceCases.map((c) => ({
    id: 'question-' + c.id,
    type: 'question',
    typeLabel: '题图',
    title: `${c.code} · ${c.title}`,
    sub: c.chip,
    meta: c.sourceLabel,
    badge: '本地题图',
    local: true,
    sourceLabel: '演示题库原图 · SHA-256 已封存',
    image: c.image,
  })),
  {
    id: 'rubric-submissions',
    type: 'rubric',
    typeLabel: '评分细则',
    title: '三份答卷 · 评分细则与批改入口',
    sub: 'sub-A / sub-B / sub-C · 满分 5 分',
    meta: '评分细则来自共享提交契约（src/data/submissions.js）审核字段',
    badge: '本地数据',
    local: true,
    sourceLabel: '教师终审唯一写分',
  },
]

function countOf(key) {
  if (key === 'all') return resources.length
  return resources.filter((r) => r.type === key).length
}

const visible = computed(() => {
  const kw = search.value.trim().toLowerCase()
  return resources.filter((r) => {
    if (filter.value !== 'all' && r.type !== filter.value) return false
    if (!kw) return true
    return `${r.title} ${r.sub} ${r.meta}`.toLowerCase().includes(kw)
  })
})

function openResource(r) {
  if (r.type === 'rubric') {
    router.push('/teacher/grading')
    return
  }
  if (r.type === 'courseware') {
    preview.value = { ...r, deck: findDeck(r.id.replace('deck-', '')) }
    return
  }
  if (r.type === 'plan') {
    const deckId = r.id.replace('plan-', '')
    const plan = lessonPlans.find((p) => p.deckId === deckId)
    preview.value = { ...r, plan }
    return
  }
  if (r.type === 'question') {
    const caseId = r.id.replace('question-', '')
    const question = guidanceCases.find((c) => c.id === caseId)
    preview.value = { ...r, question }
  }
}
</script>

<style scoped>
.res {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.res__hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 13px 22px;
}
.res__hero-main {
  display: flex;
  align-items: center;
  gap: 14px;
}
.res__hero-icon {
  width: 42px;
  height: 42px;
  flex: none;
  border-radius: 13px;
  display: grid;
  place-items: center;
  font-size: 21px;
  background: linear-gradient(135deg, #eef2ff 0%, #ecfeff 100%);
  border: 1px solid var(--tv3-primary-border);
  box-shadow: 0 6px 16px -8px rgba(79, 70, 229, 0.5);
}
.res__hero-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.res__missing {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  border: 1px solid var(--tv3-amber-border);
  border-radius: 14px;
  background: linear-gradient(135deg, #fffbeb 0%, #fff7ed 100%);
  padding: 12px 16px;
}
.res__missing-icon {
  font-size: 20px;
  line-height: 1.3;
}
.res__missing-main {
  flex: 1;
  min-width: 0;
}
.res__missing-main b {
  font-size: 13px;
  color: var(--tv3-amber-deep, #92400e);
}
.res__missing-main p {
  margin: 3px 0 0;
  font-size: 11px;
  line-height: 1.7;
  color: var(--tv3-ink2);
}
.res__missing-main code {
  font-family: var(--tv3-font-num);
  font-size: 10px;
  color: var(--tv3-amber-deep, #92400e);
  background: #fff;
  border: 1px solid var(--tv3-amber-border);
  border-radius: 3px;
  padding: 0 3px;
}
.res__missing-side {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}
.res__missing-path {
  font-size: 9.5px;
  color: var(--tv3-ink3);
  font-family: var(--tv3-font-num);
}
.res__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.res__tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.res__tab {
  border: 1px solid var(--tv3-line);
  background: #fff;
  border-radius: 999px;
  padding: 5px 13px;
  font-size: 12px;
  color: var(--tv3-ink2);
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.res__tab em {
  font-style: normal;
  font-size: 10px;
  color: var(--tv3-ink3);
  font-family: var(--tv3-font-num);
}
.res__tab:hover {
  border-color: var(--tv3-primary-border);
}
.res__tab.is-active {
  background: var(--tv3-primary);
  border-color: var(--tv3-primary);
  color: #fff;
  font-weight: 600;
}
.res__tab.is-active em {
  color: rgba(255, 255, 255, 0.75);
}
.res__search {
  width: 260px;
  height: 32px;
  padding: 4px 11px;
  font-size: 12px;
}
.res__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  align-content: start;
}
.res__card {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid var(--tv3-line);
  border-radius: 14px;
  box-shadow: var(--tv3-shadow-sm);
  overflow: hidden;
}
.res__card--missing {
  border-style: dashed;
  border-color: var(--tv3-amber-border);
  background: #fffdf7;
}
.res__card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 0;
}
.res__type {
  font-size: 10px;
  font-weight: 700;
  border-radius: 5px;
  padding: 1px 7px;
  background: var(--tv3-primary-soft);
  color: var(--tv3-primary);
}
.res__type--plan {
  background: var(--tv3-teal-soft);
  color: var(--tv3-teal);
}
.res__type--question {
  background: var(--tv3-gold-soft);
  color: var(--tv3-gold-deep);
}
.res__type--rubric {
  background: var(--tv3-ai-soft);
  color: var(--tv3-ai);
}
.res__type--missing {
  background: var(--tv3-rose-soft);
  color: var(--tv3-rose);
}
.res__card-tag {
  font-size: 9.5px;
  padding: 1px 6px;
}
.res__thumb {
  position: relative;
  margin: 9px 12px 0;
  height: 86px;
  border-radius: 10px;
  background: var(--tv3-bg2);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.res__thumb--courseware {
  background: linear-gradient(135deg, #eef2ff 0%, #e0f2fe 100%);
}
.res__thumb--plan {
  background: linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 100%);
}
.res__thumb--question {
  background: #0f172a;
}
.res__thumb--rubric {
  background: linear-gradient(135deg, #f5f3ff 0%, #eef2ff 100%);
}
.res__thumb--question img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
  opacity: 0.92;
}
.res__slide-stack {
  position: relative;
  width: 120px;
  height: 72px;
}
.res__slide {
  position: absolute;
  width: 104px;
  height: 60px;
  border-radius: 5px;
  background: #fff;
  border: 1px solid #c7d2fe;
  box-shadow: 0 3px 8px rgba(79, 70, 229, 0.12);
}
.res__doc {
  width: 76px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border-radius: 6px;
  background: #fff;
  border: 1px solid #a7f3d0;
  box-shadow: 0 3px 8px rgba(5, 150, 105, 0.12);
}
.res__doc-line {
  height: 4px;
  border-radius: 999px;
  background: #a7f3d0;
}
.res__rubric-thumb {
  width: 128px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px;
  border-radius: 6px;
  background: #fff;
  border: 1px solid #ddd6fe;
}
.res__rubric-row {
  display: flex;
  align-items: center;
  gap: 5px;
}
.res__rubric-row i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ddd6fe;
  flex: none;
}
.res__rubric-row span {
  flex: 1;
  height: 4px;
  border-radius: 999px;
  background: #ede9fe;
}
.res__rubric-row em {
  width: 14px;
  height: 4px;
  border-radius: 999px;
  background: #c4b5fd;
}
.res__thumb-label {
  position: absolute;
  right: 8px;
  bottom: 7px;
  font-size: 9px;
  color: var(--tv3-ink3);
  background: rgba(255, 255, 255, 0.82);
  border-radius: 999px;
  padding: 1px 7px;
}
.res__thumb--missing {
  background: repeating-linear-gradient(45deg, #fef3c7, #fef3c7 8px, #fffbeb 8px, #fffbeb 16px);
}
.res__missing-mark {
  font-size: 16px;
  font-weight: 800;
  color: var(--tv3-amber);
  letter-spacing: 2px;
  opacity: 0.85;
}
.res__card-body {
  padding: 8px 12px 5px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}
.res__card-title {
  font-size: 12.5px;
  color: var(--tv3-ink);
  line-height: 1.4;
}
.res__card-sub {
  font-size: 10.5px;
  color: var(--tv3-ink2);
}
.res__card-meta {
  font-size: 9.5px;
  line-height: 1.55;
  color: var(--tv3-ink3);
}
.res__card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 12px 8px;
  border-top: 1px solid var(--tv3-line2);
}
.res__source {
  flex: 1;
  min-width: 0;
  font-size: 9px;
  color: var(--tv3-ink3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.res__go {
  flex: none;
  border: 0;
  background: transparent;
  color: var(--tv3-primary);
  font-size: 10.5px;
  font-weight: 600;
  padding: 0;
  white-space: nowrap;
}
.res__go:disabled {
  color: var(--tv3-ink4);
  cursor: not-allowed;
}
.res__empty {
  grid-column: 1 / -1;
  padding: 50px;
  text-align: center;
  font-size: 12px;
  color: var(--tv3-ink3);
}
.res__mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(15, 23, 42, 0.55);
  display: grid;
  place-items: center;
  padding: 24px;
}
.res__modal {
  width: min(980px, 92vw);
  max-height: 88vh;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 30px 90px rgba(2, 6, 23, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.res__modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--tv3-line);
}
.res__modal-head > div {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}
.res__modal-head b {
  font-size: 14px;
  color: var(--tv3-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.res__modal-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 18px 18px;
}
.res__preview-meta {
  font-size: 11px;
  color: var(--tv3-ink3);
}
.res__preview-source {
  margin-top: 3px;
  font-size: 10px;
  color: var(--tv3-ink3);
}
.res__slide-preview {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  border: 1px solid var(--tv3-line);
  border-radius: 12px;
  padding: 12px 14px;
  background: linear-gradient(180deg, #fbfcff 0%, #ffffff 60%);
}
.res__slide-no {
  width: 24px;
  height: 24px;
  flex: none;
  border-radius: 7px;
  background: var(--tv3-primary);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
  font-family: var(--tv3-font-num);
}
.res__slide-content {
  flex: 1;
  min-width: 0;
}
.res__slide-kicker {
  display: block;
  font-size: 10px;
  color: var(--tv3-primary);
  letter-spacing: 0.5px;
}
.res__slide-title {
  display: block;
  font-size: 14px;
  color: var(--tv3-ink);
  margin-top: 1px;
}
.res__slide-lead {
  margin: 6px 0 0;
  font-size: 12.5px;
  line-height: 1.75;
  color: var(--tv3-ink2);
}
.res__slide-eq {
  margin: 6px 0 0;
  padding: 6px 10px;
  background: var(--tv3-bg2);
  border-radius: 8px;
  font-size: 12.5px;
  color: var(--tv3-ink);
}
.res__slide-bullets {
  margin: 6px 0 0;
  padding-left: 18px;
  font-size: 12px;
  line-height: 1.8;
  color: var(--tv3-ink2);
}
.res__slide-figure {
  margin: 6px 0 0;
  font-size: 11px;
  color: var(--tv3-gold-deep);
}
.res__slide-note {
  margin: 6px 0 0;
  font-size: 11px;
  line-height: 1.65;
  color: var(--tv3-ink3);
  background: var(--tv3-amber-soft);
  border: 1px solid var(--tv3-amber-border);
  border-radius: 8px;
  padding: 5px 9px;
}
.res__plan-section {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed var(--tv3-line);
}
.res__plan-section > b {
  font-size: 13px;
  color: var(--tv3-ink);
}
.res__plan-sub {
  margin-top: 7px;
  font-size: 12px;
  font-weight: 700;
  color: var(--tv3-primary);
}
.res__plan-item {
  margin-top: 3px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--tv3-ink2);
}
.res__q-preview {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: 16px;
}
.res__q-preview img {
  width: 100%;
  border-radius: 10px;
  border: 1px solid var(--tv3-line);
  background: #fff;
}
.res__q-text {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.8;
  color: var(--tv3-ink);
}
.res__q-options {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12.5px;
  color: var(--tv3-ink2);
}
.res__q-answer {
  margin-top: 12px;
  padding: 9px 11px;
  border-radius: 9px;
  background: var(--tv3-teal-soft);
  border: 1px solid var(--tv3-teal-border);
  font-size: 12.5px;
  color: var(--tv3-ink2);
  display: flex;
  gap: 10px;
  align-items: baseline;
}
.res__q-answer b {
  color: var(--tv3-teal);
  flex: none;
}
.res__modal-foot {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 16px;
  border-top: 1px solid var(--tv3-line);
  background: var(--tv3-bg2);
  font-size: 10px;
  color: var(--tv3-ink3);
}
</style>

