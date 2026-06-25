import { useState } from 'react';
import { ServerCrash, FolderSearch, RefreshCw } from 'lucide-react';
import { useNasStore } from '../store/useNasStore';

export default function NasRecoveryModal() {
  const { setNasRootPath } = useNasStore();
  const [isValidating, setIsValidating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSelectFolder = async () => {
    if (!window.electronAPI) return;
    
    try {
      const selectedPath = await window.electronAPI.selectFolder();
      if (!selectedPath) return; // User canceled
      
      setIsValidating(true);
      setErrorMsg('');

      // Validate that the selected folder is a valid NAS folder
      // It returns the fully resolved path (e.g. appending FOR EDIORS/SONG automatically)
      const resolvedPath = await window.electronAPI.validateNasPath(selectedPath);
      
      if (typeof resolvedPath === 'string') {
        // Save and trigger reconnect
        await window.electronAPI.saveSettings({ nasRootPath: resolvedPath });
        setNasRootPath(resolvedPath);
        window.dispatchEvent(new Event('refresh-nas'));
      } else {
        setErrorMsg('Invalid folder. Make sure you select the root SONG folder containing your categories.');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to select folder.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleRetry = () => {
    window.dispatchEvent(new Event('refresh-nas'));
  };

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
      
      <div className="bg-white/90 backdrop-blur-2xl border border-white/50 rounded-3xl p-6 w-full max-w-sm shadow-[0_20px_60px_rgba(255,167,38,0.2)] relative flex flex-col gap-5 animate-in zoom-in-95 duration-200 text-center">
        
        <div className="mx-auto w-16 h-16 rounded-full bg-highlight/10 flex items-center justify-center">
          <ServerCrash size={32} className="text-highlight" />
        </div>

        <div>
          <h2 className="text-lg font-bold text-highlight mb-2">NAS Folder Not Found</h2>
          <p className="text-xs text-text-secondary leading-relaxed">
            The configured NAS folder could not be located. The server IP or drive letter may have changed.
          </p>
          <p className="text-xs text-text-primary font-bold mt-3">
            Please select the main SONG folder to reconnect.
          </p>
        </div>

        {errorMsg && (
          <div className="bg-highlight/10 border border-highlight/20 text-highlight text-[10px] p-2 rounded-lg text-left leading-tight">
            {errorMsg}
          </div>
        )}

        <div className="flex flex-col gap-3 mt-2">
          <button
            onClick={handleSelectFolder}
            disabled={isValidating}
            className="w-full relative group overflow-hidden bg-gradient-to-r from-secondary to-accent text-white font-bold py-3.5 rounded-xl shadow-[0_8px_20px_rgba(255,90,0,0.3)] disabled:opacity-50 disabled:shadow-none transition-all duration-300 hover:shadow-[0_12px_28px_rgba(255,90,0,0.4)] hover:-translate-y-0.5 flex items-center justify-center gap-2 border border-white/20"
          >
            <div className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:animate-[shimmer_1s_forwards] skew-x-[-20deg]" />
            {isValidating ? (
              <>
                <RefreshCw size={16} className="animate-spin" /> VALIDATING...
              </>
            ) : (
              <>
                <FolderSearch size={16} /> SELECT FOLDER
              </>
            )}
          </button>
          
          <button
            onClick={handleRetry}
            disabled={isValidating}
            className="w-full py-3 rounded-xl text-xs font-bold text-text-secondary hover:bg-black/5 transition-colors"
          >
            RETRY CONNECTION
          </button>
        </div>

      </div>
    </div>
  );
}
