# Data safety

Five mistakes agents make when code reads or writes records. All five pass ordinary tests, because the tests use one well-behaved user and a handful of rows. As everywhere in this review, the question is how the rest of the repository handles the same thing, and whether the new code does it the same way.

## How to check

For each added route, server action or repository method that reads or writes records:

### Mass assignment (`data.mass-assignment`)

Request input is written to the database whole, so the caller chooses which fields change.

1. **Find the sink.** `create(req.body)`, `update({ data: body })`, `Object.assign(record, body)`, `{ ...body }` passed to an insert or update, `INSERT` built from `Object.keys(body)`.
2. **Check the model.** Open the schema or type. It is a finding when the model has a field the caller must not set (`role`, `isAdmin`, `ownerId`, `userId`, `price`, `balance`, `status`, `emailVerified`, `deletedAt`) and nothing on the path picks fields or validates against a schema that leaves them out.
3. **Find how siblings do it.** They usually destructure named fields, or parse with a schema (zod, joi) that lists the allowed keys. Cite one.

Severity critical when the writable field is a role, owner or money field, otherwise high. An attacker example: "any user can make themselves an admin by adding `"role":"admin"` to the body".

### Sensitive data in responses and logs (`data.exposure`)

A record or request is sent out whole, so fields that were never meant to leave the server go with it.

1. **Find the sink.** A response that returns a whole row or ORM object (`return user`, `res.json(user)`, `NextResponse.json(record)`), or a log call given a whole request, body, headers or user object.
2. **Check the fields.** It is a finding when the record has a password hash, token, session id, API key, reset code, internal flag or another user's personal data, and nothing on the path selects fields (`select: { id, name }`, a serializer or DTO, `omit`).
3. **Find how siblings do it.** Cite the serializer, `select` list or `toJSON` they use.

Severity high for credentials, tokens and hashes in a response or log, medium for other personal or internal fields.

### Unbounded query (`data.unbounded`)

A list endpoint reads every row that matches, so it works with ten rows and fails with a million.

1. **Find the sink.** `findMany()`, `SELECT` or `.find({})` returning a collection to a caller, with no `limit`, `take`, `LIMIT` or cursor.
2. **Check what bounds it.** The collection is unbounded when it is "all rows" or "all rows for this user" and the user can create rows without limit. It is bounded when the table is a fixed reference list, a filter always matches a few rows, or the code caps it.
3. **Find how siblings do it.** Cite the pagination helper, default page size or `limit` they use.

Severity high when the table grows with usage, medium when it is only large in theory. This is different from `fanout`, which is I/O repeated once per item; this is one read that returns everything.

### Check-then-act without atomicity (`data.race`)

The code reads a value, decides, then writes, with nothing to stop a second request doing the same between the two.

1. **Find the shape.** A read followed by a write that depends on it: balance, stock or quota checks, "create if it does not exist", counters (`count + 1`), status transitions (`if (order.status === 'pending')`). Also several writes that must all succeed or all fail, run without a transaction.
2. **Check for protection.** It is protected when the write is a single conditional statement (`UPDATE ... WHERE balance >= $1`, an atomic `increment`), the steps run in a transaction with a lock or a serialisable level, or a unique constraint rejects the duplicate.
3. **Find how siblings do it.** Cite the transaction helper or atomic update they use.

Severity high for money, stock, quotas and permissions, medium for counters and status fields. An attacker example: "two simultaneous requests both pass the balance check and both withdraw".

### Client-trusted values (`data.client-trusted`)

The server uses a value from the request that only the server should decide.

1. **Find the shape.** A price, total, discount, role, user id, owner id, plan or `isPaid` flag read from the body, query string or a hidden form field and then used to charge, grant access or pick whose record to write (`userId: req.body.userId`, `amount: body.total`).
2. **Check where it should come from.** The session gives the user id; the database gives the price; the server computes the total. It is a finding when the request value is used and the server could have looked it up.
3. **Find how siblings do it.** Cite a route that takes the same kind of value from the session or the database.

Severity critical for a role, owner or user id that picks whose data is written, or a price or total that sets what is charged; high otherwise. An attacker example: "the client sends `price: 0` in the order body and pays nothing".

## Category

`security` for `data.mass-assignment`, `data.exposure`, `data.client-trusted` and `data.race`. `performance` for `data.unbounded`.

## Evidence

The sink and the missing step on its path (for example "`req.body` passed whole to `prisma.user.update` at src/routes/users.ts:44; `User` has `role` at prisma/schema.prisma:12"), and the sibling that does it safely (file and line).

## Fix

The repository's own way: pick the fields, return a selected shape, add `limit` and a cursor with the existing helper, or collapse the read and write into one conditional statement or a transaction. For a security finding, add a test that sends the bad input (a `role` field, a second concurrent request) and expects it to fail.

## Not a finding

- Passing validated data: a body parsed by a schema that lists only the allowed keys.
- A model with no field the caller must not set.
- Returning a record to its owner when every field in it is theirs and none is a credential.
- Admin-only routes that are meant to read every record, unless they return credentials.
- A list over a small fixed table (countries, roles, plan names).
- Read-then-write on data only one request can reach at a time, such as a per-user draft with no concurrent writer.
