import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import SettingsModal from '../../../src/components/SettingsModal.vue'
import { useNoteStore } from '../../../src/stores/note'

let pinia: Pinia

function mountSettings(visible = true) {
  return mount(SettingsModal, {
    props: { visible },
    global: { plugins: [pinia] },
  })
}

describe('SettingsModal', () => {
  beforeEach(() => {
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
    vi.stubGlobal('confirm', vi.fn(() => true))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('clear all library data (1.4.4)', () => {
    it('renders 清空全部数据 button in data management section', () => {
      const wrapper = mountSettings()
      const btn = wrapper.find('[data-testid="clear-library-btn"]')
      expect(btn.exists()).toBe(true)
      expect(btn.text()).toContain('清空全部数据')
    })

    it('does not clear when user cancels first confirm', async () => {
      const store = useNoteStore()
      store.createNoteWithContent('# Hello')
      vi.stubGlobal('confirm', vi.fn(() => false))

      const wrapper = mountSettings()
      await wrapper.find('[data-testid="clear-library-btn"]').trigger('click')

      expect(store.noteList).toHaveLength(1)
      expect(wrapper.emitted('library-cleared')).toBeUndefined()
    })

    it('does not clear when user cancels second confirm', async () => {
      const store = useNoteStore()
      store.createNoteWithContent('# Hello')
      const confirm = vi.fn().mockReturnValueOnce(true).mockReturnValueOnce(false)
      vi.stubGlobal('confirm', confirm)

      const wrapper = mountSettings()
      await wrapper.find('[data-testid="clear-library-btn"]').trigger('click')

      expect(store.noteList).toHaveLength(1)
      expect(confirm).toHaveBeenCalledTimes(2)
      expect(wrapper.emitted('library-cleared')).toBeUndefined()
    })

    it('clears notes and folders after double confirm', async () => {
      const store = useNoteStore()
      const folder = store.createFolder('docs')
      store.createNoteWithContent('# Hello', folder.id)

      const wrapper = mountSettings()
      await wrapper.find('[data-testid="clear-library-btn"]').trigger('click')
      await flushPromises()

      expect(store.noteList).toHaveLength(0)
      expect(store.folderList).toHaveLength(0)
      expect(store.currentNote).toBeNull()
      expect(wrapper.emitted('library-cleared')).toHaveLength(1)
    })

    it('preserves app settings after clear', async () => {
      const store = useNoteStore()
      store.createNoteWithContent('# Hello')
      const { useStorage } = await import('../../../src/composables/useStorage')
      const storage = useStorage()
      storage.saveSettings({ ...storage.getSettings(), theme: 'dark', fontSize: 18 })

      const wrapper = mountSettings()
      await wrapper.find('[data-testid="clear-library-btn"]').trigger('click')
      await flushPromises()

      expect(storage.getSettings().theme).toBe('dark')
      expect(storage.getSettings().fontSize).toBe(18)
    })
  })
})
