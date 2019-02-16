const assert      = require('chai').assert;
const rewire      = require('rewire');
const parserPath  = '../../lib/parser';
const encoderPath = '../../lib/encoder';

describe( 'Parser', () => {

  describe( '#constructor', () => {

    it( 'should be a function', () => {
      const Parser = rewire( parserPath );

      assert.isFunction( Parser );
    });

    it( 'should inherit from stream.Transform', () => {
      const Parser    = rewire( parserPath );
      const Transform = require('stream').Transform;
      const parser    = new Parser();

      assert.instanceOf( parser, Transform );
    });

  });

  describe( '#_transform', () => {

    it( 'should emit `message` when it receives a fully-formed message', done => {
      const Parser  = rewire( parserPath );
      const Encoder = rewire( encoderPath );
      const parser  = new Parser();
      const encoder = new Encoder();
      const text    = 'hello';

      encoder.pipe( parser ).on( 'message', msg => {
        assert.equal( msg.toString(), text );
        done();
      });

      encoder.write( text );
    });

    it( 'should accept strings', done => {
      const Parser  = rewire( parserPath );
      const Encoder = rewire( encoderPath );
      const parser  = new Parser();
      const encoder = new Encoder();
      const text    = 'hello';

      encoder.on( 'data', chunk => {
        parser._transform( chunk.toString('utf8'), null, x => x );
      });

      parser.on( 'message', msg => {
        assert.equal( msg.toString(), text );
        done();
      });

      encoder.write( text );
    });

    it( 'should reassamble split messages', done => {
      const Parser  = rewire( parserPath );
      const Encoder = rewire( encoderPath );
      const parser  = new Parser();
      const encoder = new Encoder();
      const text    = 'hello';

      encoder.on( 'data', chunk => {
        // split *after* the header
        parser.write( chunk.slice( 0, 10 ) );
        parser.write( chunk.slice( 10 ) );
      });

      parser.on( 'message', msg => {
        assert.equal( msg.toString(), text );
        done();
      });

      encoder.write( text );
    });

    it( 'should reassamble chunks that were split in the middle of a header', done => {
      const Parser  = rewire( parserPath );
      const Encoder = rewire( encoderPath );
      const parser  = new Parser();
      const encoder = new Encoder();
      const text    = 'hello';

      encoder.on( 'data', chunk => {
        parser.write( chunk.slice( 0, 4 ) );
        parser.write( chunk.slice( 4 ) );
      });

      parser.on( 'message', msg => {
        assert.equal( msg.toString(), text );
        done();
      });

      encoder.write( text );
    });

    it( 'should reassamble chunks that were split TWICE in the middle of a header', done => {
      const Parser  = rewire( parserPath );
      const Encoder = rewire( encoderPath );
      const parser  = new Parser();
      const encoder = new Encoder();
      const text    = 'hello';

      encoder.on( 'data', chunk => {
        parser.write( chunk.slice( 0, 2 ) );
        parser.write( chunk.slice( 2, 6 ) );
        parser.write( chunk.slice( 6 ) );
      });

      parser.on( 'message', msg => {
        assert.equal( msg.toString(), text );
        done();
      });

      encoder.write( text );
    });

    it( 'should emit `error` when given a malformed message', done => {
      const Parser  = rewire( parserPath );
      const parser  = new Parser();

      parser.on( 'error', err => {
        assert.instanceOf( err, Error );
        done();
      });

      parser.write( Buffer.alloc( 10 ) );
    });

    it( 'should emit `error` when error occured in transform using objectMode false', done => {
      const Encoder = rewire( encoderPath );
      const encoder = new Encoder();
      const Parser  = rewire( parserPath );
      const myError = new Error('myerror');

      class MessageParser extends Parser {

        constructor() {
          super();
        }

        translate() {
          throw myError;
        }

      }

      const parser  = new MessageParser();

      parser.on( 'error', err => {
        assert.equal( err, myError );
        done();
      });

      encoder.write('hello world');
      parser.write( encoder.read() );
    });

    it( 'should emit `error` when error occured in transform using objectMode true', done => {
      const Encoder = rewire( encoderPath );
      const encoder = new Encoder({}, { objectMode: true });
      const Parser  = rewire( parserPath );
      const myError = new Error('myerror');

      class MessageParser extends Parser {

        constructor() {
          super();
        }

        translate() {
          throw myError;
        }

      }

      const parser  = new MessageParser();

      parser.on( 'error', err => {
        assert.equal( err, myError );
        done();
      });

      encoder.write({ myString: 'hello world' });
      parser.write( encoder.read() );
    });

    it( 'should separate multiple messages passed in the same chunk', done => {
      const Parser  = rewire( parserPath );
      const Encoder = rewire( encoderPath );
      const parser  = new Parser();
      const encoder = new Encoder();
      const text1   = 'hello';
      const text2   = 'world';

      let buffer = Buffer.alloc( 0 );
      let count  = 0;

      encoder.on( 'data', chunk => {
        buffer = Buffer.concat([ buffer, chunk ]);
        if ( ++count === 2 ) {
          count = 0;
          parser.write( buffer );
        }
      });

      parser.on( 'message', msg => {
        if ( ++count === 1 ) {
          assert.equal( msg.toString(), text1 );
        } else {
          assert.equal( msg.toString(), text2 );
          done();
        }
      });

      encoder.write( text1 );
      encoder.write( text2 );
    });

    it( 'should emit an error for zero-length messages', done => {
      const Parser = rewire( parserPath );
      const parser = new Parser();
      const buffer = Buffer.alloc( 10 );

      parser.on( 'error', err => {
        assert.instanceOf( err, Error );
        done();
      });

      buffer.write( 'FRINGE', 0 );
      buffer.writeUInt32BE( 0, 6 );
      parser.write( buffer );
    });

    it( 'should literally be able to parse messages one byte at a time', done => {
      const Parser  = rewire( parserPath );
      const Encoder = rewire( encoderPath );
      const parser  = new Parser();
      const encoder = new Encoder();
      const text    = 'hello';

      encoder.on( 'data', chunk => {
        for ( let i = 0, len = chunk.length; i < len; ++i ) {
          parser.write( chunk.slice( i, i + 1 ) );
        }
      });

      parser.on( 'message', msg => {
        assert.equal( msg.toString(), text );
        done();
      });

      encoder.write( text );
    });

    // write a message into Parser before binding a `message` handler
    // and make sure that it's there waiting for us
    //
    // missive previously suffered from an issue where messages written
    // prior to a `data`/`message` handler being bound would essentially be
    // thrown away
    it( 'should buffer until a message handler is bound', done => {
      const Parser  = rewire( parserPath );
      const Encoder = rewire( encoderPath );
      const parser  = new Parser();
      const encoder = new Encoder();
      const text1   = 'hello';
      const text2   = 'world';

      encoder.on( 'data', chunk => {
        parser.write( chunk );

        // write happens asynchronously, so we need to wait
        // for the data to become readable
        setImmediate( () => {
          let msg1 = parser.read();

          assert.isNotNull( msg1, 'message was not buffered while waiting for a handler to be bound' );

          msg1 = msg1.toString('utf8');

          parser.on( 'message', () => {
            let buffered = parser.read();
            assert.isNull( buffered, 'stream buffer was not exhausted after `message` was emitted' );
            done();
          });

          encoder.write( text2 );
        });
      });

      encoder.write( text1 );
    });

    it( 'should emit `error` when given a buffer larger than maxSize', done => {
      const Parser = require('rewire')('../../lib/parser');
      const Encoder = require('rewire')('../../lib/encoder');
      const parser = new Parser();
      const encoder = new Encoder();
      const text = 'hello';

      encoder.on( 'data', chunk => {
        // rewrite the `length` portion of the header
        chunk.writeUInt32BE( 1024 * 1024 * 100 + 1, 6 );
        parser.write( chunk );
      });

      parser.on( 'error', err => {
        assert.instanceOf( err, Error );
        done();
      });

      encoder.write( text );
    });


    // messages should *not* be buffered if a `message` handler is bound
    it( 'should not buffer while a message handler is bound', done => {
      const Parser  = rewire( parserPath );
      const Encoder = rewire( encoderPath );
      const parser  = new Parser();
      const encoder = new Encoder();
      const text    = 'hello';

      encoder.on( 'data', chunk => {
        parser.write( chunk );

        parser.on( 'message', () => {} );

        // write happens asynchronously, so we need to wait
        // for the data to become readable
        setImmediate( () => {
          let msg = parser.read();

          assert.isNull( msg, 'stream buffer was not cleared' );
          done();
        });
      });

      encoder.write( text );
    });

    it( 'should emit `end` when `null` is pushed', done => {
      const Parser  = rewire( parserPath );
      const Encoder = rewire( encoderPath );
      const parser  = new Parser();
      const encoder = new Encoder();
      const text    = 'hello';

      // bind a message to make sure we trigger the null check
      parser.on( 'message', () => {} );

      encoder.on( 'data', chunk => {
        parser.on( 'end', () => {
          assert.ok( true );
          done();
        });

        parser.write( chunk );
        parser.push( null );
      });

      encoder.write( text );
    });

    it( 'should read extra bytes when length modifier is set', done => {
      const Parser  = rewire( parserPath );
      const parser  = new Parser({ lengthModifier: 2 });

      // create a buffer with an insufficient length integer
      const buf = Buffer.alloc( 14 );
      let offset = buf.write('FRINGE');
      offset = buf.writeUInt32BE( 2, offset );
      offset = buf.write( 'hihi', offset );

      parser.on( 'message', msg => {
        assert.equal( msg.toString(), 'hihi' );
        done();
      });

      parser.write( buf );
    });

    it( 'should not read extra bytes when length modifier is 0', done => {
      const Parser  = rewire( parserPath );
      const parser  = new Parser();

      // create a buffer with an insufficient length integer
      const buf = Buffer.alloc( 14 );
      let offset = buf.write('FRINGE');
      offset = buf.writeUInt32BE( 2, offset );
      offset = buf.write( 'hihi', offset );

      parser.on( 'message', msg => {
        assert.equal( msg.toString(), 'hi' );
        done();
      });

      parser.write( buf );
    });

  });

});
