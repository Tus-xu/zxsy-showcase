<template>
  <StudentThemeScope class="page me">
    <header class="me-head">
      <div>
        <h1 class="page-title">我的</h1>
        <p class="page-sub">学情分析、知识掌握地图、体验反馈与个人设置——都收在这里。</p>
      </div>
      <div class="me-head__profile">
        <div class="me-avatar">林</div>
        <div>
          <b>林一川</b>
          <span>高二 (1) 班 · 演示学生</span>
        </div>
      </div>
    </header>

    <nav class="me-tabs" aria-label="我的分栏">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="me-tab"
        :class="{ active: ms.tab === tab.key }"
        :data-qa="`me-tab-${tab.key}`"
        @click="ms.tab = tab.key"
      >
        <span>{{ tab.icon }}</span>{{ tab.label }}
      </button>
    </nav>

    <!-- ==================== 学情报告 ==================== -->
    <section v-if="ms.tab === 'report'" class="me-panel" data-qa="me-report">
      <div v-if="!hasAnyData" class="me-empty ms-card" data-qa="me-report-empty">
        <b>还没有可分析的学习记录</b>
        <p>学情报告只用本机真实记录生成，不会显示假数字。先完成一次引导解题、练题或错题复习，这里就会有数据。</p>
        <div class="me-empty__actions">
          <button class="ms-btn ms-btn--primary" @click="router.push('/student/dialog')">去上传题图</button>
          <button class="ms-btn" @click="router.push('/student/practice')">去练题</button>
        </div>
      </div>

      <template v-else>
        <div class="me-stat-row">
          <div class="me-stat ms-card" data-qa="me-report-independence">
            <span>独立解题率</span>
            <template v-if="independence !== null">
              <b>{{ independence }}<small>%</small></b>
              <i>完成 {{ report.guidanceFinished }} 题引导，其中 {{ report.independentCount }} 题零错答</i>
            </template>
            <template v-else>
              <b class="is-muted">—</b>
              <i>完成一次引导解题后生成</i>
            </template>
          </div>
          <div class="me-stat ms-card">
            <span>引导解题完成</span>
            <b>{{ report.guidanceFinished }}<small>/3</small></b>
            <i>进行中 {{ report.guidanceStarted }} 题</i>
          </div>
          <div class="me-stat ms-card">
            <span>练习已答</span>
            <b>{{ report.practiceAnswered }}<small>/{{ report.practiceTotal }}</small></b>
            <i>一次答对 {{ report.practiceFirstPass }} 题</i>
          </div>
          <div class="me-stat ms-card">
            <span>错题待掌握</span>
            <b :class="{ 'is-warn': report.pendingErrors > 0 }">{{ report.pendingErrors }}</b>
            <i>错题共 {{ report.errorCount }} 道</i>
          </div>
        </div>

        <div class="me-report-grid">
          <section class="ms-card me-block">
            <div class="me-block__head"><b>错题分布</b><span>按知识点汇总</span></div>
            <template v-if="report.errorCount">
              <div v-for="row in report.errorDistribution" :key="row.caseId" class="me-dist">
                <span class="me-dist__name">{{ row.knowledge }} · {{ row.code }}</span>
                <span class="me-dist__track"><em :style="{ width: row.width }"></em></span>
                <span class="me-dist__val">{{ row.count }} 道</span>
                <span class="me-dist__pending">待掌握 {{ row.pending }}</span>
              </div>
              <p v-if="report.seedErrors" class="me-block__note">
                其中 {{ report.seedErrors }} 道是三题手册的演示种子错答（错题本为空时初始化），其余来自引导解题的真实错答。
              </p>
            </template>
            <div v-else class="me-block__empty">错题本为空，暂无错题分布。</div>
          </section>

          <section class="ms-card me-block">
            <div class="me-block__head"><b>学习建议</b><span>由本机记录推导</span></div>
            <ul class="me-advice" data-qa="me-report-advice">
              <li v-for="(a, i) in report.advice" :key="i">
                <span class="me-advice__dot"></span>
                <div>
                  <b>{{ a.title }}</b>
                  <p>{{ a.desc }}</p>
                  <button class="me-advice__go" @click="router.push(a.to)">{{ a.action }} ›</button>
                </div>
              </li>
            </ul>
          </section>
        </div>

        <section class="ms-card me-block">
          <div class="me-block__head"><b>今日行动</b><span>按下述顺序推进即可</span></div>
          <div class="me-actions">
            <button v-for="(a, i) in report.todayActions" :key="i" class="me-action" @click="router.push(a.to)">
              <span class="me-action__ico">{{ a.icon }}</span>
              <span class="me-action__body">
                <b>{{ a.title }}</b>
                <small>{{ a.desc }}</small>
              </span>
              <span class="me-action__go">→</span>
            </button>
          </div>
        </section>
      </template>
    </section>

    <!-- ==================== 掌握地图 ==================== -->
    <section v-else-if="ms.tab === 'map'" class="me-panel me-map" data-qa="me-map">
      <div class="me-map__list">
        <div class="me-map__head">
          <b>知识掌握地图</b>
          <span>按练题记录与引导状态计算；未作答的知识点显示“未开始”，不填写假数字</span>
        </div>
        <button
          v-for="row in masteryRows"
          :key="row.caseId"
          class="me-kn ms-card"
          :class="{ active: ms.mapSelected === row.caseId }"
          :data-qa="`me-kn-${row.caseId}`"
          @click="ms.mapSelected = row.caseId"
        >
          <div class="me-kn__top">
            <span class="me-kn__name">{{ row.knowledge }}</span>
            <span class="ms-tag ms-tag--gray">{{ row.code }} · {{ row.title }}</span>
            <span class="me-kn__status" :class="`is-${row.statusKey}`">{{ row.status }}</span>
          </div>
          <div class="me-kn__bar"><em :style="{ width: `${row.score}%` }"></em></div>
          <div class="me-kn__meta">
            <span>练习 {{ row.answered }}/{{ row.total }} 已答 · 答对 {{ row.correct }}{{ row.partial ? ` · 部分正确 ${row.partial}` : '' }}</span>
            <span>引导：{{ row.guidanceText }} · 错题 {{ row.wrongCount }} 道</span>
            <span class="me-kn__enter" @click.stop="openCase(row.caseId)">进入案例 ›</span>
          </div>
        </button>
      </div>

      <aside class="me-map__side">
        <div class="ms-card me-donut-card">
          <div class="me-block__head"><b>整体掌握</b><span>已启动 {{ startedCount }}/3 个知识点</span></div>
          <div class="me-donut" :style="{ background: donutBg }">
            <div class="me-donut__inner">
              <b>{{ noPracticeRows.length ? overallMastery : '—' }}<small v-if="noPracticeRows.length">%</small></b>
              <span>平均掌握度</span>
            </div>
          </div>
          <p class="me-block__note">
            掌握度 = （答对题数 + 0.5 × 部分正确题数）÷ 该知识点变式题总数；只统计已有作答记录的题。
          </p>
        </div>

        <div class="ms-card me-kn-detail" data-qa="me-kn-detail">
          <div class="me-block__head"><b>{{ detailRow.knowledge }}</b><span>{{ detailRow.code }} · {{ detailRow.title }}</span></div>
          <dl>
            <div><dt>掌握状态</dt><dd>{{ detailRow.status }}</dd></div>
            <div><dt>练习记录</dt><dd>{{ detailRow.answered }}/{{ detailRow.total }} 题已答，答对 {{ detailRow.correct }} 题</dd></div>
            <div><dt>引导状态</dt><dd>{{ detailRow.guidanceText }}</dd></div>
            <div><dt>错题</dt><dd>{{ detailRow.wrongCount }} 道（待掌握 {{ detailRow.pendingErrors }}）</dd></div>
          </dl>
          <div class="me-kn-detail__actions">
            <button class="ms-btn ms-btn--primary" :data-qa="`me-kn-practice-${detailRow.caseId}`" @click="openCase(detailRow.caseId)">去练这一组</button>
            <button class="ms-btn" @click="router.push(`/student/guide/${detailRow.caseId}`)">打开原题引导</button>
            <button class="ms-btn" @click="router.push('/student/errors')">查看错题</button>
          </div>
        </div>
      </aside>
    </section>

    <!-- ==================== 体验反馈 ==================== -->
    <section v-else-if="ms.tab === 'feedback'" class="me-panel" data-qa="me-feedback">
      <div class="ms-card me-feedback-card">
        <div class="me-block__head"><b>体验反馈</b><span>提交后写入本机记录，刷新后保留</span></div>

        <div v-if="feedbackSubmitted" class="me-feedback-done" data-qa="me-feedback-done">
          <div class="me-feedback-done__score">
            <span>你的评分</span>
            <b>{{ feedback.rating ? `${feedback.rating} / 5` : '未评分' }}</b>
            <span class="me-stars-readonly">
              <i v-for="n in 5" :key="n" :class="{ on: n <= (feedback.rating || 0) }">★</i>
            </span>
          </div>
          <p v-if="feedback.text" class="me-feedback-done__text">{{ feedback.text }}</p>
          <p v-else class="me-feedback-done__text is-muted">没有填写文字反馈。</p>
          <div class="me-feedback-done__foot">
            <span>提交于 {{ formatFull(feedback.at) }}</span>
            <button class="ms-btn ms-btn--sm" data-qa="me-feedback-edit" @click="startEditFeedback">修改反馈</button>
          </div>
        </div>

        <template v-else>
          <div class="me-feedback-form">
            <label class="me-form-row">
              <span class="me-form-label">整体评分（可选）</span>
              <span class="me-stars">
                <button
                  v-for="n in 5"
                  :key="n"
                  class="me-star"
                  :class="{ on: n <= ratingDraft }"
                  :data-qa="`me-star-${n}`"
                  @click="ratingDraft = n"
                >
                  ★
                </button>
                <span class="me-stars__hint">{{ ratingDraft ? `${ratingDraft} 分` : '点击星星评分（1–5）' }}</span>
              </span>
            </label>
            <label class="me-form-row">
              <span class="me-form-label">文字反馈（可选）</span>
              <textarea
                v-model="textDraft"
                class="me-textarea"
                rows="4"
                placeholder="哪里帮到了你？哪里还别扭？（仅保存在本机）"
                data-qa="me-feedback-text"
              ></textarea>
            </label>
            <div class="me-feedback-form__foot">
              <span v-if="feedbackError" class="me-feedback-form__err" data-qa="me-feedback-error">{{ feedbackError }}</span>
              <span v-else class="me-feedback-form__tip">评分与文字至少填写一项；提交后可修改。</span>
              <button v-if="fbState" class="ms-btn ms-btn--sm" data-qa="me-feedback-cancel" @click="cancelEditFeedback">取消修改</button>
              <button class="ms-btn ms-btn--primary" data-qa="me-feedback-submit" @click="submitFeedback">提交反馈</button>
            </div>
          </div>
        </template>
      </div>

      <div class="ms-card me-pref-card">
        <div class="me-block__head"><b>当前设置预览</b><span>主题与字号在“个人设置”里修改，学生端各页面即时生效</span></div>
        <div class="me-pref-preview">
          <span>主题：{{ themeLabel }}</span>
          <span>字号：{{ fontLabel }}</span>
          <button class="ms-btn ms-btn--sm" @click="ms.tab = 'settings'">去个人设置</button>
        </div>
      </div>
    </section>

    <!-- ==================== 个人设置 ==================== -->
    <section v-else class="me-panel me-settings" data-qa="me-settings">
      <div class="ms-card me-profile">
        <div class="me-profile__top">
          <div class="me-avatar me-avatar--lg">林</div>
          <div class="me-profile__meta">
            <b>林一川</b>
            <span>高二 (1) 班 · 演示学生</span>
            <span class="me-profile__note">昵称与班级为演示数据，只读展示；主题与字号可修改并刷新保留。</span>
          </div>
          <span class="ms-tag">身份：学生</span>
        </div>
        <dl class="me-profile__rows">
          <div><dt>昵称</dt><dd>林一川</dd></div>
          <div><dt>班级</dt><dd>高二 (1) 班</dd></div>
          <div><dt>学校</dt><dd>演示中学（离线样例）</dd></div>
          <div><dt>学号</dt><dd>20261101</dd></div>
        </dl>
      </div>

      <div class="ms-card me-pref-card">
        <div class="me-block__head"><b>显示主题</b><span>作用于学生端「练题 / 错题 / 知识库 / 资源中心 / 我的」</span></div>
        <div class="me-theme-row">
          <button
            v-for="t in themeOptions"
            :key="t.key"
            class="me-theme"
            :class="[`is-${t.key}`, { active: prefs.theme === t.key }]"
            :data-qa="`me-theme-${t.key}`"
            @click="setTheme(t.key)"
          >
            <span class="me-theme__swatch"></span>
            <span class="me-theme__name">{{ t.label }}</span>
            <span v-if="prefs.theme === t.key" class="me-theme__check">✓ 当前</span>
          </button>
        </div>
      </div>

      <div class="ms-card me-pref-card">
        <div class="me-block__head"><b>正文字号</b><span>影响题干、解析、资料原文等阅读区</span></div>
        <div class="me-font-row">
          <button
            v-for="f in fontOptions"
            :key="f.key"
            class="me-font"
            :class="{ active: prefs.font === f.key }"
            :data-qa="`me-font-${f.key}`"
            @click="setFont(f.key)"
          >
            <b>{{ f.label }}</b>
            <span>{{ f.desc }}</span>
          </button>
        </div>
        <div class="me-pref-card__foot">
          <span>设置写入本机存储（mathesis-showcase-v1），刷新后保留；主持人整场复位会恢复默认。</span>
          <button class="ms-btn ms-btn--sm" data-qa="me-pref-reset" @click="resetPrefs">恢复默认</button>
        </div>
      </div>
    </section>
  </StudentThemeScope>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import StudentThemeScope from '../../components/student/StudentThemeScope.vue'
