'use strict'

const bunyan = require('bunyan')
const RotatingFileStream = require('bunyan-rotating-file-stream')
const mkdirp = require('mkdirp')
const os = require('os')
const errSerializer = require('./errSerializer').errSerializer

module.exports = class Logger {
  constructor (config) {
    // Create the base bunyan logger
    this.log = bunyan.createLogger({
      name: 's3pweb-logger',
      application: config.name,
      // WARNING: Determining the call source info is slow. Never use this option in production.
      src: convertConfigToBoolean(config?.logger?.source),
      serializers: {
        err: errSerializer
      },
      streams: []
    })

    if (convertConfigToBoolean(config?.logger?.console?.enable)) {
      this.log.addStream({
        level: config.logger.console.level,
        stream: process.stdout
      })
    }

    if (convertConfigToBoolean(config?.logger?.file?.enable)) {
      // Set up the log directory
      let logsDirectory
      if (config.logger.file.dir) {
        if (convertConfigToBoolean(config.logger.file.addHostnameToPath)) {
          logsDirectory = `${config.logger.file.dir}/${os.hostname()}`
        } else {
          logsDirectory = config.logger.file.dir
        }
        mkdirp.sync(logsDirectory)
      } else {
        console.log('Please define config.logger.file.dir in your config file')
      }
      // Set up the log file stream
      this.log.addStream({
        level: config.logger.file.level,
        stream: new RotatingFileStream({
          // config.name comes from the including connector
          path: `${logsDirectory}/${config.name}_all_%y-%m-%d.%N.log`,
          period: '1d', // daily rotation
          totalFiles: 15, // keep up to 15 back copies
          rotateExisting: true, // Give ourselves a clean file when we start up, based on period
          threshold: '10m', // Rotate log files larger than 10 megabytes
          totalSize: '500m', // Don't keep more than 500mb of archived log files
          gzip: true // Compress the archive log files to save space
        })
      })
    }

    if (convertConfigToBoolean(config?.logger?.ringBuffer?.enable)) {
      this.ringbuffer = new bunyan.RingBuffer({
        limit: convertConfigToNumber(config.logger.ringBuffer.size)
      })

      this.log.addStream({
        level: 'trace',
        type: 'raw',
        stream: this.ringbuffer
      })
    }

    if (convertConfigToBoolean(config?.logger?.server?.enable)) {
      if (config.logger.server.type === 'elk') {
        this.log.addStream({
          level: config.logger.server.level,
          type: 'raw',
          stream: require('./log-stash-stream')
            .createStream({
              host: config.logger.server.url,
              port: config.logger.server.port,
              ringbuffer: this.ringbuffer
            })
            .on('error', err => {
              console.error('Error on logstash stream', err)
            })
        })
      }
    }
  }

  get () {
    return this.log
  }
}

function convertConfigToBoolean (value) {
  let booleanValue = false
  if (value === true || value === 'true') {
    booleanValue = true
  }
  return booleanValue
}

function convertConfigToNumber (value) {
  let numberValue = 0
  if (Number(value)) {
    numberValue = Number(value)
  }
  return numberValue
}
