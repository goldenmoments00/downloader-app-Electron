export interface ElectronAPI {
  readClipboard: () => Promise<string>;
  openFolder: (path: string) => Promise<string>;
  showSaveDialog: (defaultFilename: string) => Promise<string | null>;
  startDownload: (job: { id: number; url: string; quality: string; outputPath: string; cleanName?: string; embedArtwork?: boolean }) => void;
  onDownloadProgress: (callback: (data: any) => void) => void;
  onDownloadComplete: (callback: (data: any) => void) => void;
  windowMinimize: () => void;
  windowClose: () => void;
  resizeWindow: (width: number, height: number) => void;
  setIconMode: (active: boolean) => void;
  getSettings: () => Promise<any>;
  saveSettings: (settings: any) => Promise<void>;
  getNasStatus: () => Promise<'Connected' | 'Connecting' | 'Offline' | 'Access Denied'>;
  scanNasFolders: () => Promise<string[]>;
  selectFolder: () => Promise<string | null>;
  validateNasPath: (path: string) => Promise<boolean>;
  getVideoInfo: (url: string) => Promise<string | null>;
  checkDuplicate: (targetDir: string, cleanName: string, brandedName: string, ext: string) => Promise<{ exists: boolean; matches: any[]; nextVersionName: string }>;
  insertToIndex: (filename: string, cleanName: string, category: string, fullPath: string) => void;
  showItemInFolder: (path: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
