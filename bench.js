const benny   = require('benny');
const Encoder = require('./lib/encoder');
const Parser  = require('./lib/parser');

benny.suite(
  'Fringe',
  benny.add( 'parse', () => {
    const encoder = new Encoder({ prefix: 'TEST', lengthFormat: 'UInt8' });
    const parser  = new Parser({ prefix: 'TEST', lengthFormat: 'UInt8' });

    encoder.write('Hello World');

    const message = encoder.read();

    parser.on( 'message', () => {} );

    return () => parser.write( message );
  }),
  benny.cycle(),
  benny.complete( () => process.exit( 0 ) )
);