import { groupStats, practiceGroups, practiceItems } from '../../data/practice'
import { libraryMaterials } from '../../data/library'
import { store } from '../../state/demo'

const router = useRouter()

/* ---------------- 状态 ---------------- */
function ensureMeExt() {
  if (!store.ext.studentMe || typeof store.ext.studentMe !== 'object') store.ext.studentMe = { tab: 'report', mapSelected: 'A' }
  const m = store.ext.studentMe
  if (!['report', 'map', 'feedback', 'settings'].includes(m.tab)) m.tab = 'report'
  if (!['A', 'B', 'C'].includes(m.mapSelected)) m.mapSelected = 'A'
  return m
}
const ms = ensureMeExt()

function ensurePrefs() {
  if (!store.ext.studentPrefs || typeof store.ext.studentPrefs !== 'object') {
    store.ext.studentPrefs = { theme: 'light', font: 'normal' }
  }
  if (!['light', 'warm', 'dark'].includes(store.ext.studentPrefs.theme)) store.ext.studentPrefs.theme = 'light'
  if (!['normal', 'large'].includes(store.ext.studentPrefs.font)) store.ext.studentPrefs.font = 'normal'
  return store.ext.studentPrefs
}
const prefs = ensurePrefs()

const tabs = [
  { key: 'report', label: '学情报告', icon: '📊' },
  { key: 'map', label: '掌握地图', icon: '🧠' },
  { key: 'feedback', label: '体验反馈', icon: '💬' },
  { key: 'settings', label: '个人设置', icon: '⚙️' },
]

