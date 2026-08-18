import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('page contains one inline application script', () => {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
  assert.equal(scripts.length, 1);
  assert.doesNotThrow(() => new Function(scripts[0][1]));
});

test('interactive element IDs are unique', () => {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
});

test('required application controls exist', () => {
  const requiredIds = [
    'settingsBtn',
    'leftList',
    'rightBoard',
    'importClipboardBtn',
    'saveBtn',
    'logPanel',
    'toast'
  ];

  for (const id of requiredIds) {
    assert.match(html, new RegExp(`\\sid="${id}"`));
  }
});

test('page follows the Electron content area without resizing the window', () => {
  assert.match(html, /width:\s*100%;\s*height:\s*100%;\s*overflow:\s*hidden/);
  assert.doesNotMatch(html, /window\.resizeTo|window\.moveTo/);
});
