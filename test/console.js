const test = require('ava')
const Logger = require('../dist/index')

const log = new Logger()

test('test basic', (t) => {
  log.trace('toto')
  log.debug('toto')
  log.info('toto')
  log.warn('toto')
  log.error('toto')
  log.fatal('toto')

  t.pass()
})

test('test child', (t) => {
  const childLog = log.child({ child: 'childLog' })

  childLog.trace('msg child')
  childLog.debug('msg child')
  childLog.info('msg child')
  childLog.warn('msg child')
  childLog.error('msg child')
  childLog.fatal('msg child')

  t.pass()
})
