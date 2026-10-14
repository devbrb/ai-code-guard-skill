---
name: ai-code-guard
description: Review the current code changes against the repository that already exists, before commit or merge. Finds request fan-out and N+1 calls, bypassed existing abstractions (API clients, services, hooks, repositories, auth middleware), secrets hardcoded or exposed to the browser, risky changes shipped without tests, and maintainability problems relative to the repository (inconsistent error handling or logging, dead code). Use when asked to "review my changes", "guard this diff", "check this before I commit", after finishing a feature in a JavaScript/TypeScript, React, Next.js or Node.js repository, or in CI on a pull request.
---

# AI Code Guard

Review a code change against the repository it lands in. A linter judges the changed lines on their own. This review asks whether the change fits the application that already exists: does it make calls in a way that will not scale, skip a layer the rest of the code goes through, leak a secret, ship something risky with no tests, or handle errors and logging differently from the code around it.

The value is in what you look up outside the diff. A finding you could have written without opening any other file is generic advice, and generic advice is what makes people switch a reviewer off. A short report with evidence beats a long one without.

## Steps

### 1. Collect the change

From the repository root, run `scripts/collect.mjs` (the path is relative to the folder this file is in) with Node:

```
node "<this folder>/scripts/collect.mjs" [--base <ref>]
```

Keep the quotes: the path may contain spaces.

With no argument it reviews uncommitted changes against `HEAD`. Pass `--base origin/main` (or another ref) to review a whole branch. If you were told to review only certain files, put `--only` last followed by those paths; the review then covers only them.

It prints one JSON object:

- `files`: each changed file with its status, the line ranges that were added, whether it opens with a `'use client'` directive, the environment variables it reads, and for a `package.json` the dependencies it adds.
- `diff`: the unified diff of tracked files. New untracked files appear in `files` but not in `diff`, so read those in full.
- `tools`: raw output of ESLint and `npm audit` where they are installed and relevant. `unavailable` means the tool is not installed, not that it found nothing.

If the script cannot run, get the same facts from `git status` and `git diff`. If nothing changed, say so and stop.

The review is read-only. Do not create or modify files in the repository, including redirecting command output into one: a stray file shows up as a changed file in the next review.

### 2. Read the stated conventions and suppressions

If `.ai-code-guard/conventions.md`, `AGENTS.md` or `CLAUDE.md` exists at the repository root, read it. A stated convention outranks one you infer.

If `.ai-code-guard/ignore` exists, read it as it is at the base, with `git show <base>:.ai-code-guard/ignore` (`base` is in the `collect.mjs` output), not from the working tree. Each line is `<rule> <path>`: a rule id from step 6 or `*` for every rule, then a file path or a glob such as `scripts/**`. `#` starts a comment. Drop any finding whose rule and file match a line, and do not mention it.

Entries the change itself adds to the ignore file do not apply, because a change must not be able to silence its own review. Report the finding they would have hidden as usual, and say in its evidence that the change also adds a suppression for it.

### 3. Look up what already exists

For each changed file, before judging it:

- Open the whole file, not only the changed hunk.
- Read two or three sibling files in the same directory. They show how this kind of file is normally written here.
- For each function the added lines call, open its definition and keep following it until you reach the real I/O (an HTTP request, a database query) or know there is none.
- For each raw primitive the added lines use (an HTTP call, a database client, an environment variable, hand-written formatting or validation), search the repository for how the rest of the code does that.

### 4. Run the seven checks

Read the reference file before reporting a finding of that kind. Each one also lists what is *not* a finding, which matters as much as what is.

| Check | Look closer when the added lines contain | Reference |
|---|---|---|
| Fan-out / N+1 | I/O inside a loop, `.map`, `.forEach`, or a component rendered per item | `references/fanout-n-plus-one.md` |
| Abstraction bypass | a raw primitive where the repository has a layer for it, a new route or handler, a new helper, a query or route that takes a record id from the request | `references/abstraction-bypass.md` |
| Secrets | an environment variable in browser code, a public-prefixed variable, a literal credential | `references/secrets.md` |
| Injection | a query, shell command, HTML string, `eval` or redirect built from a value | `references/injection.md` |
| Maintainability | an error response or thrown error, a log call, a literal limit or status, a new function or export | `references/maintainability.md` |
| Dependencies | `addedDependencies` on a `package.json`, or an import of a package | `references/dependencies.md` |
| Missing tests | a risky change with no test in the diff | below |

