const { default: test } = require('ava')
const net = require('node:net')
const os = require('node:os')
const { run, parseLines } = require('./helpers/run')

const serverConfig = (port, ringBuffer) => ({
  name: 'test-app',
  logger: {
    server: { enable: 'true', level: 'info', url: '127.0.0.1', port, type: 'elk' },
    ringBuffer: { enable: ringBuffer, size: 3 }
  }
})

async function startLogstash (t) {
  let received = ''
  const server = net.createServer(socket => {
    socket.setEncoding('utf8')
    socket.on('data', data => { received += data })
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.teardown(() => server.close())
  return { port: server.address().port, lines: () => parseLines(received) }
}

test('should send logs to logstash', async (t) => {
  const logstash = await startLogstash(t)

  await run(serverConfig(logstash.port, false), 'logstash')

  const lines = logstash.lines()
  t.deepEqual(lines.map(line => line.message), ['one', 'two', 'three', 'boom'])
  t.like(lines[0], {
    message: 'one',
    level: 'info',
    tags: ['bunyan'],
    name: 's3pweb-logger',
    application: 'test-app',
    child: 'childLog',
    uuid: 'abc'
  })
  t.true(lines[0].source.startsWith(`${os.hostname()}/`))
  t.is(lines[0]['@timestamp'], new Date(lines[0]['@timestamp']).toISOString())
  for (const field of ['v', 'time', 'msg']) {
    t.false(field in lines[0])
  }
  t.like(lines[3], { level: 'error', err: { message: 'boom' } })
  t.false('trace' in lines[3])
})

test('should add the ring buffer records to errors', async (t) => {
  const logstash = await startLogstash(t)

  await run(serverConfig(logstash.port, true), 'logstash')

  const lines = logstash.lines()
  t.false('trace' in lines[2])

  const trace = lines[3].trace
  t.regex(trace, /^-\d+ ms : two \n/)
  t.regex(trace, /ms : three \n/)
  t.regex(trace, /-0 ms : boom \n/)
  t.notRegex(trace, /: one \n/)
})

test('should not keep the process alive when logstash is unreachable', async (t) => {
  const server = net.createServer()
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  await new Promise(resolve => server.close(resolve))

  const { stderr } = await run(serverConfig(port, false), 'unreachable')

  t.regex(stderr, /Error on logstash stream.*ECONNREFUSED/)
})