const practiceRecords = computed(() => {
  const s = store.ext.studentPractice
  return s && s.records && typeof s.records === 'object' ? s.records : {}
})
const errors = computed(() => store.student.errors.slice())
const guidance = computed(() => store.student.guidance || {})
const libraryState = computed(() => store.ext.studentLibrary || null)
const resourcesState = computed(() => store.ext.studentResources || null)

/* ---------------- 学情报告 ---------------- */
const report = computed(() => {
  const g = guidance.value
  const started = practiceGroups.filter((c) => g[c.caseId] && g[c.caseId].uploaded).length
  const finishedSessions = practiceGroups.filter((c) => g[c.caseId] && g[c.caseId].finished)
  const finished = finishedSessions.length
  const independent = finishedSessions.filter((c) => (g[c.caseId].wrongCount || 0) === 0).length

  const answeredItems = practiceItems.filter((it) => practiceRecords.value[it.id])
  const firstPass = answeredItems.filter((it) => practiceRecords.value[it.id].firstCorrect).length
  const pendingErrors = errors.value.filter((e) => !e.mastered).length
  const seedErrors = errors.value.filter((e) => e.seed).length

  const dist = practiceGroups.map((c) => {
    const list = errors.value.filter((e) => e.caseId === c.caseId)
    const pending = list.filter((e) => !e.mastered).length
    return { caseId: c.caseId, code: c.code, knowledge: c.knowledge, count: list.length, pending }
  })
  const maxCount = Math.max(1, ...dist.map((d) => d.count))
  const errorDistribution = dist.map((d) => ({ ...d, width: `${Math.round((d.count / maxCount) * 100)}%` }))

  const advice = []
  if (pendingErrors > 0) {
    advice.push({
      title: `先清掉 ${pendingErrors} 道待掌握错题`,
      desc: '错题本支持定位原题、重开引导和标记掌握；重开后先独立重做，再回来标记。',
      action: '去错题本',
      to: '/student/errors',
    })
  }
  const practiceTodo = answeredItems.filter((it) => practiceRecords.value[it.id].status !== 'correct').length
  if (practiceTodo > 0) {
    advice.push({
      title: `练题里还有 ${practiceTodo} 题最近一次未答对`,
      desc: '在练题页对同一道题“再答一次”，对照错因反馈改到能复述关键一步。',
      action: '去练题',
      to: '/student/practice',
    })
  }
  if (finished < 3) {
    advice.push({
      title: `还有 ${3 - finished} 道演示题没有完成引导`,
      desc: '引导解题会先问你、再推进，不直接给答案；完成后独立解题率才有统计口径。',
      action: '去首页上传题图',
      to: '/student/dialog',
    })
  }
  const libraryNew = libraryMaterials.filter((m) => !(libraryStoreReady(m.id))).length
  if (libraryState.value && libraryNew > 0) {
    advice.push({
      title: `知识库里还有 ${libraryNew} 份资料未入库`,
      desc: '入库后可以查看切片、选中资料提问，并按引用定位回原文段落。',
      action: '去知识库',
      to: '/student/library',
    })
  }
  if (!advice.length) {
    advice.push({
      title: '本演示范围内的待办已清空',
      desc: '可以自由查看知识库、资源中心，或回到首页重做任意一道演示题。',
      action: '回到首页',
      to: '/student/dialog',
    })
  }

  const todayActions = []
  if (pendingErrors > 0) {
    todayActions.push({ icon: '📕', title: `复习 ${pendingErrors} 道待掌握错题`, desc: '定位原题 → 重开引导 → 标记掌握', to: '/student/errors' })
  }
  if (practiceTodo > 0 || answeredItems.length === 0) {
    todayActions.push({ icon: '✏️', title: '完成一组举一反三变式', desc: '三道演示题各有一组变式，判分后保留记录', to: '/student/practice' })
  }
  if (finished < 3) {
    todayActions.push({ icon: '🎯', title: '继续引导解题', desc: `已完成 ${finished}/3 道；引导不直接泄底`, to: '/student/dialog' })
  }
  if (libraryState.value && libraryNew > 0) {
    todayActions.push({ icon: '📚', title: '把知识库资料入库', desc: '入库 → 查看切片 → 选中提问 → 引用定位', to: '/student/library' })
  }
  if (!todayActions.length) {
    todayActions.push({ icon: '📺', title: '打开资源中心看看', desc: '本地讲义可直接阅读；视频条目会说明演示包未含文件', to: '/student/resources' })
  }

  return {
    guidanceStarted: started,
    guidanceFinished: finished,
    independentCount: independent,
    practiceAnswered: answeredItems.length,
    practiceTotal: practiceItems.length,
    practiceFirstPass: firstPass,
    errorCount: errors.value.length,
    pendingErrors,
    seedErrors,
    errorDistribution,
    advice,
    todayActions,
  }
})

