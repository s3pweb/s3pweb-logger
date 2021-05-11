This is a simple lib to log message

## Latest release

### [1.0.4](https://github.com/s3pweb/s3pweb-logger/compare/v1.0.3...v1.0.4) (2021-05-11)

### Other

* **deps:** update bunyan to 1.8.15 ([fda08f1](https://github.com/s3pweb/s3pweb-logger/commit/fda08f1111f0fc92343866eaea83d4a1e814de6c))
* **deps:** update CBuffer to 2.2.0 ([9dd31d7](https://github.com/s3pweb/s3pweb-logger/commit/9dd31d7f826efc6404ce8fca4654ad06cb293e06))
* **deps:** update config to 3.3.6 ([d98a777](https://github.com/s3pweb/s3pweb-logger/commit/d98a777287addf418b862a740962fb0ad54c0f16))
* **deps:** update gelf-pro to 1.3.5 ([5ee7c64](https://github.com/s3pweb/s3pweb-logger/commit/5ee7c6438009b3ab92ac37c7b1e8ad9f7766d75a))
* **deps-dev:** update devDependencies to latest versions ([0c141ed](https://github.com/s3pweb/s3pweb-logger/commit/0c141ed97ffe5aea1467e3c2579959562ba21772))

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
