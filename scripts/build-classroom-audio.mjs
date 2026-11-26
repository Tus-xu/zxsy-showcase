/**
 * 双师课堂神经语音构建脚本（构建期）。
 *
 * 用法：
 *   node scripts/build-classroom-audio.mjs            # 生成缺失音频并校验
 *   node scripts/build-classroom-audio.mjs --check    # 只校验，不联网
 *   node scripts/build-classroom-audio.mjs --force    # 重生成全部（会清空当前 voice 目录）
 *
 * 语音：晓晓（zh-CN-XiaoxiaoNeural, -5%, +0Hz），24kHz/48kbps MP3。
 * 切片：与播放器同一 splitSentences + textToSpeech；按 deck/order/segment 落盘，
 * 运行期由 classroomAudio.js 用 import.meta.glob 内联进单文件。
 */
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { CLASSROOM_DECKS } from '../app/src/offline/showcase/classroomDecks.js'
import { splitSentences } from '../app/src/utils/dualPlayback.js'
import { textToSpeech } from '../app/src/utils/classroomTts.js'

const HERE = path.dirname(url.fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
const VOICE = 'xiaoxiao'
const MODEL = 'zh-CN-XiaoxiaoNeural'
const RATE = '-5%'
const PITCH = '+0Hz'
const OUT_ROOT = path.join(ROOT, 'app', 'src', 'assets', 'classroom-audio', VOICE)
const JOBS = path.join(ROOT, '.work', 'classroom-audio-jobs.json')
const MANIFEST = path.join(ROOT, 'app', 'src', 'offline', 'showcase', 'classroomAudio.manifest.json')

const args = new Set(process.argv.slice(2))
const checkOnly = args.has('--check')
const force = args.has('--force')

if (force && fs.existsSync(OUT_ROOT)) fs.rmSync(OUT_ROOT, { recursive: true, force: true })

const jobs = []
const clips = []
for (const [deckKey, deck] of Object.entries(CLASSROOM_DECKS)) {
  for (const slide of deck.slides) {
    const order = Number(slide.order)
    const segs = splitSentences(slide.narration).map((s) => textToSpeech(s)).filter(Boolean)
    segs.forEach((text, i) => {
      const rel = path.posix.join(VOICE, deckKey, `${order}-${i}.mp3`)
      const abs = path.join(ROOT, 'app', 'src', 'assets', 'classroom-audio', rel)
      const id = `${deckKey}/${order}-${i}`
      jobs.push({ id, text, voice: MODEL, rate: RATE, pitch: PITCH, file: path.relative(ROOT, abs).replace(/\\/g, '/') })
      clips.push({ id, deck: deckKey, order, segment: i, chars: text.length, text_sha1: crypto.createHash('sha1').update(text).digest('hex'), file: rel })
    })
  }
}

const missing = jobs.filter((j) => {
  const p = path.join(ROOT, j.file)
  return !fs.existsSync(p) || fs.statSync(p).size <= 1024
})

console.log(`[audio] voice=${VOICE} clips=${jobs.length} missing=${missing.length}`)
if (checkOnly && fs.existsSync(MANIFEST)) {
  let old = null
  try { old = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) } catch { old = null }
  if (old) {
    const byId = new Map((old.clips || []).map((c) => [c.id, c]))
    const oldIds = new Set((old.clips || []).map((c) => c.id))
    const newIds = new Set(clips.map((c) => c.id))
    if (oldIds.size !== newIds.size || [...newIds].some((id) => !oldIds.has(id))) {
      console.error('[audio] --check 失败：manifest 的片段集合与当前讲稿不一致')
      process.exit(1)
    }
    const stale = clips.filter((c) => {
      const hit = byId.get(c.id)
      if (!hit) return true
      if (hit.text_sha1 && c.text_sha1) return hit.text_sha1 !== c.text_sha1
      return Number(hit.chars) !== Number(c.chars)
    })
    if (stale.length) {
      console.error(`[audio] --check 失败：${stale.length} 个片段的文本已变化，音频需重新生成（node scripts/build-classroom-audio.mjs --force）`)
      for (const c of stale.slice(0, 8)) console.error('  STALE', c.id)
      process.exit(1)
    }
    console.log(`[audio] manifest 校验通过：${clips.length} 个片段的文本与音频一致`)
  }
}
if (missing.length && checkOnly) {
  console.error('[audio] --check 失败：音频未全部生成；先运行 node scripts/build-classroom-audio.mjs')
  process.exit(1)
}

if (missing.length && !checkOnly) {
  fs.mkdirSync(path.dirname(JOBS), { recursive: true })
  fs.writeFileSync(JOBS, JSON.stringify({ voice: VOICE, model: MODEL, rate: RATE, pitch: PITCH, jobs }, null, 1))
  const py = process.env.PYTHON || 'python'
  const r = spawnSync(py, [path.join(ROOT, 'scripts', 'generate_classroom_audio.py'), JOBS], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, PYTHONPATH: path.join(ROOT, '.work', 'pydeps') },
  })
  if (r.status !== 0) process.exit(r.status || 1)
}

const stats = { clips: clips.length, bytes: 0, missing: 0, decks: {} }
const manifestClips = []
for (const c of clips) {
  const p = path.join(ROOT, 'app', 'src', 'assets', 'classroom-audio', c.file)
  if (!fs.existsSync(p) || fs.statSync(p).size <= 1024) {
    stats.missing += 1
    continue
  }
  const bytes = fs.statSync(p).size
  stats.bytes += bytes
  stats.decks[c.deck] = (stats.decks[c.deck] || 0) + 1
  manifestClips.push({ ...c, bytes, sha1: crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex') })
}
if (stats.missing) {
  console.error(`[audio] 仍有 ${stats.missing} 个片段缺失，拒绝生成 manifest`)
  process.exit(1)
}
if (!checkOnly) fs.writeFileSync(MANIFEST, JSON.stringify({
  version: 1,
  voice: VOICE,
  model: MODEL,
  rate: RATE,
  pitch: PITCH,
  generated_by: 'scripts/build-classroom-audio.mjs',
  stats,
  clips: manifestClips,
}, null, 1))
console.log(`[audio] ok clips=${stats.clips} bytes=${stats.bytes} (${(stats.bytes / 1048576).toFixed(2)} MiB)`)
console.log(`[audio] manifest=${path.relative(ROOT, MANIFEST)}`)