**Missing tests.** A change is risky when it adds or alters a mutation endpoint, a bulk operation, authentication or permission logic, money handling, or data deletion. Report it only when both hold: the diff contains no test that exercises the new behaviour, and the repository does test comparable existing code (find the sibling's test file and cite it). If the repository has no tests for that kind of code, the absence is its norm, not this change's fault, so do not report it. Name the cases that are missing (for a bulk operation: zero items, one item, a large batch, partial failure, an unauthorised caller) instead of asking for "more tests".

**Tool output.** Treat it as fact. Report a tool finding only if it is on an added line and falls under one of the seven checks or is a vulnerability in a dependency this change adds. Leave style rules to the linter.

### 5. Keep only what you can evidence

For each candidate finding, write down the evidence: the file and line of the existing pattern it breaks, or the chain of calls that reaches the I/O. If you cannot, drop it or lower its confidence. Drop any finding that ends up both low severity and below high confidence: a minor point you are unsure of is noise.

Do not report: style, naming or formatting; problems in code the change did not touch; "consider adding" advice with no concrete failure; anything a reference file lists as not a finding.

### 6. Report

Severity:

| Severity | Use for |
|---|---|
| critical | a secret committed or reachable from the browser; a route or action that skips the authentication, authorisation or ownership check its siblings use; request input reaching a SQL query, shell command or `eval` unescaped |
| high | I/O repeated once per item of a collection with no enforced upper bound; any other bypassed security or validation layer; request input reaching HTML or a redirect unescaped; an import of a package that does not exist |
| medium | I/O repeated per item of a small bounded collection; a skipped layer that costs error handling, caching or consistency; a risky change with no tests; an inconsistency that breaks a caller |
| low | a duplicated helper; error handling or logging unlike its siblings; dead code the change adds |

Every finding has a rule id. Use the one that fits; it is what `.ai-code-guard/ignore` matches against.

| Check | Rule ids |
|---|---|
| Fan-out / N+1 | `fanout` |
| Abstraction bypass | `bypass.auth`, `bypass.ownership`, `bypass.validation`, `bypass.layer`, `bypass.helper` |
| Secrets | `secret.hardcoded`, `secret.public-prefix`, `secret.server-env-in-client`, `secret.client-imports-server` |
| Injection | `injection.sql`, `injection.command`, `injection.code`, `injection.html`, `injection.redirect` |
| Maintainability | `consistency.errors`, `consistency.logging`, `consistency.constant`, `dead-code` |
| Dependencies | `dependency.heavy`, `dependency.duplicate`, `dependency.missing`, `dependency.nonexistent` |
| Missing tests | `tests.missing` |

Confidence is `high`, `medium` or `low`, never a percentage. `high` means you opened the code on both sides and the evidence is quoted. `medium` means the pattern is clear but something is unverified, and you say what. `low` means a suspicion worth a look.

Verdict: `BLOCK` if any critical or high finding has high confidence, `WARN` if there is any other finding of medium severity or above, otherwise `PASS`.

Default output is Markdown:

```
AI CODE GUARD — <verdict>

Security         <none|low|medium|high|critical>
Performance      <…>
Architecture     <…>
Maintainability  <…>
Tests            <…>

1. HIGH · performance · fanout · confidence high
   src/hooks/useTasks.ts:21
   Problem: one POST is sent per selected task.
   Evidence: taskService.complete → taskApi.completeTask → POST /tasks/:id/complete (src/api/taskApi.ts:8)
   Existing pattern: userRepository.findByIds batches with `id = ANY($1)` (src/repositories/userRepository.ts:11)
   Fix: add POST /tasks/bulk-complete and one UPDATE in taskRepository.
```

Each risk line is the highest severity among that category's findings, or `none`. With no findings, print the verdict and the five lines and nothing else.

When the request asks for JSON, a program will parse your whole reply, so the reply must be the object and nothing else: its first character is `{` and its last is `}`, with no code fence and no sentence before or after. The shape:

```
{
  "verdict": "PASS" | "WARN" | "BLOCK",
  "risk": { "security": "none", "performance": "high", "architecture": "none", "maintainability": "none", "tests": "none" },
  "findings": [
    {
      "severity": "critical" | "high" | "medium" | "low",
      "category": "security" | "performance" | "architecture" | "maintainability" | "tests",
      "rule": "fanout",
      "confidence": "high" | "medium" | "low",
      "file": "path/from/repo/root",
      "line": 21,
      "problem": "",
      "evidence": "",
      "existing_pattern": "",
      "fix": ""
    }
  ]
}
```

Never print a secret's value in either format. Give its first four characters followed by `…`.
