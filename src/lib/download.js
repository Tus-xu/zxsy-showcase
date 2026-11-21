/** 浏览器内下载 Blob（离线可用；不发起网络请求） */
export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 500)
}

export function downloadText(text, fileName, mime = 'text/plain') {
  downloadBlob(new Blob([text], { type: mime + ';charset=utf-8' }), fileName)
}
