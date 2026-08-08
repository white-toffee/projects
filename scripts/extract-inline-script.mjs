import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = await readFile(resolve(projectRoot, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];

if (scripts.length !== 1) {
  throw new Error(`Expected exactly one inline script, found ${scripts.length}`);
}

const cacheDirectory = resolve(projectRoot, '.cache');
await mkdir(cacheDirectory, { recursive: true });
await writeFile(resolve(cacheDirectory, 'app.js'), scripts[0][1], 'utf8');
