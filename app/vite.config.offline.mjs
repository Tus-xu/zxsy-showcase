/**
 * 离线构建配置：把现役前端打成单个 HTML（file:// 可直接打开、零网络）。
 *
 * - base: './'            —— 资源相对路径，file:// 下可用
 * - singlefile 插件        —— 内联全部 JS/CSS/字体/图片
 * - VITE_OFFLINE=1        —— 运行期切换到本地回放层 + hash 路由
 */
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  base: './',
  plugins: [vue(), viteSingleFile({ removeViteModuleLoader: true })],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    outDir: 'dist-offline',
    assetsInlineLimit: 100 * 1024 * 1024,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 30000,
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
  define: {
    __OFFLINE_BUILD__: 'true',
  },
})