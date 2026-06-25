import { contextBridge, ipcRenderer } from 'electron';

export const electronAPI = {
  readClipboard: () => ipcRenderer.invoke('read-clipboard'),
  openFolder: (path: string) => ipcRenderer.invoke('open-folder', path),
  showSaveDialog: (defaultFilename: string) => ipcRenderer.invoke('show-save-dialog', defaultFilename),
  startDownload: (job: any) => ipcRenderer.send('start-download', job),
  onDownloadProgress: (callback: (data: any) => void) => {
    ipcRenderer.removeAllListeners('download-progress');
    ipcRenderer.on('download-progress', (_, data) => callback(data));
  },
  onDownloadComplete: (callback: (data: any) => void) => {
    ipcRenderer.removeAllListeners('download-complete');
    ipcRenderer.on('download-complete', (_, data) => callback(data));
  },
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowClose: () => ipcRenderer.send('window-close'),
  resizeWindow: (width: number, height: number) => ipcRenderer.send('window-resize', width, height),
  setIconMode: (active: boolean) => ipcRenderer.send('set-icon-mode', active),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  getNasStatus: () => ipcRenderer.invoke('get-nas-status'),
  scanNasFolders: () => ipcRenderer.invoke('scan-nas-folders'),
  validateNasPath: (path: string) => ipcRenderer.invoke('validate-nas-path', path),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getVideoInfo: (url: string) => ipcRenderer.invoke('get-video-info', url),
  checkDuplicate: (targetDir: string, baseName: string, ext: string) => ipcRenderer.invoke('check-duplicate', targetDir, baseName, ext),
  insertToIndex: (filename: string, cleanName: string, category: string, fullPath: string) => ipcRenderer.send('insert-to-index', filename, cleanName, category, fullPath),
  showItemInFolder: (path: string) => ipcRenderer.invoke('show-item-in-folder', path),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
