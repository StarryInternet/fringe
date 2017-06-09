const Benchmark = require('benchmark');

global.require = require;

function setup() {
  let Encoder = require('./lib/encoder');
  let Parser  = require('./lib/parser');
  let encoder = new Encoder({ prefix: 'TEST', lengthFormat: 'UInt8' });
  let parser  = new Parser({ prefix: 'TEST', lengthFormat: 'UInt8' });

  encoder.write('Hello World');

  let message = encoder.read();

  parser.on( 'message', function() {} );
}

function fn() {
  parser.write( message );
}

const bench = new Benchmark( 'parse', { setup, fn } );

bench.on( 'complete', () => console.log( bench.toString() ) );

bench.run();
