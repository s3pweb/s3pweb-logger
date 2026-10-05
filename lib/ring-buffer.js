'use strict'

/**
 * Keeps the last `limit` log records, like bunyan.RingBuffer.
 * Records are stored as the serialized lines written by pino and only parsed when read.
 */
module.exports = class RingBuffer {
  /**
   * @param {{ limit?: number }} [options] Number of records to keep. Default: 100.
   */
  constructor (options) {
    this.limit = options?.limit ? options.limit : 100
    /** @type {string[]} */
    this.lines = []
  }

  /**
   * @param {string} line
   */
  write (line) {
    this.lines.push(line)
    if (this.lines.length > this.limit) {
      this.lines.shift()
    }
  }

  /**
   * @returns {Array<Record<string, any>>}
   */
  get records () {
    return this.lines.map(line => JSON.parse(line))
  }
}
