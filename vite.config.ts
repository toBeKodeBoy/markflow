import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  base: './',
  resolve: {
    alias: { '@': resolve(__dirname, 'src') }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('codemirror') || id.includes('@codemirror')) return 'editor'
          if (id.includes('marked') || id.includes('highlight.js')) return 'markdown'
          if (id.includes('vue') || id.includes('pinia')) return 'vendor'
        }
      }
    }
  },
  server: {
    port: 5173
  }
})
