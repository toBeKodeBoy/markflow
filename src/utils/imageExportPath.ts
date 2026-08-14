import type { ImageExportMode } from '../types'
import { renderPathTemplate } from './pathTemplate'

export interface ResolveImageExportContext {
  markdownFilePath: string
  noteTitle: string
  mode: ImageExportMode
  customTemplate?: string
  typoraRootDir?: string
}

export interface ResolvedImageExportTarget {
  assetDirAbsPath: string
  markdownPathStyle: 'absolute' | 'relative'
}

function toWindowsPath(path: string): string {
  return path.replace(/\//g, '\\')
}

function splitPath(path: string): string[] {
  return toWindowsPath(path).split('\\').filter(Boolean)
}

function getPathRoot(path: string): string {
  const normalized = toWindowsPath(path)
  const match = normalized.match(/^[A-Za-z]:/)
  return match ? match[0] : ''
}

function dirname(path: string): string {
  const normalized = toWindowsPath(path)
  const idx = normalized.lastIndexOf('\\')
  return idx > 0 ? normalized.slice(0, idx) : normalized
}

function basenameWithoutExt(path: string): string {
  const normalized = toWindowsPath(path)
  const name = normalized.slice(normalized.lastIndexOf('\\') + 1)
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

function joinWindowsPath(base: string, ...parts: string[]): string {
  const root = getPathRoot(base)
  const baseParts = splitPath(base)
  const offset = root ? 1 : 0
  const rawParts = [...baseParts.slice(offset), ...parts.flatMap(splitPath)]
  const resolved: string[] = []
  for (const part of rawParts) {
    if (!part || part === '.') continue
    if (part === '..') {
      resolved.pop()
      continue
    }
    resolved.push(part)
  }
  return root ? `${root}\\${resolved.join('\\')}` : resolved.join('\\')
}

function isAbsolutePath(path: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(path) || /^\\\\/.test(path)
}

function validateRelativeTemplate(template: string): void {
  if (/\p{Cc}/u.test(template)) throw new Error('图片导出模板包含非法控制字符')
  if (isAbsolutePath(template)) throw new Error('图片导出模板必须是相对路径')
  const parts = toWindowsPath(template).split('\\').filter(Boolean)
  if (parts.some((part) => part === '..')) {
    throw new Error('图片导出模板不能包含路径穿越')
  }
}

function buildTemplateVars(markdownFilePath: string, noteTitle: string) {
  const now = new Date()
  return {
    filename: basenameWithoutExt(markdownFilePath),
    noteTitle,
    date: now.toISOString().slice(0, 10),
    time: now.toTimeString().slice(0, 8).replace(/:/g, ''),
  }
}

export function resolveImageExportTarget(
  ctx: ResolveImageExportContext
): ResolvedImageExportTarget {
  const markdownDir = dirname(ctx.markdownFilePath)

  if (ctx.mode === 'same-folder') {
    return { assetDirAbsPath: markdownDir, markdownPathStyle: 'relative' }
  }

  if (ctx.mode === 'note-assets-folder') {
    return {
      assetDirAbsPath: joinWindowsPath(markdownDir, `${basenameWithoutExt(ctx.markdownFilePath)}.assets`),
      markdownPathStyle: 'relative',
    }
  }

  if (ctx.mode === 'typora-cache-absolute') {
    if (!ctx.typoraRootDir?.trim() || !isAbsolutePath(ctx.typoraRootDir)) {
      throw new Error('未配置有效的 Typora 图片目录')
    }
    return {
      assetDirAbsPath: joinWindowsPath(ctx.typoraRootDir, 'typora-user-images'),
      markdownPathStyle: 'absolute',
    }
  }

  const template = (ctx.customTemplate || './assets/${filename}').trim()
  validateRelativeTemplate(template)
  const rendered = renderPathTemplate(template, buildTemplateVars(ctx.markdownFilePath, ctx.noteTitle))
  validateRelativeTemplate(rendered)
  return {
    assetDirAbsPath: joinWindowsPath(markdownDir, rendered),
    markdownPathStyle: 'relative',
  }
}
