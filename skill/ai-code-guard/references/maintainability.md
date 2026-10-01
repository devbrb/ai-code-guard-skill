# Maintainability

The change works and is safe, but it leaves the codebase harder to change: it handles something differently from the rest of the repository, or it adds code nobody uses.

This check is deliberately narrow. It covers only what you can evidence against this repository. Size, nesting, naming and general "cleanliness" are the linter's job and a matter of taste, and reporting them is what gets a reviewer ignored.

## What to look for

**Error handling that differs from its siblings.** Open two or three sibling files and see how they report failure: the shape of an error response, the error class thrown, whether errors are caught or allowed to propagate. It is a finding when the new code uses a different shape or mechanism. Then check who consumes it. If a caller reads a field the new code does not send (the API client reads `error`, the new route sends `message`), the difference is a bug, not only an inconsistency, and the severity is medium.

**Logging that differs from its siblings.** Search for a logger module and count its uses. If the repository logs through one, `console.log` / `console.error` in new production code is a finding. If the repository itself uses `console` everywhere, it is not.

**A value that already has a name.** A literal in the added lines that duplicates an existing exported or shared constant (a limit, a status string, a route path) is a finding when the two must stay in step, meaning that changing one without the other would cause a bug. Cite the constant. A private constant in some other file that happens to hold the same number is a coincidence, not a finding.

**Dead code the change adds.** A function, component, export, parameter or branch added by this change that nothing reaches. Search for references before reporting: a non-exported function with no caller in its file is dead, an export with no importer anywhere is probably dead, a branch after an unconditional return is dead. Agents often leave these behind after changing approach mid-task.

## Severity

| Situation | Severity |
|---|---|
| The inconsistency breaks a consumer (a caller reads what the new code does not provide) | medium |
| Any other item in this file | low |

## Evidence

Cite the sibling or module that shows the existing way, with a count where it makes the point ("3 of 3 other route handlers return `{ error }`"). For dead code, say what you searched for and that it had no references.

## Not a finding

- Long functions, deep nesting, naming, formatting, comment style, import order.
- Anything in code the change did not add or modify.
- A difference from one single precedent. One example is not a convention.
- A new export in a module that is plainly a public interface (a library entry point, a shared types file), or a helper used only by a test in the same change.
- A duplicated helper function. That belongs to the abstraction-bypass check; do not report it twice.
- Literals with no existing named equivalent. Inventing a constant is a suggestion, not a finding.
