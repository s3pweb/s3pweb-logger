const test = require('ava')
const errSerializer = require('../lib/errSerializer').errSerializer

test('should not fail', (t) => {
  const err = new Error('test')
  const serialized = errSerializer(err)
  t.is(serialized.name, 'Error')
  t.is(serialized.message, 'test')
  t.is(serialized.stack, err.stack)
})

test('should not fail with null', (t) => {
  const serialized = errSerializer(null)
  t.is(serialized, null)
})

test('should not fail with undefined', (t) => {
  const serialized = errSerializer(undefined)
  t.is(serialized, null)
})

test('should not fail with an empty object', (t) => {
  const serialized = errSerializer({})
  t.deepEqual(serialized, { message: 'Unknown error', name: 'Error', stack: undefined })
})

test('should handle Fault', (t) => {
  const err = new Error('Error with Fault')
  err.Fault = {
    faultcode: 500,
    faultstring: 'fault string',
    detail: 'fault detail'
  }
  const serialized = errSerializer(err)
  t.is(serialized.name, 'Error')
  t.is(serialized.message, 'Error with Fault\n\n500 - fault string\nfault detail')
  t.is(serialized.stack, err.stack)
})

test('should handle body', (t) => {
  const err = new Error('Error with body')
  err.body = 'body message'
  const serialized = errSerializer(err)
  t.is(serialized.name, 'Error')
  t.is(serialized.message, 'Error with body\n\nbody message')
  t.is(serialized.stack, err.stack)
})
