import type { Logger as PinoLogger } from 'pino'

declare namespace S3pwebLogger {
  type Level = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | (string & {}) | number
  type Flag = boolean | 'true' | 'false'

  interface Config {
    name: string
    logger?: {
      console?: { enable?: Flag; level?: Level }
      file?: { enable?: Flag; level?: Level; dir?: string; addHostnameToPath?: Flag }
      server?: { enable?: Flag; level?: Level; url?: string; port?: string | number; type?: 'elk' }
      ringBuffer?: { enable?: Flag; size?: string | number }
      /** @deprecated Not supported anymore since v3, ignored. */
      source?: Flag
    }
  }

  interface RingBuffer {
    readonly limit: number
    readonly records: Array<Record<string, unknown>>
  }

  type Logger = PinoLogger
}

declare class S3pwebLogger {
  constructor (config: S3pwebLogger.Config)
  ringbuffer?: S3pwebLogger.RingBuffer
  get (): S3pwebLogger.Logger
}

export = S3pwebLogger
