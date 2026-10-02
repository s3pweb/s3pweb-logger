const Logger = require('..')

const config = require('../config/default.json')

const log = new Logger(config).get()
const child = log.child({ child: 'childName' })

log.info('one message from log')
child.info({ uuid: 'f0e1c2d3' }, 'one message from child')
