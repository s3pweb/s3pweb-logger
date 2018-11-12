const test = require('ava');
const Logger = require('..')

let log = Logger.getChild('test')

const Hook = require('console-hook');


test.before(() => {
	console.log('before: ')
});


test('test basic', (t) => {

   log.trace('toto')  
   log.debug('toto')  
   log.info('toto')  
   log.warn('toto')  
   log.error('toto')  
   log.fatal('toto')  

   t.pass()

   
	
});