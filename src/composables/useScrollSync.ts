import { ref } from 'vue'

/** 分屏模式下编辑器与预览的滚动比例（0–1），由 Editor 写入、Preview 读取。 */
const scrollRatio = ref(0)

/** 防止同一帧内重复写入 scrollRatio，避免滚动联动抖动。 */
let locked = false

/**
 * 分屏滚动同步：左侧 CodeMirror 滚动时更新比例，右侧 Preview 按比例跟随。
 * 模块级单例，Editor / Preview 共享同一份 scrollRatio。
 */
export function useScrollSync() {
  /**
   * 更新滚动比例。
   * @param ratio 当前滚动位置占可滚动高度的比例，范围 0（顶部）到 1（底部）
   */
  function setRatio(ratio: number) {
    if (locked) return
    locked = true
    scrollRatio.value = ratio
    requestAnimationFrame(() => { locked = false })
  }

  return {
    /** 只读滚动比例，供 Preview 监听并同步 scrollTop */
    scrollRatio,
    setRatio,
  }
}
