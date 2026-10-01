#!/usr/bin/env node
// Installs (or updates) the skill in one project.
// usage: node install.mjs <project dir> [--agents] [--hook] [--local]
//        node install.mjs --global [--agents] [--hook]
//   default    copies to .claude/skills   (Claude Code; Copilot and opencode read it too)
//   --agents   copies to .agents/skills   (Codex, Cursor, Copilot, Gemini CLI, opencode)
//   --hook     also adds the Claude Code review hook, to .claude/settings.json
//   --global   installs for your user instead of one project: no project dir, nothing inside any
//              repository, and the hook (with --hook) runs in every repository
//   --local    keeps the install out of git: the hook goes to .claude/settings.local.json and
//              the skill folder and that file are added to .git/info/exclude
import { execFileSync } from 'node:child_process';
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const args = process.argv.slice(2);
const global = args.includes('--global');
const project = global ? homedir() : resolve(args.find((a) => !a.startsWith('--')) ?? '');
if ((!global && !args.some((a) => !a.startsWith('--'))) || !existsSync(project)) {
  console.error('usage: node install.mjs <project dir> [--agents] [--hook] [--local]');
  console.error('       node install.mjs --global [--agents] [--hook]');
  process.exit(1);
}
const local = args.includes('--local') && !global;
const git = (...a) => execFileSync('git', a, { cwd: project, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

const skillsDir = args.includes('--agents') ? '.agents/skills' : '.claude/skills';
const dest = join(project, skillsDir, 'ai-code-guard');
rmSync(dest, { recursive: true, force: true }); // replace, so an update never nests a second copy
cpSync(join(dirname(fileURLToPath(import.meta.url)), 'skill', 'ai-code-guard'), dest, { recursive: true });
console.log(`installed: ${dest}`);

const ours = (entry) => JSON.stringify(entry).includes('stop-hook.mjs');
const read = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {}); // throws before any write if a file does not parse
// earlier versions also used PostToolUse; drop our entries from every event
function strip(settings) {
  for (const [event, list] of Object.entries(settings.hooks ?? {})) {
    settings.hooks[event] = list.filter((e) => !ours(e));
    if (!settings.hooks[event].length) delete settings.hooks[event];
  }
  if (settings.hooks && !Object.keys(settings.hooks).length) delete settings.hooks;
}

if (args.includes('--hook')) {
  const shared = join(project, '.claude', 'settings.json');
  const file = local ? join(project, '.claude', 'settings.local.json') : shared;

  if (local && JSON.stringify(read(shared)).includes('stop-hook.mjs')) {
    const settings = read(shared);
    strip(settings);
    let committed;
    try {
      committed = JSON.parse(git('show', 'HEAD:./.claude/settings.json'));
    } catch {}
    // if our entries were the only change, restore the committed file byte for byte
    if (committed && isDeepStrictEqual(committed, settings)) git('checkout', 'HEAD', '--', '.claude/settings.json');
    else if (!committed && !Object.keys(settings).length) rmSync(shared);
    else writeFileSync(shared, JSON.stringify(settings, null, 2) + '\n');
    console.log('hook: moved out of .claude/settings.json');
  }

  const settings = read(file);
  const before = JSON.stringify(settings);
  strip(settings); // also clears an outdated entry
  // a user-level hook cannot refer to a project, so it gets the absolute path
  const script = global ? dest.replaceAll('\\', '/') : `$CLAUDE_PROJECT_DIR/${skillsDir}/ai-code-guard`;
  const hook = { type: 'command', command: `node "${script}/scripts/stop-hook.mjs"` };
  // one script for both events: UserPromptSubmit snapshots the tree, Stop reviews what changed since
  for (const event of ['UserPromptSubmit', 'Stop']) ((settings.hooks ??= {})[event] ??= []).push({ hooks: [hook] });
  if (JSON.stringify(settings) !== before) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(settings, null, 2) + '\n');
  }
  console.log(`hook: in ${file}`);
}

if (local) {
  let prefix, exclude;
  try {
    prefix = git('rev-parse', '--show-prefix').trim(); // the project may be a subfolder of the repository
    exclude = resolve(project, git('rev-parse', '--git-path', 'info/exclude').trim());
  } catch {
    process.exit(0); // not a git repository: nothing to hide from
  }
  for (const path of [`${skillsDir}/ai-code-guard/`, '.claude/settings.local.json']) {
    try {
      git('check-ignore', '-q', path); // exits 0 when already ignored
    } catch {
      mkdirSync(dirname(exclude), { recursive: true });
      appendFileSync(exclude, `\n/${prefix}${path}\n`);
      console.log(`git: now ignoring ${path}`);
    }
  }
} else if (global) {
  console.log('\nInstalled for your user. Restart Claude Code sessions to pick it up.');
} else {
  console.log(`
The skill's files are untracked in that project. Commit ${skillsDir}/ai-code-guard to share it,
or run this again with --local to keep the whole install out of git.`);
}
