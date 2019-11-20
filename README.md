This is a simple lib to log message

## Latest release 1.0.2

### Changed
- (npm) published files are now whitelisted in package.json
- (style) used standard linter
- (npm) changed package name to @s3pweb/s3pweb-logger
### Removed
- (dependencies) removed unused console-hook
### Security
- (dependencies) updated config to 3.2.4

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
