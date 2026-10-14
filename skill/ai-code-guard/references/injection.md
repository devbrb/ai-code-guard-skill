# Injection

A value from outside the code is pasted into something that will be interpreted: a SQL query, a shell command, HTML, code, a redirect target. The repository almost always already has the safe way to do it, so the question is the same as everywhere else in this review: **how does the rest of the repository pass values into this, and does the new code do it the same way?**

## How to check

1. **Find the sink.** In the added lines, look for:

   | Sink | Unsafe shape | Rule |
   |---|---|---|
   | SQL | a query string built with `${}` or `+`, `$queryRawUnsafe`, `knex.raw` with a built string, `sequelize.query` with a built string | `injection.sql` |
   | Shell | `exec`, `execSync`, `spawn` with `shell: true`, given a built string | `injection.command` |
   | Code | `eval`, `new Function`, `vm.runIn*Context`, `setTimeout` with a string | `injection.code` |
   | HTML | `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `document.write`, `insertAdjacentHTML` | `injection.html` |
   | Redirect | `redirect()`, `NextResponse.redirect`, `res.redirect`, `location.href =` with a value from the request | `injection.redirect` |

2. **Trace the value back to its source.** Follow it to where it comes from. It is attacker-controlled when it comes from the request (`params`, `searchParams`, the body, headers, cookies, form data), from a URL in the browser, or from a stored field users can write (a task title, a comment). It is safe when it is a literal, a constant, an enum, or an identifier chosen from a fixed allowlist.

3. **Find the existing safe way.** Search the repository for the same sink: placeholders (`$1`, `?`) and a parameter array, a tagged template that parameterises (`sql\`...\``, Prisma `$queryRaw\`...\``), `execFile` with an argument array, a sanitiser (DOMPurify, `sanitize-html`), a redirect allowlist or a check that the target is a relative path. Cite one call site.

It is a finding when an attacker-controlled value reaches the sink without the repository's safe way.

## Severity

| Situation | Severity |
|---|---|
| Request input reaching SQL, a shell command or code evaluation | critical |
| Request input or a user-writable stored field reaching HTML, or request input choosing a redirect target | high |
| A built query, command or HTML string whose input is not attacker-controlled today but comes from a function argument any caller can pass | medium |

Category `security`.

## Evidence

The path from the source to the sink (for example "`q` from `searchParams` → `taskRepository.search(user.id, q)` → string interpolated into `ILIKE` at src/repositories/taskRepository.ts:31"), and the existing safe call site.

## Fix

The repository's own safe way: a placeholder and a parameter, `execFile` with an argument array, the sanitiser it already uses, a relative-path check. For a dynamic identifier such as a sort column, which placeholders cannot carry, an allowlist of permitted names.

## Not a finding

- Interpolating a constant or a fixed column list, such as `` `SELECT ${COLUMNS} FROM tasks WHERE id = $1` ``.
- An identifier picked from an allowlist (`const column = SORTABLE[req.sort] ?? 'due_date'`).
- A tagged template that parameterises (`sql\`... ${id}\``, Prisma `$queryRaw\`...\``). The untagged and `Unsafe` variants are not this.
- `dangerouslySetInnerHTML` with output that passed through the repository's sanitiser, or with content written by the developers (a CMS the team controls, a bundled Markdown file).
- Values going into JSX as children or attributes. React escapes them; only `href` with a `javascript:` URL from user input is a concern, and that is `injection.html`.