function libraryStoreReady(materialId) {
  const s = store.ext.studentLibrary
  return !!(s && s.materials && s.materials[materialId] && s.materials[materialId].status === 'ready')
}

const independence = computed(() => (report.value.guidanceFinished ? Math.round((report.value.independentCount / report.value.guidanceFinished) * 100) : null))
const hasAnyData = computed(() => {
  const g = guidance.value
  const guidanceStarted = practiceGroups.some((c) => g[c.caseId] && g[c.caseId].uploaded)
  const practiceAny = Object.keys(practiceRecords.value).length > 0
  const lib = libraryState.value
  const res = resourcesState.value
  const libraryAny = !!(lib && ((lib.chat || []).length || Object.keys(lib.materials || {}).length))
  const resourcesAny = !!(res && ((res.readLectures || []).length || (res.videoNoticesSeen || []).length))
  return guidanceStarted || practiceAny || errors.value.length > 0 || libraryAny || resourcesAny
})

/* ---------------- 掌握地图 ---------------- */
const masteryRows = computed(() =>
  practiceGroups.map((g) => {
    const st = groupStats(g.caseId, practiceRecords.value)
    const sess = guidance.value[g.caseId] || {}
    const list = errors.value.filter((e) => e.caseId === g.caseId)
    const pending = list.filter((e) => !e.mastered).length
    const statusKey = st.answered === 0 ? 'todo' : st.score >= 80 ? 'ok' : st.score >= 40 ? 'mid' : 'low'
    const status = { todo: '未开始', ok: '已掌握', mid: '待加强', low: '薄弱' }[statusKey]
    const guidanceText = sess.finished ? '已完成' : sess.uploaded ? '进行中' : '未开始'
    return { ...g, ...st, status, statusKey, guidanceFinished: !!sess.finished, guidanceText, wrongCount: list.length, pendingErrors: pending }
  }),
)
const noPracticeRows = computed(() => masteryRows.value.filter((r) => r.answered > 0))
const startedCount = computed(() => masteryRows.value.filter((r) => r.answered > 0 || r.guidanceFinished).length)
const overallMastery = computed(() => {
  const rows = masteryRows.value.filter((r) => r.answered > 0)
  if (!rows.length) return 0
  return Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length)
})
const donutBg = computed(() => {
  const pct = startedCount.value ? overallMastery.value : 0
  return `conic-gradient(var(--brand) 0 ${pct}%, var(--bg2) ${pct}% 100%)`
})
const detailRow = computed(() => masteryRows.value.find((r) => r.caseId === ms.mapSelected) || masteryRows.value[0])

