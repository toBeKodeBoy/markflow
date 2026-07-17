/**
 * Test setup — mock uTools bridge and browser APIs.
 * Runs before every test file.
 */
import { vi, beforeEach } from 'vitest'
import '@/stores/editorTabs'

const mockStorage = {
  getItem(key: string) { return localStorage.getItem(key) },
  setItem(key: string, value: string) { localStorage.setItem(key, value) },
  deleteItem(key: string) { localStorage.removeItem(key) },
}

;(globalThis as any).__clearMockStorage = () => {
  Object.keys(localStorage).forEach(k => localStorage.removeItem(k))
}

window.markflow = {
  getNoteList: vi.fn(() => {
    const raw = mockStorage.getItem('markflow_note_list')
    return raw ? JSON.parse(raw) : []
  }),
  saveNoteList: vi.fn((list) => {
    mockStorage.setItem('markflow_note_list', JSON.stringify(list))
  }),
  getNote: vi.fn((id: string) => {
    const raw = mockStorage.getItem(`markflow_note_${id}`)
    return raw ? JSON.parse(raw) : null
  }),
  saveNote: vi.fn((id: string, data) => {
    mockStorage.setItem(`markflow_note_${id}`, JSON.stringify(data))
  }),
  removeNote: vi.fn((id: string) => {
    mockStorage.deleteItem(`markflow_note_${id}`)
  }),
  getFolderList: vi.fn(() => {
    const raw = mockStorage.getItem('markflow_folder_list')
    return raw ? JSON.parse(raw) : []
  }),
  saveFolderList: vi.fn((list) => {
    mockStorage.setItem('markflow_folder_list', JSON.stringify(list))
  }),
  getSettings: vi.fn(() => {
    const raw = mockStorage.getItem('markflow_settings')
    return raw ? JSON.parse(raw) : {
      theme: 'light',
      fontSize: 14,
      editorFontFamily: 'monospace',
      previewVisible: true,
      sidebarVisible: true,
    }
  }),
  saveSettings: vi.fn((settings) => {
    mockStorage.setItem('markflow_settings', JSON.stringify(settings))
  }),
  showNotification: vi.fn(),
  saveMarkdownFile: vi.fn(() => true),
  savePdfFromHtml: vi.fn(() => Promise.resolve({ ok: true })),
  openMarkdownFile: vi.fn(() => ({
    content: '# Test content\n',
    path: 'D:\\mock\\test.md',
    name: 'test.md',
    images: [],
  })),
  openMarkdownFolder: vi.fn(() =>
    Promise.resolve({
      rootPath: '/mock/import',
      files: [{ relativePath: 'readme.md', content: '# Test', images: [] }],
    })
  ),
  isDarkTheme: vi.fn(() => false),
  hideMainWindow: vi.fn(),
  copyText: vi.fn(() => true),
  getAssetIndex: vi.fn(() => {
    const raw = mockStorage.getItem('markflow_asset_index')
    return raw ? JSON.parse(raw) : []
  }),
  saveAssetIndex: vi.fn((index) => {
    mockStorage.setItem('markflow_asset_index', JSON.stringify(index))
  }),
  getAsset: vi.fn((id: string) => {
    const raw = mockStorage.getItem(`markflow_asset_${id}`)
    return raw ? JSON.parse(raw) : null
  }),
  saveAsset: vi.fn((id: string, record) => {
    mockStorage.setItem(`markflow_asset_${id}`, JSON.stringify(record))
  }),
  removeAsset: vi.fn((id: string) => {
    mockStorage.deleteItem(`markflow_asset_${id}`)
  }),
}

class LocalStorageMock {
  private store: Record<string, string> = {}
  clear() { this.store = {} }
  getItem(key: string) { return this.store[key] ?? null }
  setItem(key: string, value: string) { this.store[key] = value }
  removeItem(key: string) { delete this.store[key] }
  get length() { return Object.keys(this.store).length }
  key(index: number) { return Object.keys(this.store)[index] ?? null }
}
Object.defineProperty(window, 'localStorage', { value: new LocalStorageMock() })

vi.spyOn(console, 'warn').mockImplementation(() => {})

/** jsdom 下 mermaid 依赖 SVG getBBox */
if (typeof SVGElement !== 'undefined') {
  Object.defineProperty(SVGElement.prototype, 'getBBox', {
    configurable: true,
    value() {
      return { x: 0, y: 0, width: 100, height: 20 }
    },
  })
}
if (typeof Element !== 'undefined' && !Element.prototype.getBoundingClientRect) {
  Element.prototype.getBoundingClientRect = () => ({
    x: 0, y: 0, width: 100, height: 20,
    top: 0, left: 0, bottom: 20, right: 100,
    width: 100, height: 20, toJSON: () => ({}),
  })
}
/** jsdom 下 mermaid htmlLabels:false 依赖 SVG 文本度量 */
const svgTextProto =
  typeof SVGTextElement !== 'undefined'
    ? SVGTextElement.prototype
    : typeof SVGElement !== 'undefined'
      ? SVGElement.prototype
      : null
if (svgTextProto && !('getComputedTextLength' in svgTextProto)) {
  Object.defineProperty(svgTextProto, 'getComputedTextLength', {
    configurable: true,
    value(this: { textContent: string | null }) {
      return (this.textContent?.length ?? 1) * 8
    },
  })
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

class IDBRequestMock<T = unknown> {
  result: T | undefined
  error: Error | null = null
  onsuccess: ((ev: Event) => void) | null = null
  onerror: ((ev: Event) => void) | null = null
  _resolve(value: T) {
    this.result = value
    this.onsuccess?.({} as Event)
  }
  _reject(err: Error) {
    this.error = err
    this.onerror?.({} as Event)
  }
}

class IDBTransactionMock {
  oncomplete: (() => void) | null = null
  onerror: (() => void) | null = null
  error: Error | null = null
  constructor(private store: IDBObjectStoreMock) {}
  objectStore() { return this.store }
  _finish() {
    queueMicrotask(() => this.oncomplete?.())
  }
}

class IDBObjectStoreMock {
  private data = new Map<string, unknown>()
  private tx: IDBTransactionMock | null = null
  _bindTx(tx: IDBTransactionMock) { this.tx = tx }
  get(key: string) {
    const req = new IDBRequestMock()
    queueMicrotask(() => {
      req._resolve(this.data.get(key))
      this.tx?._finish()
    })
    return req
  }
  put(value: unknown, key: string) {
    const req = new IDBRequestMock()
    this.data.set(key, value)
    queueMicrotask(() => {
      req._resolve(undefined)
      this.tx?._finish()
    })
    return req
  }
  delete(key: string) {
    const req = new IDBRequestMock()
    this.data.delete(key)
    queueMicrotask(() => {
      req._resolve(undefined)
      this.tx?._finish()
    })
    return req
  }
  clear() { this.data.clear() }
}

const idbStore = new IDBObjectStoreMock()

class IDBDatabaseMock {
  objectStoreNames = { contains: () => true }
  transaction() {
    const tx = new IDBTransactionMock(idbStore)
    idbStore._bindTx(tx)
    return tx
  }
  close() {}
  createObjectStore() { return idbStore }
}

;(globalThis as any).__clearMockIdb = () => idbStore.clear()

const idbOpen = vi.fn(() => {
  const req = new IDBRequestMock<IDBDatabaseMock>()
  queueMicrotask(() => req._resolve(new IDBDatabaseMock()))
  return req
})

Object.defineProperty(window, 'indexedDB', {
  writable: true,
  value: { open: idbOpen },
})

beforeEach(() => {
  idbStore.clear()
})
