This is a simple lib to log message

## Latest release

### [1.0.3](https://github.com/s3pweb/s3pweb-logger/compare/v1.0.2...v1.0.3) (2020-07-17)
### Other
* **dependencies:** re-generated package-lock.json to resolve vulnerabilities ([6fd2c41](https://github.com/s3pweb/s3pweb-logger/commit/6fd2c41aea4f0974b5a884ed86b93a5dca002ab0))
* **dependencies:** updated ava to 3.6.0 ([4f95545](https://github.com/s3pweb/s3pweb-logger/commit/4f95545746344e4ac45083342c581e573d4fb872))
* **dependencies:** updated config to 3.3.1 ([aa57392](https://github.com/s3pweb/s3pweb-logger/commit/aa57392302e967a63956088b0b5222db4463f2b0))
* **dependencies:** updated eslint-config-prettier to 6.10.1 ([36c2f16](https://github.com/s3pweb/s3pweb-logger/commit/36c2f1682bc4a9ed53cd384796a5b9929233d694))
* **dependencies:** updated mkdirp to 1.0.4 ([b4d3219](https://github.com/s3pweb/s3pweb-logger/commit/b4d3219583ef6fdbbb4c5ba45a2fffbd5bef8351))
* **dependencies:** updated nyc to 15.0.1 ([bd927fc](https://github.com/s3pweb/s3pweb-logger/commit/bd927fc78d52dcca951276c6887e6bfe48e34788))
* **dependencies:** updated standard to 14.3.3 ([8843c96](https://github.com/s3pweb/s3pweb-logger/commit/8843c962087db16c0c443d931692191a18f8e08d))
* **deps:** update bunyan to 1.8.14 ([ee5ae1f](https://github.com/s3pweb/s3pweb-logger/commit/ee5ae1f61fefa394ef368bdfcea95efbd4f5d9dd))
* **deps:** update CBuffer to 2.1.0 ([3341d51](https://github.com/s3pweb/s3pweb-logger/commit/3341d51de3e8b387e31d0cc14497b8956fe12c25))
* **deps-dev:** update ava to 3.10.1 ([48796b4](https://github.com/s3pweb/s3pweb-logger/commit/48796b4ac28abdfedf4bdc956239b7ebb6c43c9c))
* **deps-dev:** update eslint-config-prettier to 6.11.0 ([ce10664](https://github.com/s3pweb/s3pweb-logger/commit/ce106646186b3e2e169f9c5c3617935f645c93c6))
* **deps-dev:** update nyc to 15.1.0 ([35528d8](https://github.com/s3pweb/s3pweb-logger/commit/35528d89cb00e571aad04e176de0c22ceda0e4be))
* **deps-dev:** update standard to 14.3.4 ([591908c](https://github.com/s3pweb/s3pweb-logger/commit/591908c81dd5acab38e62a2677b3e2b74f8c0155))

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
const log = require('s3pweb-logger').logger
const { logger } = require('s3pweb-logger')

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
