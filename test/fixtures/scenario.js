'use strict'

// Usage: node scenario.js '<config as JSON>' <scenario name>
const Logger = require('../..')

const config = JSON.parse(process.argv[2])
const log = new Logger(config).get()

const scenarios = {
  levels () {
    log.trace('trace')
    log.debug('debug')
    log.info('info')
    log.warn('warn')
    log.error('error')
    log.fatal('fatal')
  },
  child () {
    log.child({ child: 'childLog' }).info({ uuid: 'abc' }, 'from child')
  },
  format () {
    log.info('Validate payload', { a: 1 })
    log.info({ uuid: 'u1' }, 'count %d', 3)
    log.info('a %s', 'b', 'c')
  },
  nonStringMessage () {
    // How NestJS logs an unhandled exception through @s3pweb/nestjs-common
    log.error({ child: 'ExceptionsHandler' }, new Error('unhandled'))
    log.info(42)
    log.info({ uuid: 'u3' }, { nested: true })
    log.warn({ uuid: 'u4' }, undefined)
    log.info(['a', 'b'])
  },
  error () {
    log.error(new Error('boom'))
    log.error({ err: new Error('inner'), uuid: 'u2' }, 'with message')
  },
  logstash () {
    const child = log.child({ child: 'childLog' })
    child.debug('debug')
    child.info({ uuid: 'abc' }, 'one')
    child.info('two')
    child.info('three')
    child.error(new Error('boom'))
    // Leave time to connect and flush, the socket does not keep the process alive
    setTimeout(() => {}, 1000)
  },
  unreachable () {
    log.info('nobody is listening')
  }
}

scenarios[process.argv[3]]()
