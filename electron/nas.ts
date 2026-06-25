import * as fs from 'fs';
import * as path from 'path';
import { getSettings } from './settings';

export type NasStatus = 'Connected' | 'Connecting' | 'Offline' | 'Access Denied';

export async function checkNasConnection(): Promise<NasStatus> {
  const { nasRootPath } = getSettings();
  try {
    // Check if path exists and we have read access
    await fs.promises.access(nasRootPath, fs.constants.R_OK);
    return 'Connected';
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return 'Offline';
    } else if (error.code === 'EPERM' || error.code === 'EACCES') {
      return 'Access Denied';
    }
    return 'Offline';
  }
}

export async function scanNasFolders(): Promise<string[]> {
  const { nasRootPath } = getSettings();
  try {
    const entries = await fs.promises.readdir(nasRootPath, { withFileTypes: true });
    
    // Filter only directories, sort them alphabetically
    const folders = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      
    return folders;
  } catch (error) {
    console.error('Failed to scan NAS folders:', error);
    return [];
  }
}

export async function validateNasPath(targetPath: string): Promise<string | false> {
  try {
    let actualPath = targetPath;
    
    // If they picked the root share (e.g. Video-Store), auto-append the nested structure
    if (!targetPath.toUpperCase().endsWith('SONG')) {
      const appendedPath = path.join(targetPath, 'FOR EDIORS', 'SONG');
      try {
        await fs.promises.access(appendedPath, fs.constants.R_OK);
        actualPath = appendedPath;
      } catch (e) {
        // Doesn't exist, stick to original targetPath
      }
    }

    // Verify path exists and has read access
    await fs.promises.access(actualPath, fs.constants.R_OK);
    
    // Verify it contains subfolders
    const entries = await fs.promises.readdir(actualPath, { withFileTypes: true });
    const hasFolders = entries.some(entry => entry.isDirectory());
    
    return hasFolders ? actualPath : false;
  } catch (error) {
    return false;
  }
}
