import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  canonicalJson,
  stableEncode,
} from "../src/index.js";
import type { StableCodecValue } from "../src/types.js";

type CanonicalCodecVector = {
  readonly name: string;
  readonly value: StableCodecValue;
  readonly stableEncodeHex: string;
  readonly stableHash: string;
  readonly canonicalJson: string;
};

const vectors: readonly CanonicalCodecVector[] = JSON.parse(
  readFileSync(new URL("./fixtures/canonical-codec-vectors.json", import.meta.url), "utf8"),
);

type AppsScriptCodecForTest = {
  stableEncode(value: unknown): string;
  stableHash(value: unknown): string;
  canonicalJson(value: unknown): string;
};

describe("Kohkai Apps Script parity mirror", () => {
  it("preserves stable encoding bytes, hashes, and canonical JSON text", () => {
    const codec = createAppsScriptCodecForTest();
    for (const vector of vectors) {
      expect(Buffer.from(codec.stableEncode(vector.value), "utf8").toString("hex"), vector.name)
        .toBe(vector.stableEncodeHex);
      expect(codec.stableHash(vector.value), vector.name).toBe(vector.stableHash);
      expect(codec.canonicalJson(vector.value), vector.name).toBe(vector.canonicalJson);
      expect(Buffer.from(stableEncode(vector.value)).toString("hex"), vector.name)
        .toBe(vector.stableEncodeHex);
      expect(canonicalJson(vector.value), vector.name).toBe(vector.canonicalJson);
    }
  });

  it("rejects the same malformed values as the package", () => {
    const codec = createAppsScriptCodecForTest();

    const sparse: unknown[] = [];
    sparse.length = 1;
    expect(() => codec.stableEncode(sparse)).toThrow(/dense/);
    expect(() => codec.canonicalJson(sparse)).toThrow(/dense/);

    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() => codec.stableEncode(cyclic)).toThrow(/cycles/);
    expect(() => codec.canonicalJson(cyclic)).toThrow(/cycles/);

    expect(() => codec.canonicalJson({ value: undefined })).toThrow(/unsupported/);
    expect(() => codec.canonicalJson(Object.create({ inherited: true }))).toThrow(/unsupported/);
    expect(codec.canonicalJson({ [Symbol.toStringTag]: "tagged" })).toBe("{}");
  });
});

function createAppsScriptCodecForTest(): AppsScriptCodecForTest {
  const utilities = {
    DigestAlgorithm: { SHA_256: "SHA_256" },
    Charset: { UTF_8: "UTF_8" },
    newBlob(value: string) {
      return {
        getBytes: () => Array.from(new TextEncoder().encode(value), (byte) => byte > 127 ? byte - 256 : byte),
      };
    },
    computeDigest(_algorithm: string, value: string, _charset: string) {
      return Array.from(createHash("sha256").update(value, "utf8").digest(), (byte) => byte > 127 ? byte - 256 : byte);
    },
  };
  const factory = new Function(
    "Utilities",
    `${readFileSync(new URL("../apps-script/KohkaiCodec.gs", import.meta.url), "utf8")}
return {
  stableEncode: kohkaiStableEncode_,
  stableHash: kohkaiStableHash_,
  canonicalJson: kohkaiCanonicalJson_,
};`,
  ) as (runtimeUtilities: typeof utilities) => AppsScriptCodecForTest;
  return factory(utilities);
}
