var test = require('ava');
var log = require('../index').Logger

var Hook = require('console-hook');

test.before(t => {
	console.log('before: ')
});

test('test metric for info', (t) => {

    var myHook = Hook().attach((method, args) => {
        
        t.is(method == 'log',true)
        t.is(args[0] == 'INFO: toto',true)
        
      });

      log.info('toto')  

      myHook.detach()

      t.is(log.metrics().info,1)      
	
});

test('test metric for warm', (t) => {

    var myHook = Hook().attach((method, args) => {
        console.log('2',method,args)
      });

    log.warm('toto')

    myHook.detach()

    t.is(log.metrics().warm, 1)
	
});