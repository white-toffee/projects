import { app, BrowserWindow, Menu, clipboard, ipcMain } from 'electron';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_ID, MAIN_WINDOW_OPTIONS } from './window-options.mjs';

const desktopDirectory = dirname(fileURLToPath(import.meta.url));
const applicationPage = resolve(desktopDirectory, '..', 'index.html');

const CLIPBOARD_POLL_MS = 500;       // 轮询周期
const CLIPBOARD_DEDUPE_MS = 60_000;  // 同一内容 60 秒内不再重复入库
const IMAGE_SIG_LEN = 256;            // 图片签名长度,够判等且足够轻

// 状态:每个窗口绑一份(多窗口可扩展)
const watchers = new Map(); // windowId -> { timer, lastText, lastImageSig, recent }

function makeRecentRing() {
  return { text: new Map(), image: new Map() }; // content -> timestamp
}

function isDuplicate(recent, kind, key) {
  const bucket = recent[kind];
  const now = Date.now();
  // 清理过期条目
  for (const [k, ts] of bucket) {
    if (now - ts > CLIPBOARD_DEDUPE_MS) bucket.delete(k);
  }
  if (bucket.has(key)) return true;
  bucket.set(key, now);
  return false;
}

function startClipboardWatcher(window) {
  if (!window || window.isDestroyed()) return;
  if (watchers.has(window.id)) return;

  const recent = makeRecentRing();
  // 记录基线:启动时把当前剪贴板内容记下来,但不推送
  const initialText = clipboard.readText();
  const initialImage = clipboard.readImage();
  const initialImageSig = initialImage.isEmpty()
    ? ''
    : initialImage.toDataURL().slice(0, IMAGE_SIG_LEN);

  const state = {
    timer: null,
    lastText: initialText,
    lastImageSig: initialImageSig,
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
      const key = text.slice(0, 256);
      if (!isDuplicate(recent, 'text', key)) {
        window.webContents.send('clipboard:text', text);
      }
    }
    // 图片
    const img = clipboard.readImage();
    if (!img.isEmpty()) {
      const sig = img.toDataURL().slice(0, IMAGE_SIG_LEN);
      if (sig !== state.lastImageSig) {
        state.lastImageSig = sig;
        if (!isDuplicate(recent, 'image', sig)) {
          // 用 ArrayBuffer 传 PNG,渲染进程那边转 Blob
          const pngBuffer = img.toPNG();
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

// ipcMain 这里没有 handle,但保留 import 占位,后续如需渲染进程主动询问可扩展
void ipcMain;

// 渲染进程健康探测:立即返回 ok,让前端维持心跳
ipcMain.handle('clipboard:status:ping', () => ({ ok: true, ts: Date.now() }));

// 渲染进程主动导入:在主进程里读剪贴板,不依赖渲染窗口的焦点
// (navigator.clipboard.read() 在窗口失焦时会抛 "Document is not focused")
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
  // 关闭前清理所有 watcher
  for (const win of BrowserWindow.getAllWindows()) {
    stopClipboardWatcher(win);
  }
  if (process.platform !== 'darwin') app.quit();
});
