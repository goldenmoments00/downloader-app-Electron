import { useEffect, useState } from 'react';
import { X, Minus, ClipboardPaste, Flame, Settings } from 'lucide-react';
import HomeView from './components/HomeView';
import { useNasStore } from './store/useNasStore';
import SettingsModal from './components/SettingsModal';
import NasRecoveryModal from './components/NasRecoveryModal';

type AnimState = 'idle' | 'minimizing' | 'restoring' | 'closing';

function App() {
  const [isCompactMode] = useState(false);
  const [isIconMode, setIsIconMode] = useState(false);
  const [clipboardUrl, setClipboardUrl] = useState('');
  const [showClipboardToast, setShowClipboardToast] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [animState, setAnimState] = useState<AnimState>('idle');
  const { setStatus, setFolders, setNasRootPath, nasRootPath, status } = useNasStore();

  // Expose restore function for clipboard listener
  const restoreFromIconMode = () => {
    // 1. Instantly restore electron window bounds so it has room to animate
    window.electronAPI?.setIconMode(false);
    if (isCompactMode) {
      window.electronAPI?.resizeWindow(320, 240);
    } else {
      window.electronAPI?.resizeWindow(320, 500);
    }
    
    // 2. Set React state so the UI renders but in a shrunk state
    setIsIconMode(false);
    setAnimState('restoring');

    // 3. 10ms later, change state to 'idle' to trigger the CSS expansion animation
    setTimeout(() => {
      setAnimState('idle');
    }, 10);
  };

  useEffect(() => {
    // Clipboard monitor
    const interval = setInterval(async () => {
      try {
        const text = await window.electronAPI?.readClipboard();
        if (text && text.startsWith('http') && text !== clipboardUrl) {
          setClipboardUrl(text);
          setShowClipboardToast(true);
          setTimeout(() => setShowClipboardToast(false), 5000);
          
          // Auto-expand if in Icon Mode
          if (isIconMode) {
            restoreFromIconMode();
          }
        }
      } catch (e) {
        // Ignore read errors
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [clipboardUrl, isIconMode, isCompactMode]);

  useEffect(() => {
    // NAS Scanner
    const scanNas = async () => {
      if (!window.electronAPI) return;
      
      try {
        const settings = await window.electronAPI.getSettings();
        setNasRootPath(settings.nasRootPath);
        if (settings.embedArtwork !== undefined) {
          useNasStore.getState().setEmbedArtwork(settings.embedArtwork);
        }

        const status = await window.electronAPI.getNasStatus();
        setStatus(status);

        if (status === 'Connected') {
          const folders = await window.electronAPI.scanNasFolders();
          setFolders(folders);
        } else {
          setFolders([]);
        }
      } catch (e) {
        console.error(e);
      }
    };

    scanNas();
    const interval = setInterval(scanNas, 5 * 60 * 1000); // 5 minutes
    
    // Listen for custom refresh event
    window.addEventListener('refresh-nas', scanNas);
    return () => {
      clearInterval(interval);
      window.removeEventListener('refresh-nas', scanNas);
    };
  }, [nasRootPath]);

  const handleMinimize = () => {
    // Start CSS shrink animation
    setAnimState('minimizing');

    // Wait for animation to finish, then snap electron window
    setTimeout(() => {
      setIsIconMode(true);
      window.electronAPI?.setIconMode(true);
      window.electronAPI?.resizeWindow(80, 64);
      setAnimState('idle');
    }, 300);
  };

  const handleClose = () => {
    setAnimState('closing');
    setTimeout(() => {
      window.electronAPI?.windowClose();
    }, 300);
  };

  const handlePasteClipboard = () => {
    const event = new CustomEvent('paste-url', { detail: clipboardUrl });
    window.dispatchEvent(event);
    setShowClipboardToast(false);
  };

  if (isIconMode) {
    return (
      <div 
        className="w-full h-full rounded-l-full rounded-r-none bg-gradient-to-r from-[#FF5A00] to-[#FF3A00] flex items-center justify-start pl-3 draggable relative overflow-hidden group border-y border-l border-white/20 animate-in slide-in-from-right duration-300"
      >
        <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:animate-[shimmer_1s_forwards] skew-x-[-20deg] pointer-events-none" />
        <div 
          className="w-10 h-10 rounded-full border-[1.5px] border-white flex items-center justify-center cursor-pointer non-draggable z-10 hover:scale-110 transition-transform shadow-sm"
          onClick={restoreFromIconMode}
        >
          <Flame size={22} className="text-white fill-white stroke-white" strokeWidth={1} />
        </div>
      </div>
    );
  }

  // Determine dynamic classes based on animation state
  let animClasses = 'scale-100 opacity-100 rounded-[16px]';
  if (animState === 'minimizing' || animState === 'restoring') {
    animClasses = 'scale-[0.2] opacity-0 rounded-full translate-y-20';
  } else if (animState === 'closing') {
    animClasses = 'scale-[0.9] opacity-0';
  }

  return (
    <div className={`h-screen w-screen flex flex-col bg-gradient-to-br from-[#FFF3D6]/70 via-[#FFE4B5]/70 to-[#FFD166]/70 backdrop-blur-3xl overflow-hidden border border-white/40 shadow-[0_8px_32px_rgba(255,167,38,0.2)] relative transition duration-300 ease-out origin-center draggable ${animClasses}`}>
      
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-64 h-64 bg-primary/20 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-80 h-80 bg-accent/10 rounded-full blur-[100px] pointer-events-none" />

      {/* macOS Style Titlebar */}
      <div className="h-10 bg-white/30 border-b border-white/40 flex items-center justify-between px-4 draggable shrink-0 z-50 backdrop-blur-xl">
        {/* Left: Traffic Lights & Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 non-draggable mt-[1px]">
            <button onClick={handleClose} className="w-3.5 h-3.5 rounded-full bg-[#FF5F56] hover:bg-[#FF5F56]/80 border border-black/10 flex items-center justify-center group shadow-sm transition-colors">
              <X size={9} strokeWidth={3} className="opacity-0 group-hover:opacity-100 text-[#4D0000] transition-opacity" />
            </button>
            <button onClick={handleMinimize} className="w-3.5 h-3.5 rounded-full bg-[#FFBD2E] hover:bg-[#FFBD2E]/80 border border-black/10 flex items-center justify-center group shadow-sm transition-colors">
              <Minus size={9} strokeWidth={3} className="opacity-0 group-hover:opacity-100 text-[#5C3D00] transition-opacity" />
            </button>
            <button onClick={() => setShowSettings(true)} className="w-3.5 h-3.5 rounded-full bg-[#27C93F] hover:bg-[#27C93F]/80 border border-black/10 flex items-center justify-center group shadow-sm transition-colors" title="Settings">
              <Settings size={9} strokeWidth={3} className="opacity-0 group-hover:opacity-100 text-[#004D00] transition-opacity" />
            </button>
          </div>
          <div className="w-px h-4 bg-black/10 mx-1" />
          <div className="flex items-center gap-2 text-[11px] font-bold tracking-widest text-text-primary bg-white/50 px-2.5 py-1 rounded-full border border-white/60 shadow-sm backdrop-blur-md">
            <div className="w-2 h-2 rounded-full bg-gradient-to-tr from-accent to-primary shadow-[0_0_8px_rgba(255,122,0,0.6)]" />
            GM HUB
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative z-10 flex flex-col non-draggable">
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-1 py-3 custom-scrollbar">
          <HomeView isCompactMode={isCompactMode} />
        </div>
      </div>

      {/* Clipboard Toast */}
      <div className={`absolute bottom-10 left-4 right-4 bg-white/70 backdrop-blur-2xl border border-white/50 rounded-2xl p-3 shadow-[0_10px_30px_rgba(255,122,0,0.15)] flex items-center gap-3 transition-all duration-500 z-50 ${showClipboardToast ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-20 opacity-0 scale-95 pointer-events-none'}`}>
        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary/20 to-secondary/20 flex items-center justify-center shrink-0 border border-primary/10">
          <ClipboardPaste size={14} className="text-secondary" />
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="text-xs font-bold text-text-primary">URL Detected</div>
          <div className="text-[10px] text-text-secondary truncate">{clipboardUrl}</div>
        </div>
        <button onClick={handlePasteClipboard} className="text-[10px] font-bold bg-gradient-to-r from-secondary to-accent text-white px-4 py-2 rounded-xl shadow-[0_4px_12px_rgba(255,90,0,0.3)] hover:shadow-[0_6px_16px_rgba(255,90,0,0.4)] hover:-translate-y-0.5 transition-all">
          PASTE
        </button>
      </div>



      {/* NAS Recovery Auto-Popup */}
      {(status === 'Offline' || status === 'Access Denied') && !showSettings && (
        <NasRecoveryModal />
      )}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default App;
