// Electron preload —— 仅暴露最小 IPC 接口给渲染进程。
// 渲染进程通过 contextBridge 拿到 `window.clipboardBridge` 后,即可监听
// 主进程推送的剪贴板变化事件。
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clipboardBridge', {
  onText(callback) {
    if (typeof callback !== 'function') return () => {};
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('clipboard:text', handler);
    return () => ipcRenderer.removeListener('clipboard:text', handler);
  },
  onImage(callback) {
    if (typeof callback !== 'function') return () => {};
    // 主进程把图片二进制以 ArrayBuffer 传过来,这里转成 Blob 再回调
    const handler = (_event, payload) => {
      const buffer = payload instanceof ArrayBuffer
        ? payload
        : (payload && payload.buffer) || null;
      if (!buffer) return;
      const blob = new Blob([buffer], { type: 'image/png' });
      callback(blob);
    };
    ipcRenderer.on('clipboard:image', handler);
    return () => ipcRenderer.removeListener('clipboard:image', handler);
  },
  // 心跳探测:向主进程发 ping,主进程返回 pong。
  // 渲染进程通过超时未响应判断连接状态。
  pingStatus(timeoutMs) {
    const timeout = typeof timeoutMs === 'number' && timeoutMs > 0 ? timeoutMs : 1500;
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), timeout);
      try {
        ipcRenderer.invoke('clipboard:status:ping').then(
          () => { clearTimeout(timer); resolve(true); },
          () => { clearTimeout(timer); resolve(false); },
        );
      } catch {
        clearTimeout(timer);
        resolve(false);
      }
    });
  },
  // 主动读取系统剪贴板,主进程实现,不依赖渲染窗口焦点
  readClipboard() {
    return ipcRenderer.invoke('clipboard:read');
  },
});
