import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'

// 两种构建目标：
// 1) 常规 dev / build：便于开发与分块调试
// 2) --mode single：单文件 HTML（断网双击 file:// 直接打开，release/开始演示.html）
export default defineConfig(({ mode }) => {
  const single = mode === 'single'
  return {
    base: './',
    plugins: [vue(), ...(single ? [viteSingleFile({ removeViteModuleLoader: true })] : [])],
    build: {
      outDir: single ? 'release' : 'dist',
      emptyOutDir: true,
      target: 'es2020',
      cssCodeSplit: !single,
      assetsInlineLimit: single ? 100 * 1024 * 1024 : 4096,
      rollupOptions: {
        output: single ? {} : undefined,
      },
    },
    server: {
      port: 5199,
      strictPort: true,
      host: '127.0.0.1',
    },
  }
})
