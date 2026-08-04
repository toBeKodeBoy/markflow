// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import {
  createLogLineBuffer,
  createSessionHeader,
  DEFAULT_DEV_PORT,
  formatLogLine,
  normalizeLogChunk,
  stripAnsiAndNormalizeNewlines,
} from '../../../scripts/dev-with-log.mjs'

describe('dev-with-log helpers', () => {
  it('为日志行补齐时间戳和来源，并统一换行', () => {
    const line = formatLogLine('vite.stdout', 'server ready', new Date('2026-07-30T10:15:24.002+08:00'))

    expect(line).toContain('[2026-07-30T02:15:24.002Z] [vite.stdout] server ready')
    expect(line.endsWith('\n')).toBe(true)
  })

  it('保留中文内容并去掉尾部多余换行', () => {
    const normalized = normalizeLogChunk(Buffer.from('启动失败：端口占用\r\n\r\n', 'utf8'))
    expect(normalized).toBe('启动失败：端口占用')
  })

  it('剥离 ANSI 后可得到空串，但原始控制序列仍需透传终端', () => {
    const ansiOnly = '\u001B[2K\u001B[1G'
    expect(normalizeLogChunk(ansiOnly)).toBe('')
    expect(stripAnsiAndNormalizeNewlines(ansiOnly)).toBe('')
  })

  it('跨 chunk 缓冲完整行，避免截断或粘连', () => {
    const lines: string[] = []
    const buffer = createLogLineBuffer((line) => lines.push(line))

    buffer.push('VITE v5.0')
    buffer.push('.0 ready\nin ')
    buffer.push('123 ms\n')

    expect(lines).toEqual(['VITE v5.0.0 ready', 'in 123 ms'])
  })

  it('flush 时写出未完成的尾部半行', () => {
    const lines: string[] = []
    const buffer = createLogLineBuffer((line) => lines.push(line))

    buffer.push('partial without newline')
    buffer.flush()

    expect(lines).toEqual(['partial without newline'])
  })

  it('生成包含调试会话元信息的头部', () => {
    const header = createSessionHeader(
      {
        cwd: 'D:\\files\\utools\\markflow',
        nodeVersion: 'v24.0.0',
        port: DEFAULT_DEV_PORT,
        command: 'vite',
      },
      new Date('2026-07-30T10:15:21.123+08:00'),
    )

    expect(header).toContain('MarkFlow dev session')
    expect(header).toContain('cwd=D:\\files\\utools\\markflow')
    expect(header).toContain('node=v24.0.0')
    expect(DEFAULT_DEV_PORT).toBe('5174')
    expect(header).toContain('port=5174')
    expect(header).toContain('command=vite')
  })

  it('转发原始 chunk 到终端，即使 normalize 后为空', () => {
    const output = { write: vi.fn() }
    const streamWrites: string[] = []
    const buffer = createLogLineBuffer((line) => {
      streamWrites.push(line)
    })

    const ansiOnly = Buffer.from('\u001B[2K\u001B[1G', 'utf8')
    output.write(ansiOnly)
    buffer.push(ansiOnly)
    buffer.flush()

    expect(output.write).toHaveBeenCalledWith(ansiOnly)
    expect(streamWrites).toEqual([])
  })
})
