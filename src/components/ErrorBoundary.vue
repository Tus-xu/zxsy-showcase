<template>
  <slot v-if="!error" />
  <div v-else class="ms-error">
    <div class="ms-error__card">
      <div class="ms-error__icon">⚠️</div>
      <h3>页面加载出现异常</h3>
      <p>{{ message }}</p>
      <div class="ms-error__actions">
        <button class="ms-btn ms-btn--primary" @click="reload">重新载入页面</button>
        <button class="ms-btn" @click="dismiss">尝试继续</button>
      </div>
      <p class="ms-error__hint">演示数据保存在本机，重新载入不会丢失已保存的演示进度。</p>
    </div>
  </div>
</template>

<script setup>
import { onErrorCaptured, ref } from 'vue'

const props = defineProps({
  title: { type: String, default: '页面加载出现异常' },
})
const error = ref(null)
const message = ref('')

onErrorCaptured((err) => {
  error.value = err
  message.value = err?.message ? String(err.message).slice(0, 200) : '未知错误'
  return false
})

function reload() {
  window.location.reload()
}
function dismiss() {
  error.value = null
}
</script>

<style scoped>
.ms-error {
  display: grid;
  place-items: center;
  min-height: 60vh;
  padding: 40px;
}
.ms-error__card {
  width: 460px;
  max-width: 92%;
  background: #fff;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 18px;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.1);
  padding: 30px;
  text-align: center;
}
.ms-error__icon {
  font-size: 32px;
  margin-bottom: 8px;
}
.ms-error__card h3 {
  margin: 0 0 6px;
  font-size: 17px;
}
.ms-error__card p {
  margin: 0;
  font-size: 12.5px;
  color: var(--ink2, #334155);
}
.ms-error__actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin: 18px 0 12px;
}
.ms-error__hint {
  font-size: 11.5px !important;
  color: var(--ink3, #94a3b8) !important;
}
</style>
