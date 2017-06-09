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
   * Reset the internal state to we can start consuming a new message
   * @method reset
   * @return {Undefined}
   */

  reset() {
    this.message = null;
    this.messageOffset = 0;
    this.headerOffset = 0;
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
      maxSize
    } = this;

    // total number of bytes consumed
    let read = 0;

    // consume header bytes
    if ( headerOffset < headerLength ) {
      const remaining = headerLength - headerOffset;

      read = Math.min( remaining, chunkLen - offset );

      chunk.copy( header, headerOffset, offset, offset + read );

      headerOffset = this.headerOffset = headerOffset + read;

      offset = offset + read;
    }

    // initialize a new message buffer
    if ( headerOffset === headerLength && message === null ) {
      // the sent prefix
      const _prefix = header.toString( 'utf8', 0, prefixLength );

      if ( _prefix !== prefix ) {
        return new Error( `Invalid message prefix: ${ prefix }` );
      }

      switch ( lengthFormat ) {
        case 'UInt8':
          length = this.length = header.readUInt8( prefixLength );
          break;
        case 'UInt16LE':
          length = this.length = header.readUInt16LE( prefixLength );
          break;
        case 'UInt16BE':
          length = this.length = header.readUInt16BE( prefixLength );
          break;
        case 'UInt32LE':
          length = this.length = header.readUInt32LE( prefixLength );
          break;
        case 'UInt32BE':
          length = this.length = header.readUInt32BE( prefixLength );
          break;
      }

      if ( length === 0 ) {
        return new Error('0-length message received');
      }

      if ( length > maxSize ) {
        return new Error( `Message length exceeds max of ${ this.maxSize }` );
      }

      message = this.message = Buffer.allocUnsafe( length ).fill( 0 );
    }

    // consume message bytes
    if ( message !== null && offset < chunkLen ) {
      const remaining = length - messageOffset;
      const bytes     = Math.min( remaining, chunkLen - offset );

      chunk.copy( message, messageOffset, offset, offset + bytes );

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

    const { lengthFormat, headerLength, prefixLength, prefix } = this;

    const length = payload.length;
    const buffer = Buffer.allocUnsafe( headerLength + length ).fill( 0 );

    buffer.write( prefix );

    switch ( lengthFormat ) {
      case 'UInt8':
        buffer.writeUInt8( length, prefixLength );
        break;
      case 'UInt16LE':
        buffer.writeUInt16LE( length, prefixLength );
        break;
      case 'UInt16BE':
        buffer.writeUInt16BE( length, prefixLength );
        break;
      case 'UInt32LE':
        buffer.writeUInt32LE( length, prefixLength );
        break;
      case 'UInt32BE':
        buffer.writeUInt32BE( length, prefixLength );
        break;
    }

    payload.copy( buffer, headerLength );

    return buffer;
  }

}

module.exports = Message;
