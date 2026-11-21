/**
 * 学生端 练习/错题/知识库/资源/我的 —— 独立 QA harness（仅验收用，不进入发布包）。
 *
 * 背景：主应用入口因 src/data/research.js 的语法错误整体白屏（由 research 子代理负责的
 * 文件，非本场景）。本 harness 只注册学生端路由，绕开该文件，使本场景可以在真实浏览器中
 * 验收：同一份 store / 同一 StudentShell / 同一持久化命名空间，真实交互与刷新恢复不变。
 * 主应用修复后，qa_student_practice.py 会优先使用主入口（见脚本 REAL_APP 开关）。
 */
import { createApp, h } from 'vue'
import { createRouter, createWebHashHistory, RouterView } from 'vue-router'
import '../../src/styles/index.css'
import StudentShell from '../../src/shells/StudentShell.vue'
import HostConsole from '../../src/components/HostConsole.vue'
import StudentHome from '../../src/ends/student/StudentHome.vue'
import GuideView from '../../src/ends/student/GuideView.vue'
import PracticeView from '../../src/ends/student/PracticeView.vue'
import ErrorsView from '../../src/ends/student/ErrorsView.vue'
import LibraryView from '../../src/ends/student/LibraryView.vue'
import ResourcesView from '../../src/ends/student/ResourcesView.vue'
import MeView from '../../src/ends/student/MeView.vue'

const NotFound = { render: () => h('div', { class: 'page' }, '未在 QA harness 中注册的页面') }

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/student/practice' },
    {
      path: '/student',
      component: StudentShell,
      children: [
        { path: '', redirect: '/student/practice' },
        { path: 'dialog', component: StudentHome },
        { path: 'guide/:caseId', component: GuideView },
        { path: 'practice', component: PracticeView },
        { path: 'errors', component: ErrorsView },
        { path: 'library', component: LibraryView },
        { path: 'resources', component: ResourcesView },
        { path: 'me', component: MeView },
        { path: ':pathMatch(.*)*', component: NotFound },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/student/practice' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

createApp({ render: () => h('div', [h(RouterView), h(HostConsole)]) }).use(router).mount('#app')

// 与 main.js 相同的断网自检：记录任何网络尝试（验收要求为 0）
const netLog = []
const origFetch = window.fetch
window.fetch = function (...args) {
  netLog.push({ type: 'fetch', url: String(args[0]), at: Date.now() })
  return origFetch.apply(this, args)
}
const OrigXHR = window.XMLHttpRequest
const send = OrigXHR.prototype.send
OrigXHR.prototype.send = function (...args) {
  netLog.push({ type: 'xhr', url: this.__url || '', at: Date.now() })
  return send.apply(this, args)
}
const open = OrigXHR.prototype.open
OrigXHR.prototype.open = function (method, url, ...rest) {
  this.__url = String(url)
  return open.call(this, method, url, ...rest)
}
window.__MATHSIS_NET_LOG__ = netLog
