import { describe, expect, it } from 'vitest'
import uploads from '../fixtures/student/uploads.json'
import { caseOfFile, handleFileRoute, handleUpload } from './files'

describe('随包题图上传', () => {
  it.each(Object.keys(uploads))('案例 %s 可以从原始题图进入录制会话', (key) => {
    const recorded = uploads[key]
    const body = JSON.parse(recorded.upload_req)
    const upload = handleUpload({ ...body, filename: 'renamed.png' }, { matchContents: true })
    expect(upload).toMatchObject({
      ok: true,
      payload: { code: 0, data: { file_id: recorded.file_id, deduplicated: true } },
    })
    expect(handleFileRoute('POST', '/api/files/' + recorded.file_id + '/parse'))
      .toMatchObject({ code: 0, data: { file_id: recorded.file_id, status: 'parsed' } })
    expect(handleFileRoute('GET', '/api/files/' + recorded.file_id))
      .toMatchObject({ code: 0, data: { file_id: recorded.file_id, status: 'parsed' } })
    expect(caseOfFile(recorded.file_id)).toBe(key)
  })

  it('名称相同的其他图片不触发录制内容', () => {
    const result = handleUpload({ filename: '题1.png', sha256: '0'.repeat(64) }, { matchContents: true })
    expect(result.ok).toBe(false)
  })
})
