// What this config promises, asserted against the config itself.
//
// The package defines what a conforming commit is for every repository that
// consumes it, so the thing worth testing is not that it loads — it is that each
// clause of the contract in index.mjs still holds. A rule can be rewritten and
// still parse.
//
// Driven through the CLI rather than the programmatic API on purpose: a consumer
// runs `commitlint`, and the CLI is what resolves `extends`, loads the parser
// preset and registers the plugin. Testing the exported object directly would skip
// every one of those and pass while a consumer failed.
//
// The generated configs use an ABSOLUTE path in `extends`. commitlint resolves a
// relative `extends` from the config FILE's directory, so `./index.mjs` written
// into a temp directory silently resolves to nothing — measured, since it is the
// same trap the repository's own .commitlintrc.mjs comment describes.

import { execFile } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, describe, it } from "node:test";
import assert from "node:assert/strict";

const INDEX = resolve(import.meta.dirname, "..", "index.mjs");
const CLI = resolve(import.meta.dirname, "..", "node_modules", ".bin", "commitlint");
const work = mkdtempSync(join(tmpdir(), "clc-behaves-"));
after(() => rmSync(work, { recursive: true, force: true }));

let n = 0;

/** Run commitlint over `message` with `rules` layered on top of this package. */
function lint(message, rules = {}) {
  const cfg = join(work, `c${n++}.json`);
  writeFileSync(cfg, JSON.stringify({ extends: [INDEX], rules }));
  return new Promise((done) => {
    const p = execFile(CLI, ["--config", cfg], (err) => done(err ? err.code ?? 1 : 0));
    p.stdin.end(message);
  });
}

const accepts = async (m, rules) =>
  assert.equal(await lint(m, rules), 0, `should have been accepted: ${JSON.stringify(m)}`);
const rejects = async (m, rules) =>
  assert.notEqual(await lint(m, rules), 0, `should have been rejected: ${JSON.stringify(m)}`);

describe("the floor", () => {
  // REQUIRED in index.mjs. These two are the only types the specification gives
  // behaviour to, so they are the only strings anything downstream reads.
  it("accepts feat and fix", async () => {
    await accepts("feat: a feature");
    await accepts("fix: a bug fix");
  });

  // The floor is enforced inside the rule rather than by convention, which is the
  // whole reason type-enum-any-case exists instead of a plain enum. A consumer
  // handing it an empty list is asking for "the floor and nothing else", not for
  // a config that rejects everything.
  it("survives a consumer replacing the entire starter set", async () => {
    const only = { "type-enum-any-case": [2, "always", []] };
    await accepts("feat: still here", only);
    await accepts("fix: still here", only);
    await rejects("docs: gone with the starter", only);
  });

  // `when: "never"` inverts the assertion for the listed types, as it does for the
  // built-in type-enum. Forbidding feat is not on offer.
  it("survives a consumer trying to forbid it", async () => {
    const never = { "type-enum-any-case": [2, "never", ["feat", "fix", "docs"]] };
    await accepts("feat: not forbiddable", never);
    await accepts("fix: not forbiddable", never);
    await rejects("docs: genuinely forbidden", never);
  });
});

describe("the starter", () => {
  // The reference implementation's remaining nine, offered as a default.
  it("accepts the nine by default", async () => {
    for (const t of ["build", "chore", "ci", "docs", "style", "refactor", "perf", "test", "revert"]) {
      await accepts(`${t}: a change`);
    }
  });

  it("rejects a type nobody listed", async () => {
    await rejects("wibble: invented");
  });

  // `value` is the consumer's list. An earlier version held it in a module
  // constant, so a consumer could not add a type its domain needed.
  it("lets a consumer add a type without losing the floor", async () => {
    const extra = { "type-enum-any-case": [2, "always", ["deploy", "migrate"]] };
    await accepts("deploy: to production", extra);
    await accepts("feat: floor intact", extra);
    await rejects("docs: replaced, not extended", extra);
  });
});

describe("specification item 15 — the type is not case-sensitive", () => {
  // "The units of information that make up Conventional Commits MUST NOT be
  // treated as case-sensitive by implementors, with the exception of BREAKING
  // CHANGE which MUST be uppercase."
  //
  // This is the clause commitlint's built-in type-enum violates — an exact match
  // against a lowercase array with no case option — and the entire reason this
  // package replaces the rule rather than configuring it.
  it("accepts a type in any case", async () => {
    await accepts("Feat: capitalised");
    await accepts("FIX: shouted");
    await accepts("DoCs: alternating");
  });

  it("still rejects an unknown type in any case", async () => {
    await rejects("WIBBLE: shouted and unknown");
  });
});

describe("the parser preset", () => {
  // Without conventional-changelog-conventionalcommits, `!` is not parsed and a
  // breaking `fix!:` arrives at the rules with type "fix!" — rejected as unknown.
  // These cases fail loudly if the preset is ever dropped from index.mjs.
  it("parses the breaking-change marker", async () => {
    await accepts("feat!: a breaking feature");
    await accepts("fix!: a breaking fix");
  });

  it("parses a scope alongside the marker", async () => {
    await accepts("feat(parser): scoped");
    await accepts("feat(parser)!: scoped and breaking");
  });
});

describe("what decides whether a message parses at all", () => {
  it("requires a type", async () => {
    await rejects("no type at all");
  });

  it("requires a subject", async () => {
    await rejects("feat:");
    await rejects("feat: ");
  });

  // header-trim is about whitespace at the ENDS of the header, not spacing inside
  // it. Measured, after this test was first written asserting the wrong thing:
  //
  //   " feat: x"    rejected  [type-empty] [subject-empty] [header-trim]
  //   "feat: x "    rejected  [header-trim]
  //   "feat:  x"    ACCEPTED  — internal spacing is not its business
  //
  // The leading-space case trips three rules at once because a leading space stops
  // the header parsing as a conventional commit at all, so type and subject come
  // back empty too. Both ends are asserted because only the trailing one isolates
  // header-trim.
  it("rejects whitespace at either end of the header", async () => {
    await rejects(" feat: leading space");
    await rejects("feat: trailing space ");
  });

  it("does not police spacing inside the header", async () => {
    await accepts("feat:  two spaces after the colon");
  });
});

describe("what this config deliberately does NOT enforce", () => {
  // Style, by the argument in index.mjs: the specification says nothing about any
  // of it, and cocogitto — the other linter in the estate — has no equivalent, so
  // enforcing it here would mean the same commit passing in one repository and
  // failing in another. These assertions exist so that re-adding config-conventional
  // fails a test rather than silently tightening every consumer.
  it("does not impose a case on the subject", async () => {
    await accepts("feat: Capitalised subject");
    await accepts("feat: UPPER CASE SUBJECT");
  });

  it("does not impose a length limit", async () => {
    await accepts(`feat: ${"a".repeat(200)}`);
  });

  it("does not forbid a trailing full stop", async () => {
    await accepts("feat: ends with a full stop.");
  });
});
