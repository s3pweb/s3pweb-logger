const { EventEmitter } = require('node:events')

const net = require('node:net')
const fs = require('node:fs')
const os = require('node:os')
const tls = require('node:tls')

/** @type {Map<number, string>} */
const levels = new Map([
  [10, 'trace'],
  [20, 'debug'],
  [30, 'info'],
  [40, 'warn'],
  [50, 'error'],
  [60, 'fatal']
])

/**
 * @typedef {object} LogstashStreamOptions
 * @property {string} [level] Unused, the level is set on the logger stream.
 * @property {string} [server] Server name, in the `source` field. Default: the hostname.
 * @property {string} [host] Default: `127.0.0.1`.
 * @property {number | string} [port] Default: `9999`.
 * @property {string} [appName] Application name, in the `source` field. Default: `process.title`.
 * @property {number} [pid] Default: `process.pid`.
 * @property {string[]} [tags] Default: `['bunyan']`.
 * @property {string} [type] Added as the `type` field when set.
 * @property {import('./ring-buffer')} [ringbuffer] Its records are added to errors as `trace`.
 * @property {boolean} [sslEnable] Default: `false`.
 * @property {string} [sslKey] Path of the private key.
 * @property {string} [ssl_cert] Path of the certificate.
 * @property {string[]} [ca] Paths of the trusted CA certificates.
 * @property {string} [ssl_passphrase] Passphrase of the private key.
 * @property {number} [cbufferSize] Number of messages kept while disconnected. Default: `10`.
 * @property {number} [maxConnectRetries] Default: `60`, a negative value retries forever.
 * @property {number} [retry_interval] Milliseconds between connection retries. Default: `10000`.
 */

/**
 * Creates a new instance of LogstashStream from the options.
 *
 * @param {LogstashStreamOptions} options The construction options.
 * @returns {LogstashStream} The stream that sends data to logstash
 */
function createLogstashStream (options) {
  return new LogstashStream(options)
}

/**
 * This class implements the pino stream contract with a stream that
 * sends data to logstash.
 */
class LogstashStream extends EventEmitter {
  /**
   * @param {LogstashStreamOptions} [options] The construction options.
   */
  constructor (options) {
    super()
    options = options || {}

    this.name = 'bunyan'
    this.level = options.level || 'info'
    this.server = options.server || os.hostname()
    this.host = options.host || '127.0.0.1'
    this.port = Number(options.port || 9999)
    this.application = options.appName || process.title
    this.pid = options.pid || process.pid
    this.tags = options.tags || ['bunyan']
    this.type = options.type

    this.ringbuffer = options.ringbuffer

    // ssl
    this.sslEnable = options.sslEnable || false
    this.sslKey = options.sslKey || ''
    this.sslCert = options.ssl_cert || ''
    this.ca = options.ca || []
    this.sslPassphrase = options.ssl_passphrase || ''

    this.cbufferSize = options.cbufferSize || 10

    // Connection state
    /** @type {string[]} */
    this.logQueue = []
    this.connected = false
    this.connecting = false
    this.silent = false
    /** @type {net.Socket | null} */
    this.socket = null
    this.retries = -1

    this.maxConnectRetries = typeof options.maxConnectRetries === 'number' ? options.maxConnectRetries : 60
    this.retryInterval = options.retry_interval || 10000

    this.connect()
  }

