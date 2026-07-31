# @vts/commitlint-config

Conventional Commits, without `@commitlint/config-conventional`'s house style — and
with a type enum that obeys the specification.

```json
{
  "extends": ["@vts"]
}
```

`@vts` resolves to `@vts/commitlint-config`; commitlint appends `commitlint-config` to a
bare scope, the same way eslint does. Three lines of JSON is the whole consumer config —
the rules and the plugin live here.

## Install

Distributed from git rather than a registry. Pin a tag, or take a semver range against
the tags:

```jsonc
"devDependencies": {
  "@commitlint/cli": "^20",
  "conventional-changelog-conventionalcommits": "^8",
  "@vts/commitlint-config": "github:Vigario-Technology-Solutions/commitlint-config#semver:^0.3.0"
}
```

`conventional-changelog-conventionalcommits` is a **peer** dependency — the parser preset,
which is the only thing this needs from that side of the ecosystem. The consumer decides
its version.

`@commitlint/config-conventional` is **not** required and is no longer extended. From
0.3.0 this declares the parser preset directly rather than inheriting twelve rules and
disabling eight of them.

## What it enforces

Two things, and deliberately little else.

**`feat` and `fix` are a floor.** They are the only types the specification gives
behaviour to — MINOR and PATCH, with `!` for MAJOR — and the only strings anything
downstream reads. A consumer cannot remove them; the rule unions them in on every
evaluation.

**Everything else is a replaceable starter.** The reference implementation's
remaining nine ship as a default. A repository may swap the whole set for types its own domain warrants.

```js
// inherit the starter
export default { extends: ["@vts"] };

// replace it — feat and fix survive regardless
export default {
  extends: ["@vts"],
  rules: { "type-enum-any-case": [2, "always", ["deploy", "migrate"]] },
};

// the floor and nothing else
export default {
  extends: ["@vts"],
  rules: { "type-enum-any-case": [2, "always", []] },
};
```

## Why the set beyond the two is open

The specification defines behaviour for `feat` and `fix`, says of everything else
only that other types **MAY** be used, and enumerates nothing. Its FAQ goes further:
the flexibility "allows your team to come up with their own types and change those
types over time."

The familiar eleven are nobody's standard. They are **not Angular's** — Angular
publishes eight (`build`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `test`),
with no `chore`, no `style`, and `revert` as a special prefix rather than a type.
The eleven come from the reference implementation `conventional-changelog` ships,
read downstream as though it were the specification.

So any restriction past the two is a local decision, and one this config declines to
make on a consumer's behalf.

A narrowed enum costs twice: it rejects a commit the standard accepts, and it
forecloses the addition a new domain would justify. An earlier version of this file
did exactly that — it dropped `style` from the eleven, not by decision but because
the rule below needed a list and the list became policy.

## Why the enum is replaced rather than configured

The built-in `type-enum` is `enums.indexOf(value) > -1` — an exact match against a
lowercase array, with no case option exposed. Specification item 15:

> The units of information that make up Conventional Commits MUST NOT be treated as
> case-sensitive by implementors, with the exception of BREAKING CHANGE which MUST be
> uppercase.

The type is such a unit, so the built-in is non-conformant and cannot be configured
out of it. Replacing it is the only route that keeps an enum while obeying the spec.

The replacement takes its list from the rule's **value** rather than a module
constant, which is what makes it extensible at all.

## Why there is no `extends: @commitlint/config-conventional`

Its only contribution to *parsing* is one line — `parserPreset`. The other twelve
entries are house style. An earlier version of this file inherited all of it and then
disabled eight, which is a lot of argument to end up where declaring the preset
directly starts.

Style rules are dropped rather than tuned because the specification says nothing
about appearance, and **cocogitto** — the other linter in use across these
repositories — has no equivalent for any of them. Enforcing appearance only where a
toolchain happens to be able to means the same commit passes in one repository and
fails in another, which is not a standard.

## Packaging, and one trap when working on this locally

**`extends` resolves from the config file's real directory, not the consumer's.** That
one fact explains everything below.

Installed normally — from git, or from a tarball — this package lands as a real directory
at `node_modules/@vts/commitlint-config`. Resolving the parser preset from there walks up
into the consumer's `node_modules` and finds it. That is why
`conventional-changelog-conventionalcommits` is a **peer** dependency: the consumer already
has it, and the consumer picks the version.

**`npm install ../commitlint-config` breaks that, silently and confusingly.** A path
install creates a *symlink* to the source checkout, so resolution starts in
`~/src/commitlint-config`, which has no `node_modules`. Every message then fails, with no
rule named:

```
Error: Cannot find module "conventional-changelog-conventionalcommits"
       from "C:\Users\tyler\src\commitlint-config"
```

Nothing is wrong with the package. To test it the way it ships:

```bash
cd commitlint-config && npm pack          # → vts-commitlint-config-0.3.0.tgz
cd ../consumer && npm install ../commitlint-config/vts-commitlint-config-0.3.0.tgz
```

The same applies to `npm link`, for the same reason.

**A JSON consumer config is fine.** Plugins are objects containing functions, so a
consumer *authoring* a plugin needs a `.js` config — but inheriting one does not, because
the functions live in this package. `.commitlintrc.json` with three lines works.

**Pin a tag, not a branch.** `#semver:^0.3.0` resolves against this repository's tags and
`package-lock.json` records the resolved commit, so consumers upgrade deliberately rather
than drifting when `main` moves.

**Not published to a registry**, deliberately. Distribution is by git dependency, which
needs no credentials for a public repository, no publish pipeline, and no name held
anywhere. Tags, semver ranges and lockfile pinning all work regardless; what a registry
would add is discoverability and provenance attestations, neither of which this needs.

## Licence

AGPL-3.0-or-later.
