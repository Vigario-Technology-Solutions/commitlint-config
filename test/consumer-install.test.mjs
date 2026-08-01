// The package, installed the way a consumer installs it.
//
// Everything the other suite asserts is reached through a path on disk. That skips
// the packaging surface — `exports`, `main`, the peer dependency, and how commitlint
// resolves a scoped name. Those cannot fail against a path and cannot be caught by
// reading; they appear only through a real install, and they break every consumer at
// once when they do.
//
// What it does NOT cover is recorded at the pack step below, rather than left to be
// assumed from the file's title.
//
// So: `npm pack` this repository, install the tarball into a scratch project
// exactly as the README instructs, and lint through it.
//
// Both `extends` forms are asserted. The shorthand is the one a consumer is more
// likely to reach for AND the one whose failure mode reads wrong — a missing
// package reports `@vts/conventional-changelog-lint-config`, the last candidate
// commitlint tries, which names something that has never existed. The README
// documents that; this is what keeps the documentation true.
//
// Each case lints a conforming AND a non-conforming message. Accepting `feat:` on
// its own proves nothing: commitlint accepts it with no config loaded at all, so a
// silently-unresolved extends would pass. `WIBBLE:` is the discriminator — it can
// only be rejected by `type-enum-any-case`, which exists nowhere else.

import { execFileSync, execFile } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";

const REPO = resolve(import.meta.dirname, "..");
const work = mkdtempSync(join(tmpdir(), "clc-consumer-"));
after(() => rmSync(work, { recursive: true, force: true }));

const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, stdio: "pipe", encoding: "utf8" });

before(() => {
  // Pack the repository as published.
  //
  // Note for anyone tightening this later: `files` is NOT what keeps index.mjs in
  // the tarball. npm always includes the target of `main`/`exports`, plus
  // package.json, README and LICENSE, whatever `files` says — verified by packing
  // with `files: ["README.md"]` and finding index.mjs in the archive regardless.
  // So this suite does not detect a wrong `files` list, and saying otherwise would
  // be a claim nothing here checks.
  run("npm", ["pack", "--pack-destination", work], REPO);
  const tarball = readdirSync(work).find((f) => f.endsWith(".tgz"));
  assert.ok(tarball, "npm pack produced no tarball");

  writeFileSync(
    join(work, "package.json"),
    JSON.stringify({ name: "scratch-consumer", private: true, type: "module" }),
  );
  // The parser preset is deliberately NOT named here. npm installs peerDependencies
  // automatically, so leaving it out makes package.json's peer declaration
  // load-bearing: drop it and the preset never arrives, `!` stops parsing, and the
  // cases below fail.
  //
  // Naming it explicitly — the obvious way to write this — made the suite pass with
  // peerDependencies deleted entirely. Measured, and the reason it is written this
  // way round.
  run("npm", ["install", "--no-audit", "--no-fund", `./${tarball}`, "@commitlint/cli@^20"], work);
}, { timeout: 180_000 });

function lint(message, extendsName) {
  writeFileSync(join(work, ".commitlintrc.json"), JSON.stringify({ extends: [extendsName] }));
  const cli = join(work, "node_modules", ".bin", "commitlint");
  return new Promise((done) => {
    const p = execFile(cli, [], { cwd: work }, (err) => done(err ? err.code ?? 1 : 0));
    p.stdin.end(message);
  });
}

for (const name of ["@vts/commitlint-config", "@vts"]) {
  describe(`extends: ["${name}"]`, () => {
    it("resolves and accepts a conforming subject", async () => {
      assert.equal(await lint("feat: a conforming subject", name), 0);
    });

    // The discriminator. Rejecting this can only come from this package's rule, so
    // it proves the config was actually loaded rather than silently skipped.
    it("rejects an unknown type, which proves the config loaded", async () => {
      assert.notEqual(await lint("WIBBLE: unknown, and uppercase", name), 0);
    });

    // Item 15 through a real install: an uppercase known type must survive, which
    // the built-in type-enum would reject. Together with the case above this pins
    // both halves — the rule is present, and it is this package's rule.
    it("accepts a known type in any case", async () => {
      assert.equal(await lint("FEAT: shouted but known", name), 0);
    });

    // The parser preset arrives only through package.json's peerDependencies, and
    // without it `feat!:` reaches the rules with type "feat!" and is rejected as
    // unknown. So this is the peer declaration's assertion, not the marker's — the
    // other suite already covers `!` against a config on disk.
    it("parses the breaking marker, which the peer dependency supplies", async () => {
      assert.equal(await lint("feat!: a breaking change", name), 0);
    });
  });
}
