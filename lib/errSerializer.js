'use strict'

function errSerializer (err) {
  if (!err) {
    return null
  }

  const name = err.name || 'Error'
  let message = err.message || 'Unknown error'
  let stack

  if (err.stack) {
    stack = getFullErrorStack(err)
  }

  if (err.Fault) {
    message += '\n\n' + err.Fault.faultcode + ' - ' + err.Fault.faultstring + '\n' + err.Fault.detail
  }

  if (err.body) {
    message += '\n\n' + err.body
  }

  return { message, name, stack }
}

function getFullErrorStack (ex) {
  let ret = ex.stack || ex.toString()
  if (ex.cause && typeof (ex.cause) === 'function') {
    const cex = ex.cause()
    if (cex) {
      ret += '\nCaused by: ' + getFullErrorStack(cex)
    }
  }
  return (ret)
}

module.exports = {
  errSerializer
}
