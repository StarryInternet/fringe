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
  prefix:           'FRINGE',
  lengthFormat:     'UInt32BE',
  maxSize:          1024 * 1024 * 100,
  lengthModifier:   0
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
    // do we have a full header?
    this.foundHeader = false;
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
   * Reset the internal state to we can start consuming a new message
   * @method reset
   * @return {Undefined}
   */

  reset() {
    this.message = null;
    this.messageOffset = 0;
    this.headerOffset = 0;
    this.foundHeader = false;
    this.length = 0;
  }

  /**
   * Is this message valid and complete?
   *
   * @method valid
   * @return {Boolean} – true if the message is complete
   */

  get valid() {
    return this.message !== null && this.messageOffset === this.length;
  }

  /**
   * Convert the message to a buffer
   *
   * @method toBuffer
   * @return {Buffer} – the full message (minus prefix and length) as Buffer
   */

  toBuffer() {
    return this.message;
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
    const chunkLen = chunk.length;

    let {
      lengthFormat,
      prefix,
      prefixLength,
      header,
      headerOffset,
      headerLength,
      message,
      messageOffset,
      length,
      maxSize,
      foundHeader,
      lengthModifier
    } = this;

    // total number of bytes consumed
    let read = 0;

    // consume header bytes
    if ( !foundHeader ) {
      const remaining = headerLength - headerOffset;

      read = Math.min( remaining, chunkLen - offset );

      // fats path for complete header
      if ( read === headerLength ) {
        header = chunk.slice( offset, offset + read );
      } else {
        chunk.copy( header, headerOffset, offset, offset + read );
      }

      headerOffset = this.headerOffset = headerOffset + read;

      offset = offset + read;
    }

    // initialize internal stage for a new a new message
    if ( headerOffset === headerLength && !foundHeader ) {
      // the sent prefix
      const _prefix = header.toString( 'utf8', 0, prefixLength );

      if ( _prefix !== prefix ) {
        return new Error( `Invalid message prefix: ${ prefix }` );
      }

      switch ( lengthFormat ) {
        case 'UInt8':
          length = header.readUInt8( prefixLength );
          break;
        case 'UInt16LE':
          length = header.readUInt16LE( prefixLength );
          break;
        case 'UInt16BE':
          length = header.readUInt16BE( prefixLength );
          break;
        case 'UInt32LE':
          length = header.readUInt32LE( prefixLength );
          break;
        case 'UInt32BE':
          length = header.readUInt32BE( prefixLength );
          break;
      }

      if ( length === 0 ) {
        return new Error('0-length message received');
      }

      if ( length > maxSize ) {
        return new Error( `Message length exceeds max of ${ this.maxSize }` );
      }

      foundHeader = this.foundHeader = true;

      // in some versions of V8, using += with a `let` declared variable
      // causes the engine to deopt; so we're writing this the long way
      //
      // https://github.com/vhf/v8-bailout-reasons
      // ( Unsupported let compound assignment )
      this.length = length = length + lengthModifier;
    }

    // consume message bytes
    if ( foundHeader && offset < chunkLen ) {
      const remaining = length - messageOffset;
      const bytes     = Math.min( remaining, chunkLen - offset );

      // fast path for fresh, complete messages
      if ( bytes === length ) {
        this.message = chunk.slice( offset, offset + bytes );
        this.messageOffset = bytes;
        return read + bytes;
      } else {
        if ( message === null ) {
          message = this.message = Buffer.allocUnsafe( length ).fill( 0 );
        }
        chunk.copy( message, messageOffset, offset, offset + bytes );
      }

      this.messageOffset = messageOffset + bytes;

      read = read + bytes;
    }

    return read;
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

    const {
      lengthModifier, lengthFormat, headerLength, prefixLength, prefix
    } = this;

    const length = payload.length;
    const buffer = Buffer.allocUnsafe( headerLength + length ).fill( 0 );
    const lengthBytes = length - lengthModifier;

    buffer.write( prefix );

    switch ( lengthFormat ) {
      case 'UInt8':
        buffer.writeUInt8( lengthBytes, prefixLength );
        break;
      case 'UInt16LE':
        buffer.writeUInt16LE( lengthBytes, prefixLength );
        break;
      case 'UInt16BE':
        buffer.writeUInt16BE( lengthBytes, prefixLength );
        break;
      case 'UInt32LE':
        buffer.writeUInt32LE( lengthBytes, prefixLength );
        break;
      case 'UInt32BE':
        buffer.writeUInt32BE( lengthBytes, prefixLength );
        break;
    }

    payload.copy( buffer, headerLength );

    return buffer;
  }

}

module.exports = Message;
