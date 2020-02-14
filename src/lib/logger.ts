import * as bunyan from 'bunyan';
import * as RotatingFileStream from 'bunyan-rotating-file-stream';
import * as mkdirp from 'mkdirp';
import * as os from 'os';
import Logger = require('bunyan');

export class S3pwebLogger {
  private readonly bunyanLogger: Logger;
  private readonly ringBuffer: Logger.RingBuffer;

  constructor(config) {
    this.bunyanLogger = bunyan.createLogger({
      name: 's3pweb-logger',
      application: config.name,
      // WARNING: Determining the call source info is slow. Never use this option in production.
      src: config.source,
      serializers: {
        err: errSerializer,
      },
      streams: [],
    });

    if (config.console && config.console.enable === true) {
      this.bunyanLogger.addStream({
        level: config.console.level,
        stream: process.stdout,
      });
    }

    if (config.file && config.file.enable === true) {
      let logsDirectory;

      if (config.file.dir) {
        if (config.file.addHostnameToPath) {
          logsDirectory = `${config.file.dir}/${os.hostname()}`;
        } else {
          logsDirectory = config.file.dir;
        }
        mkdirp.sync(logsDirectory);
      } else {
        console.log('Please define config.file.dir in your config file');
      }

      this.bunyanLogger.addStream({
        level: config.file.level,
        stream: new RotatingFileStream({
          // config.name comes from the including connector
          path: `${logsDirectory}/${config.name}_all_%y-%m-%d.%N.log`,
          period: '1d', // daily rotation
          totalFiles: 15, // keep up to 50 back copies
          rotateExisting: true, // Give ourselves a clean file when we start up, based on period
          threshold: '10m', // Rotate log files larger than 10 megabytes
          totalSize: '500m', // Don't keep more than 20mb of archived log files
          gzip: true, // Compress the archive log files to save space
        }),
      });
    }

    if (config.ringBuffer && config.ringBuffer.enable === true) {
      this.ringBuffer = new bunyan.RingBuffer({
        limit: config.ringBuffer.size,
      });

      this.bunyanLogger.addStream({
        level: 'trace',
        type: 'raw',
        stream: this.ringBuffer,
      });
    }

    if (config.server && config.server.enable === true) {
      if (config.server.type === 'elk') {
        // Configure logstash stream
        this.bunyanLogger.addStream({
          level: config.server.level,
          type: 'raw',
          stream: require('./log-stash-stream')
            .createStream({
              host: config.server.url,
              port: config.server.port,
              ringbuffer: this.ringBuffer,
            })
            .on('error', err => {
              console.error('Error on logstash stream', err);
            }),
        });
      }

      if (config.server.type === 'ovh') {
        const OvhStream = require('./ovh-stream');

        this.bunyanLogger.addStream({
          level: config.server.level,
          type: 'raw',
          stream: new OvhStream(),
        });
      }
    }
  }

  get() {
    return this.bunyanLogger;
  }

  getChild(name) {
    return this.bunyanLogger.child({ child: name });
  }

  getRingBuffer() {
    return this.ringBuffer.records;
  }
}

function errSerializer(err) {
  if (!err || !err.stack) {
    return err;
  }
  return {
    message: err.message,
    name: err.name,
    stack: getFullErrorStack(err),
  };
}

function getFullErrorStack(ex) {
  let ret = ex.stack || ex.toString();
  if (ex.cause && typeof (ex.cause) === 'function') {
    const cex = ex.cause();
    if (cex) {
      ret += '\nCaused by: ' + getFullErrorStack(cex);
    }
  }
  return (ret);
}
