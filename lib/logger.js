const config = require('config')
const bunyan = require('bunyan')

const RotatingFileStream = require('bunyan-rotating-file-stream')
const mkdirp = require('mkdirp')

class Logger {
  constructor () {
    if (
      config.logger &&
      config.logger.file &&
      config.logger.file.enable === true
    ) {
      if (config.logger.file.dir) {
        mkdirp.sync(config.logger.file.dir)
      } else {
        console.log('Please define config.logger.file.dir in your config file')
      }
    }

    this.log = bunyan.createLogger({
      name: 's3pweb-logger',
      application: config.name,
      // WARNING: Determining the call source info is slow. Never use this option in production.
      src: config.logger.source,
      serializers: {
        err: bunyan.stdSerializers.err
      },
      streams: []
    })

    if (
      config.logger &&
      config.logger.console &&
      config.logger.console.enable === true
    ) {
      this.log.addStream({
        level: config.logger.console.level,
        stream: process.stdout
      })
    }

    if (
      config.logger &&
      config.logger.file &&
      config.logger.file.enable === true
    ) {
      this.log.addStream({
        level: config.logger.file.level,
        stream: new RotatingFileStream({
          // config.name comes from the including connector
          path: `./${config.logger.file.dir}/${
            config.name
          }_all_%y-%m-%d.%N.log`,
          period: '1d', // daily rotation
          totalFiles: 15, // keep up to 50 back copies
          rotateExisting: true, // Give ourselves a clean file when we start up, based on period
          threshold: '10m', // Rotate log files larger than 10 megabytes
          totalSize: '500m', // Don't keep more than 20mb of archived log files
          gzip: true // Compress the archive log files to save space
        })
      })
    }

    if (
      config.logger &&
      config.logger.ringBuffer &&
      config.logger.ringBuffer.enable === true
    ) {
      this.ringbuffer = new bunyan.RingBuffer({
        limit: config.logger.ringBuffer.size
      })

      this.log.addStream({
        level: 'trace',
        type: 'raw',
        stream: this.ringbuffer
      })
    }

    if (
      config.logger &&
      config.logger.server &&
      config.logger.server.enable === true
    ) {
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
              console.error(`Error on logstash stream`, err)
            })
        })
      }

      if (config.logger.server.type === 'ovh') {
        const OvhStream = require('./ovh-stream')

        this.log.addStream({
          level: config.logger.server.level,
          type: 'raw',
          stream: new OvhStream()
        })
      }
    }
  }

  get () {
    return this.log
  }

  getChild (name) {
    return this.log.child({ child: name })
  }

  getRingBuffer () {
    return this.ringbuffer.records
  }
}

const instanceLogger = new Logger()

Object.freeze(instanceLogger)

module.exports.logger = instanceLogger.get()
