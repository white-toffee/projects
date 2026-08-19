import { app, BrowserWindow, Menu, clipboard, ipcMain } from 'electron';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_ID, MAIN_WINDOW_OPTIONS } from './window-options.mjs';
import {
  createContentHash,
  createRecentContentCache,
  isDuplicateContent,
} from './clipboard-dedupe.mjs';

const desktopDirectory = dirname(fileURLToPath(import.meta.url));
const applicationPage = resolve(desktopDirectory, '..', 'index.html');

const CLIPBOARD_POLL_MS = 750;

const watchers = new Map(); // windowId -> clipboard watcher state

function startClipboardWatcher(window) {
  if (!window || window.isDestroyed()) return;
  if (watchers.has(window.id)) return;

  const recent = createRecentContentCache();
  // 记录基线:启动时把当前剪贴板内容记下来,但不推送
  const initialText = clipboard.readText();
  const initialImage = clipboard.readImage();
  const initialImageHash = initialImage.isEmpty()
    ? ''
    : createContentHash(initialImage.toPNG());

  const state = {
    timer: null,
    lastText: initialText,
    lastImageHash: initialImageHash,
    recent,
  };

  state.timer = setInterval(() => {
    if (window.isDestroyed()) {
      stopClipboardWatcher(window);
      return;
    }
    // 文本
    const text = clipboard.readText();
    if (text && text !== state.lastText) {
      state.lastText = text;
      const hash = createContentHash(text);
      if (!isDuplicateContent(recent, 'text', hash)) {
        window.webContents.send('clipboard:text', text);
      }
    }
    // 图片
    const img = clipboard.readImage();
    if (!img.isEmpty()) {
      const pngBuffer = img.toPNG();
      const hash = createContentHash(pngBuffer);
      if (hash !== state.lastImageHash) {
        state.lastImageHash = hash;
        if (!isDuplicateContent(recent, 'image', hash)) {
          // 用 ArrayBuffer 传 PNG,渲染进程那边转 Blob
          const ab = pngBuffer.buffer.slice(
            pngBuffer.byteOffset,
            pngBuffer.byteOffset + pngBuffer.byteLength,
          );
          window.webContents.send('clipboard:image', ab);
        }
      }
    }
  }, CLIPBOARD_POLL_MS);

  watchers.set(window.id, state);
}

function stopClipboardWatcher(window) {
  const state = watchers.get(window.id);
  if (!state) return;
  if (state.timer) clearInterval(state.timer);
  watchers.delete(window.id);
}

async function createMainWindow() {
  const mainWindow = new BrowserWindow(MAIN_WINDOW_OPTIONS);
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // 等到页面真正开始渲染再启动剪贴板监听,避免捕获启动时的一次性基线变更
    startClipboardWatcher(mainWindow);
  });
  mainWindow.on('closed', () => stopClipboardWatcher(mainWindow));
  await mainWindow.loadFile(applicationPage);
  return mainWindow;
}

function reportWindowCreationFailure(error) {
  console.error('[desktop window]', error);
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  startPrimaryInstance();
}

function startPrimaryInstance() {
  // 渲染进程健康探测:立即返回 ok,让前端维持心跳
  ipcMain.handle('clipboard:status:ping', () => ({ ok: true, ts: Date.now() }));

  // 主动导入不依赖渲染窗口焦点。
  ipcMain.handle('clipboard:read', () => {
    const text = clipboard.readText();
    const img = clipboard.readImage();
    let imageDataUrl = null;
    if (!img.isEmpty()) {
      try { imageDataUrl = img.toDataURL(); } catch { imageDataUrl = null; }
    }
    return { text: text || null, imageDataUrl };
  });

  app.setAppUserModelId(APP_ID);
  Menu.setApplicationMenu(null);

  app.on('second-instance', () => {
    const [mainWindow] = BrowserWindow.getAllWindows();
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady()
    .then(async () => {
      await createMainWindow();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createMainWindow().catch(reportWindowCreationFailure);
        }
      });
    })
    .catch(reportWindowCreationFailure);

  app.on('window-all-closed', () => {
    for (const win of BrowserWindow.getAllWindows()) {
      stopClipboardWatcher(win);
    }
    if (process.platform !== 'darwin') app.quit();
  });
}
