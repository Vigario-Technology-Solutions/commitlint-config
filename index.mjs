// Conventional Commits, without config-conventional's opinions.
//
// `@commitlint/config-conventional` is Conventional Commits PLUS a house style, by its
// maintainers' own account -- commitlint#2141 ran from 2020 to June 2026 and closed as
// intended behaviour, with `[0]` named as the supported way to drop a rule. This config
// drops the ones that are style rather than specification, and replaces the one that is
// non-conformant.
//
// Consumers write three lines and inherit everything, including the plugin:
//
//   { "extends": ["@vts"] }
//
// `@vts` resolves to `@vts/commitlint-config`: commitlint appends `commitlint-config` to
// a bare scope, exactly as eslint does.

const TYPES = [
  "feat", "fix", "refactor", "perf", "revert",
  "ci", "build", "docs", "test", "chore",
];

export default {
  extends: ["@commitlint/config-conventional"],

  plugins: [
    {
      rules: {
        // The built-in `type-enum` is `enums.indexOf(value) > -1` -- an exact match
        // against a lowercase array, with no case option exposed. Conventional Commits
        // item 15: "The units of information that make up Conventional Commits MUST NOT
        // be treated as case-sensitive by implementors, with the exception of BREAKING
        // CHANGE which MUST be uppercase." The type is a structural unit, so the built-in
        // is non-conformant and cannot be configured out of it. Replacing it is the only
        // route that keeps the enum while obeying the specification.
        //
        // Same contract as a built-in rule: (parsed, when, value) => [pass, message].
        "type-enum-any-case": ({ type }) => {
          // `type-empty` owns the missing-type failure. Reporting it here too would give
          // two errors for one mistake.
          if (!type) return [true];
          return [
            TYPES.includes(type.toLowerCase()),
            `type must be one of [${TYPES.join(", ")}], any case -- got "${type}"`,
          ];
        },
      },
    },
  ],

  rules: {
    // WHICH types, still enforced. WHAT CASE, no longer.
    "type-enum": [0],
    "type-enum-any-case": [2, "always"],

    // Style, not specification -- and none of it has a counterpart in cocogitto, whose
    // configuration is grammar, types, scopes and release mechanics with no style rules
    // at all. Enforcing appearance only where a toolchain happens to be able to means the
    // same commit passes in one repository and fails in another, which is not a standard.
    "type-case": [0],
    "scope-case": [0],
    "subject-case": [0],
    "subject-full-stop": [0],
    "header-max-length": [0],

    // Kept, because these decide whether the message parses as a conventional commit at
    // all -- which is what every downstream tool depends on.
    "type-empty": [2, "never"],
    "subject-empty": [2, "never"],
    "header-trim": [2, "always"],
  },
};
