import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

const codemirrorDedupe = [
  '@lezer/common',
  '@lezer/highlight',
  '@lezer/markdown',
  '@lezer/lr',
  '@codemirror/state',
  '@codemirror/view',
  '@codemirror/language',
  '@codemirror/lang-markdown',
  '@codemirror/autocomplete',
]

export default defineConfig({
  plugins: [vue()],
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@lezer/common': resolve(__dirname, 'node_modules/@lezer/common'),
      '@lezer/highlight': resolve(__dirname, 'node_modules/@lezer/highlight'),
      '@lezer/lr': resolve(__dirname, 'node_modules/@lezer/lr'),
      '@lezer/markdown': resolve(__dirname, 'node_modules/@lezer/markdown'),
    },
    dedupe: codemirrorDedupe,
  },
  optimizeDeps: {
    include: [
      '@codemirror/state',
      '@codemirror/view',
      '@codemirror/commands',
      '@codemirror/lang-markdown',
      '@codemirror/language',
      '@codemirror/autocomplete',
    ],
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('codemirror') || id.includes('@codemirror') || id.includes('@lezer')) return 'editor'
          if (id.includes('marked') || id.includes('highlight.js')) return 'markdown'
          if (id.includes('vue') || id.includes('pinia')) return 'vendor'
        }
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['.monkeycode-ai.online']
  }
})
