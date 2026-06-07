import { ref } from 'vue'

const scrollRatio = ref(0)
let locked = false

export function useScrollSync() {
  function setRatio(ratio: number) {
    if (locked) return
    locked = true
    scrollRatio.value = ratio
    requestAnimationFrame(() => { locked = false })
  }

  return { scrollRatio, setRatio }
}
