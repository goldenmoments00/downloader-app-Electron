import Database from 'better-sqlite3';
import { app } from 'electron';
import { join } from 'path';
import fs from 'fs';
import { getSettings } from './settings';

let db: ReturnType<typeof Database> | null = null;

// The same cleaning logic as the frontend
export function cleanFilenameForIndex(originalTitle: string): string {
  let t = originalTitle;
  
  // Strip existing branding if present on disk
  t = t.replace(/ - GoldenMoment\.in 🔥🎵/gi, '').trim();

  t = t.replace(/\(.*?\)|\[.*?\]|\{.*?\}/g, ' ');
  t = t.split('|')[0];
  
  const ftRegex = /\b(ft\.?|feat\.?|featuring)\b/i;
  if (ftRegex.test(t)) {
    t = t.split(ftRegex)[0];
  }

  t = t.replace(/#\w+/g, ' ');
  t = t.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ' ');
  
  const promoKeywords = ['official video', 'official audio', 'lyrical video', 'lyrics', 'lyrical', 'music video', 'full song hd', 'full song', 'hd', '4k', '8k', 'hdr', 'dolby', 'remastered', 'trending', 'audio', 'video'];
  promoKeywords.forEach(keyword => {
    t = t.replace(new RegExp(`\\b${keyword}\\b`, 'gi'), ' ');
  });
  
  let parts = t.split('-').map(p => p.trim()).filter(Boolean);
  if (parts.length > 1) {
    t = parts[parts.length - 1]; 
  } else if (parts.length === 1) {
    t = parts[0];
  } else {
    t = originalTitle.split('|')[0].replace(/\(.*?\)|\[.*?\]|\{.*?\}/g, '').replace(/ - GoldenMoment\.in 🔥🎵/gi, '').trim();
  }
  
  t = t.replace(/\s+/g, ' ').trim();
  
  if (!t || t === '-' || t.length < 2) {
    t = originalTitle.replace(/ - GoldenMoment\.in 🔥🎵/gi, '').trim();
  }

  t = t.replace(/[\\/:*?"<>|]/g, '');
  return t.trim();
}

export function initDb() {
  const dbPath = join(app.getPath('userData'), 'library.db');
  db = new Database(dbPath);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS library_index (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      clean_name TEXT NOT NULL,
      category TEXT NOT NULL,
      full_path TEXT NOT NULL UNIQUE,
      date_added TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_clean_name ON library_index(clean_name);
    CREATE INDEX IF NOT EXISTS idx_filename ON library_index(filename);
  `);
}

export function insertFileToIndex(filename: string, cleanName: string, category: string, fullPath: string) {
  if (!db) return;
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO library_index (filename, clean_name, category, full_path, date_added)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(filename, cleanName.toLowerCase(), category, fullPath, new Date().toISOString());
  } catch (err) {
    console.error('Failed to insert file to index:', err);
  }
}

export function searchDuplicate(cleanName: string) {
  if (!db) return [];
  
  const searchName = cleanName.toLowerCase();
  
  // We match EXACT clean_name or EXACT filename ignoring extension case
  const stmt = db.prepare(`
    SELECT category, full_path, filename 
    FROM library_index 
    WHERE LOWER(clean_name) = ? OR LOWER(filename) LIKE ?
  `);
  
  // filename LIKE 'kesariya.mp3' or 'kesariya.mp4'
  return stmt.all(searchName, `${searchName}.%`) as any[];
}

export async function syncNasLibrary() {
  if (!db) return;
  const { nasRootPath } = getSettings();
  if (!nasRootPath || !fs.existsSync(nasRootPath)) return;

  try {
    const categories = await fs.promises.readdir(nasRootPath, { withFileTypes: true });
    
    db.exec('BEGIN TRANSACTION');
    
    // Naive sync: clear and rebuild or just insert/replace
    // For simplicity, we just insert/replace. Deleted files won't be removed until a full scrub, but that's fine for now.
    for (const cat of categories) {
      if (cat.isDirectory()) {
        const catPath = join(nasRootPath, cat.name);
        try {
          const files = await fs.promises.readdir(catPath, { withFileTypes: true });
          for (const file of files) {
            if (file.isFile()) {
              const ext = join(file.name).split('.').pop() || '';
              // only index media
              if (['mp3', 'mp4', 'm4a', 'wav'].includes(ext.toLowerCase())) {
                 const baseName = file.name.substring(0, file.name.lastIndexOf('.'));
                 const cleaned = cleanFilenameForIndex(baseName);
                 const stmt = db.prepare(`
                    INSERT OR IGNORE INTO library_index (filename, clean_name, category, full_path, date_added)
                    VALUES (?, ?, ?, ?, ?)
                 `);
                 stmt.run(file.name, cleaned.toLowerCase(), cat.name, join(catPath, file.name), new Date().toISOString());
              }
            }
          }
        } catch (e) {
          console.error(`Failed to read category ${cat.name}`, e);
        }
      }
    }
    
    db.exec('COMMIT');
    console.log('NAS Library sync complete');
  } catch (e) {
    console.error('Failed to sync NAS library:', e);
    if (db.inTransaction) db.exec('ROLLBACK');
  }
}
