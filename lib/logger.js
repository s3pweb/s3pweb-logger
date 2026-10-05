'use strict'

const pino = require('pino')
const fs = require('node:fs')
const os = require('node:os')
const util = require('node:util')
const errSerializer = require('./errSerializer').errSerializer
const RingBuffer = require('./ring-buffer')

// Child bindings kept as an object to merge them into each record like bunyan, see overrideChildLikeBunyan
const bindingsSym = Symbol('s3pweb-logger.bindings')

module.exports = class Logger {
  /**
   * @param {import('../index').Config} config
   */
  constructor (config) {
    const {
      console: consoleConfig,
      file: fileConfig,
      server: serverConfig,
      ringBuffer: ringBufferConfig
    } = config?.logger ?? {}
    /** @type {import('pino').StreamEntry[]} */
    const streams = []

    if (consoleConfig && convertConfigToBoolean(consoleConfig.enable)) {
      streams.push({
        level: resolveLevel(consoleConfig.level),
        stream: pino.destination({ dest: 1, sync: true })
      })
    }

    if (fileConfig && convertConfigToBoolean(fileConfig.enable)) {
      // Set up the log directory
      if (fileConfig.dir) {
        let logsDirectory
        if (convertConfigToBoolean(fileConfig.addHostnameToPath)) {
          logsDirectory = `${fileConfig.dir}/${os.hostname()}`
        } else {
          logsDirectory = fileConfig.dir
        }
        fs.mkdirSync(logsDirectory, { recursive: true })

        // Set up the log file stream (runs in a worker thread)
        streams.push({
          level: resolveLevel(fileConfig.level),
          stream: pino
            .transport({
              target: 'pino-roll',
              options: {
                // config.name comes from the including connector
                file: `${logsDirectory}/${config.name}_all`,
                extension: '.log',
                frequency: 'daily', // daily rotation
                dateFormat: 'yyyy-MM-dd',
                size: '10m', // Rotate log files larger than 10 megabytes
                limit: { count: 15 } // keep up to 15 back copies
              }
            })
            .on('error', err => {
              console.error('Error on file stream', err)
            })
        })
      } else {
        console.log('Please define config.logger.file.dir in your config file')
      }
    }

    /** @type {RingBuffer | undefined} */
    this.ringbuffer = undefined
    if (ringBufferConfig && convertConfigToBoolean(ringBufferConfig.enable)) {
      this.ringbuffer = new RingBuffer({
        limit: convertConfigToNumber(ringBufferConfig.size)
      })
    }

    if (serverConfig && convertConfigToBoolean(serverConfig.enable)) {
      if (serverConfig.type === 'elk') {
        streams.push({
          level: resolveLevel(serverConfig.level),
          stream: require('./log-stash-stream')
            .createStream({
              host: serverConfig.url,
              port: serverConfig.port,
              ringbuffer: this.ringbuffer
            })
            .on('error', err => {
              console.error('Error on logstash stream', err)
            })
        })
      }
    }

    // Added last on purpose: among streams of the same level, multistream writes to the last added
    // first, so the ring buffer already holds the current record when the logstash stream reads it.
    if (this.ringbuffer) {
      streams.push({ level: 'trace', stream: this.ringbuffer })
    }

    const multistream = pino.multistream(streams)

    this.log = pino({
      name: 's3pweb-logger',
      // The logger must let through the records of the most verbose stream, each stream filters the rest
      level: streams.length > 0 ? pino.levels.labels[multistream.minLevel] : 'silent',
      // Keep bunyan's record format (v, hostname, pid, ISO time) so `| bunyan` and Kibana keep working
      base: { application: config.name, pid: process.pid, hostname: os.hostname(), v: 0 },
      timestamp: pino.stdTimeFunctions.isoTime,
      serializers: {
        err: errSerializer
      },
      hooks: {
        logMethod: formatLikeBunyan
      },
      // With the default merge strategy, the fields given to the log call override the bindings
      mixin: (_mergeObject, _level, /** @type {any} */ logger) => ({ ...logger[bindingsSym] })
    }, multistream)
    overrideChildLikeBunyan(this.log)
  }

  /**
   * @returns {import('pino').Logger}
   */
  get () {
    return this.log
  }
}

/**
 * Pino appends the bindings of each child to the record, so a field bound again by a child or given to the
 * log call (`child`, `uuid`...) is duplicated in the JSON, bunyan overrides it. Keep the bindings in an object
 * merged by the mixin instead. Children are created with `Object.create(parent)`, they inherit these methods.
 *
 * @param {import('pino').Logger} log
 * @returns {void}
 */
function overrideChildLikeBunyan (log) {
  /** @type {any} */
  const root = log
  const { child, bindings } = root
  root[bindingsSym] = {}
  /**
   * @this {any}
   * @param {import('pino').Bindings} childBindings
   * @param {import('pino').ChildLoggerOptions} [options]
   */
  root.child = function (childBindings, options) {
    const instance = child.call(this, {}, options)
    instance[bindingsSym] = { ...this[bindingsSym], ...childBindings }
    return instance
  }
  /** @this {any} */
  root.bindings = function () {
    return { ...bindings.call(this), ...this[bindingsSym] }
  }
  /**
   * @this {any}
   * @param {import('pino').Bindings} newBindings
   */
  root.setBindings = function (newBindings) {
    this[bindingsSym] = { ...this[bindingsSym], ...newBindings }
  }
}

/**
 * Pino ignores extra arguments without a matching placeholder, bunyan formats every argument after the
 * message with util.format: `log.info('payload', payload)` must keep the payload in the message.
 * Pino also keeps a non-string message as is, bunyan formats it to a string: NestJS logs unhandled
 * exceptions with `log.error({ err }, error)`, which must keep the stack instead of `"msg":{}`.
 *
 * @this {import('pino').Logger}
 * @param {any[]} args
 * @param {(...args: any[]) => void} method
 * @returns {void}
 */
function formatLikeBunyan (args, method) {
  // Like bunyan, only a plain object (or an Error) as first argument holds the record fields
  const hasFields = args[0] !== null && typeof args[0] === 'object' && !Array.isArray(args[0])
  const msgIndex = hasFields ? 1 : 0
  const msgArgs = args.slice(msgIndex)
  if (msgArgs.length > 1 || (msgArgs.length === 1 && typeof msgArgs[0] !== 'string')) {
    return method.call(this, ...args.slice(0, msgIndex), util.format(...msgArgs))
  }
  return method.apply(this, args)
}

/**
 * Accept the same levels as bunyan: a name in any case, a number, or nothing for info.
 *
 * @param {import('../index').Level | undefined} value
 * @returns {import('pino').Level}
 */
function resolveLevel (value) {
  if (value === undefined || value === null || value === '') {
    return 'info'
  }
  const level = typeof value === 'number' ? pino.levels.labels[value] : String(value).toLowerCase()
  if (!(level in pino.levels.values)) {
    throw new Error(`unknown level name: "${value}"`)
  }
  return /** @type {import('pino').Level} */ (level)
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function convertConfigToBoolean (value) {
  let booleanValue = false
  if (value === true || value === 'true') {
    booleanValue = true
  }
  return booleanValue
}

/**
 * @param {unknown} value
 * @returns {number}
 */
function convertConfigToNumber (value) {
  let numberValue = 0
  if (Number(value)) {
    numberValue = Number(value)
  }
  return numberValue
}
