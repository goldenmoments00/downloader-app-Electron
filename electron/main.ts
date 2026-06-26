import { app, BrowserWindow, ipcMain, clipboard, shell, dialog, screen } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { startDownload, getVideoInfo } from './downloader';
import { getSettings, saveSettings } from './settings';
import { checkNasConnection, scanNasFolders, validateNasPath } from './nas';
import { autoUpdater } from 'electron-updater';
import { initDb, syncNasLibrary, searchDuplicate, insertFileToIndex } from './db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Disable GPU Acceleration for Windows 7/8/10 if having issues, but usually fine
// app.disableHardwareAcceleration()

let mainWindow: BrowserWindow | null = null;
let isIconMode = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 320,
    height: 500,
    title: 'Golden Media Hub',
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  // Ensure window is always on top even across virtual desktops
  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  setInterval(() => {
    if (isIconMode && mainWindow) {
      const bounds = mainWindow.getBounds();
      const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
      const workArea = display.workArea;

      const targetX = Math.round(workArea.x + workArea.width - bounds.width);
      
      // Permanently lock the X coordinate to the right edge
      if (Math.abs(bounds.x - targetX) > 2) {
        mainWindow.setBounds({
          x: targetX,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height
        });
      }
    }
  }, 50);
}

app.whenReady().then(() => {
  console.log('App is ready, creating window...');
  createWindow();
  console.log('Window created.');
  
  // Initialize SQLite Library Index
  initDb();
  
  // Sync NAS library asynchronously
  checkNasConnection().then(status => {
    if (status === 'Connected') {
      syncNasLibrary();
    }
  });

  // Auto Updater Logic
  if (app.isPackaged) {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    
    autoUpdater.checkForUpdatesAndNotify().catch(err => {
      console.error('Failed to check for updates:', err);
    });

    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info.version);
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info.version);
      // Automatically quit and install when downloaded
      autoUpdater.quitAndInstall(false, true);
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}).catch(err => {
  console.error('Failed during app.whenReady:', err);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Features IPC
ipcMain.handle('read-clipboard', () => clipboard.readText());
ipcMain.handle('open-folder', (_, path) => shell.openPath(path));
ipcMain.handle('show-item-in-folder', (_, path) => shell.showItemInFolder(path));
ipcMain.handle('show-save-dialog', async (_, defaultFilename) => {
  console.log('Opening save dialog for:', defaultFilename);
  
  // Temporarily disable alwaysOnTop if mainWindow exists
  const wasOnTop = mainWindow ? mainWindow.isAlwaysOnTop() : false;
  if (mainWindow && wasOnTop) mainWindow.setAlwaysOnTop(false);

  try {
    // Omitting mainWindow makes this a top-level independent dialog
    const result = await dialog.showSaveDialog({
      title: 'Save Media',
      defaultPath: defaultFilename,
      buttonLabel: 'Save',
    });
    
    console.log('Save dialog result:', result);
    
    if (mainWindow && wasOnTop) mainWindow.setAlwaysOnTop(true, 'screen-saver');
    
    return result.filePath;
  } catch (error) {
    console.error('Error showing save dialog:', error);
    if (mainWindow && wasOnTop) mainWindow.setAlwaysOnTop(true, 'screen-saver');
    return null;
  }
});

ipcMain.on('start-download', (_, job) => {
  console.log('Starting download for job:', job);
  startDownload(job, mainWindow);
});

ipcMain.handle('get-video-info', async (_, url) => {
  return await getVideoInfo(url);
});

ipcMain.handle('check-duplicate', (_, targetDir, cleanName, brandedName, ext) => {
  // Global search using the SQLite index (which searches clean_name OR filename)
  const matches = searchDuplicate(cleanName);
  
  // Also check if it exists exactly in the targetDir with the BRANDED name to calculate nextVersionName
  const exactTargetExists = fs.existsSync(join(targetDir, `${brandedName}${ext}`));
  
  let nextVersionName = `${brandedName}${ext}`;
  if (exactTargetExists) {
    let counter = 2;
    while (fs.existsSync(join(targetDir, `${brandedName} (${counter})${ext}`))) {
      counter++;
    }
    nextVersionName = `${brandedName} (${counter})${ext}`;
  }
  
  return { 
    exists: matches.length > 0, 
    matches, 
    nextVersionName 
  };
});

ipcMain.on('insert-to-index', (_, filename, cleanName, category, fullPath) => {
  insertFileToIndex(filename, cleanName, category, fullPath);
});


// Window controls
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-close', () => mainWindow?.close());
ipcMain.on('window-resize', (_, width, height) => {
  if (mainWindow) {
    const bounds = mainWindow.getBounds();
    const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
    const workArea = display.workArea;

    let newX = bounds.x;
    let newY = bounds.y;

    // Push left if it goes off the right screen edge
    if (newX + width > workArea.x + workArea.width) {
      newX = workArea.x + workArea.width - width;
    }
    
    // Push up if it goes off the bottom screen edge
    if (newY + height > workArea.y + workArea.height) {
      newY = workArea.y + workArea.height - height;
    }

    // Ensure it doesn't go off the top/left
    if (newX < workArea.x) newX = workArea.x;
    if (newY < workArea.y) newY = workArea.y;

    mainWindow.setBounds({ x: Math.round(newX), y: Math.round(newY), width, height });
  }
});
ipcMain.on('set-icon-mode', (_, active) => {
  isIconMode = active;
});

// NAS & Settings IPCs
ipcMain.handle('get-settings', () => getSettings());
ipcMain.handle('save-settings', (_, settings) => saveSettings(settings));
ipcMain.handle('get-nas-status', () => checkNasConnection());
ipcMain.handle('scan-nas-folders', () => scanNasFolders());
ipcMain.handle('validate-nas-path', (_, path) => validateNasPath(path));

ipcMain.handle('select-folder', async () => {
  if (!mainWindow) return null;
  
  const wasOnTop = mainWindow.isAlwaysOnTop();
  if (wasOnTop) mainWindow.setAlwaysOnTop(false);

  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });
    
    if (wasOnTop) mainWindow.setAlwaysOnTop(true, 'screen-saver');
    return result.canceled ? null : result.filePaths[0];
  } catch (error) {
    console.error('Error showing open dialog:', error);
    if (wasOnTop) mainWindow.setAlwaysOnTop(true, 'screen-saver');
    return null;
  }
});
