/**
 * 主持人控制台（离线发行专用，仅快捷键唤起）。
 *
 * 嘉宾界面不出现任何入口：不渲染浮标、不在导航/设置里加入口。
 * 主持人按 Ctrl+Shift+H 打开，Esc 关闭；用于复位本地演示状态、查看采证快照时间。
 */
const CSS = `
.msh{position:fixed;right:16px;bottom:16px;width:320px;z-index:99999;background:#0f172a;color:#e2e8f0;
border-radius:14px;box-shadow:0 18px 48px rgba(2,6,23,.45);font:13px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;
padding:14px 16px;display:none}
.msh.on{display:block}
.msh h4{margin:0 0 8px;font-size:13px;letter-spacing:.04em;color:#93c5fd;font-weight:700}
.msh dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:4px 10px}
.msh dt{color:#94a3b8}
.msh dd{margin:0;color:#e2e8f0;word-break:break-all}
.msh button{margin-top:12px;width:100%;border:0;border-radius:9px;padding:9px 12px;background:#1d4ed8;color:#fff;
font-weight:600;cursor:pointer}
.msh button.ghost{background:#334155;margin-top:6px}
.msh .hint{margin-top:10px;color:#94a3b8;font-size:11.5px}
`

function fmt(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  const p = (v) => String(v).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function installHostConsole() {
  const style = document.createElement('style')
  style.textContent = CSS
  document.head.appendChild(style)

  const el = document.createElement('div')
  el.className = 'msh'
  el.setAttribute('data-offline-host', '1')
  document.body.appendChild(el)

  const render = () => {
    let s = {}
    try { s = JSON.parse(localStorage.getItem('ma_offline_demo_v1') || '{}') } catch { s = {} }
    const role = s.session?.role || '（未登录）'
    const chats = Object.keys(s.chat || {}).length
    el.innerHTML = `
      <h4>主持人工具 · 离线演示</h4>
      <dl>
        <dt>当前身份</dt><dd>${role}</dd>
        <dt>回放数据</dt><dd>run-02 现役采证（2026-11-22）</dd>
        <dt>会话游标</dt><dd>${chats} 个</dd>
        <dt>发布记录</dt><dd>${(s.published || []).length} 条（离线本地）</dd>
        <dt>断网</dt><dd>0 请求</dd>
      </dl>
      <button id="msh-reset">复位本次演示（清空本地状态并回到登录页）</button>
      <button id="msh-close" class="ghost">关闭（Esc）</button>
      <div class="hint">快捷键 Ctrl+Shift+H 打开/关闭。嘉宾界面不显示本入口。</div>
    `
    el.querySelector('#msh-reset').onclick = () => {
      try { localStorage.removeItem('ma_offline_demo_v1') } catch { /* ignore */ }
      location.hash = '#/login'
      location.reload()
    }
    el.querySelector('#msh-close').onclick = () => el.classList.remove('on')
  }

  const toggle = () => {
    if (el.classList.contains('on')) {
      el.classList.remove('on')
      return
    }
    render()
    el.classList.add('on')
  }

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'H' || e.key === 'h')) {
      e.preventDefault()
      toggle()
    } else if (e.key === 'Escape') {
      el.classList.remove('on')
    }
  })
  window.__offlineHost = { toggle }
}