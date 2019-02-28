const util = require('util')
const { EventEmitter } = require('events')

const net = require('net')
const fs = require('fs')
const os = require('os')
const tls = require('tls')
const CBuffer = require('CBuffer')

const bunyan = require('bunyan')

const levels = new Map([
  [10, 'trace'],
  [20, 'debug'],
  [30, 'info'],
  [40, 'warn'],
  [50, 'error'],
  [60, 'fatal']
])

/**
 * Creates a new instance of LogstashStream from the options.
 *
 * @param {objects} options The constructions options. See the constructor for details.
 * TODO: Improve this doc.
 *
 * @returns {LogstashStream} The bunyan stream that sends data to logstash
 */
function createLogstashStream (options) {
  return new LogstashStream(options)
}

/**
 * This class implements the bunyan stream contract with a stream that
 * sends data to logstash.
 *
 * @param {objects} options The constructions options. See the constructor for details.
 * TODO: Improve this doc.
 *
 * @constructor
 */
function LogstashStream (options) {
  EventEmitter.call(this)
  options = options || {}

  this.name = 'bunyan'
  this.level = options.level || 'info'
  this.server = options.server || os.hostname()
  this.host = options.host || '127.0.0.1'
  this.port = options.port || 9999
  this.application = options.appName || process.title
  this.pid = options.pid || process.pid
  this.tags = options.tags || ['bunyan']
  this.type = options.type

  this.ringbuffer = options.ringbuffer

  this.client = null

  // ssl
  this.sslEnable = options.sslEnable || false
  this.sslKey = options.sslKey || ''
  this.sslCert = options.ssl_cert || ''
  this.ca = options.ca || ''
  this.sslPassphrase = options.ssl_passphrase || ''

  this.cbufferSize = options.cbufferSize || 10

  // Connection state
  this.logQueue = new CBuffer(this.cbufferSize)
  this.connected = false
  this.socket = null
  this.retries = -1

  this.maxConnectRetries =
    typeof options.maxConnectRetries === 'number'
      ? options.maxConnectRetries
      : 4
  this.retryInterval = options.retry_interval || 100

  this.connect()
}
util.inherits(LogstashStream, EventEmitter)

/**
 * Writes a log entry to the steam.
 *
 * @param {object} entry The entry to write.
 * @returns {void}
 */
LogstashStream.prototype.write = function (entry) {
  let level

  if (typeof entry === 'string') {
    entry = JSON.parse(entry)
  }

  const rec = Object.assign({}, entry)

  level = rec.level

  if (levels.has(level)) {
    level = levels.get(level)
  }

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
    let trace = ''
    let lastTime

    for (let index = 0; index < this.ringbuffer.records.length; index++) {
      const record = this.ringbuffer.records[index]

      let time = new Date(record.time).getTime()

      if (!lastTime) {
        lastTime = new Date(
          this.ringbuffer.records[this.ringbuffer.records.length - 1].time
        ).getTime()
      }

      trace += `-${lastTime - time} ms : ${record.msg} \n`
      try {
        trace += `${JSON.stringify(record, null, 3)} \n`
      } catch (err) {
        trace += `could not print all record fields \n`
      }

      if (record.trace) {
        trace += `Trace : ${JSON.stringify(record.trace)} \n`
      }
    }

    msg.trace = trace
  }

  delete rec.time
  delete rec.msg

  // Remove internal bunyan fields that won't mean anything outside of
  // a bunyan context.
  delete rec.v
  delete rec.level

  rec.pid = this.pid

  this.send(JSON.stringify(Object.assign({}, msg, rec), bunyan.safeCycles()))
}

/**
 * Connects the stream to the remote logstash server specified in the options.
 *
 * @returns {void}
 */
LogstashStream.prototype.connect = function () {
  let options = {}
  const self = this
  this.retries += 1
  this.connecting = true
  if (this.sslEnable) {
    options = {
      key: this.sslKey ? fs.readFileSync(this.sslKey) : null,
      cert: this.ssl_cert ? fs.readFileSync(this.ssl_cert) : null,
      passphrase: this.ssl_passphrase ? this.ssl_passphrase : null,
      ca: this.ca ? this.ca.map(filePath => fs.readFileSync(filePath)) : null
    }
    this.socket = tls.connect(
      this.port,
      this.host,
      options,
      () => {
        self.socket.setEncoding('UTF-8')
        self.announce()
        self.connecting = false
      }
    )
  } else {
    this.socket = new net.Socket()
  }
  this.socket.unref()

  this.socket.on('error', err => {
    self.connecting = false
    self.connected = false
    self.socket.destroy()
    self.socket = null
    self.emit('error', err)
  })

  this.socket.on('timeout', () => {
    if (self.socket.readyState !== 'open') {
      self.socket.destroy()
    }
    self.emit('timeout')
  })

  this.socket.on('connect', () => {
    self.retries = 0
    self.emit('connect')
  })

  this.socket.on('close', () => {
    self.connected = false

    if (
      self.maxConnectRetries < 0 ||
      self.retries < self.maxConnectRetries
    ) {
      if (!self.connecting) {
        setTimeout(() => {
          self.connect()
        }, self.retry_interval).unref()
      }
    } else {
      self.logQueue = new CBuffer(self.cbufferSize)
      self.silent = true
    }
    self.emit('close')
  })

  if (!this.sslEnable) {
    this.socket.connect(
      self.port,
      self.host,
      () => {
        self.announce()
        self.connecting = false
      }
    )
  }
}

/**
 * Announces that the stream is connected. Will flush any messages in the queue.
 *
 * @returns {void}
 */
LogstashStream.prototype.announce = function () {
  const self = this
  self.connected = true
  self.flush()
}

/**
 * Flushes the queue, sending all messages that have not been sent yet to the remote
 * destination.
 *
 * @returns {void}
 */
LogstashStream.prototype.flush = function () {
  const self = this

  let message = self.logQueue.pop()
  while (message) {
    self.sendLog(message.message)
    message = self.logQueue.pop()
  }

  self.logQueue.empty()
}

/**
 * Immediately writes a string to the undelying socket.
 *
 * @param {string} message The string to write.
 * @returns {void}
 */
LogstashStream.prototype.sendLog = function (message) {
  this.socket.write(`${message}\n`)
}

/**
 * Sends a string message. The message will be immediately sent if the stream
 * is already connected, or queued if the stream is not connected yet.
 * @param {string} message The string to send
 * @returns {void}
 */
LogstashStream.prototype.send = function (message) {
  const self = this

  // send tcp logs
  if (self.connected) {
    self.sendLog(message)
  } else {
    self.logQueue.push({
      message
    })
  }
}

module.exports = {
  createStream: createLogstashStream,
  LogstashStream
}
