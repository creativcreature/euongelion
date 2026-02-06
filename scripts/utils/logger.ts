/**
 * Script Logging Utility
 * Provides consistent, colorful logging for migration and seeding scripts
 */

import * as fs from 'fs'
import * as path from 'path'

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
}

// Log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

// Logger configuration
export interface LoggerConfig {
  level?: LogLevel
  prefix?: string
  timestamp?: boolean
  colors?: boolean
  logFile?: string
  silent?: boolean
}

// Log entry structure
interface LogEntry {
  timestamp: Date
  level: LogLevel
  message: string
  data?: unknown
}

/**
 * Logger class for consistent script output
 */
export class Logger {
  private config: Required<LoggerConfig>
  private logBuffer: LogEntry[] = []
  private startTime: number

  constructor(config: LoggerConfig = {}) {
    this.config = {
      level: config.level ?? LogLevel.INFO,
      prefix: config.prefix ?? '',
      timestamp: config.timestamp ?? true,
      colors: config.colors ?? true,
      logFile: config.logFile ?? '',
      silent: config.silent ?? false,
    }
    this.startTime = Date.now()
  }

  /**
   * Set the log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level
  }

  /**
   * Set silent mode
   */
  setSilent(silent: boolean): void {
    this.config.silent = silent
  }

  /**
   * Format timestamp for log output
   */
  private formatTimestamp(): string {
    const now = new Date()
    return now.toISOString().replace('T', ' ').slice(0, 19)
  }

  /**
   * Get elapsed time since logger creation
   */
  private getElapsed(): string {
    const elapsed = Date.now() - this.startTime
    if (elapsed < 1000) return `${elapsed}ms`
    if (elapsed < 60000) return `${(elapsed / 1000).toFixed(1)}s`
    return `${(elapsed / 60000).toFixed(1)}m`
  }

  /**
   * Format a log message
   */
  private format(level: LogLevel, message: string, data?: unknown): string {
    const parts: string[] = []

    // Timestamp
    if (this.config.timestamp) {
      const timestamp = this.formatTimestamp()
      parts.push(
        this.config.colors
          ? `${colors.dim}${timestamp}${colors.reset}`
          : timestamp,
      )
    }

    // Prefix
    if (this.config.prefix) {
      parts.push(
        this.config.colors
          ? `${colors.cyan}${this.config.prefix}${colors.reset}`
          : this.config.prefix,
      )
    }

    // Level indicator
    const levelIndicators: Record<LogLevel, { label: string; color: string }> =
      {
        [LogLevel.DEBUG]: { label: 'DEBUG', color: colors.dim },
        [LogLevel.INFO]: { label: 'INFO', color: colors.green },
        [LogLevel.WARN]: { label: 'WARN', color: colors.yellow },
        [LogLevel.ERROR]: { label: 'ERROR', color: colors.red },
        [LogLevel.SILENT]: { label: '', color: '' },
      }

    const indicator = levelIndicators[level]
    if (indicator.label) {
      parts.push(
        this.config.colors
          ? `${indicator.color}${indicator.label}${colors.reset}`
          : indicator.label,
      )
    }

    // Message
    parts.push(message)

    // Data (if provided)
    if (data !== undefined) {
      const dataStr =
        typeof data === 'string' ? data : JSON.stringify(data, null, 2)
      parts.push(
        this.config.colors ? `${colors.dim}${dataStr}${colors.reset}` : dataStr,
      )
    }

    return parts.join(' ')
  }

  /**
   * Write to log file if configured
   */
  private writeToFile(entry: LogEntry): void {
    if (!this.config.logFile) return

    const logLine = `${entry.timestamp.toISOString()} [${LogLevel[entry.level]}] ${entry.message}${
      entry.data ? ' ' + JSON.stringify(entry.data) : ''
    }\n`

    try {
      fs.appendFileSync(this.config.logFile, logLine)
    } catch (err) {
      console.error(`Failed to write to log file: ${(err as Error).message}`)
    }
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, data?: unknown): void {
    if (level < this.config.level || this.config.silent) return

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data,
    }

    this.logBuffer.push(entry)
    this.writeToFile(entry)

    const formatted = this.format(level, message, data)

