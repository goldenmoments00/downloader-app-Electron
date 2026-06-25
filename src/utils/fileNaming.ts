export function cleanFilename(originalTitle: string): string {
  let t = originalTitle;

  // Remove content in brackets: () [] {}
  t = t.replace(/\(.*?\)|\[.*?\]|\{.*?\}/g, ' ');

  // Drop everything after |
  t = t.split('|')[0];

  // Remove hashtags
  t = t.replace(/#\w+/g, ' ');

  // Remove emojis
  t = t.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ' ');

  // Remove specific promotional text (case-insensitive)
  const promoKeywords = [
    'official video', 'full song hd', 'full song', 'hd', '4k', 'hdr', 'trending', 'lyrical', 'lyric video', 'audio', 'video'
  ];
  promoKeywords.forEach(keyword => {
    t = t.replace(new RegExp(`\\b${keyword}\\b`, 'gi'), ' ');
  });

  // Split by '-' and clean
  let parts = t.split('-').map(p => p.trim()).filter(Boolean);
  
  if (parts.length > 1) {
    // If it's "Artist - Song", usually Song is the last part. This handles "Arijit Singh - Kesariya"
    t = parts[parts.length - 1]; 
  } else if (parts.length === 1) {
    // If there's no hyphen left after cleaning (e.g. "Tum Se Hi - Full Song HD" becomes "Tum Se Hi")
    t = parts[0];
  }

  // Final cleanup of extra spaces
  t = t.replace(/\s+/g, ' ').trim();
  
  // Provide a fallback just in case the title becomes empty
  if (!t) {
    t = `video_${Date.now().toString().slice(-4)}`;
  }
  
  // Remove any remaining invalid file characters (Windows invalid characters: \ / : * ? " < > |)
  t = t.replace(/[\\/:*?"<>|]/g, '');

  return t.trim();
}
