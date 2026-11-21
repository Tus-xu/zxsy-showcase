/**
 * 离线回放层：在「服务边界」用 run-02 采证到的真实响应替代后端。
 *
 * 原则（本轮返工铁律）：
 *   1. 只回放采证过的响应，不编造业务数据；
 *   2. 未采证的端点返回 404 信封，让现役 UI 展示它自己的错误/空态，而不是假成功；
 *   3. 跨端一致性由本地状态承托（发布快照等），UI 仍由现役组件渲染。
 */
import { getAccessToken, setAccessToken, setAuthScope } from '../api/authSession'
import { findFixture, IMAGE_MAP } from './fixtures'
import { getSession, patch, setSession, store } from './state'
import { handleFileRoute, handleUpload } from './handlers/files'
import { noticeEvents, pickChatTurn, OFFLINE_NOTICE } from './handlers/agent'

const DEMO_CODE = '246810'
const OFFLINE_TOKEN = 'offline-demo-token'

function absolute(path) {
  try {
    return new URL(path, location.href)
  } catch {
    return null
  }
}

function pathOf(url) {
  const s = String(url)
  // 站内绝对路径（api 客户端统一用 '/api/...'）在 file:// 下不能被 URL 解析成站点根，直接取用
  if (s.startsWith('/api')) return s
  const u = absolute(url)
  if (!u) return s
  if (u.protocol === 'file:') {
    const i = u.pathname.indexOf('/api')
    return i >= 0 ? u.pathname.slice(i) + (u.search || '') : u.pathname + (u.search || '')
  }
  return u.pathname + (u.search || '')
}

function isApi(url) {
  const s = String(url)
  if (s.startsWith('/api')) return true
  const u = absolute(url)
  if (!u) return false
  if (u.protocol === 'file:') return u.pathname.includes('/api/')
  return u.pathname.startsWith('/api')
}

function jsonResponse(payload, status = 200) {
  if (payload && payload.__binary) {
    return new Response(payload.bytes, { status, headers: { 'Content-Type': payload.ct } })
  }
  return new Response(typeof payload === 'string' ? payload : JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function binaryPayload(rec) {
  const b64 = rec?.text?.b64 || ''
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return { __binary: true, bytes, ct: rec.text.ct || 'application/octet-stream' }
}

function envelope(data, message = 'ok') {
  return { code: 0, message, data }
}

function notRecorded(path, method) {
  return jsonResponse(
    { code: 40401, message: `离线演示未收录该数据：${method} ${path}`, data: null },
    404,
  )
}

/** 构造 SSE 流响应 */
function sseResponse(script, { delayMs = 24, signal } = {}) {
  const encoder = new TextEncoder()
  let i = 0
  let timer = null
  const stream = new ReadableStream({
    start(controller) {
      const push = () => {
        if (signal?.aborted) {
          try { controller.close() } catch { /* ignore */ }
          return
        }
        if (i >= script.length) {
          try { controller.close() } catch { /* ignore */ }
          return
        }
        const ev = script[i++]
        const chunk = `event: ${ev.event}\ndata: ${JSON.stringify(ev.data)}\n\n`
        controller.enqueue(encoder.encode(chunk))
        timer = setTimeout(push, delayMs)
      }
      timer = setTimeout(push, delayMs)
    },
    cancel() {
      if (timer) clearTimeout(timer)
    },
  })
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache' },
  })
}

/** 角色用户对象：取自现役 /api/auth/me 的真实返回 */
function roleUser(role) {
  const fx = findFixture(role, 'GET', '/api/auth/me')
  if (fx) {
    try {
      const parsed = JSON.parse(fx.text)
      if (parsed?.data) return parsed.data
    } catch { /* ignore */ }
  }
  return null
}

function sessionUser(role) {
  const s = getSession()
  if (s && s.user) return s.user
  const u = roleUser(role)
  if (u) return u
  return { id: 'offline-user', nickname: role === 'teacher' ? '张老师' : role === 'researcher' ? '林知远' : '小林', active_role: role, roles: [{ role, status: 'approved', verified: true }] }
}

function currentRole() {
  const s = getSession()
  return (s && s.role) || 'student'
}

