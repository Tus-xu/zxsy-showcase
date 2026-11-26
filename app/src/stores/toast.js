import { defineStore } from 'pinia'

let seq = 0

export const useToastStore = defineStore('toast', {
  state: () => ({ items: [] }),
  actions: {
    /**
     * @param {string} text
     * @param {string} [type]
     * @param {number|null} [duration] null = 不自动消失（须显式关闭），用于一次性迁移提示等需被读完的通知
     */
    show(text, type = 'info', duration = 2600) {
      // 同文案同类型已在屏上时不再叠加：离线页多个请求同时 404 会在右上角
      // 堆十几条相同提示，直接遮住对话（本轮用户截图中的实际故障）。
      const existing = this.items.find((t) => t.text === text && t.type === type)
      if (existing) return existing.id
      const id = ++seq
      this.items.push({ id, text, type })
      if (duration === null) return id
      setTimeout(() => {
        this.items = this.items.filter((t) => t.id !== id)
      }, duration)
      return id
    },
    dismiss(id) {
      this.items = this.items.filter((t) => t.id !== id)
    },
    success(text) { this.show(text, 'success') },
    error(text) { this.show(text, 'error', 3600) },
    info(text) { this.show(text, 'info') },
    warning(text) { this.show(text, 'warning') },
  },
})
