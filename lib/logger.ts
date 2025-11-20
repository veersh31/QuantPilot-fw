type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: Record<string, any>
  error?: Error
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private logLevel: LogLevel = (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) || 'info'

  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.logLevel]
  }

  private formatLog(entry: LogEntry): string {
    const { timestamp, level, message, context, error } = entry
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`

    let output = `${prefix} ${message}`

    if (context && Object.keys(context).length > 0) {
      output += ` ${JSON.stringify(context)}`
    }

    if (error) {
      output += `\nError: ${error.message}\nStack: ${error.stack}`
    }

    return output
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error) {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
    }

    const formatted = this.formatLog(entry)

    // In development, use console with colors
    if (this.isDevelopment) {
      switch (level) {
        case 'debug':
          console.debug(formatted)
          break
        case 'info':
          console.info(formatted)
          break
        case 'warn':
          console.warn(formatted)
          break
        case 'error':
          console.error(formatted)
          break
      }
    } else {
      // In production, use standard console (which can be collected by logging services)
      console.log(formatted)
    }

    // In production, you could send logs to a service like:
    // - Sentry
    // - LogRocket
    // - Datadog
    // - CloudWatch
    // Example: if (level === 'error') sendToSentry(entry)
  }

  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context)
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context)
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context)
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    this.log('error', message, context, error)
  }

  // API-specific logging helpers
  apiRequest(method: string, url: string, params?: Record<string, any>) {
    this.info(`API Request: ${method} ${url}`, params)
  }

  apiResponse(method: string, url: string, status: number, duration?: number) {
    this.info(`API Response: ${method} ${url}`, { status, duration })
  }

  apiError(method: string, url: string, error: Error) {
    this.error(`API Error: ${method} ${url}`, error)
  }

  // Feature-specific logging
  stockFetch(symbol: string, success: boolean) {
    if (success) {
      this.debug('Stock data fetched', { symbol })
    } else {
      this.warn('Stock data fetch failed', { symbol })
    }
  }

  portfolioAction(action: string, symbol?: string) {
    this.info(`Portfolio ${action}`, symbol ? { symbol } : undefined)
  }

  userAction(action: string, details?: Record<string, any>) {
    this.info(`User action: ${action}`, details)
  }
}

// Export singleton instance
export const logger = new Logger()

// Export for testing or custom instances
export { Logger }
