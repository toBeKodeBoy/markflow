import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_PATH = fileURLToPath(import.meta.url)
const SCRIPT_DIR = dirname(SCRIPT_PATH)
const PROJECT_ROOT = resolve(SCRIPT_DIR, '..')
const LOG_PATH = resolve(PROJECT_ROOT, 'dev-server.log')
const VITE_BIN_PATH = resolve(PROJECT_ROOT, 'node_modules', 'vite', 'bin', 'vite.js')
export const DEFAULT_DEV_PORT = '5174'
const DEFAULT_ARGS = ['--host', '0.0.0.0']
const ANSI_PATTERN =
  /\u001B\[[0-9;]*[A-Za-z]/g

/** 剥离 ANSI 并统一换行，保留中间空行与尾部半行（供流式缓冲） */
export function stripAnsiAndNormalizeNewlines(chunk) {
  return String(chunk)
    .replace(ANSI_PATTERN, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
}

/** 单次 chunk 规范化（测试/静态校验用）：去掉尾部空白 */
export function normalizeLogChunk(chunk) {
  return stripAnsiAndNormalizeNewlines(chunk).trimEnd()
}

export function formatLogLine(source, message, now = new Date()) {
  return `[${now.toISOString()}] [${source}] ${message}\n`
}

export function createSessionHeader(meta, now = new Date()) {
  const lines = [
    '',
    '============================================================',
    formatLogLine('dev-server', 'MarkFlow dev session', now).trimEnd(),
    formatLogLine(
      'dev-server',
      `cwd=${meta.cwd} node=${meta.nodeVersion} port=${meta.port} command=${meta.command}`,
      now,
    ).trimEnd(),
    '============================================================',
  ]
  return `${lines.join('\n')}\n`
}

/** 跨 data 事件缓冲完整日志行，避免截断/粘连 */
export function createLogLineBuffer(onLine) {
  let pending = ''

  return {
    push(chunk) {
      pending += stripAnsiAndNormalizeNewlines(chunk)
      const parts = pending.split('\n')
      pending = parts.pop() ?? ''
      for (const line of parts) {
        onLine(line)
      }
    },
    flush() {
      const final = pending.trimEnd()
      pending = ''
      if (final) onLine(final)
    },
  }
}

async function ensureLogDir(logPath) {
  await mkdir(dirname(logPath), { recursive: true })
}

function exitProcess(code) {
  process.exit(code)
}

async function runDevServer() {
  await ensureLogDir(LOG_PATH)

  const stream = createWriteStream(LOG_PATH, {
    flags: 'a',
    encoding: 'utf8',
  })
  const viteArgs = process.argv.slice(2)
  const args = [VITE_BIN_PATH, ...(viteArgs.length > 0 ? viteArgs : DEFAULT_ARGS)]
  const portFlagIndex = args.findIndex((arg) => arg === '--port')
  const port = portFlagIndex >= 0 ? args[portFlagIndex + 1] ?? DEFAULT_DEV_PORT : DEFAULT_DEV_PORT

  stream.write(
    createSessionHeader({
      cwd: PROJECT_ROOT,
      nodeVersion: process.version,
      port,
      command: `node ${args.join(' ')}`,
    }),
  )

  const child = spawn(process.execPath, args, {
    cwd: PROJECT_ROOT,
    env: process.env,
    stdio: ['inherit', 'pipe', 'pipe'],
  })

  const stdoutBuffer = createLogLineBuffer((line) => {
    stream.write(formatLogLine('vite.stdout', line))
  })
  const stderrBuffer = createLogLineBuffer((line) => {
    stream.write(formatLogLine('vite.stderr', line))
  })

  /** 始终透传原始 chunk 到终端；文件侧走行缓冲 */
  const forwardChunk = (buffer, chunk, output) => {
    output.write(chunk)
    buffer.push(chunk)
  }

  child.stdout?.on('data', (chunk) => forwardChunk(stdoutBuffer, chunk, process.stdout))
  child.stderr?.on('data', (chunk) => forwardChunk(stderrBuffer, chunk, process.stderr))

  const finishAndExit = (code, signal) => {
    stdoutBuffer.flush()
    stderrBuffer.flush()
    stream.write(
      formatLogLine(
        'dev-server.exit',
        signal ? `signal=${signal}` : `code=${code ?? 0}`,
      ),
    )
    // 必须 process.exit：stdio inherit stdin 会阻止仅设置 exitCode 时结束事件循环
    stream.end(() => {
      exitProcess(code ?? (signal ? 1 : 0))
    })
  }

  child.on('error', (error) => {
    stream.write(formatLogLine('dev-server.error', error.stack ?? error.message))
    stream.end(() => {
      exitProcess(1)
    })
  })

  child.on('exit', (code, signal) => {
    finishAndExit(code, signal)
  })
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) {
  runDevServer().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`)
    exitProcess(1)
  })
}
