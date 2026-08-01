// This package, used on itself. index.mjs is both the shareable config and this
// repository's own configuration, so every commit here is linted by exactly the
// rules it ships — a change that would reject a conforming commit fails on the
// pull request that introduces it rather than in a consumer weeks later.
//
// A relative extends rather than "@vts": the package is not installed into its own
// node_modules, and commitlint resolves extends from the config file's directory.
export default { extends: ["./index.mjs"] };
