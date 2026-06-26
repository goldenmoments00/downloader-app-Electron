import { useState } from 'react';
import { X, Save, Server, AlertCircle } from 'lucide-react';
import { useNasStore } from '../store/useNasStore';

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const { nasRootPath, setNasRootPath, embedArtwork, setEmbedArtwork } = useNasStore();
  const [localPath, setLocalPath] = useState(nasRootPath);
  const [localEmbedArtwork, setLocalEmbedArtwork] = useState(embedArtwork);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (window.electronAPI) {
        await window.electronAPI.saveSettings({ 
          nasRootPath: localPath,
          embedArtwork: localEmbedArtwork
        });
        setNasRootPath(localPath);
        setEmbedArtwork(localEmbedArtwork);
        
        // Trigger a refresh event
        window.dispatchEvent(new Event('refresh-nas'));
      }
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-white/80 backdrop-blur-2xl border border-white/50 rounded-3xl p-6 w-full max-w-sm shadow-[0_20px_60px_rgba(255,167,38,0.2)] relative flex flex-col gap-5 animate-in zoom-in-95 duration-200">
        
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <Server size={18} className="text-secondary" />
            NAS Settings
          </h2>
          <button onClick={onClose} className="p-1.5 text-text-secondary hover:bg-black/5 hover:text-text-primary rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center pr-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest pl-1">
              NAS Root Path
            </label>
            <button 
              onClick={async () => {
                if (!window.electronAPI) return;
                const path = await window.electronAPI.selectFolder();
                if (path) {
                  // Pre-validate to automatically append FOR EDIORS/SONG if they picked the root
                  const resolvedPath = await window.electronAPI.validateNasPath(path);
                  setLocalPath(typeof resolvedPath === 'string' ? resolvedPath : path);
                }
              }}
              className="text-[10px] font-bold bg-secondary/10 hover:bg-secondary/20 text-secondary px-2 py-1 rounded-md transition-colors"
            >
              BROWSE
            </button>
          </div>
          <textarea
            value={localPath}
            onChange={(e) => setLocalPath(e.target.value.replace(/[\r\n]+/g, ''))} // Prevent newlines
            placeholder="\\NAS\Share\Folder"
            rows={3}
            className="w-full bg-white/60 border border-white/50 rounded-xl px-4 py-3 text-sm text-text-primary placeholder-text-secondary/60 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all shadow-inner backdrop-blur-md font-mono resize-none leading-relaxed"
          />
        </div>

        <div className="bg-highlight/10 border border-highlight/20 rounded-xl p-3 flex gap-2">
          <AlertCircle size={14} className="text-highlight shrink-0 mt-0.5" />
          <p className="text-[10px] text-highlight/90 leading-tight">
            The application will automatically scan this directory for category folders to display in the dropdown.
          </p>
        </div>

        <div className="flex items-center justify-between bg-white/60 border border-white/50 rounded-xl p-4 shadow-inner backdrop-blur-md">
          <div className="flex flex-col">
            <span className="text-[12px] font-bold text-text-primary">Embed Album Artwork</span>
            <span className="text-[10px] text-text-secondary">Embeds high-quality thumbnails & metadata into Audio Only downloads (MP3).</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={localEmbedArtwork}
              onChange={(e) => setLocalEmbedArtwork(e.target.checked)}
            />
            <div className="w-9 h-5 bg-black/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-secondary"></div>
          </label>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full relative group overflow-hidden bg-gradient-to-r from-secondary to-accent text-white font-bold py-3.5 rounded-xl shadow-[0_8px_20px_rgba(255,90,0,0.3)] disabled:opacity-50 disabled:shadow-none transition-all duration-300 hover:shadow-[0_12px_28px_rgba(255,90,0,0.4)] hover:-translate-y-0.5 flex items-center justify-center gap-2 border border-white/20"
        >
          <div className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:animate-[shimmer_1s_forwards] skew-x-[-20deg]" />
          <Save size={16} />
          {saving ? 'SAVING...' : 'SAVE CONFIGURATION'}
        </button>

      </div>
    </div>
  );
}