function openCase(caseId) {
  ms.mapSelected = caseId
  router.push(`/student/practice?case=${caseId}`)
}

/* ---------------- 体验反馈 ---------------- */
/** 反馈区：提交后展示；点“修改反馈”进入编辑态（原记录保留到重新提交）。 */
const fbState = computed(() => {
  const s = store.ext.studentPractice
  return s && s.feedback && typeof s.feedback === 'object' ? s.feedback : null
})
const editingFeedback = ref(false)
const feedbackSubmitted = computed(() => !!fbState.value && !editingFeedback.value)
const feedback = computed(() => fbState.value || { rating: 0, text: '', at: null })
const ratingDraft = ref(0)
const textDraft = ref('')
const feedbackError = ref('')

function ensurePracticeExt() {
  if (!store.ext.studentPractice || typeof store.ext.studentPractice !== 'object') store.ext.studentPractice = {}
  return store.ext.studentPractice
}
function startEditFeedback() {
  ratingDraft.value = feedback.value.rating || 0
  textDraft.value = feedback.value.text || ''
  feedbackError.value = ''
  editingFeedback.value = true
}
function cancelEditFeedback() {
  editingFeedback.value = false
  feedbackError.value = ''
}
function submitFeedback() {
  if (!ratingDraft.value && !textDraft.value.trim()) {
    feedbackError.value = '请至少选择一个评分，或填写一段文字反馈。'
    return
  }
  feedbackError.value = ''
  const s = ensurePracticeExt()
  s.feedback = {
    rating: ratingDraft.value,
    text: textDraft.value.trim(),
    at: Date.now(),
  }
  editingFeedback.value = false
}

