export const BRANDING_SUFFIX = ' - GoldenMoment.in 🔥🎵';

export function stripBranding(filename: string): string {
  if (!filename) return '';
  return filename.replace(/ - GoldenMoment\.in 🔥🎵/gi, '').trim();
}

export function getBrandedFilename(cleanTitle: string): string {
  if (!cleanTitle) return `video_${Date.now().toString().slice(-4)}${BRANDING_SUFFIX}`;
  return `${cleanTitle}${BRANDING_SUFFIX}`;
}

export function cleanFilename(originalTitle: string): string {
  if (!originalTitle || originalTitle.trim() === '') {
    return `video_${Date.now().toString().slice(-4)}`;
  }

  let t = originalTitle;

  // 1. Remove emojis
  t = t.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ' ');

  // 2. Remove text inside brackets () [] {}
  t = t.replace(/\(.*?\)|\[.*?\]|\{.*?\}/g, ' ');

  // 3. Drop everything after '|' (usually channel names, movies, or albums)
  t = t.split('|')[0];

  // 4. Split by 'ft.', 'feat.', 'featuring' and take the left side
  const ftRegex = /\b(ft\.?|feat\.?|featuring)\b/i;
  if (ftRegex.test(t)) {
    t = t.split(ftRegex)[0];
  }

  // 5. Remove specific promotional text (case-insensitive)
  const promoKeywords = [
    'official video', 'official audio', 'lyrical video', 'lyrics', 'lyrical', 'music video',
    'full song hd', 'full song', 'hd', '4k', '8k', 'hdr', 'dolby', 'remastered', 'trending',
    'audio', 'video'
  ];
  promoKeywords.forEach(keyword => {
    t = t.replace(new RegExp(`\\b${keyword}\\b`, 'gi'), ' ');
  });

  // 6. Remove hashtags
  t = t.replace(/#\w+/g, ' ');

  // 7. Handle hyphen separation safely
  // If we see "Artist - Title", the Title is usually the last part.
  // But if we see "Title - Movie", taking the last part is wrong.
  // We will assume that if there's exactly one hyphen, and the left part is short (e.g. artist name), 
  // or the right part is the actual title, we'll try to pick safely.
  // Actually, standard YT Music convention is "Artist - Title". 
  // Let's take the right-most part for standard splitting, BUT only if we have exactly 2 parts 
  // to avoid stripping too much from "Title - Some - Other - Thing".
  let parts = t.split('-').map(p => p.trim()).filter(Boolean);
  
  if (parts.length > 1) {
    // Usually "Artist - Song". Take the last part.
    t = parts[parts.length - 1]; 
  } else if (parts.length === 1) {
    t = parts[0];
  } else {
    // If completely empty after cleaning, fallback
    t = originalTitle.split('|')[0].replace(/\(.*?\)|\[.*?\]|\{.*?\}/g, '').trim();
  }

  // 8. Normalize spaces
  t = t.replace(/\s+/g, ' ').trim();

  // 9. If the application cannot confidently determine a clean title, use original title instead of guessing
  if (!t || t === '-' || t.length < 2) {
    t = originalTitle;
  }

  // 10. Remove any invalid file characters (Windows invalid characters: \ / : * ? " < > |)
  t = t.replace(/[\\/:*?"<>|]/g, '').trim();

  return t || `video_${Date.now().toString().slice(-4)}`;
}
