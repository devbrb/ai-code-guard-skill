# Fan-out and N+1

The change works for ten items and falls over at ten thousand, because it does one network or database round trip per item.

## How to check

1. **Find the repeated call.** Look for a call inside `for`, `while`, `.map`, `.forEach`, `.reduce`, `Promise.all(items.map(...))`, or inside a component or hook that is rendered once per list item.
2. **Confirm it does I/O.** Open the callee and follow it down until you reach an HTTP request, a database query or another remote call. A wrapper three layers deep still counts. If the chain ends in pure in-memory work, there is no finding.
3. **Find what bounds the collection.** Ask where the list comes from and what enforces its size *at this call site or on the server*:
   - A literal or fixed set (three named calls, an enum) is bounded and small.
   - A page of results with a fixed page size is bounded.
   - A user selection, a function argument, a prop, an upload, or "all rows matching" is unbounded unless the code caps it. The size the current screen happens to pass does not count: the next caller can pass more.
4. **Look for an existing batch path.** Search for an endpoint that accepts a list of ids, a repository method using `IN` / `= ANY(...)`, a join or `include`, a data loader, or a concurrency helper already used elsewhere. If one exists, cite it: it is both the evidence and the fix.

## Severity

| Situation | Severity |
|---|---|
| Per-item I/O over an unbounded collection | high |
| Per-item I/O over a bounded page (tens of items) | medium |
| Per-item I/O in a one-off script or migration | low |

Running the calls in sequence (`await` inside a loop) and all at once (`Promise.all` with no limit) are the same finding. The first is slow, the second can overwhelm the server or hit a rate limit. Say which one it is.

## Not a finding

- `Promise.all` over a fixed handful of *different* calls, such as loading tasks and the user together. That is ordinary parallelism.
- A loop that only transforms data already in memory.
- Per-item calls that already go through a chunking or concurrency-limit helper.
- A query library deduplicating identical keys, so that many components asking for the same key produce one request.

## Fix

Prefer the batch path the repository already has. If there is none, propose one at the layer where it belongs: one endpoint that takes the ids, and one query in the data layer. Offer bounded concurrency only as a stopgap when the server cannot change.
