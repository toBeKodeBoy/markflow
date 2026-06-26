import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'

// 静态 ?inline 导入 —— 在构建时内联为字符串，同步可用，无异步时序问题
import lightHljsCss from 'highlight.js/styles/github.css?inline'
import darkHljsCss from 'highlight.js/styles/github-dark.css?inline'

/** 根据 data-theme 注入对应 highlight.js 语法高亮主题 */
function loadHljsTheme(theme: string) {
  const styleId = 'hljs-theme'
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = styleId
    document.head.appendChild(styleEl)
  }
  styleEl.textContent = theme === 'dark' ? darkHljsCss : lightHljsCss
}

// 初始加载（在 app.mount 之前同步执行）
const currentTheme = document.documentElement.getAttribute('data-theme') || 'light'
loadHljsTheme(currentTheme)

// 监听 data-theme 变化自动切换
const observer = new MutationObserver(() => {
  const theme = document.documentElement.getAttribute('data-theme') || 'light'
  loadHljsTheme(theme)
})
observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
