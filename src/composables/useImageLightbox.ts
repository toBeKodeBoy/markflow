import { ref, readonly } from 'vue'

const visible = ref(false)
const src = ref('')
const alt = ref('')

/** 图片全屏预览：模块级单例状态，供 App 与各编辑区共享 */
export function useImageLightbox() {
  function openLightbox(imageSrc: string, imageAlt = '') {
    if (!imageSrc) return
    src.value = imageSrc
    alt.value = imageAlt
    visible.value = true
  }

  function closeLightbox() {
    visible.value = false
    src.value = ''
    alt.value = ''
  }

  return {
    visible: readonly(visible),
    src: readonly(src),
    alt: readonly(alt),
    openLightbox,
    closeLightbox,
  }
}
