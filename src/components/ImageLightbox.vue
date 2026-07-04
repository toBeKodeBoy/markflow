<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="image-lightbox-overlay"
      role="dialog"
      aria-modal="true"
      :aria-label="alt || '图片预览'"
      @click.self="closeLightbox"
    >
      <button
        type="button"
        class="image-lightbox-close"
        title="关闭 (Esc)"
        @click="closeLightbox"
      >
        ✕
      </button>
      <img :src="src" :alt="alt" class="image-lightbox-img" @click.stop />
      <p v-if="alt" class="image-lightbox-caption">{{ alt }}</p>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue'
import { useImageLightbox } from '../composables/useImageLightbox'

const { visible, src, alt, closeLightbox } = useImageLightbox()

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && visible.value) {
    e.preventDefault()
    e.stopPropagation()
    closeLightbox()
  }
}

watch(visible, (open) => {
  if (open) {
    window.addEventListener('keydown', onKeydown, true)
    document.body.style.overflow = 'hidden'
  } else {
    window.removeEventListener('keydown', onKeydown, true)
    document.body.style.overflow = ''
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown, true)
  document.body.style.overflow = ''
})
</script>
