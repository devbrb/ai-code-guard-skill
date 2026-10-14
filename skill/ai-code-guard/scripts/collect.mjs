#!/usr/bin/env node
// Collects the facts for a review and prints them as one JSON object:
// changed files, added line ranges, the diff, and output from installed scanners.
// usage: node collect.mjs [--base <ref>] [--only <path>...]
//   --base   compare against this ref (default: uncommitted changes against HEAD)
//   --only   limit the review to these paths; it must come last
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

const MAX = 200_000; // chars of diff / tool output passed on to the reviewer
const args = process.argv.slice(2);
const baseArg = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'HEAD';
const only = args.includes('--only') ? ['--', ...args.slice(args.indexOf('--only') + 1)] : [];

const git = (...a) =>
  execFileSync('git', ['-c', 'core.quotepath=off', '-c', 'core.safecrlf=false', ...a], { encoding: 'utf8', maxBuffer: 1 << 28 });
const diffArgs = ['--no-color', '--no-ext-diff', '--src-prefix=a/', '--dst-prefix=b/'];

const base = git('merge-base', baseArg, 'HEAD').trim();
const files = new Map();

// tracked changes: "M\0path\0" or "R100\0old\0new\0"
const ns = git('diff', '--name-status', '-z', base, ...only).split('\0').filter(Boolean);
for (let i = 0; i < ns.length; ) {
  const status = ns[i++][0];
  if (status === 'R' || status === 'C') i++; // skip the old path
  files.set(ns[i], { path: ns[i++], status, addedLines: [] });
}

// added line ranges from the zero-context diff's hunk headers
let current;
for (const line of git('diff', '-U0', ...diffArgs, base, ...only).split('\n')) {
  if (line.startsWith('+++ ')) current = files.get(line.slice(6).trimEnd());
  const hunk = /^@@ -\S+ \+(\d+)(?:,(\d+))? @@/.exec(line);
  if (hunk && current) {
    const start = Number(hunk[1]);
    const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
    if (count > 0) current.addedLines.push([start, start + count - 1]);
  }
}

// untracked files are entirely new
for (const path of git('ls-files', '--others', '--exclude-standard', '-z', ...only).split('\0').filter(Boolean)) {
  files.set(path, { path, status: 'A', untracked: true, addedLines: [] });
}

const isCode = (p) => /\.[cm]?[jt]sx?$/.test(p);
for (const f of files.values()) {
  if (f.status === 'D' || statSync(f.path).size > 1_000_000) continue;
  const text = readFileSync(f.path, 'utf8');
  if (f.untracked) f.addedLines = [[1, text.split('\n').length]];
  if (/(^|\/)package\.json$/.test(f.path)) {
    const deps = (json) => {
      try {
        const p = JSON.parse(json);
        return { ...p.dependencies, ...p.devDependencies, ...p.peerDependencies, ...p.optionalDependencies };
      } catch {
        return {};
      }
    };
    let before = '{}';
    try {
      before = execFileSync('git', ['show', `${base}:${f.path}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    } catch {} // new file: everything in it is added
    const old = deps(before);
    f.addedDependencies = Object.keys(deps(text)).filter((name) => !(name in old));
  }
  if (!isCode(f.path)) continue;
  // the directive must be the first statement; only comments may come before it
  f.clientDirective = /^\s*(?:\/\/.*\r?\n\s*|\/\*[\s\S]*?\*\/\s*)*['"]use client['"]/.test(text);
  f.envRefs = [...new Set([...text.matchAll(/(?:process|import\.meta)\.env\.([A-Za-z0-9_]+)/g)].map((m) => m[1]))];
}

const present = [...files.values()].filter((f) => f.status !== 'D').map((f) => f.path);
const code = present.filter(isCode);
const tools = [
  code.length && { name: 'eslint', cmd: `npx --no-install eslint --format json ${code.map((p) => `"${p}"`).join(' ')}` },
  present.some((p) => /(^|\/)package(-lock)?\.json$/.test(p)) && { name: 'npm-audit', cmd: 'npm audit --json' },
]
  .filter(Boolean)
  .map(({ name, cmd }) => {
    const out = (spawnSync(cmd, { shell: true, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 120_000 }).stdout || '').trim();
    // both tools exit non-zero when they find something, so judge by whether JSON came back
    if (!/^[[{]/.test(out)) return { name, status: 'unavailable' };
    return { name, status: 'ran', output: out.slice(0, MAX), truncated: out.length > MAX };
  });

const diff = git('diff', ...diffArgs, base, ...only);
console.log(
  JSON.stringify({ base, files: [...files.values()], diff: diff.slice(0, MAX), diffTruncated: diff.length > MAX, tools }, null, 1),
);
