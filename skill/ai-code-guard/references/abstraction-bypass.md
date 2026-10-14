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

## Ownership (IDOR)

A route can be behind authentication and still let any signed-in user read or change anyone's record, because it looks the record up by the id in the request and never checks who owns it. Agents write this often: the auth wrapper is copied from a sibling, the scoping in the query is not.

For every added route, server action or repository method that takes a record id from the request (`params`, the query string, the body, form data):

1. **Find how siblings scope.** Open sibling routes and the repository methods they call. The usual shapes are a query condition on the session user (`WHERE id = $1 AND owner_id = $2`, `where: { id, userId: session.user.id }`), a lookup followed by a check (`if (task.ownerId !== user.id) return 403`), or a policy helper (`can(user, 'edit', task)`).
2. **Follow the new code to the query.** Trace the id from the request to the SQL or ORM call. It is a finding when no step on that path ties the record to the session user while comparable siblings do. A repository method added without a user parameter, next to methods that take one, is the usual sign.
3. **Say what an attacker does.** For example: "any signed-in user can rename another user's task by sending its id".

Severity critical, rule `bypass.ownership`, category `security`. Evidence is the sibling that scopes (file and line of its condition) and the new query that does not.

Not a finding: records that are public by design, a route behind a role check that grants access to every record (an admin route), an id taken from the session rather than the request, and a repository where no comparable query scopes by user (then the whole repository works that way, and it is not this change's fault).

## Severity

| What was bypassed | Severity |
|---|---|
| Authentication or authorisation that every sibling uses, or the ownership check described above | critical |
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
