const { default: test } = require('ava')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const Logger = require('..')
const { run, parseLines } = require('./helpers/run')

const consoleConfig = (level) => ({
  name: 'test-app',
  logger: { console: { enable: true, level } }
})

test('should log to the console from the configured level', async (t) => {
  const { lines } = await run(consoleConfig('debug'), 'levels')

  t.deepEqual(lines.map(line => line.msg), ['debug', 'info', 'warn', 'error', 'fatal'])
  t.deepEqual(lines.map(line => line.level), [20, 30, 40, 50, 60])
})

test('should keep the bunyan record format', async (t) => {
  const { lines } = await run(consoleConfig('info'), 'levels')

  for (const line of lines) {
    t.is(line.v, 0)
    t.is(line.name, 's3pweb-logger')
    t.is(line.application, 'test-app')
    t.is(line.hostname, os.hostname())
    t.is(typeof line.pid, 'number')
    t.is(line.time, new Date(line.time).toISOString())
  }
})

test('should accept bunyan level formats', async (t) => {
  t.is((await run(consoleConfig('WARN'), 'levels')).lines.length, 3)
  t.is((await run(consoleConfig(50), 'levels')).lines.length, 2)
  t.is((await run(consoleConfig(), 'levels')).lines.length, 4)
})

test('should throw on an unknown level', (t) => {
  t.throws(() => new Logger(consoleConfig('loud')), { message: 'unknown level name: "loud"' })
})

test('should add child fields', async (t) => {
  const { lines } = await run(consoleConfig('info'), 'child')

  t.like(lines[0], { child: 'childLog', uuid: 'abc', msg: 'from child' })
})

test('should format extra arguments like bunyan', async (t) => {
  const { lines } = await run(consoleConfig('info'), 'format')

  t.is(lines[0].msg, 'Validate payload { a: 1 }')
  t.like(lines[1], { uuid: 'u1', msg: 'count 3' })
  t.is(lines[2].msg, 'a b c')
})

test('should format non-string messages like bunyan', async (t) => {
  const { lines } = await run(consoleConfig('info'), 'nonStringMessage')

  t.is(lines[0].child, 'ExceptionsHandler')
  t.regex(lines[0].msg, /^Error: unhandled\n {4}at /)
  t.is(lines[1].msg, '42')
  t.like(lines[2], { uuid: 'u3', msg: '{ nested: true }' })
  t.like(lines[3], { uuid: 'u4', msg: 'undefined' })
  t.is(lines[4].msg, "[ 'a', 'b' ]")
})

test('should serialize errors', async (t) => {
  const { lines } = await run(consoleConfig('info'), 'error')

  t.like(lines[0], { msg: 'boom', err: { name: 'Error', message: 'boom' } })
  t.regex(lines[0].err.stack, /^Error: boom\n {4}at /)
  t.like(lines[1], { msg: 'with message', uuid: 'u2', err: { name: 'Error', message: 'inner' } })
})

test('should not log anything without stream', async (t) => {
  const { lines } = await run({ name: 'test-app', logger: { console: { enable: 'false' } } }, 'levels')

  t.is(lines.length, 0)
})

test('should log to a rotating file', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 's3pweb-logger-'))
  t.teardown(() => fs.rmSync(dir, { recursive: true, force: true }))

  await run({
    name: 'test-app',
    logger: { file: { enable: 'true', level: 'warn', dir, addHostnameToPath: true } }
  }, 'levels')

  const logsDirectory = path.join(dir, os.hostname())
  const files = fs.readdirSync(logsDirectory)
  t.is(files.length, 1)
  t.regex(files[0], /^test-app_all\.\d{4}-\d{2}-\d{2}\.1\.log$/)

  const lines = parseLines(fs.readFileSync(path.join(logsDirectory, files[0]), 'utf8'))
  t.deepEqual(lines.map(line => line.msg), ['warn', 'error', 'fatal'])
})
