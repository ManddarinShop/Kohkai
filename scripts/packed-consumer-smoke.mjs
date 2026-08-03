#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";

const repository = process.cwd();
const temporaryDirectory = mkdtempSync(join(tmpdir(), "kohkai-packed-consumer-"));
try {
  const packageDirectory = join(temporaryDirectory, "package");
  mkdirSync(packageDirectory);
  const packageFile = execFileSync(
    "npm",
    ["pack", "--silent", "--pack-destination", packageDirectory],
    { cwd: repository, encoding: "utf8" },
  ).trim();
  const packagePath = join(packageDirectory, packageFile);
  const consumerDirectory = join(temporaryDirectory, "consumer");
  mkdirSync(consumerDirectory);
  execFileSync("npm", ["init", "-y"], { cwd: consumerDirectory, stdio: "ignore" });
  execFileSync("npm", ["install", "--no-audit", "--no-fund", "--ignore-scripts", packagePath], {
    cwd: consumerDirectory,
    stdio: "inherit",
  });

  const smokeScript = join(consumerDirectory, "smoke.mjs");
  writeFileSync(smokeScript, `
    import assert from "node:assert/strict";
    import { canonicalJson, stableEncode } from "@hikoutei/kohkai";
    assert.equal(canonicalJson({ z: 1, a: true }), '{"a":true,"z":1}');
    assert.ok(stableEncode("kohkai") instanceof Uint8Array);
    console.log("Kohkai packed consumer: PASS");
  `);
  execFileSync("node", [smokeScript], { cwd: consumerDirectory, stdio: "inherit" });
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
