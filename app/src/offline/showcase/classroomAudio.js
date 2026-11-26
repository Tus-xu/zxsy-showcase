/**
 * 双师课堂神经语音索引。
 *
 * 构建期由 scripts/build-classroom-audio.mjs 生成 106 个句级 mp3；
 * 这里用 import.meta.glob 收集，离线构建会按 assetsInlineLimit 内联为 data URI。
 * 运行期按 deckKey / 页序 / 句序命中；缺失时才回退浏览器 TTS。
 */
const FILES = import.meta.glob('../../assets/classroom-audio/**/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
})

const MAP = {}
for (const [path, url] of Object.entries(FILES)) {
  const m = String(path).replace(/\\/g, '/').match(/classroom-audio\/([^/]+)\/([^/]+)\/(\d+)-(\d+)\.mp3$/)
  if (!m) continue
  MAP[`${m[1]}/${m[2]}/${m[3]}-${m[4]}`] = url
}

export const CLASSROOM_VOICE = {
  id: 'xiaoxiao',
  label: '晓晓',
  desc: '自然女声 · 神经语音',
}

export function classroomAudioUrl(deckKey, order, segment, voice = 'xiaoxiao') {
  if (!deckKey) return ''
  return MAP[`${voice}/${deckKey}/${Number(order)}-${Number(segment)}`] || ''
}

export function hasClassroomAudio(deckKey, voice = 'xiaoxiao') {
  if (!deckKey) return false
  return Object.keys(MAP).some((k) => k.startsWith(`${voice}/${deckKey}/`))
}

export function classroomAudioClipCount(deckKey, voice = 'xiaoxiao') {
  if (!deckKey) return 0
  return Object.keys(MAP).filter((k) => k.startsWith(`${voice}/${deckKey}/`)).length
}
