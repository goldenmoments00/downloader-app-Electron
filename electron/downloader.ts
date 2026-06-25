import { spawn } from 'child_process';
import { join } from 'path';
import { app, BrowserWindow } from 'electron';

export interface DownloadJob {
  id: number;
  url: string;
  quality: string;
  outputPath: string;
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

    const child = spawn(binPath, ['--print', 'title', url], {
      stdio: ['ignore', 'pipe', 'ignore']
    });

    let output = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0 && output.trim()) {
        resolve(output.trim());
      } else {
        resolve(null);
      }
    });

    child.on('error', (err) => {
      console.error('Failed to get video info:', err);
      resolve(null);
    });
  });
}
