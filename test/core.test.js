import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encode, decode, encodeInt, decodeInt } from '../src/index.js';

function bytes(...arr) {
  return new Uint8Array(arr);
}

// --- integer round trip ---

test('encodeInt: zero', () => {
  assert.equal(encodeInt(0), '0');
});

test('decodeInt: zero', () => {
  assert.equal(decodeInt('0'), 0);
});

test('encodeInt/decodeInt: round trip over a range', () => {
  const samples = [0, 1, 31, 32, 33, 1023, 1024, 65535, 65536, 0x7fffffff];
  for (const n of samples) {
    assert.equal(decodeInt(encodeInt(n)), n, `round trip failed for ${n}`);
  }
});

test('decodeInt: case-insensitive', () => {
  // 'F' -> 15, 'f' -> 15 by our alphabet normalization
  assert.equal(decodeInt('F'), 15);
  assert.equal(decodeInt('f'), 15);
});

test('decodeInt: Crockford confusable normalization', () => {
  // 'O' should be treated as '0', 'I'/'L' as '1'
  assert.equal(decodeInt('O'), 0);
  assert.equal(decodeInt('I'), 1);
  assert.equal(decodeInt('L'), 1);
});

test('encodeInt: rejects non-integer or negative', () => {
  assert.throws(() => encodeInt(1.5), TypeError);
  assert.throws(() => encodeInt(-1), TypeError);
});

test('decodeInt: rejects invalid characters', () => {
  assert.throws(() => decodeInt('!'), TypeError);
});

// --- byte round trip ---

test('encode/decode: empty input', () => {
  assert.equal(encode(bytes()), '');
  assert.deepEqual(decode(''), bytes());
});

test('encode/decode: one byte', () => {
  // 8 bits -> 2 symbols (10 bits, 2 padding)
  assert.equal(encode(bytes(0xff)), 'ZW');
  assert.deepEqual(decode('ZW'), bytes(0xff));
});

test('encode/decode: two bytes', () => {
  // 16 bits -> 4 symbols (20 bits, 4 padding)
  assert.equal(encode(bytes(0xff, 0xff)), 'ZZZG');
  assert.deepEqual(decode('ZZZG'), bytes(0xff, 0xff));
});

test('encode/decode: three bytes (no padding needed)', () => {
  // 24 bits -> 5 symbols exactly (25 bits with 1 trailing pad, but floor(5*5/8)=3)
  assert.equal(encode(bytes(0xff, 0xff, 0xff)), 'ZZZZY');
  assert.deepEqual(decode('ZZZZY'), bytes(0xff, 0xff, 0xff));
});

test('encode/decode: five bytes (40 bits -> 8 symbols)', () => {
  assert.equal(encode(bytes(0xff, 0xff, 0xff, 0xff, 0xff)), 'ZZZZZZZZ');
  assert.deepEqual(decode('ZZZZZZZZ'), bytes(0xff, 0xff, 0xff, 0xff, 0xff));
});

test('decode: case-insensitive', () => {
  const out = decode('zzzz');
  assert.deepEqual(out, bytes(0xff, 0xff));
});

test('decode: rejects invalid characters', () => {
  assert.throws(() => decode('ZZ!Z'), TypeError);
});

test('encode: rejects non-Uint8Array', () => {
  assert.throws(() => encode([]), TypeError);
  assert.throws(() => encode('abc'), TypeError);
});

test('encode/decode: arbitrary data round trip', () => {
  const data = bytes(0x00, 0x5e, 0xa3, 0x7f, 0x80, 0xff, 0x01, 0x02, 0x03);
  const encoded = encode(data);
  const decoded = decode(encoded);
  assert.deepEqual(decoded, data);
});
