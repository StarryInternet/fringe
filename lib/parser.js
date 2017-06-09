const { Transform } = require('stream');
const Message       = require('./message');

class Parser extends Transform {

  /**
   * Parser constructor
   *
   * @method constructor
   * @param  {Object} format  – formatting options
   * @param  {Object} options – stream options
   * @return {Parser}
   */

  constructor( format = {}, options = {} ) {
    super( options );

    Object.assign( this, { format } );

    this.message = new Message( this.format );
  }

  /**
   * Override default `on` so that the stream drains properly without a
   * `data` handler bound
   *
   * @method on
   * @param  {String}   ev – event name
   * @param  {Function} fn – event handler
   * @return {Parser}
   */

  on( ev, fn ) {
    const res = super.on( ev, fn );

    if ( ev === 'message' && !this.isPaused() ) {
      this.resume();
    }

    return res;
  }

  /**
   * Accept a chunk
   *
   * @method _transform
   * @param  {Buffer}   chunk    – input buffer
   * @param  {String}   encoding – encoding
   * @param  {Function} done     – callback
   * @return {Undefined}
   */

  _transform( chunk, encoding, done ) {
    const message = this.message;
    const length  = chunk.length;

    let offset = 0;

    if ( typeof chunk === 'string' ) {
      chunk = Buffer.from( chunk, encoding || 'utf8' );
    }

    while ( true ) {
      const result = message.consume( chunk, offset );

      if ( typeof result !== 'number' ) {
        return done( result );
      }

      offset = offset + result;

      if ( message.valid ) {
        this.finish();
      }

      if ( offset >= length ) {
        return done();
      }
    }
  }

  /**
   * Translate a message (e.g. JSON.parse)
   *
   * Intended to be overridden by encoder subclasses, must return a
   * String or Buffer.
   *
   * @method translate
   * @param  {Buffer} message – raw binary data
   * @return {Any}            – translated message
   */

  translate( message ) {
    return message;
  }

  /**
   * Push a full message and reset internal state
   *
   * @method finish
   * @return {Undefined}
   */

  finish() {
    const buffer     = this.message.toBuffer();
    const translated = this.translate( buffer );

    this.message.reset();

    super.push( buffer );

    this.emit( 'message', translated );
  }

}

module.exports = Parser;
