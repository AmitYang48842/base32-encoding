# Base32

Encodes and decodes binary data to and from a case-insensitive alphanumeric text format using Crockford's Base32 alphabet (`0123456789ABCDEFGHJKMNPQRSTVWXYZ`).

```js
import { encode, decode, encodeInt, decodeInt } from './src/index.js';

const bytes = new Uint8Array([0xff, 0xff, 0xff]);
const text = encode(bytes);      // 'ZZZZY'
const back = decode(text);       // Uint8Array [255, 255, 255]

const id = encodeInt(123456);     // '1AZR'
const n = decodeInt('1azr');     // 123456 — lowercase accepted
```

## Why

Short identifiers passed between systems (URLs, printed codes, verbal handoff) break when characters are ambiguous. Crockford's alphabet drops `I`, `L`, `O`, and `U`, so the remaining symbols are visually distinct. The decoder also maps the common confusables (`O`→`0`, `I`/`L`→`1`) so that a human-typed code still resolves.

The trade-off: this is not RFC 4648 base32. If you need interoperability with systems that expect the RFC alphabet or `=` padding, this is not that library.

## Edge cases

- The byte encoder emits no `=` padding. Byte length is recovered from the symbol count, so padding is redundant and a source of transcription noise.
- The integer encoder produces no fixed width; `encodeInt(0)` is `"0"`, not a zero-padded block.
- The decoder accepts any case. The encoder emits uppercase only, so there is one canonical form on output.
