import hljs from 'highlight.js'

const POPULAR_LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp',
  'go', 'rust', 'ruby', 'php', 'swift', 'kotlin',
  'bash', 'shell', 'sql',
  'html', 'css', 'json', 'xml', 'yaml', 'markdown', 'mermaid',
  'plaintext',
]

const ALL_LANGUAGES = (() => {
  const seen = new Set<string>(POPULAR_LANGUAGES)
  const extra = hljs.listLanguages().filter((lang) => {
    if (seen.has(lang)) return false
    seen.add(lang)
    return true
  })
  return [...POPULAR_LANGUAGES, ...extra]
})()

type DropdownOptions = {
  onSelect: (language: string) => void
}

let globalDropdown: HTMLDivElement | null = null
let globalList: HTMLDivElement | null = null
let searchInput: HTMLInputElement | null = null
let activeIndex = -1
let activeOptions: DropdownOptions | null = null

function highlightMatch(text: string, query: string): string {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    text.slice(0, idx) +
    `<span class="highlight">${text.slice(idx, idx + query.length)}</span>` +
    text.slice(idx + query.length)
  )
}

function filterLanguages(query: string): string[] {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return ALL_LANGUAGES

  const terms = trimmed.split(/\s+/)
  return ALL_LANGUAGES.filter((lang) =>
    terms.every((term) => lang.toLowerCase().includes(term)),
  )
}

function selectLanguage(language: string) {
  activeOptions?.onSelect(language)
  hideCodeLanguageDropdown()
}

function renderList(items: string[], query: string) {
  if (!globalList) return
  globalList.innerHTML = ''

  if (items.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'code-lang-dropdown-empty'
    empty.textContent = '无匹配语言'
    globalList.appendChild(empty)
    return
  }

  items.forEach((language) => {
    const item = document.createElement('div')
    item.className = 'code-lang-dropdown-item'
    item.dataset.lang = language
    item.innerHTML = highlightMatch(language, query)
    item.addEventListener('mousedown', (event) => {
      event.preventDefault()
      event.stopPropagation()
      selectLanguage(language)
    })
    globalList!.appendChild(item)
  })
}

function updateActiveItem(items: NodeListOf<HTMLDivElement>) {
  items.forEach((item, index) => {
    item.classList.toggle('active', index === activeIndex)
  })
  if (activeIndex >= 0 && items[activeIndex]) {
    items[activeIndex].scrollIntoView({ block: 'nearest' })
  }
}

function onSearchInput() {
  if (!searchInput) return
  const query = searchInput.value
  renderList(filterLanguages(query), query)
  activeIndex = -1
}

function onSearchKeyDown(event: KeyboardEvent) {
  if (!globalList) return
  const items = globalList.querySelectorAll<HTMLDivElement>('.code-lang-dropdown-item')
  if (items.length === 0) return

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      activeIndex = Math.min(activeIndex + 1, items.length - 1)
      updateActiveItem(items)
      break
    case 'ArrowUp':
      event.preventDefault()
      activeIndex = Math.max(activeIndex - 1, 0)
      updateActiveItem(items)
      break
    case 'Enter': {
      event.preventDefault()
      const index = activeIndex >= 0 ? activeIndex : 0
      if (index < items.length) selectLanguage(items[index].dataset.lang || '')
      break
    }
    case 'Escape':
      event.preventDefault()
      hideCodeLanguageDropdown()
      break
  }
}

function getDropdown(): HTMLDivElement {
  if (globalDropdown) return globalDropdown

  const dropdown = document.createElement('div')
  dropdown.className = 'code-lang-dropdown'

  const searchWrap = document.createElement('div')
  searchWrap.className = 'code-lang-search-wrap'

  const searchIcon = document.createElement('span')
  searchIcon.className = 'code-lang-search-icon'
  searchIcon.textContent = '\u{1F50D}'

  const input = document.createElement('input')
  input.className = 'code-lang-search-input'
  input.type = 'text'
  input.placeholder = '搜索语言...'
  input.spellcheck = false
  input.autocomplete = 'off'
  input.addEventListener('input', onSearchInput)
  input.addEventListener('keydown', onSearchKeyDown)

  searchWrap.appendChild(searchIcon)
  searchWrap.appendChild(input)
  dropdown.appendChild(searchWrap)
  searchInput = input

  const list = document.createElement('div')
  list.className = 'code-lang-dropdown-list'
  dropdown.appendChild(list)
  globalList = list

  renderList(ALL_LANGUAGES, '')

  dropdown.style.display = 'none'
  document.body.appendChild(dropdown)

  // 用 click 关闭，避免 mousedown 打开后同一事件冒泡到 document 立刻关闭
  document.addEventListener('click', (event) => {
    if (dropdown.style.display === 'none') return
    const target = event.target as Node
    if (dropdown.contains(target)) return
    const anchor = (target as HTMLElement).closest?.('.code-lang-badge, .preview-code-lang-badge')
    if (anchor) return
    hideCodeLanguageDropdown()
  })

  globalDropdown = dropdown
  return dropdown
}

export function showCodeLanguageDropdown(anchor: HTMLElement, options: DropdownOptions) {
  const dropdown = getDropdown()
  activeOptions = options
  activeIndex = -1

  if (searchInput) {
    searchInput.value = ''
    renderList(ALL_LANGUAGES, '')
  }

  const rect = anchor.getBoundingClientRect()
  dropdown.style.position = 'fixed'
  dropdown.style.top = `${rect.bottom + 4}px`
  dropdown.style.right = `${window.innerWidth - rect.right}px`
  dropdown.style.minWidth = `${Math.max(rect.width, 160)}px`
  dropdown.style.left = ''
  dropdown.style.width = ''
  dropdown.style.display = 'block'

  requestAnimationFrame(() => {
    searchInput?.focus()
  })
}

export function hideCodeLanguageDropdown() {
  if (globalDropdown) {
    globalDropdown.style.display = 'none'
  }
  activeOptions = null
  activeIndex = -1
}
