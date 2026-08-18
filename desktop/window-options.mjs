// preload 用相对路径(__dirname 在 Electron 里指向 desktop 目录)
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const preloadPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  'preload.mjs',
);
const iconPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'build',
  'icon.png',
);

export const APP_ID = 'com.soulcatcher.app';

export const MAIN_WINDOW_OPTIONS = Object.freeze({
  width: 1200,
  height: 800,
  minWidth: 1000,
  minHeight: 700,
  useContentSize: true,
  icon: iconPath,
  show: false,
  backgroundColor: '#f5f4ef',
  webPreferences: Object.freeze({
    preload: preloadPath,
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
  }),
});
