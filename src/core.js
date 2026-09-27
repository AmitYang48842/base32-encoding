/**
 * Base32 encoding and decoding for binary data.
 *
 * Uses the case-insensitive Crockford alphabet. The encoder emits uppercase
 * output so that a single canonical form exists on the wire; the decoder
 * accepts any case (typical text input) and normalizes to uppercase before
 * lookup. Lowercase input decodes correctly because case is folded first.
 */

// Crockford's alphabet: digits first, then A-V. No ambiguous letters
// (I, L, O, U) are used, which keeps human transcription reliable.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const DECODE_MAP = new Map();
for (let i = 0; i < ALPHABET.length; i++) {
  DECODE_MAP.set(ALPHABET[i], i);
  DECODE_MAP.set(ALPHABET[i].toLowerCase(), i);
}

// Crockford maps visually ambiguous characters to canonical values so that
// a typed '1' decodes as if the user had written '1' (which is already in the
// alphabet), and similarly for the letter/number confusables below.
DECODE_MAP.set('O', 0); DECODE_MAP.set('o', 0);
DECODE_MAP.set('I', 1); DECODE_MAP.set('i', 1);
DECODE_MAP.set('L', 1); DECODE_MAP.set('l', 1);

/**
 * Minimum bits needed to represent a value `n` that fits in a JS 32-bit int.
 * Used to size the base-32 output without padding ambiguity.
 */
function bitLength(n) {
  if (n === 0) return 0;
  return 32 - Math.clz32(n);
}

/**
 * Encode a non-negative integer into a Base32 (Crockford) string with no
 * padding. Zero encodes as the single character '0'.
 */
export function encodeInt(n) {
  if (!Number.isInteger(n) || n < 0) {
    throw new TypeError('encodeInt: expected a non-negative integer');
  }
  if (n === 0) return '0';
  let out = '';
  let v = n;
  while (v > 0) {
    out = ALPHABET[v & 31] + out;
    v = Math.floor(v / 32);
  }
  return out;
}

/**
 * Decode a Base32 (Crockford) string to a non-negative integer. Accepts any
 * case. Throws TypeError if any character is not a valid symbol.
 */
export function decodeInt(s) {
  if (typeof s !== 'string') {
    throw new TypeError('decodeInt: expected a string');
  }
  let result = 0;
  for (const ch of s) {
    const v = DECODE_MAP.get(ch);
    if (v === undefined) {
      throw new TypeError(`decodeInt: invalid character '${ch}'`);
    }
    result = result * 32 + v;
  }
  return result;
}

/**
 * Encode an arbitrary byte sequence into Base32. Uses left-to-right bit
 * packing: groups of 5 bits, zero-padded on the right as needed. This is
 * the common RFC-4648-style arrangement but with Crockford's alphabet so the
 * output is case-insensitive and human-friendly.
 *
 * The padding decision: we do NOT append '=' padding characters. The byte
 * length can be recovered unambiguously from the symbol count (see decode
 * below), so padding would only add noise for human readers.
 */
export function encode(data) {
  if (!(data instanceof Uint8Array)) {
    throw new TypeError('encode: expected Uint8Array');
  }
  if (data.length === 0) return '';

  let bits = 0;
  let value = 0;
  let out = '';

  for (let i = 0; i < data.length; i++) {
    value = (value << 8) | data[i];
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    out += ALPHABET[(value << (5 - bits)) & 31];
  }

  return out;
}

/**
 * Decode a Base32 string into bytes. Accepts any case. Each symbol must be a
 * valid Crockford symbol. The original byte length is derived from the symbol
 * count: 1 symbol -> 0 bytes is impossible (encoder never emits trailing
 * fewer-than-5-bit groups without data), so symbol count maps to byte count as
 * floor(n*5/8). This inverts `encode` exactly.
 */
export function decode(s) {
  if (typeof s !== 'string') {
    throw new TypeError('decode: expected a string');
  }
  if (s.length === 0) return new Uint8Array(0);

  let bits = 0;
  let value = 0;
  const bytes = [];

  for (const ch of s) {
    const v = DECODE_MAP.get(ch);
    if (v === undefined) {
      throw new TypeError(`decode: invalid character '${ch}'`);
    }
    value = (value << 5) | v;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  // The encoder never emits a final symbol whose low bits are all padding
  // unless those bits carry data, so `bits` here is in [0,4] and the remaining
  // bits are guaranteed to be zero padding. We drop them.
  return new Uint8Array(bytes);
}