function loginPayload(role) {
  const u = sessionUser(role)
  return {
    code: 0,
    message: 'ok',
    data: {
      access_token: OFFLINE_TOKEN,
      expires_in: 900,
      onboarding_required: false,
      user: { id: u.id, nickname: u.nickname, active_role: role, roles: u.roles || [] },
      identity_status: 'authenticated',
    },
  }
}

/* ─────────────── 端点处理 ─────────────── */

function handleAuth(method, path, body) {
  const p = path.split('?')[0]
  if (p === '/api/auth/challenges/sms') {
    return jsonResponse(envelope({ challenge_id: 'offline-challenge', expires_in: 300, retry_after: 60, account_exists: true, demo_code: DEMO_CODE }, 'sent'))
  }
  if (p === '/api/auth/login/sms' || p === '/api/auth/login/password') {
    const role = body?.preferred_role || body?.role || currentRole()
    setSession({ role, user: sessionUser(role), at: Date.now() })
    setAuthScope(role)
    setAccessToken(OFFLINE_TOKEN)
    return jsonResponse(loginPayload(role))
  }
  if (p === '/api/auth/token/refresh') {
    const role = currentRole()
    setAuthScope(role)
    setAccessToken(OFFLINE_TOKEN)
    return jsonResponse({
      code: 0,
      message: 'ok',
      data: { access_token: OFFLINE_TOKEN, expires_in: 900, active_role: role },
    })
  }
  if (p === '/api/auth/me') {
    return jsonResponse(envelope(sessionUser(currentRole())))
  }
  if (p === '/api/auth/logout') {
    setSession(null)
    setAccessToken('')
    return jsonResponse(envelope(null, 'ok'))
  }
  return null
}

function handleLocalState(method, path) {
  const p = path.split('?')[0]
  // 教师发布：写入本地发布记录，供学生端课堂读取（同一业务对象）
  const pub = p.match(/^\/api\/teacher-v3\/prep\/sessions\/([^/]+)\/publish$/)
  if (pub && method === 'POST') {
    const record = { sessionId: pub[1], at: Date.now() }
    patch((s) => { s.published = [record, ...(s.published || [])] })
    const fx = findFixture('teacher', method, path)
    if (fx) return jsonResponse(fx.text, fx.status)
    return jsonResponse(envelope({ published: true, ...record }))
  }
  return null
}

async function dispatch(method, path, { body, accept, signal } = {}) {
  const auth = handleAuth(method, path, body)
  if (auth) return auth

  const local = handleLocalState(method, path)
  if (local) return local

  // 上传链路（现役契约：uploadInit → 预签名 PUT → parse → detail/content）
  if (method === 'POST' && path.split('?')[0] === '/api/files/upload') {
    const r = handleUpload(body)
    return jsonResponse(r.payload, r.ok ? 200 : 404)
  }
  const fileById = handleFileRoute(method, path)
  if (fileById) return jsonResponse(fileById)

  // 对话 SSE：按附件 → 案例 → 第 N 轮采证原文回放
  if ((accept || '').includes('text/event-stream') && path.split('?')[0] === '/api/agent/chat') {
    const picked = pickChatTurn(body)
    if (picked?.events?.length) {
      return sseResponse(picked.events, { delayMs: 8, signal })
    }
    if (picked?.exhausted) {
      return sseResponse(noticeEvents('离线演示：现役系统本题已采证的对话轮次到此为止，后续轮次未采证。'), { delayMs: 8, signal })
    }
    return sseResponse(noticeEvents(OFFLINE_NOTICE), { delayMs: 8, signal })
  }

  const role = currentRole()
  // 先按本角色，再按其它角色（跨端页面：学生课堂读取教师发布的同一对象）
  for (const r of [role, ...['teacher', 'student', 'researcher'].filter((x) => x !== role)]) {
    const fx = findFixture(r, method, path)
    if (fx) return jsonResponse(fx.binary ? binaryPayload(fx) : fx.text, fx.status)
  }
  return notRecorded(path, method)
}

/* ─────────────── 安装 ─────────────── */

let installed = false

