/**
 * 采证流程 A/B/C 的原题图：与 run-02/run-03 上传采证逐字节一致（SHA-256 见 `qa` 与 `release/素材/SHA256清单.md`）。
 *
 * 为什么带 `?inline`：离线发行版是单个 HTML（file:// 直接打开），图片必须以 data URI 内联，
 * 否则历史消息里的缩略图在断网环境会退化成「原图已丢失（存储缺失）」——那是一条会被误读成
 * "文件真的丢了"的现役文案（见 `未通过项.md` 第 58 行）。
 */
import ti1 from '../../assets/showcase/ti1.png?inline'
import ti2 from '../../assets/showcase/ti2.png?inline'
import ti3 from '../../assets/showcase/ti3.png?inline'

export const FLOW_IMAGE = {
  A: { url: ti1, name: '题1.png', mime: 'image/png', bytes: 30184 },
  B: { url: ti2, name: '题2.png', mime: 'image/png', bytes: 35639 },
  C: { url: ti3, name: '题3.png', mime: 'image/png', bytes: 32956 },
}

/** 历史用户消息里的附件快照（AttachmentThumb 优先读 localUrl） */
export function flowAttachment(caseName, fileId) {
  const img = FLOW_IMAGE[caseName]
  if (!img) return []
  return [
    {
      file_id: fileId || '',
      kind: 'image',
      name: img.name,
      mime: img.mime,
      size: img.bytes,
      localUrl: img.url,
    },
  ]
}
