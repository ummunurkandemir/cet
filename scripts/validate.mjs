#!/usr/bin/env node
// Structural checks for the toolkit: frontmatter, README tables, links,
// fixtures and plugin manifests. No dependencies; exits 1 on any error.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const fail = (file, msg) => errors.push(`${relative(root, file) || '.'}: ${msg}`);

const read = (p) => readFileSync(p, 'utf8');
const isDir = (p) => existsSync(p) && statSync(p).isDirectory();

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// Minimal frontmatter parser: top-level `key: value` lines only.
function frontmatter(file) {
  const m = read(file).match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  const fields = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (kv) fields[kv[1]] = kv[2].trim();
  }
  return fields;
}

function checkTools(file, fields, key) {
  const value = fields[key];
  if (!value) return fail(file, `missing \`${key}\` allowlist`);
  if (value === '*' || /all tools/i.test(value)) fail(file, `\`${key}\` must be an explicit allowlist, not "${value}"`);
}

// --- Skills ---------------------------------------------------------------
const skillsDir = join(root, 'skills');
const skills = isDir(skillsDir) ? readdirSync(skillsDir).filter((n) => isDir(join(skillsDir, n))) : [];
for (const name of skills) {
  const file = join(skillsDir, name, 'SKILL.md');
  if (!existsSync(file)) { fail(join(skillsDir, name), 'skill directory has no SKILL.md'); continue; }
  const fm = frontmatter(file);
  if (!fm) { fail(file, 'missing frontmatter'); continue; }
  if (fm.name !== name) fail(file, `name "${fm.name}" does not match directory "${name}"`);
  if (!fm.description) fail(file, 'missing description');
  if ('trigger' in fm) fail(file, '`trigger` is not a Claude Code frontmatter field; describe the trigger in `description`');
  checkTools(file, fm, 'allowed-tools');
}

// --- Agents ---------------------------------------------------------------
const agentsDir = join(root, 'agents');
const agents = [];
if (isDir(agentsDir)) {
  for (const entry of readdirSync(agentsDir)) {
    const p = join(agentsDir, entry);
    if (isDir(p)) { fail(p, 'agents must be flat files (agents/<name>.md); Claude Code does not discover subdirectories'); continue; }
    if (!entry.endsWith('.md')) continue;
    const name = entry.slice(0, -3);
    agents.push(name);
    const fm = frontmatter(p);
    if (!fm) { fail(p, 'missing frontmatter'); continue; }
    if (fm.name !== name) fail(p, `name "${fm.name}" does not match file name "${name}"`);
    if (!fm.description) fail(p, 'missing description');
    checkTools(p, fm, 'tools');
  }
}

// --- README tables --------------------------------------------------------
const readmePath = join(root, 'README.md');
const readme = read(readmePath);
for (const row of readme.split('\n').filter((l) => l.startsWith('|') && l.includes('✅'))) {
  const link = row.match(/\]\(([^)]+)\)/);
  if (!link) fail(readmePath, `available row has no link: ${row.slice(0, 60)}…`);
}
for (const name of skills) {
  if (!readme.includes(`(skills/${name}/SKILL.md)`)) fail(readmePath, `skill "${name}" is not listed in the README`);
}
for (const name of agents) {
  if (!readme.includes(`(agents/${name}.md)`)) fail(readmePath, `agent "${name}" is not listed in the README`);
}
const workflowsDir = join(root, 'workflows');
if (isDir(workflowsDir)) {
  for (const f of readdirSync(workflowsDir).filter((n) => n.endsWith('.workflow.js'))) {
    if (!readme.includes(`(workflows/${f})`)) fail(readmePath, `workflow "${f}" is not listed in the README`);
  }
}

// --- Markdown links -------------------------------------------------------
const files = walk(root);
for (const file of files.filter((f) => f.endsWith('.md'))) {
  // Ignore fenced code blocks so example snippets aren't treated as links.
  const text = read(file).replace(/```[\s\S]*?```/g, '');
  for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const path = target.split('#')[0];
    if (!existsSync(resolve(dirname(file), path))) fail(file, `broken link: ${target}`);
  }
}

// --- Fixtures -------------------------------------------------------------
for (const file of files.filter((f) => relative(root, f).startsWith('examples/') || /\/examples\//.test(f))) {
  if (statSync(file).size === 0) fail(file, 'fixture file is empty');
}

// --- Plugin manifests -----------------------------------------------------
const manifest = (p) => {
  try { return JSON.parse(read(p)); } catch (e) { fail(p, `invalid JSON: ${e.message}`); return null; }
};
const pluginPath = join(root, '.claude-plugin', 'plugin.json');
const marketPath = join(root, '.claude-plugin', 'marketplace.json');
const plugin = existsSync(pluginPath) ? manifest(pluginPath) : (fail(pluginPath, 'missing'), null);
const market = existsSync(marketPath) ? manifest(marketPath) : (fail(marketPath, 'missing'), null);
if (plugin && market) {
  const entry = market.plugins?.find((p) => p.name === plugin.name);
  if (!entry) fail(marketPath, `does not list plugin "${plugin.name}"`);
  else if (entry.version && entry.version !== plugin.version) {
    fail(marketPath, `version ${entry.version} differs from plugin.json ${plugin.version}`);
  }
  for (const wf of plugin.workflows ?? []) {
    if (!existsSync(resolve(root, wf))) fail(pluginPath, `workflow not found: ${wf}`);
  }
}

// --- Report ---------------------------------------------------------------
if (errors.length) {
  console.error(`✘ ${errors.length} problem(s):\n` + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}
console.log(`✔ ${skills.length} skills, ${agents.length} agents, README, links, fixtures and manifests OK`);
