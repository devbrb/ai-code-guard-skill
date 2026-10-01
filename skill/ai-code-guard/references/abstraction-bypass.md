# Abstraction bypass

The change does something the repository already has a place for, and does it somewhere else. The code works, but it skips whatever that place provides: authentication, error handling, caching, validation, a single spot to change later.

The question for every added line that uses a raw primitive: **is there already a place in this repository that does this?**

## How to check

1. **Infer the layers.** Look at the directory names and at how existing files import each other. A common shape in a React / Next.js application is:

   ```
   component → hook → service → API client → route handler → (auth wrapper) → repository → database
   ```

   The real repository may have fewer layers or different names. Use what is there, not this diagram.

2. **Search for the existing way.** For the primitive the change uses, search the repository for its other uses:
   - an HTTP call in a component: look for an API client, services, data-fetching hooks
   - a database client in a route or component: look for repositories or a data-access layer
   - a new route handler, server action or controller: open its siblings and see what wraps them
   - a new helper function: search by name and by what it does (date formatting, currency, slugs, validation)
   - fetched data stored in local or global state: see whether the repository uses a query or cache library for server data

3. **Decide whether it is a convention.** One precedent is not a convention. It is one when the other call sites consistently go through the layer: every sibling route is wrapped, every other component uses a hook. Count them and say the count.

4. **Say what is lost.** Open the bypassed layer and name what it does that the new code does not: attaches credentials, redirects on 401, maps errors, invalidates a cache, scopes a query to the current user. If the layer adds nothing the new code lacks, the finding is weak.

## Severity

| What was bypassed | Severity |
|---|---|
| Authentication or authorisation that every sibling uses | critical |
| Input validation or another security layer | high |
| A data, service or fetching layer (loses error handling, caching, consistency) | medium |
| An existing helper, duplicated | low |

## Evidence

A finding needs the file and line of the existing abstraction, and at least one other call site that uses it. Without both, lower the confidence or drop the finding.

## Not a finding

- Code inside the layer itself. The API client is where the raw HTTP call belongs, and the repository is where the SQL belongs.
- Something new the repository has no pattern for yet, such as the first call to an external service. There is nothing to bypass.
- Server code calling an outside API directly when the existing client only wraps the application's own API.
- Tests, mocks, scripts and migrations reaching past the layers.
- An exception the conventions file allows.
