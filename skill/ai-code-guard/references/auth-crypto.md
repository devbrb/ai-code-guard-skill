# Auth and crypto basics

Agents reach for the shortest way to make a token, hash a password or open a cross-origin call, and the shortest way is often the weak one. It works in a demo and passes tests. Check the added lines for the shapes below, then see how the repository already does the same thing: an auth library, a session helper or a hashing util means the new code should use it.

## How to check

| Shape in the added lines | Why it is weak | Rule |
|---|---|---|
| `Math.random()`, `Date.now()` or a counter used to make a token, reset code, session id, invite link or API key | Predictable; use `crypto.randomBytes` or `crypto.randomUUID` | `crypto.random` |
| `md5`, `sha1` or plain `sha256` (`createHash`) on a password | Fast hashes are cracked at billions per second; use bcrypt, scrypt or argon2 | `crypto.hash` |
| `jwt.decode` used to trust a token, `verify` with `algorithms: ['none']` or no algorithm list, a secret like `'secret'` or `'changeme'`, a token with no expiry | The signature is never checked, or is easy to forge | `crypto.jwt` |
| A session or auth cookie set without `httpOnly`, `secure` or `sameSite` | Readable by scripts or sent over plain HTTP | `crypto.cookie` |
| `cors({ origin: '*' })` together with `credentials: true`, or `Access-Control-Allow-Origin` set from the request's `Origin` header unchecked | Any site can make signed-in requests | `crypto.cors` |
| A login, signup, password-reset or code-check route with no rate limit when the repository limits other routes | Open to password guessing | `crypto.ratelimit` |

A reset or login code with the weakness above is one finding, even if it is also short, never expires or has no attempt limit; name those in the Fix line.

For each one: open how the repository does it elsewhere (its hashing helper, its cookie options, its CORS config, its limiter) and cite it. If the repository has no precedent, report on the weakness alone, with medium confidence.

## Severity

| Situation | Severity |
|---|---|
| A token or code that guards an account made with a predictable source; a password hashed with a fast hash; a JWT that is not verified or has a guessable secret | critical |
| Cookie flags missing on a session cookie; CORS wildcard with credentials | high |
| No rate limit on login or reset when the repository limits other routes | high |
| No rate limit on login or reset in a repository that has no limiter at all (report once, not per route) | medium |
| A predictable value used for something that is not a credential (a file name, a display id) | not a finding |

Category `security`.

## Evidence

The line with the weak call, what it guards (say what an attacker does: "reset codes come from `Math.random`, so a script can guess the code for any account"), and the repository's own way (file and line), if there is one.

## Fix

The standard replacement: `crypto.randomBytes(32).toString('hex')`, bcrypt or argon2 with the repository's cost setting, `jwt.verify` with a fixed algorithm list and a secret from the environment, `httpOnly: true, secure: true, sameSite: 'lax'`, an origin allowlist, the repository's rate limiter.

## Not a finding

- `Math.random()` for UI effects, jitter, sampling, a shuffle, or an id that guards nothing.
- `sha256` used as a checksum, a cache key or an ETag, not for passwords.
- `jwt.decode` to read a claim from a token that was verified earlier on the same path.
- A cookie that holds a harmless preference (theme, language).
- CORS `*` on a public API that sends no credentials.
- A login route in a repository that has no rate limiter anywhere (report the missing limiter once as medium, not per route).
