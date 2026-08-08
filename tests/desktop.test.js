import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { MAIN_WINDOW_OPTIONS } from '../desktop/window-options.mjs';

const packageJson = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8')
);
const mainSource = await readFile(
  new URL('../desktop/main.mjs', import.meta.url),
  'utf8'
);

test('desktop renderer remains isolated from Node.js', () => {
  assert.equal(MAIN_WINDOW_OPTIONS.webPreferences.contextIsolation, true);
  assert.equal(MAIN_WINDOW_OPTIONS.webPreferences.nodeIntegration, false);
  assert.equal(MAIN_WINDOW_OPTIONS.webPreferences.sandbox, true);
});

test('desktop entry loads the existing application page', () => {
  assert.equal(packageJson.main, 'desktop/main.mjs');
  assert.match(mainSource, /\.\.['"], ['"]index\.html/);
  assert.match(mainSource, /loadFile\(applicationPage\)/);
});

test('Windows installer configuration uses NSIS', () => {
  assert.equal(packageJson.version, '0.2.0');
  assert.equal(packageJson.build.appId, 'com.soulcatcher.app');
  assert.equal(packageJson.build.productName, '灵魂捕手');
  assert.equal(packageJson.build.artifactName, '灵魂捕手0.2.${ext}');
  assert.equal(packageJson.build.electronDist, 'node_modules/electron/dist');
  assert.equal(packageJson.build.win.icon, 'build/icon.png');
  assert.equal(packageJson.build.win.target[0].target, 'nsis');
  assert.deepEqual(packageJson.build.win.target[0].arch, ['x64']);
});

test('desktop and installer icon asset exists', async () => {
  assert.match(MAIN_WINDOW_OPTIONS.icon, /build[\\/]icon\.png$/);
  await access(new URL('../build/icon.png', import.meta.url));
});
