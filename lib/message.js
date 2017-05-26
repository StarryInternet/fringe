// suported length formats
const formats = {
  UInt8:    1,
  UInt16BE: 2,
  UInt16LE: 2,
  UInt32BE: 4,
  UInt32LE: 4
};

// default settings
const defaults = {
  prefix:       'FRINGE',
  lengthFormat: 'UInt32BE',
  maxSize:      1024 * 1024 * 100
};

class Message {

  /**
   * Message constructor
   *
   * @method constructor
   * @param  {Object}  options – formatting options
   * @return {Message}
   */

  constructor( options ) {
    Object.assign( this, defaults, options );

    // size of the message prefix
    this.prefixLength = Buffer.byteLength( this.prefix );
    // size of prefix + length
    this.headerLength = this.prefixLength + formats[ this.lengthFormat ];
    // header buffer
    this.header = Buffer.alloc( this.headerLength );
    // message buffer (once full header is received)
    this.message = null;
    // current write offset within this.message
    this.messageOffset = 0;
    // current write offset within this.header
    this.headerOffset = 0;
    // expected length (once header is received)
    this.length = 0;
  }

  /**
   * Is this message valid and complete?
   *
   * @method valid
   * @return {Boolean} – true if the message is complete
   */

  get valid() {
    return this.message && this.messageOffset === this.length;
  }

  /**
   * Convert the message to a buffer
   *
   * @method toBuffer
   * @return {Buffer} – the full message (minus prefix and length) as Buffer
   */

  toBuffer() {
    return this.message.slice();
  }

  /**
   * Consume a chunk into the internal buffer and return the number of
   * bytes you grabbed
   *
   * @method consume
   * @param  {Buffer} chunk  – input buffer
   * @param  {Number} offset – read offset within the chunk
   * @return {Number}        – number of bytes from chunk that you consumed
   */

  consume( chunk, offset ) {
    const length = chunk.length;

    // number of bytes consumed
    let read = 0;

    // read to header
    const headerBytes = this.consumeHeader( chunk, offset, length );

    offset += headerBytes;
    read   += headerBytes;

    // try to initialize the internal buffer if we have a full header
    this.startMessage();

    // read to message and return total bytes consumed
    return read + this.consumeMessage( chunk, offset, length );
  }

  /**
   * Attempt to consume a chunk portion to fill the header buffer,
   * and return the number of bytes consumed
   *
   * @method consumeHeader
   * @param  {Buffer}      chunk  – input chunk
   * @param  {Nunber}      offset – input chunk read offset
   * @param  {Nunber}      length – input chunk byte length
   * @return {number}             – bytes consumed
   */

  consumeHeader( chunk, offset, length ) {
    if ( this.headerOffset < this.headerLength ) {
      const remaining = this.headerLength - this.headerOffset;
      const bytes     = Math.min( remaining, length - offset );

      chunk.copy( this.header, this.headerOffset, offset, offset + bytes );

      this.headerOffset += bytes;

      return bytes;
    }

    return 0;
  }

  /**
   * Initialize internal buffer if a full header has been read
   *
   * @method startMessage
   * @return {Undefined}
   */

  startMessage() {
    if ( this.headerOffset === this.headerLength && !this.message ) {
      // the sent prefix
      const prefix = this.header.toString( 'utf8', 0, this.prefixLength );

      if ( prefix !== this.prefix ) {
        throw new Error( `Invalid message prefix: ${ prefix }` );
      }

      const method = `read${ this.lengthFormat }`;

      this.length = this.header[ method ]( this.prefixLength );

      if ( this.length === 0 ) {
        throw new Error('0-length message received');
      }

      if ( this.length > this.maxSize ) {
        throw new Error( `Message length exceeds max of ${ this.maxSize }` );
      }

      this.message = Buffer.alloc( this.length );
    }
  }

  /**
   * Attempt to consume a chunk portion to fill the message buffer,
   * and return the number of bytes consumed
   *
   * @method consumeHeader
   * @param  {Buffer}      chunk  – input chunk
   * @param  {Nunber}      offset – input chunk read offset
   * @param  {Nunber}      length – input chunk byte length
   * @return {number}             – bytes consumed
   */

  consumeMessage( chunk, offset, length ) {
    if ( this.message && offset < length ) {
      const remaining = this.length - this.messageOffset;
      const bytes     = Math.min( remaining, length - offset );

      chunk.copy( this.message, this.messageOffset, offset, offset + bytes );

      this.messageOffset += bytes;

      return bytes;
    }

    return 0;
  }

  /**
   * Encode a message into a buffer with prefix and length
   *
   * @method encode
   * @param  {Buffer|String} payload – message payload
   * @return {Buffer}                – encoded message
   */

  encode( payload ) {
    if ( typeof payload === 'string' ) {
      payload = Buffer.from( payload, 'utf8' );
    }

    const buffer = Buffer.alloc( this.headerLength + payload.length );
    const method = `write${ this.lengthFormat }`;

    buffer.write( this.prefix );
    buffer[ method ]( payload.length, this.prefixLength );
    payload.copy( buffer, this.headerLength );

    return buffer;
  }

}

module.exports = Message;
