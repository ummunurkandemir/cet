#!/usr/bin/env node
// Syntax-checks Workflow scripts. They are not plain modules: the body runs
// inside an async function (top-level await and return are allowed) with
// agent/parallel/pipeline/phase/log/args/budget/workflow injected. Wrap
// each script the same way and let the JS parser compile it.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
const GLOBALS = ['agent', 'parallel', 'pipeline', 'phase', 'log', 'args', 'budget', 'workflow'];

const files = ['workflows', 'templates']
  .filter((d) => existsSync(join(root, d)))
  .flatMap((d) => readdirSync(join(root, d)).filter((f) => f.endsWith('.js')).map((f) => join(d, f)));

let failed = 0;
for (const file of files) {
  const src = readFileSync(join(root, file), 'utf8');
  if (!/^\s*(\/\/.*\n\s*)*export const meta = \{/m.test(src)) {
    console.error(`✘ ${file}: must start with \`export const meta = {...}\``);
    failed++;
    continue;
  }
  try {
    new AsyncFunction(...GLOBALS, src.replace(/export const meta/, 'const meta'));
  } catch (e) {
    console.error(`✘ ${file}: ${e.message}`);
    failed++;
  }
}
if (failed) process.exit(1);
console.log(`✔ ${files.length} workflow script(s) parse`);
