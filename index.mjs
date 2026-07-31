// Conventional Commits — the specification, not a house style built on top of it.
//
// WHAT THE SPECIFICATION ACTUALLY FIXES. It defines behaviour for two types:
// `feat` MUST be used when a commit adds a feature, `fix` when it is a bug fix,
// with `!` marking either as breaking. Of everything else it says only that other
// types MAY be used. It enumerates nothing, and its own FAQ states that the
// flexibility "allows your team to come up with their own types and change those
// types over time."
//
// So the familiar eleven are Angular's list, adopted by the reference
// implementation and read downstream as though normative. Every restriction
// beyond the two is a local decision, and this file makes exactly one.
//
// THE ONE DECISION: `feat` and `fix` are a floor. A consumer may replace the
// optional set entirely, and may not remove those two, because they are the only
// strings anything downstream reads. The floor is enforced inside the rule rather
// than by convention, so a consumer's list is unioned with it on every evaluation.
//
// WHY NO `extends: @commitlint/config-conventional`. Its only contribution to
// PARSING is one line -- the parser preset below. The other twelve entries are its
// house style, which an earlier version of this file inherited and then disabled
// eight of. Taking the preset directly leaves nothing to argue with.

// The parser. Without it `!` is not parsed, and a breaking `fix!:` reaches the
// rules with type "fix!" and is rejected as an unknown type.
const PARSER_PRESET = "conventional-changelog-conventionalcommits";

// Enforced always. Not configurable, by design.
const REQUIRED = ["feat", "fix"];

// Offered, and fully replaceable. Angular's remaining nine -- a starting point
// rather than a boundary.
const STARTER = [
  "build", "chore", "ci", "docs", "style",
  "refactor", "perf", "test", "revert",
];

export default {
  parserPreset: PARSER_PRESET,

  plugins: [
    {
      rules: {
        // Replaces the built-in `type-enum`, which is `enums.indexOf(value) > -1`
        // -- an exact match against a lowercase array with no case option exposed.
        // Specification item 15: "The units of information that make up
        // Conventional Commits MUST NOT be treated as case-sensitive by
        // implementors, with the exception of BREAKING CHANGE which MUST be
        // uppercase." The type is such a unit, so the built-in is non-conformant
        // and cannot be configured out of it.
        //
        // Same contract as a built-in rule: (parsed, when, value) => [pass, message].
        // `value` is the consumer's list, which is what makes this extensible --
        // the previous version held the list in a module constant, so a consumer
        // could not add a type its domain needed.
        //
        //   value === undefined   inherit STARTER
        //   value === []          the floor and nothing else
        //   value === [...]       those, plus the floor
        "type-enum-any-case": ({ type }, _when, value) => {
          const optional = value === undefined ? STARTER : value;
          const allowed = [...new Set([...REQUIRED, ...optional])];
          // `type-empty` owns the missing-type failure. Reporting it here too
          // would give two errors for one mistake.
          if (!type) return [true];
          return [
            allowed.includes(type.toLowerCase()),
            `type must be one of [${allowed.join(", ")}], any case -- got "${type}"`,
          ];
        },
      },
    },
  ],

  // Only what decides whether a message parses as a conventional commit at all,
  // which is what every downstream tool depends on. Nothing here is about
  // appearance: no case rules, no length limits, no full-stop rule. Those are
  // style, the specification says nothing about them, and cocogitto -- the other
  // linter in use -- has no equivalent, so enforcing them here would mean the same
  // commit passing in one repository and failing in another.
  rules: {
    "type-empty": [2, "never"],
    "subject-empty": [2, "never"],
    "header-trim": [2, "always"],
    "type-enum-any-case": [2, "always"],
  },
};
