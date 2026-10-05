[![npm (scoped)](https://img.shields.io/npm/v/@s3pweb/s3pweb-logger)](https://www.npmjs.com/package/@s3pweb/s3pweb-logger)

This is a simple lib to log messages built on top of [pino](https://github.com/pinojs/pino).
This lib can send logs to the console, to a file or to a logstash instance.

Requires Node.js 22 or later.

# Installation

    npm install @s3pweb/s3pweb-logger

# Configuration

The constructor expect a config object following this format:

```json
{
  "name": "your-application-name",
  "logger": {
    "console": {
      "enable": true,
      "level": "debug"
    },
    "file": {
      "enable": true,
      "level": "info",
      "dir": "./logs",
      "addHostnameToPath": true
    },
    "server": {
      "enable": true,
      "level": "trace",
      "url": "0.0.0.0",
      "port": "9998",
      "type": "elk"
    },
    "ringBuffer": {
      "enable": true,
      "size": 5
    }
  }
}
```

# Example

```js
const Logger = require('@s3pweb/s3pweb-logger')

const log = new Logger(config).get()
const child = log.child({ child: 'childName' })

log.info('one message from log')
child.info({ uuid }, 'one message from child')
```

`get()` returns a [pino logger](https://getpino.io/#/docs/api?id=logger). Records keep the bunyan format
(`v`, `name`, `hostname`, `pid`, ISO `time`), so they can still be read with `bunyan`, or with `pino-pretty`:

```bash
node app.js | npx bunyan -o short
node app.js | npx pino-pretty -i v,application
```

# Migrating from v2 (bunyan)

The configuration and the calls (`log.info({ uuid }, 'message %s', value)`, `log.child({ child })`) are unchanged.
Extra arguments are still formatted with `util.format` like bunyan did, but pino's TypeScript types reject them
without placeholders: replace `log.info('payload', payload)` by `log.info({ payload }, 'payload')`.

Breaking changes:

- The logger is a pino logger: use the `Logger` type from this lib (or `pino.Logger`) instead of `@types/bunyan`.
  Bunyan-only methods (`addStream`, `level()` as a function, `reopenFileStreams`...) are not available.
- `logger.source` is not supported anymore and is ignored.
- Log files are rotated by [pino-roll](https://github.com/mcollina/pino-roll) and named `<name>_all.<yyyy-MM-dd>.<n>.log`.
  They are rotated daily or at 10 MB and the last 15 are kept, but they are not gzipped anymore and there is no total size limit.

# Tests

```bash
npm test
npm run typecheck # checks lib/ JSDoc types and that index.d.ts matches the implementation
node example/example.js
```

# Bonus

To start a ELK stack on docker :

```bash
chmod +x example/startElk.sh 

./example/startElk.sh
```

Or with docker compose :

```bash
docker-compose -f example/docker-stack.yaml up -d
```

Open your favorite browser : http://localhost:5601

Create an index with just * (replace logstash-* by *)
