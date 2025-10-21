import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  root: 'gui',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'gui/src'),
    },
  },
  base: './',
  build: {
    outDir: '../dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'gui/index.html'),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})