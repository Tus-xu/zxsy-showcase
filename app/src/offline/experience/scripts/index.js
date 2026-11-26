import { EXPERIENCE_BY_ID } from '../catalog'
import t1 from './t1'
import t2 from './t2'
import t3 from './t3'

const SCRIPTS = { ...t1, ...t2, ...t3 }

/** 合并元数据与脚本；未写的体验返回 null（侧栏可见但运行时会给出边界提示） */
export function getExperience(id) {
  const meta = EXPERIENCE_BY_ID[id]
  const body = SCRIPTS[id]
  if (!meta || !body) return null
  return { ...meta, ...body }
}

export function hasScript(id) {
  return !!SCRIPTS[id]
}
