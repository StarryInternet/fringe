Fringe
===

Fast, lightweight, and extensible message framing over streams.

### Installing

```
npm install --save fringe
```

### Usage

By default, `fringe` encodes your input buffer with the string `FRINGE`
plus the byte length of the input buffer encoded as `UInt32BE`.

#### Hello world:

```js
const { Encoder, Parser } = require('fringe');

const encoder = new Encoder();
const parser  = new Parser();

encoder.pipe( parser );

parser.on( 'message', buffer => console.log( buffer.toString('utf8') ) );

encoder.write('hello');
encoder.write('world');
```

### Events

When a complete message is received, `Parser` will emit two events:

#### data

The standard Node.js `data` events for streams. The argument passed to your
callback will be a Buffer of the original message payload.

#### message

The argument passed to the `message` event will be the return value of the
`Parser` instance's `translate` method (see below).

By default, this value will be identical to the Buffer passed to the `data`
callback – but is useful for situations where `translate` may return a parsed
object.

### Configuration

`Encoder` and `Parser` each accept two arguments:

#### format

An object containing formatting options for the message

###### prefix

A string that will be prepended to each message (may be an empty string).
Defaults to `FRINGE`.

###### lengthFormat

The binary format that the payload length will be stored as. Options are
`UInt8`, `UInt16BE`, `UInt16LE`, `UInt32BE`, and `UInt32LE`. Defaults to
`UInt32BE`.

###### maxSize

The maximum acceptable payload length in bytes. Defaults to 100 MB
(1024 * 1024 * 100).

#### options

Options to be passed directly to the underlying `Transform` stream.

### Extending

`Encoder` and `Parser` may each be sub-classes with custom `translate` methods.

#### Encoder translate

Accepts any value and must return a string or Buffer.

An example `translate` function to accept an object and output a JSON string:

```js
translate( obj ) {
  return JSON.stringify( obj );
}
```

#### Parser translate

Accepts a string or Buffer and may return any value.

An example `translate` function to accept a Buffer and output an object:

```js
translate( buffer ) {
  return JSON.parse( buffer.toString('utf8') );
}
```
