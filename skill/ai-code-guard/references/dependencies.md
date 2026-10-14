# Dependencies

The change adds a package to the repository. Every package is code the team now has to update, audit and ship, so the question is whether this one earns that.

`collect.mjs` reports `addedDependencies` for each changed `package.json`: the names that are in it now and were not at the base.

## What to look for

**A whole library for a few functions.** The change installs a package and calls one or two of its functions, which a few lines, the standard library or the platform already cover. Agents do this often: `lodash` for `groupBy`, `moment` to format one date, `axios` for one request, `uuid` where `crypto.randomUUID()` exists.

1. Search the whole repository, not only the diff, for imports of the package (`from 'pkg'`, `from 'pkg/...'`, `require('pkg')`). List the functions used and count the files.
2. For each function, decide what replaces it, from the cheapest rung:
   - something the repository already has (a helper in `src/lib`, another installed package that does the same job)
   - the standard library or platform (`Intl.DateTimeFormat`, `structuredClone`, `fetch`, `crypto.randomUUID`, `Array.prototype.flat`, `URLSearchParams`)
   - a few lines written in place
3. Check that the replacement is available. Read `tsconfig.json` `target` / `lib` and `engines` in `package.json`: `Object.groupBy` does not exist under `es2022`, `fetch` does not exist before Node 18. If the native API is unavailable, the replacement is the few lines, not the native call.

It is a finding when every function used has a replacement of a few lines or fewer. Name the replacement for each function.

**A duplicate of an installed package.** The change adds a package for a job an installed one already does: a second date library, a second HTTP client, a second validation or state library. Cite the installed package and one file that uses it.

**An import that resolves to nothing.** An added line imports a package that is not in any `package.json` the file can see, not a workspace package, not a path alias from `tsconfig.json`, and not a Node built-in. Either the dependency was never added, so the build breaks, or the name was invented. If you can run `npm view <name> name` and it reports that the package does not exist, say so: an invented name is one an attacker can register.

## Severity

| Situation | Severity |
|---|---|
| An import of a package that does not exist on the registry | high |
| An import of a package missing from `package.json` | medium |
| A whole library for a few functions, imported into browser code (it ships in the bundle) | medium |
| A duplicate of an installed package | medium |
| A whole library for a few functions, server or build code only | low |

Report under `architecture`, except a package that does not exist, which is `security`.

## Evidence

The `package.json` line that adds the package, every import of it in the repository with the functions used, and the replacement for each. For a duplicate, the installed package and a file that uses it.

## Not a finding

- A package used widely across the repository, or one the change uses for more than a handful of functions.
- A package that solves a hard problem correctly: cryptography, HTML sanitisation, time zones and calendars, parsing a real format (CSV, Markdown, YAML), schema validation, an accessible UI primitive. A few hand-written lines are worse there; never propose them.
- Tooling and types in `devDependencies`: `@types/*`, linters, test runners, build plugins.
- A peer dependency the installed packages require, or one the framework's own setup instructions add.
- A per-function import that already keeps the bundle small (`lodash/groupBy`, `date-fns/format`) when the repository is happy with that package. Judge it by the duplicate rule only.
