// Claude Code hook that reviews the code files this session edited during the current turn.
// It is registered for three events (install.mjs --hook does this):
//   PostToolUse (Edit|Write|MultiEdit)  records the edited file under this session's id
//   PreToolUse/PostToolUse (Bash)       records files the shell command changed (snapshot diff)
//   Stop                                reviews the recorded files, then forgets them
// Attribution is per session_id, so a second Claude Code chat in the same repo is never
// reviewed for edits it did not make, and a question-only chat records nothing.
// ponytail: shell changes are found by diffing the tree around one Bash call, so another session
// editing at the same instant can be misattributed; state is a plain read-modify-write file, so
// parallel tool calls in one session can drop a record. Add locking if that ever shows up.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
const event = input.hook_event_name;
if (!['PreToolUse', 'PostToolUse', 'Stop'].includes(event)) process.exit(0);

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

const isBash = input.tool_name === 'Bash';
let root, file;
try {
  root = git(cwd, ['rev-parse', '--show-toplevel']).trim();
  const session = String(input.session_id).replace(/[^\w-]/g, '');
  file = resolve(cwd, git(cwd, ['rev-parse', '--git-dir']).trim(), `ai-code-guard-turn-${session}.json`);
} catch {
  process.exit(0); // not a git repository, or no commits yet
}
const load = () => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { files: [] });
const save = (state) => writeFileSync(file, JSON.stringify(state)); // print nothing: tool-event output would reach Claude

if (event === 'PreToolUse') {
  if (isBash) save({ ...load(), bash: snapshot(root) });
  process.exit(0);
}

if (event === 'PostToolUse') {
  const state = load();
  const found = [];
  if (isBash) {
    const before = state.bash ?? {};
    const now = snapshot(root);
    found.push(...Object.keys(now).filter((p) => now[p] !== 'deleted' && now[p] !== before[p]));
    delete state.bash;
  } else if (/\.(jsx?|tsx?|mjs|cjs|mts|cts)$/.test(input.tool_input?.file_path ?? '')) {
    const rel = relative(root, resolve(cwd, input.tool_input.file_path)).replaceAll('\\', '/');
    if (!rel.startsWith('..') && !/^\.(claude|agents)\//.test(rel)) found.push(rel);
  }
  state.files = [...new Set([...state.files, ...found])];
  save(state);
  process.exit(0);
}

// Stop. Nothing recorded means this session edited no code: stay out of it.
const files = load().files.filter((p) => existsSync(join(root, p)));
rmSync(file, { force: true });
// Claude is finishing the review this hook asked for; blocking again would loop
if (input.stop_hook_active || !files.length) process.exit(0);

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
