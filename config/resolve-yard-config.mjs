// Picks the yard config file for this build. Plain Node, no dependencies, so
// next.config.ts and vitest.config.mts can both use it. The chosen file is aliased
// to the module id `@yard-config` and validated by src/lib/domain/yard-config.ts.
//
// Resolution order, first existing file wins:
//   1. $GREENKEEPER_CONFIG (must exist when set)
//   2. personal/greenkeeper.config.json
//   3. config/greenkeeper.config.json
//   4. config/greenkeeper.example.json

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const YARD_CONFIG_MODULE = '@yard-config';
export const YARD_CONFIG_ENV = 'GREENKEEPER_CONFIG';

const PROJECT_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CANDIDATES = [
  path.join('personal', 'greenkeeper.config.json'),
  path.join('config', 'greenkeeper.config.json'),
  path.join('config', 'greenkeeper.example.json'),
];
// Turbopack only resolves files inside the project root, so a config that lives
// elsewhere is staged here (node_modules is already ignored by git).
const STAGED_PATH = path.join('node_modules', '.cache', 'greenkeeper', 'yard-config.json');

function assertReadableJson(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (error) {
    throw new Error(`Greenkeeper yard config ${file} cannot be read: ${error.message}`);
  }
  try {
    JSON.parse(text);
  } catch (error) {
    throw new Error(`Greenkeeper yard config ${file} is not valid JSON: ${error.message}`);
  }
  return text;
}

/** Absolute path of the yard config file that wins, before staging. */
export function findYardConfig({ root = PROJECT_ROOT, env = process.env } = {}) {
  const fromEnv = env[YARD_CONFIG_ENV]?.trim();
  if (fromEnv) {
    const file = path.resolve(root, fromEnv);
    if (!fs.existsSync(file)) {
      throw new Error(`${YARD_CONFIG_ENV} points to ${file}, which does not exist`);
    }
    return file;
  }
  const found = CANDIDATES.map((candidate) => path.join(root, candidate)).find((file) => fs.existsSync(file));
  if (!found) throw new Error(`No Greenkeeper yard config found; expected one of: ${CANDIDATES.join(', ')}`);
  return found;
}

/**
 * Path to alias `@yard-config` to. Checks the file parses as JSON and, when it sits
 * outside the project root, copies it inside so every bundler can resolve it.
 */
export function resolveYardConfig(options = {}) {
  const root = options.root ?? PROJECT_ROOT;
  const file = findYardConfig({ ...options, root });
  const text = assertReadableJson(file);
  const relative = path.relative(root, file);
  if (!relative.startsWith('..') && !path.isAbsolute(relative)) return file;

  const staged = path.join(root, STAGED_PATH);
  fs.mkdirSync(path.dirname(staged), { recursive: true });
  fs.writeFileSync(staged, text);
  return staged;
}

/** Turbopack aliases take project-relative paths ('./config/...'), not absolute ones. */
export function toProjectRelative(file, root = PROJECT_ROOT) {
  return `./${path.relative(root, file).split(path.sep).join('/')}`;
}
