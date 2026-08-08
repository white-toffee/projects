interface Window {
  clipboardBridge?: ClipboardBridge;
  showDirectoryPicker(options?: {
    mode?: 'read' | 'readwrite';
  }): Promise<FileSystemDirectoryHandle>;
}

interface ClipboardBridge {
  onText(callback: (text: string) => void | Promise<void>): () => void;
  onImage(callback: (image: Blob) => void | Promise<void>): () => void;
  pingStatus(timeoutMs?: number): Promise<boolean>;
  readClipboard(): Promise<ClipboardReadResult>;
}

interface ClipboardReadResult {
  text: string;
  imageDataUrl: string | null;
}
