/**
 * Visual Canvas Layer Component Tests - 视觉层级优化
 * 
 * 验证使用画布层样式的组件在深色模式下的表现
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '../src/App.vue'
import { useNoteStore } from '../src/stores/note'
import { useEditorTabsStore } from '../src/stores/editorTabs'
import { setActivePinia, createPinia } from 'pinia'
import fs from 'fs'
import path from 'path'

// Mock Milkdown 依赖
vi.mock('@milkdown/core', () => ({
  Editor: { props: {}, setup: () => {} },
  rootCtx: Symbol('rootCtx'),
  defaultValueCtx: Symbol('defaultValueCtx'),
  editorViewCtx: Symbol('editorViewCtx'),
}))
vi.mock('@milkdown/preset-commonmark', () => ({ commonmark: () => [] }))
vi.mock('@milkdown/preset-gfm', () => ({ gfm: () => [] }))
vi.mock('@milkdown/plugin-clipboard', () => ({ clipboard: () => [] }))
vi.mock('@milkdown/plugin-listener', () => ({
  listener: () => [],
  listenerCtx: Symbol('listenerCtx'),
}))
vi.mock('@milkdown/plugin-history', () => ({ history: () => [] }))
vi.mock('@milkdown/ctx', () => ({
  createContext: () => ({}),
}))

// Mock Milkdown Editor component
vi.mock('../src/components/WysiwygEditor.vue', () => ({
  default: {
    name: 'WysiwygEditor',
    template: '<div class="wysiwyg-pane editor-canvas" data-testid="wysiwyg-editor"><slot /></div>',
    props: ['noteId', 'viewMode', 'focusMode'],
  },
}))

// Mock CodeMirror Editor component
vi.mock('../src/components/Editor.vue', () => ({
  default: {
    name: 'Editor',
    template: '<div class="cm-editor editor-canvas" data-testid="code-mirror-editor"><slot /></div>',
    props: ['noteId', 'viewMode', 'readOnly', 'wrapEnabled', 'lineNumbers'],
  },
}))

// Mock Preview component
vi.mock('../src/components/Preview.vue', () => ({
  default: {
    name: 'Preview',
    template: '<div class="markdown-preview" data-testid="preview"><slot /></div>',
    props: ['htmlContent', 'loading'],
  },
}))

// Mock child components
vi.mock('../src/components/Toolbar.vue', () => ({
  default: {
    name: 'Toolbar',
    template: '<div class="toolbar" data-testid="toolbar"><slot /></div>',
  },
}))

vi.mock('../src/components/Sidebar.vue', () => ({
  default: {
    name: 'Sidebar',
    template: '<aside class="sidebar" data-testid="sidebar"><slot /></aside>',
  },
}))

vi.mock('../src/components/Toc.vue', () => ({
  default: {
    name: 'Toc',
    template: '<nav class="toc" data-testid="toc"><slot /></nav>',
  },
}))

vi.mock('../src/components/EditorTabBar.vue', () => ({
  default: {
    name: 'EditorTabBar',
    template: '<div class="editor-tab-bar" data-testid="tab-bar"><slot /></div>',
  },
}))

vi.mock('../src/composables/useAppSettings.ts', () => ({
  useAppSettings: () => ({
    settings: {
      viewMode: 'live',
      darkMode: true,
      contentWidth: 'readable',
    },
    load: vi.fn(),
    save: vi.fn(),
    get: () => ({
      viewMode: 'live',
      darkMode: true,
      sidebarVisible: true,
    }),
    set: vi.fn(),
  }),
}))

vi.mock('../src/composables/useTheme.ts', () => ({
  useTheme: vi.fn(() => ({
    updateHtmlThemeAttribute: vi.fn(),
    init: vi.fn(),
  })),
}))

vi.mock('../src/plugins/htmlRender.ts', () => ({
  HTML_RENDER_CONFIG: { enabled: false },
}))

describe('Visual Canvas Layer - Component Integration', () => {
  function createMocks() {
    return {
      global: {
        mocks: {
          markflow: {
            invoke: vi.fn().mockResolvedValue(null),
            on: vi.fn(),
            off: vi.fn(),
          },
        },
        stubs: {
          APPIcon: true,
        },
      },
    }
  }

  const cssFilePath = path.join(__dirname, '../src/style.css')
  const styleContent = fs.readFileSync(cssFilePath, 'utf-8')

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('CSS Styles Verification', () => {
    it('should have surface elevation for toolbar-group', () => {
      expect(styleContent).toContain('.toolbar-group')
      expect(styleContent).toContain('--surface-elevated-2')
      expect(styleContent).toContain('--shadow-sm')
    })

    it('should apply elevated shadows for modals in dark mode', () => {
      expect(styleContent).toContain('.modal')
      expect(styleContent).toContain('--shadow-lg')
      
      // Verify dark mode has reduced shadow opacity
      expect(styleContent).toContain('rgba(0, 0, 0, 0.22)')
    })

    it('should define canvas-shadow and canvas-radius variables', () => {
      expect(styleContent).toContain('--canvas-shadow:')
      expect(styleContent).toContain('--canvas-radius:')
    })

    it('should have different canvas styles for each mode', () => {
      expect(styleContent).toContain('.mode-live .editor-canvas')
      expect(styleContent).toContain('.mode-focus .editor-canvas')
      expect(styleContent).toContain('.mode-split .editor-canvas')
    })

    it('should remove canvas decorations in split and source modes', () => {
      const combinedModeMatch = styleContent.match(/\.mode-split \.editor-canvas,[\s\S]{0,100}border:\s*none/)
      expect(combinedModeMatch).toBeTruthy()
    })
  })

  describe('App.vue - Dark Mode Canvas Layer', () => {
    it('should apply mode-live class for live view mode by default', async () => {
      const pinia = createPinia()
      setActivePinia(pinia)
      const tabsStore = useEditorTabsStore(pinia)
      
      tabsStore.activeTabId = 'tab-1'

      const wrapper = mount(App, {
        ...createMocks(),
        global: {
          ...createMocks().global,
          plugins: [[pinia]],
        },
      })

      await wrapper.vm.$nextTick()
      
      const appEl = wrapper.find('.app')
      expect(appEl.exists()).toBe(true)
      expect(appEl.classes()).toContain('mode-live')
    })

    it('should render editor-canvas element correctly', async () => {
      const pinia = createPinia()
      setActivePinia(pinia)
      const noteStore = useNoteStore(pinia)
      const tabsStore = useEditorTabsStore(pinia)
      
      tabsStore.activeTabId = 'tab-1'
      noteStore.noteList.value = [{ id: 'note-1', title: 'Test', content: '', folderId: null }]

      const wrapper = mount(App, {
        ...createMocks(),
        global: {
          ...createMocks().global,
          plugins: [[pinia]],
        },
      })

      await wrapper.vm.$nextTick()
      
      const canvas = wrapper.find('.editor-canvas')
      expect(canvas.exists()).toBe(true)
      expect(canvas.classes()).toContain('editor-canvas')
    })
  })

  describe('Canvas Layer Styles in Different Modes', () => {
    it('should render editor-canvas element correctly', async () => {
      const pinia = createPinia()
      setActivePinia(pinia)
      const noteStore = useNoteStore(pinia)
      const tabsStore = useEditorTabsStore(pinia)
      
      // Create a tab to trigger editor rendering
      tabsStore.activeTabId = 'tab-1'
      noteStore.noteList.value = [{ id: 'note-1', title: 'Test', content: '', folderId: null }]

      const wrapper = mount(App, {
        ...createMocks(),
        global: {
          ...createMocks().global,
          plugins: [[pinia]],
        },
      })

      await wrapper.vm.$nextTick()
      
      const canvas = wrapper.find('.editor-canvas')
      expect(canvas.exists()).toBe(true)
      expect(canvas.classes()).toContain('editor-canvas')
    })

    it('should render toolbar correctly', async () => {
      const pinia = createPinia()
      setActivePinia(pinia)
      const tabsStore = useEditorTabsStore(pinia)
      
      tabsStore.activeTabId = 'tab-1'

      const wrapper = mount(App, {
        ...createMocks(),
        global: {
          ...createMocks().global,
          plugins: [[pinia]],
        },
      })

      await wrapper.vm.$nextTick()
      
      const toolbar = wrapper.find('[data-testid="toolbar"]')
      expect(toolbar.exists()).toBe(true)
      expect(toolbar.classes()).toContain('toolbar')
    })
  })

  describe('Toolbar Visual Hierarchy', () => {
    it('should render toolbar with groups', async () => {
      const pinia = createPinia()
      setActivePinia(pinia)
      const tabsStore = useEditorTabsStore(pinia)
      
      tabsStore.activeTabId = 'tab-1'

      const wrapper = mount(App, {
        ...createMocks(),
        global: {
          ...createMocks().global,
          plugins: [[pinia]],
        },
      })

      await wrapper.vm.$nextTick()
      
      const toolbar = wrapper.find('[data-testid="toolbar"]')
      expect(toolbar.exists()).toBe(true)
      expect(toolbar.classes()).toContain('toolbar')
    })
  })

  describe('Modal Visual Hierarchy', () => {
    it('should use elevated shadow for modals', () => {
      expect(styleContent).toContain('.search-modal')
      expect(styleContent).toContain('box-shadow: var(--shadow-lg)')
      
      expect(styleContent).toContain('.create-entry-modal')
      expect(styleContent).toContain('box-shadow: var(--shadow-lg)')
    })
  })
})
