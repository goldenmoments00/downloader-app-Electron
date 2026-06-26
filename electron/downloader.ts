import { spawn } from 'child_process';
import { join } from 'path';
import { app, BrowserWindow } from 'electron';

export interface DownloadJob {
  id: number;
  url: string;
  quality: string;
  outputPath: string;
  cleanName?: string;
  embedArtwork?: boolean;
}

export function startDownload(job: DownloadJob, mainWindow: BrowserWindow | null) {
  if (!mainWindow) return;

  const binDir = app.isPackaged ? join(process.resourcesPath, 'bin') : join(process.cwd(), 'bin');
  const binPath = join(binDir, 'yt-dlp.exe');
  
  let formatString = '';
  switch (job.quality) {
    case 'Best Quality':
      formatString = 'bestvideo+bestaudio/best';
      break;
    case '1080p':
      formatString = 'bestvideo[height<=1080]+bestaudio/best';
      break;
    case '720p':
      formatString = 'bestvideo[height<=720]+bestaudio/best';
      break;
    case '480p':
      formatString = 'bestvideo[height<=480]+bestaudio/best';
      break;
    case 'Audio Only':
      formatString = 'bestaudio/best';
      break;
    default:
      formatString = 'best';
  }

  const args = [
    '-f', formatString,
    '-o', job.outputPath,
    '--newline',
    '--force-overwrites',
    '--no-playlist',
    '--ffmpeg-location', binDir,
    job.url
  ];

  if (job.quality === 'Audio Only') {
    args.splice(args.length - 1, 0, '-x', '--audio-format', 'mp3');
    
    if (job.embedArtwork) {
      args.splice(args.length - 1, 0, '--embed-metadata', '--embed-thumbnail', '--convert-thumbnails', 'jpg');
      if (job.cleanName) {
        args.splice(args.length - 1, 0, '--replace-in-metadata', 'title', '.*', job.cleanName);
      }
    }
  } else {
    args.splice(args.length - 1, 0, '--merge-output-format', 'mp4');
  }

  const child = spawn(binPath, args, {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const fs = require('fs');
  const logStream = fs.createWriteStream(join(app.getPath('userData'), 'yt-dlp.log'), { flags: 'a' });
  
  child.stdout.on('data', (data) => {
    const output = data.toString();
    logStream.write(`[STDOUT] ${output}\n`);
    
    // Parse yt-dlp progress: "[download]  10.5% of 50.00MiB at 1.20MiB/s ETA 00:30"
    const progressMatch = output.match(/\[download\]\s+(\d+\.\d+)%/);
    const speedMatch = output.match(/at\s+([0-9.]+[a-zA-Z]+\/s)/);
    const etaMatch = output.match(/ETA\s+([\d:]+)/);

    if (progressMatch) {
      mainWindow.webContents.send('download-progress', {
        id: job.id,
        progress: parseFloat(progressMatch[1]),
        speed: speedMatch ? speedMatch[1] : '--',
        eta: etaMatch ? etaMatch[1] : '--'
      });
    }
  });

  child.stderr.on('data', (data) => {
    logStream.write(`[STDERR] ${data}\n`);
    console.error(`yt-dlp error: ${data}`);
  });

  child.on('close', (code) => {
    logStream.write(`[CLOSE] Exited with code ${code}\n`);
    logStream.end();
    mainWindow.webContents.send('download-complete', {
      id: job.id,
      success: code === 0
    });
  });

  child.on('error', (err) => {
    logStream.write(`[ERROR] Failed to spawn child process: ${err.message}\n`);
    logStream.end();
    console.error('Failed to start download process:', err);
    import('electron').then(({ dialog }) => {
      dialog.showErrorBox('Download Error', `Failed to start download.\nPath: ${binPath}\nError: ${err.message}`);
    });
    mainWindow.webContents.send('download-complete', {
      id: job.id,
      success: false
    });
  });

  return child;
}

export function getVideoInfo(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const binDir = app.isPackaged ? join(process.resourcesPath, 'bin') : join(process.cwd(), 'bin');
    const binPath = join(binDir, 'yt-dlp.exe');

    let isResolved = false;

    const child = spawn(binPath, ['--print', 'title', '--no-playlist', url], {
      stdio: ['ignore', 'pipe', 'ignore']
    });

    // Add a 30-second timeout
    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        console.error('getVideoInfo timed out after 30 seconds');
        child.kill(); // Kill the hung process
        resolve(null);
      }
    }, 30000);

    let output = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
      // As soon as we get a non-empty line on stdout, resolve it!
      const lines = output.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length > 0 && !isResolved) {
        isResolved = true;
        clearTimeout(timeout);
        child.kill(); // We got what we need, kill the process to save resources
        resolve(lines[0]);
      }
    });

    child.on('close', (_code) => {
      if (isResolved) return;
      isResolved = true;
      clearTimeout(timeout);
      
      const lines = output.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length > 0) {
        resolve(lines[0]);
      } else {
        resolve(null);
      }
    });

    child.on('error', (err) => {
      if (isResolved) return;
      isResolved = true;
      clearTimeout(timeout);
      
      console.error('Failed to get video info:', err);
      // Show an error popup so we can debug on other PCs!
      import('electron').then(({ dialog }) => {
        dialog.showErrorBox('getVideoInfo Error', `Failed to run yt-dlp.exe.\nPath: ${binPath}\nError: ${err.message}`);
      });
      resolve(null);
    });
  });
}
