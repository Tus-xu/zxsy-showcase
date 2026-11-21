<template>
  <div v-if="open" class="ms-host" @click.self="open = false">
    <div class="ms-host__panel">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px">
        <h3>主持人工具</h3>
        <button class="ms-host__close" @click="open = false">关闭 (Esc)</button>
      </div>
      <div class="sub">快捷键 Ctrl + Shift + H · 仅主持人使用，嘉宾界面不展示</div>

      <div class="ms-host__section">
        <h4>身份切换</h4>
        <div class="ms-host__row">
          <button class="ms-host__btn" @click="go('/student/dialog')">学生端</button>
          <button class="ms-host__btn" @click="go('/teacher/prep')">教师端</button>
          <button class="ms-host__btn" @click="go('/research')">科研端</button>
          <button class="ms-host__btn" @click="go('/login')">演示登录</button>
        </div>
      </div>

      <div class="ms-host__section">
        <h4>三题检查点（学生引导解题）</h4>
        <div class="ms-host__list">
          <div v-for="c in cases" :key="c.id" class="ms-host__item">
            <span>{{ c.code }} · {{ c.title }}</span>
            <span style="display: flex; gap: 6px">
              <button @click="go(`/student/guide/${c.id}`)">进入</button>
              <button @click="resetCase(c.id)">复位</button>
            </span>
          </div>
        </div>
      </div>

      <div class="ms-host__section">
        <h4>全场景检查点</h4>
        <div class="ms-host__list">
          <div v-for="s in checkpoints" :key="s.path" class="ms-host__item">
            <span>{{ s.label }}</span>
            <button @click="go(s.path)">进入</button>
          </div>
        </div>
      </div>

      <div class="ms-host__section">
        <h4>三张原图位置（上传时从文件选择器选择）</h4>
        <div class="ms-host__hint">
          发行包三张原图：<br />
          <span class="ms-host__code">素材\题1.png</span>（案例 A 双曲线）<br />
          <span class="ms-host__code">素材\题2.png</span>（案例 B 正三棱柱）<br />
          <span class="ms-host__code">素材\题3.png</span>（案例 C 有放回取球）<br />
          原始采证副本：<span class="ms-host__code">D:\zxsy-math-arena\docs\superpowers\plans\题1..3.png</span>（按 SHA-256 绑定，改名不影响）
        </div>
      </div>

      <div class="ms-host__section">
        <h4>复位与内部状态</h4>
        <div class="ms-host__row" style="margin-bottom: 10px">
          <button class="ms-host__btn" @click="resetStudentAll">复位学生端</button>
          <button class="ms-host__btn" @click="resetTeacherAll">复位教师端</button>
          <button class="ms-host__btn" @click="resetResearchAll">复位科研端</button>
          <button class="ms-host__btn ms-host__btn--danger" @click="resetEverything">整场复位</button>
        </div>
        <div class="ms-host__hint">
          网络尝试次数（应为 0）：<b style="color: #86efac">{{ netAttempts }}</b><br />
          上次复位：{{ lastResetText }}<br />
          持久化命名空间：<span class="ms-host__code">mathesis-showcase-v1</span>
        </div>
      </div>
    </div>
  </div>
  <button v-if="fabVisible" class="ms-host-fab" title="主持人工具（Ctrl+Shift+H）" @click="open = true">⚙</button>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { guidanceCases } from '../data/guidance'
import { resetAll, resetGuidance, resetResearch, resetStudent, resetTeacher, store } from '../state/demo'

/** 场景实现把状态写在 store.ext.<命名空间>；复位对应端时一并清理，保证“复位后重演”真实从零开始。 */
const EXT_KEYS = {
  student: ['studentPractice', 'studentErrors', 'studentLibrary', 'studentResources', 'studentPrefs', 'studentMe', 'studentClassroom'],
  teacher: ['teacherPrep', 'teacherGrading'],
  research: ['researchUi'],
}

const router = useRouter()
const open = ref(false)
/** 嘉宾界面不展示主持人浮标（避免与 AI 管家重叠/遮挡）；主持人用 Ctrl+Shift+H 或登录页入口打开。
 *  仅当 URL 带 ?host=1 或 hash 含 host=1 时显示浮标，便于彩排/验收。 */
const fabVisible = ref(
  typeof window !== 'undefined' && /[?&#]host=1/.test(window.location.href + window.location.hash),
)
const cases = guidanceCases

const checkpoints = [
  { label: '学生 · 首页 / 上传入口', path: '/student/dialog' },
  { label: '学生 · 练题（举一反三）', path: '/student/practice' },
  { label: '学生 · 错题本', path: '/student/errors' },
  { label: '学生 · 知识库', path: '/student/library' },
  { label: '学生 · 课堂（已发布课件）', path: '/student/classroom' },
  { label: '学生 · 双师课堂（打开课件）', path: '/student/dual/dual-deck-0' },
  { label: '教师 · 备课中心', path: '/teacher/prep' },
  { label: '教师 · 课件工作台', path: '/teacher/prep/w/prep-ellipse/ppt' },
  { label: '教师 · 教案工作台', path: '/teacher/prep/w/prep-ellipse/plan' },
  { label: '教师 · 作业批改', path: '/teacher/grading' },
  { label: '科研 · 阅读与溯源', path: '/research/read' },
  { label: '科研 · 写作与编译', path: '/research/write' },
]

const netAttempts = computed(() => (window.__MATHSIS_NET_LOG__ ? window.__MATHSIS_NET_LOG__.length : 0))
const lastResetText = computed(() => (store.host.lastResetAt ? new Date(store.host.lastResetAt).toLocaleString() : '未复位'))

function go(path) {
  open.value = false
  router.push(path)
}
function clearExt(keys) {
  for (const k of keys) {
    if (store.ext) delete store.ext[k]
  }
}
function resetStudentAll() {
  resetStudent()
  clearExt(EXT_KEYS.student)
}
function resetTeacherAll() {
  resetTeacher()
  clearExt(EXT_KEYS.teacher)
}
function resetResearchAll() {
  resetResearch()
  clearExt(EXT_KEYS.research)
}
function resetCase(id) {
  resetGuidance(id)
}
function resetEverything() {
  resetAll()
  if (window.__MATHSIS_NET_LOG__) window.__MATHSIS_NET_LOG__.length = 0
}

function onKeydown(e) {
  if (e.ctrlKey && e.shiftKey && (e.key === 'H' || e.key === 'h')) {
    e.preventDefault()
    open.value = !open.value
  }
  if (e.key === 'Escape') open.value = false
}
function onOpenHost() {
  open.value = true
}
onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('ms-open-host', onOpenHost)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('ms-open-host', onOpenHost)
})
</script>
