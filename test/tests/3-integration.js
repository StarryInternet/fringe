const assert = require('chai').assert;
const rewire = require('rewire');

describe( 'Integration Tests', () => {

  const formats = [
    'UInt8',
    'UInt16LE',
    'UInt16BE',
    'UInt32LE',
    'UInt32BE'
  ];

  formats.forEach( lengthFormat => {

    it( `should support ${ lengthFormat } lengths`, () => {
      const Encoder = rewire('../../lib/encoder');
      const Parser  = rewire('../../lib/parser');

      const encode = new Encoder({ lengthFormat });
      const parse  = new Parser({ lengthFormat });

      encode.write('Hello World');

      const encoded = encode.read();

      parse.write( encoded );

      const decoded = parse.read();

      assert.equal( decoded.toString(), 'Hello World' );
    });

  });

  it( 'should parse severely chunked messages', () => {
    const Encoder = rewire('../../lib/encoder');
    const Parser  = rewire('../../lib/parser');

    const encode = new Encoder();
    const parse  = new Parser();

    function getRandomMessage() {
      const length = 1 + ~~( Math.random() * 100 );
      return 'x'.repeat( length ).replace( /./g, getRandomCharacter );
    }

    function getRandomCharacter() {
      return String.fromCharCode( 33 + ~~( Math.random() * 94 ) );
    }

    let buffer   = Buffer.from('');
    let messages = 1000;
    let reads    = 0;

    parse.on( 'message', () => reads++ );

    for ( let i = 0; i < messages; ++i ) {
      const message = getRandomMessage();
      encode.write( message );
      buffer = Buffer.concat([ buffer, encode.read() ]);
    }

    for ( let i = 0; i < buffer.length; i += 100 ) {
      parse.write( buffer.slice( i, i + 100 ) );
    }

    assert.equal( messages, reads );
  });

});
