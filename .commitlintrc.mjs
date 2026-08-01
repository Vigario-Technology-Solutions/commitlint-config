// This package, used on itself. index.mjs is both the shareable config and this
// repository's own configuration, so every commit here is linted by exactly the
// rules it ships — a change that would reject a conforming commit fails on the
// pull request that introduces it rather than in a consumer weeks later.
//
// A relative extends rather than the published name "@vts/commitlint-config": the
// package is not installed into its own node_modules, and commitlint resolves
// extends from the config file's directory.
//
// And emphatically not the bare scope "@vts". commitlint expands a lone scope to
// <scope>/conventional-changelog-lint-config, so that string resolves to a package
// that does not exist. It is not a shorthand for this package, and writing it as
// though it were is what broke main once already.
export default { extends: ["./index.mjs"] };
