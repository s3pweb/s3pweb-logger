This is a simple lib to log message

# Installation

npm install s3pweb-logger

# Config

Configurations are stored in configuration files within your application, and can be overridden and extended by environment variables, command line parameters, or external sources. See : http://lorenwest.github.io/node-config/

1. Create a config folder

2. Create a file(s) with the name of your environnement(s) like test.json 

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

```js
NODE_ENV=test node example/example.js
```

# Bonus :

To start a ELK stack on docker :

```bash

chmod +x example/startElk.sh 

./example/startElk.sh

```

Open your favorite browser : http://localhost:5601

Create an index with just * (replace logstash-* by *)