    switch (level) {
      case LogLevel.ERROR:
        console.error(formatted)
        break
      case LogLevel.WARN:
        console.warn(formatted)
        break
      default:
        console.log(formatted)
    }
  }

  /**
   * Debug level logging
   */
  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data)
  }

  /**
   * Info level logging
   */
  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data)
  }

  /**
   * Warning level logging
   */
  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data)
  }

  /**
   * Error level logging
   */
  error(message: string, data?: unknown): void {
    this.log(LogLevel.ERROR, message, data)
  }

  /**
   * Log a success message (info level with special formatting)
   */
  success(message: string): void {
    const formatted = this.config.colors
      ? `${colors.green}${colors.bright}[SUCCESS]${colors.reset} ${message}`
      : `[SUCCESS] ${message}`
    this.log(LogLevel.INFO, formatted)
  }

  /**
   * Log a section header
   */
  section(title: string): void {
    const line = '='.repeat(60)
    const formatted = this.config.colors
      ? `\n${colors.bright}${colors.blue}${line}\n${title}\n${line}${colors.reset}\n`
      : `\n${line}\n${title}\n${line}\n`
    console.log(formatted)
  }

  /**
   * Log a subsection header
   */
  subsection(title: string): void {
    const line = '-'.repeat(40)
    const formatted = this.config.colors
      ? `\n${colors.cyan}${line}\n${title}\n${line}${colors.reset}\n`
      : `\n${line}\n${title}\n${line}\n`
    console.log(formatted)
  }

  /**
   * Log progress information
   */
  progress(current: number, total: number, message?: string): void {
    const percentage = Math.round((current / total) * 100)
    const bar = this.createProgressBar(percentage)
    const status = message ? ` - ${message}` : ''

    const formatted = this.config.colors
      ? `${colors.cyan}${bar}${colors.reset} ${percentage}%${status}`
      : `${bar} ${percentage}%${status}`

    // Use carriage return to update in place
    process.stdout.write(`\r${formatted}`)

    if (current >= total) {
      console.log() // New line when complete
    }
  }

  /**
   * Create a visual progress bar
   */
  private createProgressBar(percentage: number, width: number = 30): string {
    const filled = Math.round((percentage / 100) * width)
    const empty = width - filled
    return `[${'='.repeat(filled)}${' '.repeat(empty)}]`
  }

  /**
   * Log a table of data
   */
  table(
    data: Record<string, unknown>[] | Record<string, unknown>,
    columns?: string[],
  ): void {
    if (Array.isArray(data)) {
      console.table(data, columns)
    } else {
      const rows = Object.entries(data).map(([key, value]) => ({
        Property: key,
        Value: value,
      }))
      console.table(rows)
    }
  }

  /**
   * Log timing information
   */
  timing(label: string): void {
    const elapsed = this.getElapsed()
    const formatted = this.config.colors
      ? `${colors.magenta}[TIMING]${colors.reset} ${label}: ${elapsed}`
      : `[TIMING] ${label}: ${elapsed}`
    console.log(formatted)
  }

  /**
   * Create a child logger with a different prefix
   */
  child(prefix: string): Logger {
    return new Logger({
      ...this.config,
      prefix: this.config.prefix ? `${this.config.prefix}${prefix}` : prefix,
    })
  }

  /**
   * Get all buffered log entries
   */
  getBuffer(): LogEntry[] {
    return [...this.logBuffer]
  }

  /**
   * Clear the log buffer
   */
  clearBuffer(): void {
    this.logBuffer = []
  }

  /**
   * Save buffer to a file
   */
  saveBufferToFile(filePath: string): void {
    const content = this.logBuffer
      .map(
        (entry) =>
          `${entry.timestamp.toISOString()} [${LogLevel[entry.level]}] ${entry.message}${
            entry.data ? ' ' + JSON.stringify(entry.data) : ''
          }`,
      )
      .join('\n')

    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(filePath, content)
    this.info(`Log saved to: ${filePath}`)
  }

  /**
   * Create a spinner for long-running operations
   */
  spinner(message: string): {
    stop: (success?: boolean, finalMessage?: string) => void
  } {
    const frames = ['|', '/', '-', '\\']
    let i = 0
    let running = true

    const interval = setInterval(() => {
      if (!running) return
      const frame = frames[i++ % frames.length]
      process.stdout.write(`\r${frame} ${message}`)
    }, 100)

    return {
      stop: (success = true, finalMessage?: string) => {
        running = false
        clearInterval(interval)
        const icon = success
          ? this.config.colors
            ? `${colors.green}[OK]${colors.reset}`
            : '[OK]'
          : this.config.colors
            ? `${colors.red}[FAIL]${colors.reset}`
            : '[FAIL]'
        console.log(`\r${icon} ${finalMessage || message}`)
      },
    }
  }
}

/**
 * Create a default logger instance
 */
export function createLogger(config?: LoggerConfig): Logger {
  return new Logger(config)
}

/**
 * Singleton logger for quick access
 */
let defaultLogger: Logger | null = null

export function getLogger(config?: LoggerConfig): Logger {
  if (!defaultLogger) {
    defaultLogger = new Logger(config)
  }
  return defaultLogger
}

export default Logger
