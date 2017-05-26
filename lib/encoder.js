const { Transform } = require('stream');
const Message       = require('./message');

class Encoder extends Transform {

  /**
   * Encoder constructor
   *
   * @method constructor
   * @param  {Object}  format  – formatting options
   * @param  {Object}  options – stream options
   * @return {Encoder}
   */

  constructor( format = {}, options = {} ) {
    super( options );

    Object.assign( this, { format } );
  }

  /**
   * Translate a message (e.g. JSON.stringify or convert to Protobuf)
   *
   * Intended to be overridden by encoder subclasses, must return a
   * String or Buffer.
   *
   * @method translate
   * @param  {Any}           message – raw message
   * @return {String|Buffer}         – encoded message
   */

  translate( message ) {
    return message;
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
    const translated = this.translate( chunk );
    const buffer     = new Message( this.format ).encode( translated );

    this.push( buffer );

    done();
  }

}

module.exports = Encoder;
