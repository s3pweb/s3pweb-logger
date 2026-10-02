'use strict'

const { execFile } = require('node:child_process')
const path = require('node:path')
const util = require('node:util')

const fixture = path.join(__dirname, '..', 'fixtures', 'scenario.js')

/**
 * Runs a scenario of test/fixtures/scenario.js in a child process and returns its stdout as parsed lines.
 */
async function run (config, scenario) {
  const {
    stdout,
    stderr
  } = await util.promisify(execFile)(process.execPath, [fixture, JSON.stringify(config), scenario], {
    timeout: 10000
  })
  return { lines: parseLines(stdout), stderr }
}

function parseLines (output) {
  return output.split('\n').filter(line => line.length > 0).map(line => JSON.parse(line))
}

module.exports = { run, parseLines }
