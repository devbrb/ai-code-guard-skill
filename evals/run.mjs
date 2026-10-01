#!/usr/bin/env node
// Scores the skill against the cases in evals/cases.
// usage: node evals/run.mjs [--dry] [case ...]
//   --dry   skip the agent; only check that collect.mjs reports each case's files
//
// Each case is copied, with the fixture app and the skill, into a throwaway git repo. The
// agent is asked for a JSON review, which is compared with the case's expected.json.
// To score another agent, set GUARD_AGENT_CMD (a command that reads the prompt on stdin
// and prints the answer) and GUARD_SKILLS_DIR (where that agent looks for skills).
import { execFileSync, spawn } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const AGENT_CMD =
  process.env.GUARD_AGENT_CMD ??
  'claude -p --setting-sources project --allowedTools "Read,Grep,Glob,Bash(node:*),Bash(git:*),PowerShell(node:*),PowerShell(git:*)"';
const SKILLS_DIR = process.env.GUARD_SKILLS_DIR ?? '.claude/skills';
const PROMPT =
  'Use the ai-code-guard skill to review the uncommitted changes in this repository. Output the JSON format only.';
const RANK = { low: 1, medium: 2, high: 3, critical: 4 };
const CONCURRENCY = 4;

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const only = args.filter((a) => !a.startsWith('--'));
const slash = (p) => String(p).replaceAll('\\', '/');
const label = (f) => `${f.severity} ${f.category} ${slash(f.file)}`;

function setup(name) {
  const repo = mkdtempSync(join(tmpdir(), 'guard-eval-'));
  cpSync(join(here, 'fixture'), repo, { recursive: true });
  cpSync(join(here, '..', 'skill', 'ai-code-guard'), join(repo, SKILLS_DIR, 'ai-code-guard'), { recursive: true });
  const git = (...a) => execFileSync('git', a, { cwd: repo, stdio: 'pipe' });
  git('init', '-q');
  git('add', '-A');
  git('-c', 'user.name=eval', '-c', 'user.email=eval@localhost', 'commit', '-qm', 'base');
  cpSync(join(here, 'cases', name, 'files'), repo, { recursive: true });
  return repo;
}

function score(expected, review) {
  const findings = review.findings ?? [];
  if (expected.clean) {
    const noisy = findings.filter((f) => RANK[f.severity] >= RANK.medium);
    return { pass: noisy.length === 0, detail: noisy.map(label).join('; ') };
  }
  const hit = findings.find(
    (f) =>
      expected.category.includes(f.category) &&
      RANK[f.severity] >= RANK[expected.minSeverity] &&
      (!expected.file || slash(f.file).endsWith(expected.file)),
  );
  const wanted = `wanted ${expected.minSeverity}+ ${expected.category.join('/')} ${expected.file ?? ''}`;
  return { pass: !!hit, detail: hit ? label(hit) : `${wanted}; got ${findings.map(label).join('; ') || 'no findings'}` };
}

const runAgent = (cwd) =>
  new Promise((resolve) => {
    // PWD too: some agents (opencode) take their working directory from it, not from the process cwd
    const p = spawn(AGENT_CMD, { cwd, shell: true, env: { ...process.env, PWD: cwd } });
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('close', () => resolve({ out, err }));
    p.stdin.end(PROMPT);
  });

const results = [];
async function runCase(name) {
  const dir = join(here, 'cases', name);
  const expected = JSON.parse(readFileSync(join(dir, 'expected.json'), 'utf8'));
  const repo = setup(name);
  let result;
  if (dry) {
    const collect = join(SKILLS_DIR, 'ai-code-guard', 'scripts', 'collect.mjs');
    const seen = JSON.parse(execFileSync('node', [collect], { cwd: repo, encoding: 'utf8' })).files.map((f) => f.path);
    const want = readdirSync(join(dir, 'files'), { recursive: true })
      .filter((p) => statSync(join(dir, 'files', p)).isFile())
      .map(slash);
    result = { pass: seen.sort().join() === want.sort().join(), detail: `${seen.length} changed files` };
  } else {
    const { out, err } = await runAgent(repo);
    writeFileSync(join(here, 'results', `${name}.txt`), err ? `${out}\n--- stderr ---\n${err}` : out);
    try {
      result = score(expected, JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1)));
    } catch {
      result = { pass: false, detail: 'no JSON in the output, see evals/results' };
    }
  }
  rmSync(repo, { recursive: true, force: true, maxRetries: 3 });
  results.push({ clean: !!expected.clean, ...result });
  console.log(`${result.pass ? 'PASS' : 'FAIL'}  ${name}  ${result.detail}`);
}

mkdirSync(join(here, 'results'), { recursive: true });
const queue = readdirSync(join(here, 'cases')).filter((n) => !only.length || only.includes(n));
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) await runCase(queue.shift());
  }),
);

if (dry) process.exit(results.every((r) => r.pass) ? 0 : 1);

const bad = results.filter((r) => !r.clean);
const clean = results.filter((r) => r.clean);
const caught = bad.filter((r) => r.pass).length;
const noisy = clean.filter((r) => !r.pass).length;
console.log(`\ncaught ${caught}/${bad.length}, false positives ${noisy}/${clean.length}`);
// pass bar: at least 80% of the seeded problems caught, at most one clean change flagged
process.exit(caught >= 0.8 * bad.length && noisy <= 1 ? 0 : 1);