/* ---------------- 个人设置 ---------------- */
const themeLabel = computed(() => ({ light: '浅色', warm: '暖色', dark: '深色' }[prefs.theme] || '浅色'))
const fontLabel = computed(() => ({ normal: '标准', large: '大字' }[prefs.font] || '标准'))
const themeOptions = [
  { key: 'light', label: '浅色（默认）' },
  { key: 'warm', label: '暖色' },
  { key: 'dark', label: '深色' },
]
const fontOptions = [
  { key: 'normal', label: '标准字号', desc: '题干 / 解析 14px' },
  { key: 'large', label: '大字', desc: '题干 / 解析 16px' },
]
function setTheme(theme) {
  const p = ensurePrefs()
  p.theme = theme
}
function setFont(font) {
  const p = ensurePrefs()
  p.font = font
}
function resetPrefs() {
  const p = ensurePrefs()
  p.theme = 'light'
  p.font = 'normal'
}

/* ---------------- 通用 ---------------- */
function formatFull(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
.page.me {
  padding: 22px 30px 40px;
}
.me-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 12px;
}
.me-head .page-title {
  margin-bottom: 2px;
}
.me-head .page-sub {
  margin-bottom: 0;
  font-size: 13px;
  color: var(--ink2);
}
.me-head__profile {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 14px 7px 8px;
  border-radius: 99px;
  border: 1px solid var(--line);
  background: var(--card);
}
.me-head__profile b {
  display: block;
  font-size: 13px;
  line-height: 1.3;
}
.me-head__profile span {
  font-size: 11px;
  color: var(--ink3);
}
.me-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 800;
  font-size: 14px;
  background: linear-gradient(135deg, var(--brand), var(--brand2));
  flex: none;
}
.me-avatar--lg {
  width: 52px;
  height: 52px;
  font-size: 21px;
}
.me-tabs {
  display: flex;
  gap: 9px;
  margin-bottom: 13px;
  flex-wrap: wrap;
}
.me-tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  border-radius: 99px;
  border: 1px solid var(--line);
  background: var(--card);
  font-size: 13px;
  color: var(--ink2);
  transition: all 0.15s ease;
}
.me-tab:hover {
  border-color: var(--brand);
  color: var(--brand-deep);
}
.me-tab.active {
  border-color: var(--brand);
  background: var(--brand-soft);
  color: var(--brand-deep);
  font-weight: 700;
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
}
.me-panel {
  display: flex;
  flex-direction: column;
  gap: 13px;
}
.me-empty {
  padding: 46px 26px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.me-empty b {
  font-size: 16px;
}
.me-empty p {
  margin: 0;
  max-width: 560px;
  font-size: 12.8px;
  line-height: 1.8;
  color: var(--ink3);
}
.me-empty__actions {
  display: flex;
  gap: 10px;
  margin-top: 6px;
}
.me-stat-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.me-stat {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.me-stat > span {
  font-size: 11.5px;
  color: var(--ink3);
}
.me-stat b {
  font-size: 23px;
  font-family: var(--font-num, inherit);
  color: var(--ink);
  line-height: 1.25;
}
.me-stat b.is-muted {
  color: var(--ink3);
}
.me-stat b.is-warn {
  color: var(--warn-deep);
}
.me-stat b small {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--ink3);
}
.me-stat i {
  font-style: normal;
  font-size: 10.8px;
  color: var(--ink3);
}
.me-report-grid {
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: 13px;
  align-items: stretch;
}
.me-block {
  padding: 15px 18px;
}
.me-block__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.me-block__head b {
  font-size: 14px;
}
.me-block__head span {
  font-size: 11px;
  color: var(--ink3);
}
.me-block__note {
  margin: 8px 0 0;
  font-size: 11.3px;
  line-height: 1.7;
  color: var(--ink3);
}
.me-block__empty {
  font-size: 12.3px;
  color: var(--ink3);
  padding: 12px 0;
}
.me-dist {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12.3px;
  margin-bottom: 8px;
}
.me-dist__name {
  width: 128px;
  flex: none;
  color: var(--ink2);
}
.me-dist__track {
  flex: 1;
  height: 8px;
  border-radius: 99px;
  background: var(--bg2);
  overflow: hidden;
}
.me-dist__track em {
  display: block;
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, var(--err), #f59e0b);
}
.me-dist__val {
  width: 40px;
  flex: none;
  text-align: right;
  font-weight: 700;
  color: var(--ink);
}
.me-dist__pending {
  width: 72px;
  flex: none;
  font-size: 10.8px;
  color: var(--ink3);
}
.me-advice {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.me-advice li {
  display: flex;
  gap: 9px;
  align-items: flex-start;
}
.me-advice__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--brand);
  margin-top: 6px;
  flex: none;
}
.me-advice b {
  font-size: 12.8px;
}
.me-advice p {
  margin: 2px 0 4px;
  font-size: 11.8px;
  line-height: 1.75;
  color: var(--ink3);
}
.me-advice__go {
  border: 0;
  background: none;
  color: var(--brand-deep);
  font-size: 11.5px;
  font-weight: 600;
  padding: 0;
}
.me-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.me-action {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 11px 13px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: var(--card);
  text-align: left;
}
.me-action:hover {
  border-color: var(--brand);
  background: var(--brand-soft);
}
.me-action__ico {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: var(--brand-soft);
  display: grid;
  place-items: center;
  font-size: 15px;
  flex: none;
}
.me-action__body {
  flex: 1;
  min-width: 0;
}
.me-action__body b {
  display: block;
  font-size: 12.8px;
}
.me-action__body small {
  font-size: 11px;
  color: var(--ink3);
}
.me-action__go {
  color: var(--ink3);
}

