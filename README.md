[![npm (scoped)](https://img.shields.io/npm/v/@s3pweb/s3pweb-logger)](https://www.npmjs.com/package/@s3pweb/s3pweb-logger)

This is a simple lib to log messages built on top of [bunyan](https://github.com/trentm/node-bunyan).
This lib can send logs to the console, to a file or to a logstash instance.

# Installation

    npm install @s3pweb/s3pweb-logger

# Configuration

The constructor expect a config object following this format:

```json
{
  "name": "your-application-name",
  "logger": {
    "source": false,
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
child.info('one message from child')
```

# Tests

Set the name of your environment with NODE_ENV=xxxx before node

```bash
NODE_ENV=test node example/example.js
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
