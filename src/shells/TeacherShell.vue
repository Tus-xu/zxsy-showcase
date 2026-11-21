<template>
  <div class="tv3-app">
    <aside class="tv3-nav">
      <div class="tv3-nav__brand">
        <div class="tv3-nav__brand-badge">∫</div>
        <div>
          <div class="tv3-nav__brand-title">教师工作台</div>
          <div class="tv3-nav__brand-sub">智学数研 · AI 备课教学</div>
        </div>
      </div>

      <div class="tv3-nav__group-label">每日教学</div>
      <button
        v-for="m in dailyMenus"
        :key="m.path"
        class="tv3-nav__item tv3-nav__item--btn"
        :class="{ 'is-active': isActive(m.path) }"
        @click="go(m.path)"
      >
        <span class="tv3-nav__icon" v-html="m.icon"></span>{{ m.label }}
      </button>

      <div class="tv3-nav__group-label">资源与测评</div>
      <button
        v-for="m in assessMenus"
        :key="m.path"
        class="tv3-nav__item tv3-nav__item--btn"
        :class="{ 'is-active': isActive(m.path) }"
        @click="go(m.path)"
      >
        <span class="tv3-nav__icon" v-html="m.icon"></span>{{ m.label }}
      </button>

      <div class="tv3-nav__footer"></div>
    </aside>

    <div class="tv3-main">
      <header class="tv3-topbar">
        <div>
          <div class="tv3-topbar__title">{{ pageTitle }}</div>
          <div class="tv3-topbar__sub">{{ pageSub }}</div>
        </div>
        <span class="tv3-tag tv3-tag--ai">AI 助教已就绪</span>
        <div class="tv3-topbar__spacer" />
        <div class="tv3-topbar__tasks">
          <button class="tv3-btn tv3-btn--sm" type="button" @click.stop="taskOpen = !taskOpen">
            <span class="tv3-nav__icon" v-html="ICON.bell"></span>
            任务
            <span v-if="runningTasks > 0" class="tv3-bell-badge">{{ runningTasks }}</span>
          </button>
          <div v-if="taskOpen" class="tv3-topbar__taskpanel" @click.stop>
            <div class="tv3-topbar__taskpanel-head">后台任务</div>
            <div v-for="t in tasks" :key="t.id" class="tv3-topbar__taskitem">
              <span class="tv3-tag" :class="t.status === 'succeeded' ? 'tv3-tag--ok' : t.status === 'failed' ? 'tv3-tag--danger' : 'tv3-tag--primary'">
                {{ t.status === 'succeeded' ? '完成' : t.status === 'failed' ? '失败' : t.status === 'running' ? '进行中' : '排队' }}
              </span>
              <span class="tv3-topbar__taskitem-title">{{ t.title }}</span>
              <div v-if="t.status === 'running'" class="tv3-progress" style="flex: 1">
                <div class="tv3-progress__bar" :style="{ width: t.progress + '%' }" />
              </div>
            </div>
          </div>
        </div>
        <div class="tv3-teacher-chip" style="cursor: pointer" @click.stop="userMenu = !userMenu">
          <div class="tv3-teacher-chip__avatar">张</div>
          <div class="tv3-teacher-chip__meta">
            <div class="tv3-teacher-chip__name">张老师</div>
            <div class="tv3-teacher-chip__sub">高中数学 · 教师</div>
          </div>
        </div>
      </header>

      <div v-if="userMenu" class="tv3-user-menu" @click.stop>
        <button class="tv3-user-menu__item" @click="go('/teacher/prep')">进入备课中心</button>
        <button class="tv3-user-menu__item tv3-user-menu__item--danger" @click="switchRole">切换演示身份</button>
      </div>

      <main class="tv3-page" :class="{ 'tv3-page--prep': isPrepCenter }">
        <ErrorBoundary>
          <router-view />
        </ErrorBoundary>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ErrorBoundary from '../components/ErrorBoundary.vue'

const route = useRoute()
const router = useRouter()
const taskOpen = ref(false)
const userMenu = ref(false)
document.addEventListener('click', () => {
  taskOpen.value = false
  userMenu.value = false
})

const ICON = {
  book: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5v16"/></svg>',
  school: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3 2 8l10 5 10-5z"/><path d="M6 10v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/></svg>',
  library: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="16" rx="1"/><path d="m17 5 4 1.2-3.6 13.4-4-1.1z"/></svg>',
  clipboard: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2.8h6V4"/><path d="M8.5 9h7M8.5 13h7M8.5 17h4"/></svg>',
  stats: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  folder: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  bell: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
}

const dailyMenus = [
  { path: '/teacher/prep', label: '备课中心', icon: ICON.book },
  { path: '/teacher/classroom', label: '课堂', icon: ICON.school },
]
const assessMenus = [
  { path: '/teacher/bank', label: '题库与组卷', icon: ICON.library },
  { path: '/teacher/assign', label: '作业与批改', icon: ICON.clipboard },
  { path: '/teacher/insights', label: '学情洞察', icon: ICON.stats },
  { path: '/teacher/resources', label: '资源中心', icon: ICON.folder },
]