/* ---------- 掌握地图 ---------- */
.me-map {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 13px;
  align-items: start;
}
.me-map__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.me-map__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 2px;
}
.me-map__head b {
  font-size: 14px;
}
.me-map__head span {
  font-size: 11px;
  color: var(--ink3);
}
.me-kn {
  text-align: left;
  padding: 13px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--card);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
.me-kn:hover {
  border-color: var(--brand);
}
.me-kn.active {
  border-color: var(--brand);
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.12);
}
.me-kn__top {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.me-kn__name {
  font-size: 14.5px;
  font-weight: 800;
  color: var(--ink);
}
.me-kn__status {
  margin-left: auto;
  font-size: 10.5px;
  font-weight: 700;
  padding: 2px 9px;
  border-radius: 99px;
}
.me-kn__status.is-todo {
  background: var(--bg2);
  color: var(--ink3);
}
.me-kn__status.is-ok {
  background: var(--ok-bg);
  color: var(--ok-deep);
}
.me-kn__status.is-mid {
  background: var(--warn-bg);
  color: var(--warn-deep);
}
.me-kn__status.is-low {
  background: var(--err-bg);
  color: var(--err-deep);
}
.me-kn__bar {
  height: 9px;
  border-radius: 99px;
  background: var(--bg2);
  overflow: hidden;
}
.me-kn__bar em {
  display: block;
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, var(--brand), var(--brand2));
  transition: width 0.3s ease;
}
.me-kn__meta {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  font-size: 11.3px;
  color: var(--ink3);
}
.me-kn__enter {
  margin-left: auto;
  color: var(--brand-deep);
  font-weight: 600;
  cursor: pointer;
}
.me-map__side {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.me-donut-card {
  padding: 15px 18px;
}
.me-donut {
  width: 158px;
  height: 158px;
  border-radius: 50%;
  margin: 12px auto;
  display: grid;
  place-items: center;
}
.me-donut__inner {
  width: 118px;
  height: 118px;
  border-radius: 50%;
  background: var(--card);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line);
}
.me-donut__inner b {
  font-size: 26px;
  font-family: var(--font-num, inherit);
}
.me-donut__inner b small {
  font-size: 13px;
  color: var(--ink3);
}
.me-donut__inner span {
  font-size: 10.5px;
  color: var(--ink3);
}
.me-kn-detail {
  padding: 15px 18px;
}
.me-kn-detail dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px 12px;
  margin: 0 0 12px;
}
.me-kn-detail dt {
  font-size: 10.5px;
  color: var(--ink3);
}
.me-kn-detail dd {
  margin: 1px 0 0;
  font-size: 12.3px;
  color: var(--ink);
  font-weight: 600;
}
.me-kn-detail__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* ---------- 体验反馈 ---------- */
.me-feedback-card,
.me-pref-card {
  padding: 16px 18px;
}
.me-feedback-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.me-form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.me-form-label {
  font-size: 11.8px;
  color: var(--ink3);
}
.me-stars {
  display: flex;
  align-items: center;
  gap: 4px;
}
.me-star {
  border: 0;
  background: none;
  font-size: 25px;
  line-height: 1;
  color: var(--line);
  padding: 0 2px;
}
.me-star.on {
  color: #f59e0b;
}
.me-stars__hint {
  margin-left: 8px;
  font-size: 11.3px;
  color: var(--ink3);
}
.me-textarea {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 9px 12px;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.8;
  color: var(--ink);
  background: var(--card);
  outline: none;
  resize: vertical;
}
.me-textarea:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
}
.me-feedback-form__foot {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.me-feedback-form__tip {
  flex: 1;
  font-size: 11.3px;
  color: var(--ink3);
}
.me-feedback-form__err {
  flex: 1;
  font-size: 11.8px;
  color: var(--err-deep);
}
.me-feedback-done {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.me-feedback-done__score {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 11.5px;
  color: var(--ink3);
}
.me-feedback-done__score b {
  font-size: 19px;
  color: var(--warn-deep);
}
.me-stars-readonly i {
  font-style: normal;
  color: var(--line);
  font-size: 16px;
}
.me-stars-readonly i.on {
  color: #f59e0b;
}
.me-feedback-done__text {
  margin: 0;
  padding: 11px 13px;
  border-radius: 10px;
  background: var(--bg2);
  font-size: 13px;
  line-height: 1.85;
  color: var(--ink2);
  white-space: pre-wrap;
}
.me-feedback-done__text.is-muted {
  color: var(--ink3);
}
.me-feedback-done__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 11px;
  color: var(--ink3);
}
.me-pref-preview {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12.3px;
  color: var(--ink3);
  flex-wrap: wrap;
}
/* ---------- 个人设置 ---------- */
.me-profile {
  padding: 16px 18px;
}
.me-profile__top {
  display: flex;
  align-items: center;
  gap: 13px;
  flex-wrap: wrap;
}
.me-profile__meta {
  flex: 1;
  min-width: 200px;
}
.me-profile__meta b {
  display: block;
  font-size: 16px;
}
.me-profile__meta span {
  display: block;
  font-size: 12px;
  color: var(--ink3);
}
.me-profile__note {
  margin-top: 2px;
  font-size: 11px !important;
}
.me-profile__rows {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px 14px;
  margin: 14px 0 0;
  padding-top: 13px;
  border-top: 1px solid var(--line2, var(--line));
}
.me-profile__rows dt {
  font-size: 10.8px;
  color: var(--ink3);
}
.me-profile__rows dd {
  margin: 2px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}
.me-theme-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.me-theme {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 13px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: var(--card);
  font-size: 12.8px;
  color: var(--ink2);
}
.me-theme.active {
  border-color: var(--brand);
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.12);
  color: var(--brand-deep);
  font-weight: 700;
}
.me-theme__swatch {
  width: 30px;
  height: 20px;
  border-radius: 5px;
  border: 1px solid var(--line);
  flex: none;
}
.me-theme.is-light .me-theme__swatch {
  background: linear-gradient(135deg, #ffffff, #f8fafc);
}
.me-theme.is-warm .me-theme__swatch {
  background: linear-gradient(135deg, #fffaf2, #f6ead9);
}
.me-theme.is-dark .me-theme__swatch {
  background: linear-gradient(135deg, #172033, #0f172a);
}
.me-theme__check {
  margin-left: auto;
  font-size: 10.5px;
  color: var(--brand-deep);
}
.me-font-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.me-font {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
  padding: 11px 13px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: var(--card);
  color: var(--ink2);
}
.me-font.active {
  border-color: var(--brand);
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.12);
}
.me-font b {
  font-size: 14px;
}
.me-font span {
  font-size: 11px;
  color: var(--ink3);
}
.me-pref-card__foot {
  margin-top: 13px;
  padding-top: 11px;
  border-top: 1px solid var(--line2, var(--line));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 11px;
  color: var(--ink3);
  flex-wrap: wrap;
}
</style>
