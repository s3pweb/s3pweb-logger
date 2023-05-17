const test = require('ava')
const Logger = require('..')

const config = require('../config/test.json')

const log = new Logger(config).get()

test('test basic', (t) => {
  log.trace('trace')
  log.debug('debug')
  log.info('info')
  log.warn('warn')
  log.error('error')
  log.fatal('fatal')

  t.pass()
})

test('test child', (t) => {
  const childLog = log.child({ child: 'childLog' })

  childLog.trace('trace child')
  childLog.debug('debug child')
  childLog.info('info child')
  childLog.warn('warn child')
  childLog.error('error child')
  childLog.fatal('fatal child')

  t.pass()
})
