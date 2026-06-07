/**
 * Test setup — mock uTools bridge and browser APIs.
 * Runs before every test file.
 */
import { vi, beforeEach } from 'vitest'

// ---- mock uTools bridge (window.markflow) ----
// Use localStorage as backing store so that localStorage.clear() in tests cleans all data.
const mockStorage = {
  getItem(key: string) { return localStorage.getItem(key) },
  setItem(key: string, value: string) { localStorage.setItem(key, value) },
  deleteItem(key: string) { localStorage.removeItem(key) },
}

// Expose a helper to clear mock storage
;(globalThis as any).__clearMockStorage = () => {
  const keys = Object.keys(localStorage)
  keys.forEach(k => localStorage.removeItem(k))
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
    return raw ? JSON.parse(raw) : { theme: 'light', fontSize: 14, editorFontFamily: 'monospace', previewVisible: true, sidebarVisible: true }
  }),
  saveSettings: vi.fn((settings) => {
    mockStorage.setItem('markflow_settings', JSON.stringify(settings))
  }),
  showNotification: vi.fn(),
  saveMarkdownFile: vi.fn(() => true),
  openMarkdownFile: vi.fn(() => '# Test content\n'),
  isDarkTheme: vi.fn(() => false),
  hideMainWindow: vi.fn(),
}

// ---- mock localStorage fallback ----
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

// ---- mock console.warn (keep tests clean) ----
vi.spyOn(console, 'warn').mockImplementation(() => {})

// ---- mock matchMedia ----
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