  /**
   * Writes a log entry to the steam.
   *
   * @param {string | Record<string, any>} entry The entry to write.
   * @returns {void}
   */
  write (entry) {
    /** @type {Record<string, any>} */
    const rec = typeof entry === 'string' ? JSON.parse(entry) : ({ ...entry })

    let level = rec.level

    if (levels.has(level)) {
      level = levels.get(level)
    }

    /** @type {Record<string, any>} */
    const msg = {
      '@timestamp': new Date(rec.time).toISOString(),
      message: rec.msg,
      tags: this.tags,
      source: `${this.server}/${this.application}`,
      level
    }

    if (typeof this.type === 'string') {
      msg.type = this.type
    }

    if (this.ringbuffer && (level === 'error' || level === 'fatal')) {
      const records = this.ringbuffer.records
      let trace = ''
      let lastTime

      for (const record of records) {
        const time = new Date(record.time).getTime()

        if (!lastTime) {
          lastTime = new Date(records.at(-1).time).getTime()
        }

        trace += `-${lastTime - time} ms : ${record.msg} \n`
        try {
          trace += `${JSON.stringify(record, null, 3)} \n`
        } catch (err) {
          trace += 'could not print all record fields \n'
        }

        if (record.trace) {
          trace += `Trace : ${JSON.stringify(record.trace)} \n`
        }
      }

      msg.trace = trace
    }

    delete rec.time
    delete rec.msg

    // Remove internal fields that won't mean anything outside of
    // a logger context.
    delete rec.v
    delete rec.level

    rec.pid = this.pid

    this.send(JSON.stringify({ ...msg, ...rec }))
  }

  /**
   * Connects the stream to the remote logstash server specified in the options.
   *
   * @returns {void}
   */
  connect () {
    this.retries += 1
    this.connecting = true

    /** @type {net.Socket} */
    let socket
    if (this.sslEnable) {
      /** @type {tls.ConnectionOptions} */
      const options = {
        key: this.sslKey ? fs.readFileSync(this.sslKey) : undefined,
        cert: this.sslCert ? fs.readFileSync(this.sslCert) : undefined,
        passphrase: this.sslPassphrase || undefined,
        ca: this.ca.length > 0 ? this.ca.map(filePath => fs.readFileSync(filePath)) : undefined
      }

      socket = tls.connect(
        this.port,
        this.host,
        options,
        () => {
          socket.setEncoding('utf8')
          this.announce()
          this.connecting = false
        }
      )
    } else {
      socket = new net.Socket()
    }
    this.socket = socket

    socket.unref()

    socket.on('error', err => {
      this.connecting = false
      this.connected = false
      socket.destroy()
      this.socket = null
      this.emit('error', err)
    })

    socket.on('timeout', () => {
      if (socket.readyState !== 'open') {
        socket.destroy()
      }
      this.emit('timeout')
    })

    socket.on('connect', () => {
      this.retries = 0
      this.emit('connect')
    })

    socket.on('close', () => {
      this.connected = false

      if (this.maxConnectRetries < 0 || this.retries < this.maxConnectRetries) {
        if (!this.connecting) {
          setTimeout(() => {
            this.connect()
          }, this.retryInterval).unref()
        }
      } else {
        this.logQueue = []
        this.silent = true
      }
      this.emit('close')
    })

    if (!this.sslEnable) {
      socket.connect(this.port, this.host, () => {
        this.announce()
        this.connecting = false
      })
    }
  }

  /**
   * Announces that the stream is connected. Will flush any messages in the queue.
   *
   * @returns {void}
   */
  announce () {
    this.connected = true
    this.flush()
  }

  /**
   * Flushes the queue, sending all messages that have not been sent yet to the remote
   * destination.
   *
   * @returns {void}
   */
  flush () {
    const queue = this.logQueue
    this.logQueue = []
    queue.forEach(message => this.sendLog(message))
  }

  /**
   * Immediately writes a string to the underlying socket.
   *
   * @param {string} message The string to write.
   * @returns {void}
   */
  sendLog (message) {
    this.socket?.write(`${message}\n`)
  }

  /**
   * Sends a string message. The message will be immediately sent if the stream
   * is already connected, or queued if the stream is not connected yet.
   * @param {string} message The string to send
   * @returns {void}
   */
  send (message) {
    // send tcp logs
    if (this.connected) {
      this.sendLog(message)
    } else {
      // Keep only the most recent messages while disconnected
      this.logQueue.push(message)
      if (this.logQueue.length > this.cbufferSize) {
        this.logQueue.shift()
      }
    }
  }
}

module.exports = {
  createStream: createLogstashStream,
  LogstashStream
}
