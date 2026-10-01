# Secrets

Two separate problems: a credential written into the repository, and a credential that reaches the browser.

## Reaching the browser

First decide whether the file runs in the browser.

| Runs in the browser | Runs only on the server |
|---|---|
| a file that starts with `'use client'`, and everything it imports | `app/**/route.ts` route handlers, `pages/api/**` |
| components under `pages/` (outside `getServerSideProps` / `getStaticProps`) | files or functions marked `'use server'` |
| any component in a plain React or Vite application | components under `app/` with no `'use client'` directive |
| | `middleware.ts`, scripts, server entry points |

`collect.mjs` reports `clientDirective` and `envRefs` for each changed file. A file without the directive can still run in the browser if a client file imports it, so check who imports it.

Then look for:

- **A public-prefixed variable holding a secret.** `NEXT_PUBLIC_*`, `VITE_*` and `REACT_APP_*` are copied into the JavaScript bundle at build time, so anyone can read them. It is a finding when the name says it is a credential (`KEY`, `SECRET`, `TOKEN`, `PASSWORD`, `DATABASE`, `SERVICE_ROLE`, `PRIVATE`). Severity critical.
- **A server variable read in browser code.** In Next.js an unprefixed variable is `undefined` in the browser, so the code is broken, and the obvious "fix" of adding the public prefix would leak it. Report it as high and say the call has to move to the server.
- **A server-only module imported by a client file.** If a module reads a secret and a `'use client'` file imports it, the secret or the failure travels with it.

The fix is the same each time: keep the credential on the server, and have the browser call a route handler or server action that uses it.

## Written into the repository

Look at added lines for:

- a string literal assigned to a name like `apiKey`, `token`, `secret`, `password`, or passed as an `Authorization` header
- recognisable formats: `sk-`, `sk_live_`, `ghp_`, `AKIA`, `xoxb-`, a `-----BEGIN … PRIVATE KEY-----` block, a connection string containing a password
- a `.env` file with real values being added to version control (check `.gitignore`)

Severity critical. The fix is to move the value to an environment variable *and* rotate it, because it is already in the working tree and possibly in history.

## Not a finding

- Values designed to be public: a Supabase anon key, a Stripe publishable key (`pk_`), Firebase web configuration, analytics ids, public URLs.
- Placeholders: `your-key-here`, `changeme`, `xxx`, empty values in `.env.example`.
- Obviously fake values in test fixtures.
- `process.env.SOMETHING` read in a server-only file. That is the correct way to do it.

## Reporting

Never print the secret. Give the first four characters followed by `…`, the file and the line.
