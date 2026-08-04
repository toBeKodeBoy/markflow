/** MarkFlow 业务日志门面：统一级别、scope 与可插拔 Sink */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogRecord {
  level: LogLevel
  scope: string
  message: string
  time: string
  error?: { name: string; message: string; stack?: string }
  data?: Record<string, unknown>
}

export interface LogSink {
  write(record: LogRecord): void
}

export interface Logger {
  debug(message: string, data?: Record<string, unknown>): void
  info(message: string, data?: Record<string, unknown>): void
  warn(message: string, data?: Record<string, unknown>): void
  error(message: string, error?: unknown, data?: Record<string, unknown>): void
  child(scope: string): Logger
}

export interface LoggerConfig {
  level: LogLevel
  sinks: LogSink[]
  now?: () => Date
}

export interface MemorySink extends LogSink {
  readonly records: LogRecord[]
  clear(): void
}

export interface AppendAppLogBridge {
  appendAppLog?: (
    level: LogLevel,
    scope: string,
    message: string,
    data?: Record<string, unknown>,
  ) => void | string
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

type ConsoleLike = Pick<Console, 'debug' | 'info' | 'warn' | 'error'>

function isLogLevel(value: string): value is LogLevel {
  return value in LEVEL_ORDER
}

/** 统一行格式，供 Console / 文件落盘对齐 */
export function formatLogLine(record: LogRecord): string {
  const payload: Record<string, unknown> = { ...(record.data ?? {}) }
  if (record.error) {
    payload.error = record.error
  }
  let extra = ''
  if (Object.keys(payload).length > 0) {
    try {
      extra = ` ${JSON.stringify(payload)}`
    } catch {
      extra = ' [unserializable-data]'
    }
  }
  return `[${record.time}] [${record.level.toUpperCase()}] [${record.scope}] ${record.message}${extra}`
}

export function createConsoleSink(consoleLike: ConsoleLike = console): LogSink {
  return {
    write(record) {
      const line = formatLogLine(record)
      const method = isLogLevel(record.level) ? consoleLike[record.level] : consoleLike.info
      method.call(consoleLike, line)
    },
  }
}

let activeConfig: LoggerConfig = {
  level: 'warn',
  sinks: [createConsoleSink()],
  now: () => new Date(),
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[activeConfig.level]
}

function stringifyUnknown(value: unknown): string {
  if (typeof value === 'undefined') return 'undefined'
  if (value === null) return 'null'
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

function normalizeError(value: unknown): LogRecord['error'] | undefined {
  if (typeof value === 'undefined') {
    return { name: 'Unknown', message: 'undefined' }
  }
  if (value instanceof Error) {
    return {
      name: value.name || 'Error',
      message: value.message,
      stack: value.stack,
    }
  }
  if (typeof value === 'object' && value !== null) {
    const maybe = value as { name?: unknown; message?: unknown; stack?: unknown }
    if (typeof maybe.message === 'string') {
      return {
        name: typeof maybe.name === 'string' ? maybe.name : 'Error',
        message: maybe.message,
        stack: typeof maybe.stack === 'string' ? maybe.stack : undefined,
      }
    }
  }
  return {
    name: 'Error',
    message: stringifyUnknown(value),
  }
}

const ERROR_ARG_OMITTED = Symbol('error-arg-omitted')

function emit(
  level: LogLevel,
  scope: string,
  message: string,
  error: unknown | typeof ERROR_ARG_OMITTED,
  data?: Record<string, unknown>,
): void {
  if (!shouldLog(level)) return

  const record: LogRecord = {
    level,
    scope,
    message,
    time: (activeConfig.now ?? (() => new Date()))().toISOString(),
  }
  if (data && Object.keys(data).length > 0) {
    record.data = data
  }
  // 注意：不能用默认参数表示「未传 error」，否则显式 undefined 会被默认值吞掉
  if (error !== ERROR_ARG_OMITTED) {
    record.error = normalizeError(error)
  }

  const sinks =
    activeConfig.sinks.length > 0 ? activeConfig.sinks : [createConsoleSink()]
  for (const sink of sinks) {
    try {
      sink.write(record)
    } catch {
      // Sink 失败不得影响业务主流程
    }
  }
}

function joinScope(parent: string, child: string): string {
  const left = parent.trim()
  const right = child.trim()
  if (!left) return right
  if (!right) return left
  return `${left}.${right}`
}

class ScopedLogger implements Logger {
  private readonly scope: string

  constructor(scope: string) {
    this.scope = scope
  }

  debug(message: string, data?: Record<string, unknown>): void {
    emit('debug', this.scope, message, ERROR_ARG_OMITTED, data)
  }

  info(message: string, data?: Record<string, unknown>): void {
    emit('info', this.scope, message, ERROR_ARG_OMITTED, data)
  }

  warn(message: string, data?: Record<string, unknown>): void {
    emit('warn', this.scope, message, ERROR_ARG_OMITTED, data)
  }

  error(message: string, error?: unknown, data?: Record<string, unknown>): void {
    if (arguments.length >= 2) {
      emit('error', this.scope, message, error, data)
      return
    }
    emit('error', this.scope, message, ERROR_ARG_OMITTED, data)
  }

  child(scope: string): Logger {
    return new ScopedLogger(joinScope(this.scope, scope))
  }
}

/** 配置全局 logger；测试中可反复调用 */
export function configureLogger(config: Partial<LoggerConfig> & Pick<LoggerConfig, 'sinks'>): void {
  activeConfig = {
    level: config.level ?? activeConfig.level,
    sinks: config.sinks,
    now: config.now ?? activeConfig.now,
  }
}

export function resetLoggerConfig(): void {
  activeConfig = {
    level: 'warn',
    sinks: [],
    now: () => new Date(),
  }
}

export function getLoggerConfig(): Readonly<LoggerConfig> {
  return {
    level: activeConfig.level,
    sinks: activeConfig.sinks,
    now: activeConfig.now,
  }
}

export function createLogger(scope: string): Logger {
  return new ScopedLogger(scope.trim() || 'app')
}

export function createMemorySink(): MemorySink {
  const records: LogRecord[] = []
  return {
    records,
    write(record) {
      records.push(record)
    },
    clear() {
      records.length = 0
    },
  }
}

/**
 * Bridge 落盘 Sink。
 * - 无参：写入时惰性读取 window.markflow（避免启动顺序导致引用过期）
 * - 显式传入 bridge/null：用于测试或禁用
 * - 默认仅转发 info+，避免 DEV debug 刷爆本地文件
 */
export function createBridgeFileSink(
  bridge?: AppendAppLogBridge | null,
): LogSink {
  const hasExplicitBridge = arguments.length >= 1
  return {
    write(record) {
      if (LEVEL_ORDER[record.level] < LEVEL_ORDER.info) return
      const resolved = hasExplicitBridge
        ? bridge
        : typeof window !== 'undefined'
          ? window.markflow
          : null
      const append = resolved?.appendAppLog
      if (typeof append !== 'function') return
      const data: Record<string, unknown> = { ...(record.data ?? {}) }
      if (record.error) {
        data.error = record.error
      }
      append(
        record.level,
        record.scope,
        record.message,
        Object.keys(data).length > 0 ? data : undefined,
      )
    },
  }
}

/** 应用启动时安装默认 Sink（Console + 可选 Bridge 落盘） */
export function installDefaultLogger(options?: {
  level?: LogLevel
  enableBridge?: boolean
}): void {
  const sinks: LogSink[] = [createConsoleSink()]
  if (options?.enableBridge !== false) {
    sinks.push(createBridgeFileSink())
  }
  const level =
    options?.level ??
    (typeof import.meta !== 'undefined' && import.meta.env?.DEV ? 'debug' : 'warn')
  configureLogger({ level, sinks })
}
