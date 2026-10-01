#!/usr/bin/env node
// Claude Code hook that reviews the code changed during the current turn, and nothing else.
// It is registered for two events (install.mjs --hook does this):
//   UserPromptSubmit   snapshots the content of every changed or new code file
//   Stop               compares with the snapshot; files that changed during the turn get reviewed
// Comparing snapshots catches every way a file can change: the edit tools, shell commands,
// formatters, code generators. A turn that changes no code (a question, a discussion) is never
// reviewed, whatever else is uncommitted.
// ponytail: anything that changes a file during the turn counts, including you saving in your
// editor while Claude works; files Claude commits during the turn drop out of the comparison.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
const event = input.hook_event_name;
if (event !== 'UserPromptSubmit' && event !== 'Stop') process.exit(0);

const cwd = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const git = (dir, args, stdin) =>
  execFileSync('git', args, { cwd: dir, input: stdin, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], maxBuffer: 1 << 28 });
const CODE = ['*.js', '*.jsx', '*.ts', '*.tsx', '*.mjs', '*.cjs', '*.mts', '*.cts', ':(exclude).claude', ':(exclude).agents'];

// path -> content hash for every code file that differs from HEAD or is untracked
function snapshot(root) {
  const split = (s) => s.split('\0').filter(Boolean);
  const paths = [
    ...new Set([
      ...split(git(root, ['diff', 'HEAD', '--name-only', '-z', '--', ...CODE])),
      ...split(git(root, ['ls-files', '--others', '--exclude-standard', '-z', '--', ...CODE])),
    ]),
  ];
  const present = paths.filter((p) => existsSync(join(root, p)));
  const hashes = present.length ? git(root, ['hash-object', '--stdin-paths'], present.join('\n')).trim().split('\n') : [];
  return Object.fromEntries(paths.map((p) => [p, hashes[present.indexOf(p)] ?? 'deleted']));
}

let root, file, now;
try {
  root = git(cwd, ['rev-parse', '--show-toplevel']).trim();
  const session = String(input.session_id).replace(/[^\w-]/g, '');
  file = resolve(cwd, git(cwd, ['rev-parse', '--git-dir']).trim(), `ai-code-guard-turn-${session}.json`);
  now = snapshot(root);
} catch {
  process.exit(0); // not a git repository, or no commits yet
}

if (event === 'UserPromptSubmit') {
  writeFileSync(file, JSON.stringify(now)); // print nothing: this event's output would reach Claude
  process.exit(0);
}

// Stop. No snapshot means the turn started before the hook was installed: stay out of it.
if (!existsSync(file)) process.exit(0);
const before = JSON.parse(readFileSync(file, 'utf8'));
rmSync(file, { force: true });
// Claude is finishing the review this hook asked for; blocking again would loop
if (input.stop_hook_active) process.exit(0);

const files = Object.keys(now).filter((p) => now[p] !== 'deleted' && now[p] !== before[p]);
if (!files.length) process.exit(0);

const collect = join(dirname(fileURLToPath(import.meta.url)), 'collect.mjs');
console.log(
  JSON.stringify({
    decision: 'block',
    reason:
      `Code changed during this turn: ${files.join(', ')}. Review only these files with the ai-code-guard skill, ` +
      `collecting with: node "${collect}" --only ${files.map((f) => `"${f}"`).join(' ')}. ` +
      'Fix every critical or high finding you have high confidence in, then show the review result. ' +
      'Report lower findings without changing the code for them.',
  }),
);
