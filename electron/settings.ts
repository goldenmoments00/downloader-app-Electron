import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');

export interface AppSettings {
  nasRootPath: string;
  embedArtwork: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  nasRootPath: '\\\\AS6604T-631E\\Video-Store\\FOR EDIORS\\SONG',
  embedArtwork: true
};

export function getSettings(): AppSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error('Failed to read settings:', error);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: Partial<AppSettings>) {
  try {
    const current = getSettings();
    const updated = { ...current, ...settings };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw error;
  }
}
