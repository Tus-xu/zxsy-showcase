/**
 * 离线回放层（spike 版）：拦截 /api 的 fetch / XHR / SSE，用本地数据回应。
 * 正式版将按 run-02 采证 fixture 逐端点回放；此处先验证「现役前端能否在 file:// 下启动」。
 */
/* eslint-disable no-console */

const ORIGIN = typeof location !== 'undefined' ? location.origin : ''

function isApiUrl(url) {
  try {
    const u = new URL(url, location.href)
    if (u.origin !== ORIGIN && !/^(file|blob):/.test(u.origin)) return false
    return u.pathname.startsWith('/api')
  } catch {
    return String(url).startsWith('/api')
  }
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

let installed = false

export function installReplay() {
  if (installed) return
  installed = true
  const origFetch = window.fetch.bind(window)
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : input?.url || String(input)
    const method = (init?.method || (typeof input === 'object' && input?.method) || 'GET').toUpperCase()
    if (!isApiUrl(url)) return origFetch(input, init)
    console.info('[offline-replay]', method, url)
    if (method === 'GET' && /\/health/.test(url)) {
      return jsonResponse({ code: 0, data: { status: 'ok', offline: true }, message: 'ok' })
    }
    // spike：返回成功空数据，验证 UI 能否在无后端下启动
    return jsonResponse({ code: 0, data: null, message: 'offline' })
  }

  // XHR（少数上传/下载走 XHR）
  const OrigXHR = window.XMLHttpRequest
  function PatchedXHR() {
    const xhr = new OrigXHR()
    const open = xhr.open
    xhr.open = function (method, url, ...rest) {
      this.__offlineApi = isApiUrl(url)
      this.__offlineMethod = String(method || 'GET').toUpperCase()
      return open.call(this, method, url, ...rest)
    }
    return xhr
  }
  PatchedXHR.prototype = OrigXHR.prototype
  window.XMLHttpRequest = PatchedXHR
}