export function installReplay() {
  if (installed) return
  installed = true

  // 启动即恢复上次演示身份（file:// 下 cookie 不可用，故用 localStorage 引导会话）
  const s = getSession()
  if (s?.role) {
    setAuthScope(s.role)
    setAccessToken(OFFLINE_TOKEN)
  }

  const origFetch = window.fetch.bind(window)
  window.fetch = async function (input, init) {
    const rawUrl = typeof input === 'string' ? input : input?.url || String(input)
    const method = String(init?.method || (typeof input === 'object' && input?.method) || 'GET').toUpperCase()

    // 预签名直传（现役上传链路第 2 步）指向对象存储；离线一律视为「已收到字节」
    if (!isApi(rawUrl)) {
      const u = absolute(rawUrl)
      const external = u && (u.protocol === 'http:' || u.protocol === 'https:')
      if (external) {
        return new Response('', { status: 200, headers: { 'Content-Type': 'text/plain' } })
      }
      return origFetch(input, init)
    }

    const path = pathOf(rawUrl)
    const headers = new Headers(init?.headers || (typeof input === 'object' ? input?.headers : undefined) || {})
    let body = null
    try {
      const b = init?.body
      if (typeof b === 'string') {
        try { body = JSON.parse(b) } catch { body = null }
      }
    } catch { /* ignore */ }
    return dispatch(method, path, {
      body,
      accept: headers.get('accept') || '',
      signal: init?.signal,
    })
  }

  // 少数上传走 XHR：同样接到回放层
  const OrigXHR = window.XMLHttpRequest
  function PatchedXHR() {
    const xhr = new OrigXHR()
    const state = { method: 'GET', path: '', body: null }
    const open = xhr.open
    const send = xhr.send
    xhr.open = function (m, url, ...rest) {
      state.method = String(m || 'GET').toUpperCase()
      state.path = pathOf(url)
      if (!isApi(url)) return open.call(this, m, url, ...rest)
      // 离线：绕过网络层，直接由本对象承载
      return open.call(this, 'GET', 'data:application/json,', ...rest)
    }
    xhr.send = function (b) {
      if (!state.path) return send.call(this, b)
      let payload = null
      try {
        if (typeof b === 'string') payload = JSON.parse(b)
      } catch { /* ignore */ }
      dispatch(state.method, state.path, { body: payload }).then(async (res) => {
        const text = await res.text()
        Object.defineProperty(xhr, 'readyState', { value: 4, configurable: true })
        Object.defineProperty(xhr, 'status', { value: res.status, configurable: true })
        Object.defineProperty(xhr, 'responseText', { value: text, configurable: true })
        Object.defineProperty(xhr, 'response', { value: text, configurable: true })
        xhr.dispatchEvent(new Event('readystatechange'))
        xhr.dispatchEvent(new Event('load'))
        xhr.dispatchEvent(new Event('loadend'))
      }).catch(() => {
        xhr.dispatchEvent(new Event('error'))
      })
      return undefined
    }
    return xhr
  }
  PatchedXHR.prototype = OrigXHR.prototype
  window.XMLHttpRequest = PatchedXHR

  console.info('[offline] replay installed · role=', currentRole(), '· published=', (store.published || []).length)

  installImageRewriter()
}

/**
 * 外部图片离线化：现役页面里的封面/插图来自外网 CDN，
 * run-02 已把这些图片原件采证下来；这里把 <img src> 换成采证到的 data URI。
 * 找不到采证的图片保持原样（会显示现役组件自己的占位/破图态，不伪造）。
 */
function installImageRewriter() {
  const urls = Object.keys(IMAGE_MAP)
  if (!urls.length) return
  const has = (src) => src && IMAGE_MAP[src]
  const fix = (img) => {
    const src = img.getAttribute('src')
    if (!has(src)) return
    img.setAttribute('src', IMAGE_MAP[src])
  }
  const scan = () => {
    document.querySelectorAll('img').forEach(fix)
  }
  const obs = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'attributes' && m.target.tagName === 'IMG') fix(m.target)
      for (const node of m.addedNodes || []) {
        if (node.nodeType !== 1) continue
        if (node.tagName === 'IMG') fix(node)
        node.querySelectorAll?.('img').forEach(fix)
      }
    }
  })
  const start = () => {
    scan()
    obs.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] })
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
  else start()
}

export { DEMO_CODE, OFFLINE_TOKEN }
export function getTokenForBoot() {
  return getAccessToken()
}