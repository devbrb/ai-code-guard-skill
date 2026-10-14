# AI Code Guard

An agent skill that reviews a code change against the repository it lands in. It looks for five things: request fan-out and N+1 calls, bypassed existing abstractions (including auth wrappers), secrets hardcoded or exposed to the browser, risky changes with no tests, and maintainability problems relative to the repository (error handling or logging unlike its siblings, duplicated constants, dead code the change adds).

It targets JavaScript / TypeScript, React, Next.js and Node.js repositories.

## Quick install

Paste this in a terminal. It installs the skill for your user and turns on automatic review, and there is nothing else to set up:

```
npx github:<user>/<repo> --global --hook
```

It needs Node 18+ and git. Restart Claude Code afterwards, then ask it to make a code change: it reviews its own edits before finishing. Leave off `--hook` to review only on request (`/ai-code-guard`).

## Other ways to install

From a git repository (replace `<repo url>` with where you host it; the first two lines are needed once per machine):

```
git clone <repo url> ai-code-guard
node ai-code-guard/install.mjs <project dir> --hook --local
```

or without cloning:

```
npx github:<user>/<repo> <project dir> --hook --local
```

To update, `git pull` in the clone and run the installer again (or just re-run the `npx` line).

To install once for your whole user instead of per project, use `--global` (no project folder). Nothing is then written inside any repository:

```
node ai-code-guard/install.mjs --global --hook
```

The skill goes to `~/.claude/skills` and the hook to `~/.claude/settings.json`, where existing settings are kept. With `--hook` the review runs in every repository you open with Claude Code, so leave `--hook` off if you want the skill only on request (`/ai-code-guard`). To remove it, delete `~/.claude/skills/ai-code-guard` and the two `stop-hook.mjs` entries from `~/.claude/settings.json`.

The per-project options:

```
node install.mjs <project dir>            # Claude Code: .claude/skills/
node install.mjs <project dir> --agents   # other agents: .agents/skills/
node install.mjs <project dir> --hook     # Claude Code, plus the review hook
node install.mjs <project dir> --hook --local   # the same, kept out of git
```

Running it again updates the copy in place.

`--local` keeps the install private to you. The hook goes into `.claude/settings.local.json` instead of the committed `.claude/settings.json`, and the skill folder is added to `.git/info/exclude`, so nothing shows up as a git change. If an earlier install put the hook in `settings.json`, `--local` moves it out and restores that file exactly as it was committed. Then ask the agent to "review my changes with ai-code-guard" (in Claude Code, `/ai-code-guard`).

| Agent | Reads skills from | Tested here |
|---|---|---|
| Claude Code | `.claude/skills/` | yes |
| opencode | `.agents/skills/`, `.claude/skills/`, `.opencode/skills/` | yes |
| Codex | `.agents/skills/` | yes |
| Cursor | `.agents/skills/`, `.cursor/skills/` | yes |
| GitHub Copilot | `.agents/skills/`, `.claude/skills/`, `.github/skills/` | yes |
| Gemini CLI | `.agents/skills/`, `.gemini/skills/` | yes |

The skill needs Node 18+ and git. It uses ESLint and `npm audit` output when they are available in the reviewed repository.

Optionally describe your conventions in `.ai-code-guard/conventions.md` in the reviewed repository. The skill reads it before inferring conventions from the code.

## Review automatically (Claude Code hook)

`install.mjs --hook` adds two hook entries to the project's `.claude/settings.json`, both running `scripts/stop-hook.mjs`:

- **UserPromptSubmit** snapshots the content of every changed or new JS/TS file when you send a prompt.
- **Stop** compares the tree with that snapshot when Claude finishes. If code files changed during the turn, it sends Claude back to review only those files, fix critical and high findings, and show the result.

Because it compares file contents, it catches every kind of change: Claude's edit tools, shell commands, formatters, code generators. A turn that changes no code, such as a question or a discussion, is never reviewed, whatever else is uncommitted. Fixes Claude makes during the review are not reviewed again.

Two edge cases: a file you save in your editor while Claude is working counts as changed during the turn, and a file Claude commits during the turn drops out of the comparison.

To remove the hook, delete both entries that mention `stop-hook.mjs` from `.claude/settings.json`.

## CI

```
node .claude/skills/ai-code-guard/scripts/ci.mjs --base origin/main
```

Exit code 0 means PASS or WARN, 1 means BLOCK (a critical or high finding with high confidence), and 2 means the agent returned no usable review. The verdict is computed by the script from the findings, not taken from the agent. `examples/github-workflow.yml` is a ready workflow for pull requests; it has not been run on GitHub yet.

The review agent reads the pull request's code and can run `node` and `git`, so run this only on pull requests from people who can already push to the repository.

Set `GUARD_AGENT_CMD` to use an agent other than Claude Code, for example `opencode run`.
