#!/usr/bin/env node
// Runs the review headless and turns its verdict into an exit code, for CI.
// usage: node ci.mjs [--base <ref>]     (default: uncommitted changes against HEAD)
// exit:  0 = PASS or WARN, 1 = BLOCK, 2 = the review did not produce a result
// The agent is GUARD_AGENT_CMD: any command that reads the prompt on stdin and prints the reply.
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'HEAD';
// the ref goes into the prompt, so accept only what a ref name can look like
if (!/^[\w./-]+$/.test(base ?? '')) {
  console.error(`ai-code-guard: invalid --base "${base}"`);
  process.exit(2);
}

const cmd =
  process.env.GUARD_AGENT_CMD ??
  'claude -p --allowedTools "Read,Grep,Glob,Bash(node:*),Bash(git:*),PowerShell(node:*),PowerShell(git:*)"';
const target = base === 'HEAD' ? 'the uncommitted changes in this repository' : `this branch against ${base}`;
const prompt = `Use the ai-code-guard skill to review ${target}. Output the JSON format only.`;

const out =
  spawnSync(cmd, {
    shell: true,
    input: prompt,
    encoding: 'utf8',
    maxBuffer: 1 << 28,
    stdio: ['pipe', 'pipe', 'inherit'],
    // PWD too: some agents take their working directory from it, not from the process cwd
    env: { ...process.env, PWD: process.cwd() },
  }).stdout ?? '';

let review;
try {
  // agents often wrap the object in a code fence or a sentence
  review = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
} catch {}
if (!Array.isArray(review?.findings)) {
  console.error(`ai-code-guard: the agent did not return a review.\n${out}`);
  process.exit(2);
}

// the verdict is computed here, by the skill's rule, and not taken from the agent: agents mislabel it
const serious = (f) => f.severity === 'critical' || f.severity === 'high';
const verdict = review.findings.some((f) => serious(f) && f.confidence === 'high')
  ? 'BLOCK'
  : review.findings.some((f) => serious(f) || f.severity === 'medium')
    ? 'WARN'
    : 'PASS';

console.log(`AI CODE GUARD — ${verdict}`);
for (const f of review.findings) {
  console.log(`\n${String(f.severity).toUpperCase()} · ${f.category} · confidence ${f.confidence}`);
  console.log(`${f.file}:${f.line}\n${f.problem}\nFix: ${f.fix}`);
}
process.exit(verdict === 'BLOCK' ? 1 : 0);