const tasks = [
  { id: 1, title: '课件导出（椭圆及其标准方程）', status: 'succeeded', progress: 100 },
  { id: 2, title: '作业批改建议生成 · 3 份', status: 'running', progress: 62 },
]
const runningTasks = computed(() => tasks.filter((t) => t.status === 'running' || t.status === 'queued').length)

const isPrepCenter = computed(() => /^\/teacher\/prep(\/.*)?$/.test(route.path))
const isActive = (p) => (p === '/teacher/prep' ? route.path.startsWith('/teacher/prep') : route.path === p)
const subTitles = {
  '/teacher/today': 'AI 助手 · 今日教学 · 最近工作',
  '/teacher/prep': '多轮对话 · 教材学情 · 教案课件一体生成',
  '/teacher/prep/history': '历史备课 · 继续编辑 · 复用蓝图',
  '/teacher/bank': '分类树 · 专题夹 · 拍照/自编入库',
  '/teacher/assign': '四步发布 · 学前/课后 · 批改终审',
  '/teacher/grading': '题聚焦 · 匿名队列 · 原图终审',
  '/teacher/classroom': '双师课堂 · 实时互动 · 班级',
  '/teacher/insights': '热力图 · 错因 · 诊断',
  '/teacher/resources': '资源 · 数学识别 · 构造配方库',
}
const pageTitle = computed(() => route.meta.title || '教师工作台')
const pageSub = computed(() => subTitles[route.path] || '高二年级 · 2026 秋季学期')

function go(path) {
  router.push(path)
}
function switchRole() {
  router.push('/login')
}
</script>

<style scoped>
.tv3-nav__item--btn {
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 9px;
}
.tv3-nav__icon {
  display: inline-flex;
  align-items: center;
  color: currentColor;
}
.tv3-nav__footer {
  flex: 1;
}
.tv3-user-menu {
  position: absolute;
  right: 26px;
  top: 62px;
  z-index: 80;
  background: #fff;
  border: 1px solid var(--tv3-line, #e2e8f0);
  border-radius: 12px;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.14);
  padding: 6px;
  min-width: 160px;
}
.tv3-user-menu__item {
  display: block;
  width: 100%;
  border: 0;
  background: none;
  text-align: left;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12.5px;
  color: var(--tv3-ink, #0f172a);
}
.tv3-user-menu__item:hover {
  background: var(--tv3-bg2, #f1f5f9);
}
.tv3-user-menu__item--danger {
  color: #dc2626;
}
.tv3-topbar {
  position: relative;
}

/* 教师壳层：从原 TeacherV3Layout 迁移的局部样式（原样式是组件 scoped，vendor CSS 中不存在） */
.tv3-bell-badge {
  min-width: 16px;
  height: 16px;
  border-radius: 999px;
  background: var(--tv3-rose, #e11d48);
  color: #fff;
  font-size: 10.5px;
  font-weight: 700;
  display: inline-grid;
  place-items: center;
  padding: 0 4px;
  font-family: var(--tv3-font-num, 'Inter', sans-serif);
  margin-left: 3px;
}
.tv3-teacher-chip {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 4px 10px 4px 4px;
  border-radius: 999px;
  background: var(--tv3-bg2, #f1f5f9);
  flex: none;
  white-space: nowrap;
}
.tv3-teacher-chip__avatar {
  width: 30px;
  height: 30px;
  flex: none;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--tv3-navy, #1e3a8a), var(--tv3-gold, #f59e0b));
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 700;
}
.tv3-teacher-chip__meta {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
  min-width: 0;
}
.tv3-teacher-chip__name {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--tv3-ink, #0f172a);
}
.tv3-teacher-chip__sub {
  font-size: 10.5px;
  color: var(--tv3-ink3, #94a3b8);
}
.tv3-topbar__tasks {
  position: relative;
  flex: none;
}
.tv3-topbar__taskpanel {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  z-index: 90;
  width: 380px;
  background: var(--tv3-card, #fff);
  border: 1px solid var(--tv3-line, #e2e8f0);
  border-radius: var(--tv3-radius-lg, 14px);
  box-shadow: var(--tv3-shadow-lg, 0 18px 44px rgba(15, 23, 42, 0.16));
  padding: 12px;
}
.tv3-topbar__taskpanel-head {
  font-size: 12.5px;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--tv3-ink2, #334155);
}
.tv3-topbar__taskitem {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 6px;
  border-radius: 8px;
}
.tv3-topbar__taskitem:hover {
  background: var(--tv3-bg2, #f1f5f9);
}
.tv3-topbar__taskitem-title {
  font-size: 12.5px;
  color: var(--tv3-ink, #0f172a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 170px;
}
.tv3-progress {
  height: 6px;
  background: var(--tv3-line, #e2e8f0);
  border-radius: 999px;
  overflow: hidden;
}
.tv3-progress__bar {
  height: 100%;
  background: var(--tv3-primary, #4f46e5);
  border-radius: 999px;
  transition: width 0.3s ease;
}
</style>
