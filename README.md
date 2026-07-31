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
  "@commitlint/config-conventional": "^20",
  "@vts/commitlint-config": "github:Vigario-Technology-Solutions/commitlint-config#semver:^0.1.0"
}
```

`@commitlint/config-conventional` is a **peer** dependency: this extends it rather than
replacing it, so the consumer decides its version.

## What it changes

| rule | here | why |
|---|---|---|
| `type-enum` | **off** | exact-match, case-sensitive — see below |
| `type-enum-any-case` | **on** | same enum, any case |
| `type-case` | off | style, not specification |
| `scope-case` | off | style |
| `subject-case` | off | style |
| `subject-full-stop` | off | style |
| `header-max-length` | off | style |
| `type-empty`, `subject-empty`, `header-trim` | on | whether the message parses at all |

Types: `feat`, `fix`, `refactor`, `perf`, `revert`, `ci`, `build`, `docs`, `test`,
`chore`.

## Why the enum is replaced rather than configured

The built-in rule is an exact match:

```js
return enums.indexOf(value) > -1;
```

A lowercase array, `indexOf`, no case option. Conventional Commits **item 15**:

> The units of information that make up Conventional Commits MUST NOT be treated as
> case-sensitive by implementors, with the exception of BREAKING CHANGE which MUST be
> uppercase.

The type is a structural unit — it is the thing parsed to decide MINOR versus PATCH — so
rejecting `FEAT:` is non-conformant, and no configuration reaches it. Switching the rule
off and supplying an equivalent is the only route that keeps the enum and obeys the spec.

## Why the style rules are dropped

They are not in the specification, and they have no counterpart in
[cocogitto](https://github.com/cocogitto/cocogitto), whose configuration is grammar,
types, scopes and release mechanics with no style rules at all. Enforcing appearance only
where a toolchain happens to be able to means the same commit message passes in one
repository and fails in another — which is not a standard, it is a coin flip on which
repository you opened.

This is also the maintainers' own recommendation. commitlint#2141, *"subject-case rule
breaks ConventionalCommits spec"*, ran from 2020 to June 2026 and closed as intended
behaviour:

> subject-case is an opinionated default of @commitlint/config-conventional, not a spec
> requirement … and it can be disabled with `"subject-case": [0]`.

`config-conventional` is Conventional Commits **plus opinions**, deliberately. This is
the subtraction.

## Packaging, and one trap when working on this locally

**`extends` resolves from the config file's real directory, not the consumer's.** That
one fact explains everything below.

Installed normally — from git, or from a tarball — this package lands as a real directory
at `node_modules/@vts/commitlint-config`. Resolving `@commitlint/config-conventional`
from there walks up into the consumer's `node_modules` and finds it. That is why
`config-conventional` is a **peer** dependency: the consumer already has it, and the
consumer picks the version.

**`npm install ../commitlint-config` breaks that, silently and confusingly.** A path
install creates a *symlink* to the source checkout, so resolution starts in
`~/src/commitlint-config`, which has no `node_modules`. Every message then fails, with no
rule named:

```
Error: Cannot find module "@commitlint/config-conventional"
       from "C:\Users\tyler\src\commitlint-config"
```

Nothing is wrong with the package. To test it the way it ships:

```bash
cd commitlint-config && npm pack          # → vts-commitlint-config-0.1.0.tgz
cd ../consumer && npm install ../commitlint-config/vts-commitlint-config-0.1.0.tgz
```

The same applies to `npm link`, for the same reason.

**A JSON consumer config is fine.** Plugins are objects containing functions, so a
consumer *authoring* a plugin needs a `.js` config — but inheriting one does not, because
the functions live in this package. `.commitlintrc.json` with three lines works.

**Pin a tag, not a branch.** `#semver:^0.1.0` resolves against this repository's tags and
`package-lock.json` records the resolved commit, so consumers upgrade deliberately rather
than drifting when `main` moves.

**Not published to a registry**, deliberately. Distribution is by git dependency, which
needs no credentials for a public repository, no publish pipeline, and no name held
anywhere. Tags, semver ranges and lockfile pinning all work regardless; what a registry
would add is discoverability and provenance attestations, neither of which this needs.

## Licence

AGPL-3.0-or-later.
