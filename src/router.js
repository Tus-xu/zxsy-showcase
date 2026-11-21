import { createRouter, createWebHashHistory } from 'vue-router'
import Login from './ends/Login.vue'

import StudentShell from './shells/StudentShell.vue'
import TeacherShell from './shells/TeacherShell.vue'
import ResearchShell from './shells/ResearchShell.vue'

// 学生端
import StudentHome from './ends/student/StudentHome.vue'
import GuideView from './ends/student/GuideView.vue'
import PracticeView from './ends/student/PracticeView.vue'
import ErrorsView from './ends/student/ErrorsView.vue'
import LibraryView from './ends/student/LibraryView.vue'
import ResourcesView from './ends/student/ResourcesView.vue'
import ClassroomView from './ends/student/ClassroomView.vue'
import DualView from './ends/student/DualView.vue'
import MeView from './ends/student/MeView.vue'

// 教师端
import TeacherToday from './ends/teacher/TeacherToday.vue'
import PrepCenter from './ends/teacher/PrepCenter.vue'
import PrepHistory from './ends/teacher/PrepHistory.vue'
import PrepWorkbench from './ends/teacher/PrepWorkbench.vue'
import GradingView from './ends/teacher/GradingView.vue'
import TeacherClassroom from './ends/teacher/TeacherClassroom.vue'
import TeacherInsights from './ends/teacher/TeacherInsights.vue'
import TeacherBank from './ends/teacher/TeacherBank.vue'
import TeacherAssign from './ends/teacher/TeacherAssign.vue'
import TeacherResources from './ends/teacher/TeacherResources.vue'

// 科研端
import ResearchHome from './ends/research/ResearchHome.vue'
import ResearchRead from './ends/research/ResearchRead.vue'
import ResearchWrite from './ends/research/ResearchWrite.vue'

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'login', component: Login, meta: { public: true, title: '演示登录' }, alias: ['/auth/login'] },

  {
    path: '/student',
    component: StudentShell,
    meta: { shell: 'student' },
    children: [
      { path: '', redirect: '/student/dialog' },
      { path: 'dialog', name: 'student-home', component: StudentHome, meta: { shell: 'student', title: '首页' } },
      { path: 'guide/:caseId', name: 'student-guide', component: GuideView, meta: { shell: 'student', title: '引导解题' } },
      { path: 'practice', name: 'student-practice', component: PracticeView, meta: { shell: 'student', title: '练题' } },
      { path: 'errors', name: 'student-errors', component: ErrorsView, meta: { shell: 'student', title: '错题' } },
      { path: 'library', name: 'student-library', component: LibraryView, meta: { shell: 'student', title: '知识库' } },
      { path: 'resources', name: 'student-resources', component: ResourcesView, meta: { shell: 'student', title: '资源中心' } },
      { path: 'classroom', name: 'student-classroom', component: ClassroomView, meta: { shell: 'student', title: '课堂' } },
      { path: 'dual/:sessionId', name: 'student-dual', component: DualView, meta: { shell: 'student', title: '双师课堂', immersive: true } },
      { path: 'me', name: 'student-me', component: MeView, meta: { shell: 'student', title: '我的' } },
    ],
  },

  {
    path: '/teacher',
    component: TeacherShell,
    meta: { shell: 'teacher' },
    children: [
      { path: '', redirect: '/teacher/prep' },
      { path: 'today', redirect: '/teacher/prep' },
      { path: 'prep', name: 'teacher-prep', component: PrepCenter, meta: { shell: 'teacher', title: '备课中心' } },
      { path: 'prep/history', name: 'teacher-prep-history', component: PrepHistory, meta: { shell: 'teacher', title: '备课历史' } },
      { path: 'prep/w/:sessionId/:tab?', name: 'teacher-prep-workbench', component: PrepWorkbench, meta: { shell: 'teacher', title: '备课工作台', fullwidth: true } },
      { path: 'bank', name: 'teacher-bank', component: TeacherBank, meta: { shell: 'teacher', title: '题库与组卷' } },
      { path: 'assign', name: 'teacher-assign', component: TeacherAssign, meta: { shell: 'teacher', title: '作业与批改' } },
      { path: 'grading', name: 'teacher-grading', component: GradingView, meta: { shell: 'teacher', title: '批改工作台' } },
      { path: 'classroom', name: 'teacher-classroom', component: TeacherClassroom, meta: { shell: 'teacher', title: '课堂' } },
      { path: 'insights', name: 'teacher-insights', component: TeacherInsights, meta: { shell: 'teacher', title: '学情洞察' } },
      { path: 'resources', name: 'teacher-resources', component: TeacherResources, meta: { shell: 'teacher', title: '资源中心' } },
    ],
  },

  {
    path: '/research',
    component: ResearchShell,
    meta: { shell: 'research' },
    children: [
      { path: '', name: 'research-home', component: ResearchHome, meta: { shell: 'research', title: '科研工作台' } },
      { path: 'read', name: 'research-read', component: ResearchRead, meta: { shell: 'research', title: '科研工作台 · 阅读' } },
      { path: 'write', name: 'research-write', component: ResearchWrite, meta: { shell: 'research', title: '科研工作台 · 写作' } },
    ],
  },

  // ===== 现役入口别名（run-01 实测：以真实系统 URL 形态访问时落到对应展示页） =====
  { path: '/research-workspace', redirect: '/research' },
  { path: '/research-workspace/account', redirect: '/research' },
  { path: '/research-workspace/workspace', redirect: '/research/read' },
  { path: '/research-workspace/:projectId/read', redirect: (to) => ({ path: '/research/read', query: { project: to.params.projectId } }) },
  { path: '/research-workspace/:projectId/write', redirect: (to) => ({ path: '/research/write', query: { project: to.params.projectId } }) },
  // 学生端旧书签兼容（真实系统 redirect 到新地址）
  { path: '/kb', redirect: '/student/library' },
  { path: '/class', redirect: '/student/classroom' },
  { path: '/tasks', redirect: '/student/classroom' },
  { path: '/overview', redirect: '/student/me' },
  { path: '/report', redirect: '/student/me' },
  { path: '/graph', redirect: '/student/me' },
  { path: '/profile', redirect: '/student/me' },
  { path: '/exam', redirect: '/student/practice' },
  { path: '/resource', redirect: '/student/resources' },
  { path: '/teacher-v3/prep', redirect: '/teacher/prep' },
  { path: '/teacher-v3/prep/history', redirect: '/teacher/prep/history' },
  { path: '/teacher-v3/classroom', redirect: '/teacher/classroom' },
  { path: '/teacher-v3/bank', redirect: '/teacher/bank' },
  { path: '/teacher-v3/assign', redirect: '/teacher/assign' },
  { path: '/teacher-v3/insights', redirect: '/teacher/insights' },
  { path: '/teacher-v3/resources', redirect: '/teacher/resources' },
  { path: '/teacher-v3/grading', redirect: '/teacher/grading' },

  { path: '/:pathMatch(.*)*', redirect: '/login' },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})
