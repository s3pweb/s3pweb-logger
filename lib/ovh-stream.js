const gelf = require('gelf-pro')

const config = require('config')

gelf.setConfig({
  fields: config.logger.server['X-OVH-TOKEN'],
  filter: [], // optional; filters to discard a message
  transform: [], // optional; transformers for a message
  broadcast: [], // optional; listeners of a message
  levels: {
    emergency: 0,
    alert: 1,
    critical: 2,
    error: 3,
    warning: 4,
    notice: 5,
    info: 6,
    debug: 7
  },
  aliases: {}, // optional; default: see the aliases section below
  adapterName: 'tcp-tls', // optional; currently supported "udp", "tcp" and "tcp-tls"; default: udp
  adapterOptions: {
    // this object is passed to the adapter.connect() method
    // common
    host: 'gra1.logs.ovh.com', // optional; default: 127.0.0.1
    port: 12202 // optional; default: 12201
    //   // tcp adapter example
    //   family: 4, // tcp only; optional; version of IP stack; default: 4
    //   timeout: 1000, // tcp only; optional; default: 10000 (10 sec)
  }
})

function mapGelfLevel (bunyanLevel) {
  switch (bunyanLevel) {
    case 10 /* bunyan.TRACE */:
      return 'debug'
    case 20 /* bunyan.DEBUG */:
      return 'debug'
    case 30 /* bunyan.INFO */:
      return 'info'
    case 40 /* bunyan.WARN */:
      return 'warning'
    case 50 /* bunyan.ERROR */:
      return 'error'
    case 60 /* bunyan.FATAL */:
      return 'emergency'
    default:
      return 'debug'
  }
}

function GelfStream () {}

GelfStream.prototype.write = function (bunyanMessage) {
  let key
  const ignoreFields = ['hostname', 'time', 'msg', 'name', 'level', 'v']

  const gelfMessage = {
    host: bunyanMessage.hostname,
    timestamp: Number(new Date(bunyanMessage.time)) / 1000,
    short_message: bunyanMessage.msg,
    facility: bunyanMessage.name
  }

  for (key in bunyanMessage) {
    if (ignoreFields.indexOf(key) < 0 && gelfMessage[key] === null) {
      gelfMessage[key] = JSON.stringify(bunyanMessage[key], null, 3)
    }
  }

  gelf[mapGelfLevel(bunyanMessage.level)](bunyanMessage.msg, gelfMessage)
}

module.exports = GelfStream
