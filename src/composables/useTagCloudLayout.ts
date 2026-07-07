export interface TagCloudItemStyle {
  fontSize: string
  fontWeight: number
  opacity: number
}

/** weight 0–1 → 字号 / 字重 / 透明度 */
export function tagCloudItemStyle(weight: number): TagCloudItemStyle {
  const w = Math.min(1, Math.max(0, weight))
  return {
    fontSize: `${11 + Math.round(w * 2)}px`,
    fontWeight: w >= 0.66 ? 600 : w >= 0.33 ? 500 : 400,
    opacity: 0.65 + w * 0.35,
  }
}
