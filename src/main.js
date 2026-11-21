import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import './styles/index.css'

const app = createApp(App)
app.use(router)
app.mount('#app')

// 断网自检：记录任何一次网络尝试，供主持人工具/验收使用（正常情况下应为 0）
const netLog = []
if (typeof window !== 'undefined') {
  const origFetch = window.fetch
  window.fetch = function (...args) {
    netLog.push({ type: 'fetch', url: String(args[0]), at: Date.now() })
    return origFetch.apply(this, args)
  }
  const OrigXHR = window.XMLHttpRequest
  if (OrigXHR) {
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
  }
  window.__MATHSIS_NET_LOG__ = netLog
}
