# @hikoutei/kohkai

Runtime-neutral **Kohkai** primitives for byte-stable serialization and
canonical JSON text across Node.js, Apps Script, and other standard runtimes.
The package owns the `stable_encode_v1` byte grammar and the canonical-JSON
text grammar used by signed payloads. It has no runtime dependencies and no
Hikoutei domain, ORM, Google SDK, or Node-specific crypto types in its public
surface.

The package is ESM-only and uses standard runtime facilities such as
`Uint8Array`, `TextEncoder`, and `String.prototype.normalize`. Apps Script
cannot import an npm package at runtime, so this repository also owns a
self-contained source mirror under `apps-script/`; its output is checked
against the package implementation and golden vectors.

## Installation

```sh
npm install @hikoutei/kohkai
```

```ts
import {
  stableEncode,
  canonicalJson,
  isCanonicalJsonValue,
  CanonicalCodecError,
  StableCodecError,
} from "@hikoutei/kohkai";
```

## API

- `stableEncode(value)` returns the versioned `stable_encode_v1` bytes used for
  deterministic identity and fingerprint inputs.
- `canonicalJson(value)` returns sorted-key, finite-number, dense-array JSON
  text suitable for signed payloads.
- `isCanonicalJsonValue(value)` validates the canonical JSON input grammar.
- `StableCodecError` and `CanonicalCodecError` expose machine-readable error
  codes for invalid or ambiguous values.

`stableEncode` rejects non-finite numbers, unsupported types, cyclic values,
duplicate object keys after NFC normalization, invalid tagged dates, and
unpaired UTF-16 surrogates. `canonicalJson` separately rejects non-finite
numbers, unsupported values, sparse arrays, cycles, and non-plain objects.

The package intentionally does not provide a SHA-256 helper. Applications keep
hashing and application-specific error/protocol mappings at their own boundary.

## Compatibility contract

The `stable_encode_v1` bytes and hashes, and the canonical JSON text grammar,
are compatibility contracts. Existing vectors must not change silently. A
future incompatible encoding requires a new explicit version.

The Apps Script mirror is self-contained and does not import this npm package.
Use the repository's parity tests when changing either implementation.

## Development

```sh
npm ci
npm test
npm run typecheck
npm run typecheck:test
npm run build
npm pack --dry-run
```

## License

MIT © ManddarinShop
