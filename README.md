[![npm (scoped)](https://img.shields.io/npm/v/@s3pweb/s3pweb-logger)](https://www.npmjs.com/package/@s3pweb/s3pweb-logger)

This is a simple lib to log message

## Latest release

## [1.1.0](https://github.com/s3pweb/s3pweb-logger/compare/v1.0.4...v1.1.0) (2022-04-08)


### Features

* **configuration:** convert some config values because environment variables are strings ([00439cc](https://github.com/s3pweb/s3pweb-logger/commit/00439cc3ca8e018dcc771d1c0ba3b76f937a7dd6))


### Other

* **deps-dev:** remove eslint-config-prettier ([9b4c8f2](https://github.com/s3pweb/s3pweb-logger/commit/9b4c8f238802fb36916685ce6552250328ecfc03))
* **deps-dev:** update to ava@4.1.0 ([4f292dd](https://github.com/s3pweb/s3pweb-logger/commit/4f292dd02db7f5ef2cf78c4794f606068874e3e0))
* **deps-dev:** update to standard-version@9.3.2 ([c425f6f](https://github.com/s3pweb/s3pweb-logger/commit/c425f6f0ac58089577e547e8750b1d651c3b9f54))
* **deps-dev:** update to standard@16.0.4 ([600fa6f](https://github.com/s3pweb/s3pweb-logger/commit/600fa6f12dc91ab069ce9ef961420dcacb197025))
* **deps:** recreate package-lock.json to fix vulnerabilities ([0cbe715](https://github.com/s3pweb/s3pweb-logger/commit/0cbe71506bed7354b82f78e9f481e052ca6dc7cd))
* **deps:** update to config@3.3.7 ([1612e0d](https://github.com/s3pweb/s3pweb-logger/commit/1612e0d09b834de9bf7454251cbbcb922858ae5b))
* **deps:** update to gelf-pro@1.3.6 ([be33876](https://github.com/s3pweb/s3pweb-logger/commit/be338762e900c6d858ce062340a0935dce3faeb9))


# Installation

    npm install s3pweb-logger

# Config

Configurations are stored in configuration files within your application, and can be overridden and extended by environment variables, command line parameters, or external sources. See : http://lorenwest.github.io/node-config/

1. Create a config folder

2. Create a file(s) with the name of your environment(s) like test.json 

3. Paste this configuration template :

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
      "dir": "./logs"
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
      "size": 50
    }
  }
}
```

4. Adapt values with your expectations


# Example :

```js
const log = require('@s3pweb/s3pweb-logger').logger
const { logger } = require('@s3pweb/s3pweb-logger')

const child = log.child({ child: 'childName' })

log.info('one message from log')
logger.info('one message from logger')
child.info('one message from child')
```

# Run example :

Pass the name of your environnement with NODE_ENV=xxxx before node

```bash
NODE_ENV=test node example/example.js
```

# Bonus :

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
