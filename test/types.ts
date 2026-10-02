// Type tests, only checked by `npm run typecheck`: the JS implementation must match index.d.ts.
import S3pwebLogger = require('..')
import Implementation = require('../lib/logger')

const implementation: typeof S3pwebLogger = Implementation

const wrapper = new implementation({
  name: 'app',
  logger: { console: { enable: 'true', level: 'debug' }, ringBuffer: { enable: true, size: 5 } }
})
const log: S3pwebLogger.Logger = wrapper.get().child({ child: 'MyService' })
log.trace({ uuid: 'u1' }, 'Get entity %s.', 'id')
log.error({ err: new Error('boom') }, 'message')
log.info({ payload: { a: 1 } }, 'Validate payload')
export const records: number = wrapper.ringbuffer?.records.length ?? 0

// @ts-expect-error the application name is required
export const missingName = new S3pwebLogger({})
// @ts-expect-error pino types want a placeholder for each extra argument
log.info('Validate payload', { a: 1 })
