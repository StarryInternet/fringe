const assert = require('chai').assert;
const rewire = require('rewire');
const path   = '../../lib/encoder';

describe( 'Encoder', () => {

  describe( '#constructor', () => {

    it( 'should be a function', () => {
      const Encoder = rewire( path );

      assert.isFunction( Encoder );
    });

    it( 'should inherit from stream.Transform', () => {
      const Encoder   = rewire( path );
      const Transform = require('stream').Transform;
      const encoder   = new Encoder();

      assert.instanceOf( encoder, Transform );
    });

  });

  describe( '#_transform', () => {

    it( 'accept a string and return a buffer with prefix and length', done => {
      const Encoder = rewire( path );
      // `objectMode: true` prevents the stream from converting our string to
      // buffer so that we can get coverage on passing strings to `_transform`
      const encoder = new Encoder( {}, { objectMode: true } );
      const text   = 'hello';

      encoder.on( 'data', chunk => {
        const header = chunk.slice( 0, 6 ).toString('utf8');
        const len    = chunk.readUInt32BE( 6 );

        assert.equal( header, 'FRINGE' );
        assert.equal( len, 5 );

        done();
      });

      encoder.write( text );
    });

    it( 'should modify the length if length modifier has been set', done => {
      const Encoder = rewire( path );
      const opts    = [ { lengthModifier: 2 }, { objectMode: true } ];
      const encoder = new Encoder( ...opts );
      const text   = 'hello';

      encoder.on( 'data', chunk => {
        assert.equal( chunk.readUInt32BE( 6 ), 3 );
        done();
      });

      encoder.write( text );
    });

    it( 'should not modify length if length modifier hasnt been set', done => {
      const Encoder = rewire( path );
      const encoder = new Encoder( {}, { objectMode: true } );
      const text   = 'hello';

      encoder.on( 'data', chunk => {
        assert.equal( chunk.readUInt32BE( 6 ), 5 );
        done();
      });

      encoder.write( text );
    });

    it( 'should emit `error` on transform exception w/ objectMode', done => {
      const Encoder = rewire( path );
      const myError = new Error('myerror');

      class MessageEncoder extends Encoder {

        constructor() {
          super( {}, { objectMode: true } );
        }

        translate() {
          throw myError;
        }

      }

      const encoder  = new MessageEncoder();

      encoder.on( 'error', err => {
        assert.equal( err, myError );
        done();
      });

      encoder.write({ myString: 'hello world' });
    });

    it( 'should emit `error` on transform exception w/o objectMode', done => {
      const Encoder = rewire( path );
      const myError = new Error('myerror');

      class MessageEncoder extends Encoder {

        constructor() {
          super();
        }

        translate() {
          throw myError;
        }

      }

      const encoder  = new MessageEncoder();

      encoder.on( 'error', err => {
        assert.equal( err, myError );
        done();
      });

      encoder.write('hello word');
    });

  });

});
