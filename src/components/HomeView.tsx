import { useState, useEffect } from 'react';
import { Link2, Download, X, Play, Pause, Folder, ServerCrash, RefreshCw, Wifi, Server, Sparkles, Monitor, Laptop, Smartphone, Headphones, ExternalLink, AlertTriangle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useNasStore } from '../store/useNasStore';
import { cleanFilename, getBrandedFilename } from '../utils/fileNaming';

interface HomeViewProps {
  isCompactMode?: boolean;
}

interface QueueItem {
  id: number;
  name: string;
  quality: string;
  progress: number;
  speed: string;
  eta: string;
  status: 'downloading' | 'paused' | 'completed' | 'saving' | 'error';
  cleanName?: string;
  category?: string;
  fullPath?: string;
}

const qualities = ['Best Quality', '1080p', '720p', '480p', 'Audio Only'];

const qualityIcons = {
  'Best Quality': <Sparkles size={16} />,
  '1080p': <Monitor size={16} />,
  '720p': <Laptop size={16} />,
  '480p': <Smartphone size={16} />,
  'Audio Only': <Headphones size={16} />
};

export default function HomeView({ isCompactMode }: HomeViewProps) {
  const { setActiveDownloads } = useStore();
  const {
    status,
    folders,
    selectedCategory,
    nasRootPath,
    setSelectedCategory,
    destinationMode,
    customFolder,
    setDestinationMode,
    setCustomFolder
  } = useNasStore();
  const [url, setUrl] = useState('');
  const [selectedQuality, setSelectedQuality] = useState(qualities[0]);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);
  const [analyzeCountdown, setAnalyzeCountdown] = useState<number | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{
    cleanName: string;
    brandedName: string;
    targetDir: string;
    ext: string;
    url: string;
    quality: string;
    nextVersionName: string;
    matches: any[];
  } | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handlePasteEvent = (e: any) => {
      if (e.detail) setUrl(e.detail);
    };
    window.addEventListener('paste-url', handlePasteEvent);
    return () => window.removeEventListener('paste-url', handlePasteEvent);
  }, []);

  // Listen for yt-dlp progress and completion
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onDownloadProgress((data: any) => {
        setQueue(prev => prev.map(item => {
          if (item.id === data.id) {
            return {
              ...item,
              progress: data.progress,
              speed: data.speed,
              eta: data.eta
            };
          }
          return item;
        }));
      });

      window.electronAPI.onDownloadComplete((data: any) => {
        setQueue(prev => prev.map(item => {
          if (item.id === data.id) {
            // Index the file if successful
            if (data.success && item.cleanName && item.category && item.fullPath) {
              window.electronAPI.insertToIndex(item.name, item.cleanName, item.category, item.fullPath);
            }
            return {
              ...item,
              progress: 100,
              status: data.success ? 'completed' : 'error'
            };
          }
          return item;
        }));
      });
    }
  }, []);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
    }
  };

  const isValidUrl = () => {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSelectCustomFolder = async () => {
    const path = await window.electronAPI.selectFolder();
    if (path) {
      setCustomFolder(path);
    }
  };

  const handleDownload = async () => {
    if (!isValidUrl() || isFetchingInfo) return;
    if (destinationMode === 'nas' && (!selectedCategory || status !== 'Connected')) return;
    if (destinationMode === 'custom' && !customFolder) return;

    setIsFetchingInfo(true);
    setAnalyzeCountdown(15);
    
    const countdownInterval = setInterval(() => {
      setAnalyzeCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownInterval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    let originalTitle = await window.electronAPI.getVideoInfo(url);
    
    clearInterval(countdownInterval);
    setAnalyzeCountdown(null);
    setIsFetchingInfo(false);

    if (!originalTitle) {
      // Fallback if unable to fetch title
      originalTitle = `video_${Date.now().toString().slice(-4)}`;
    }

    const cleanName = cleanFilename(originalTitle);
    const brandedName = getBrandedFilename(cleanName);
    const ext = selectedQuality === 'Audio Only' ? '.mp3' : '.mp4';
    
    const separator = (destinationMode === 'custom' ? customFolder : nasRootPath).includes('\\') ? '\\' : '/';
    let targetDir = '';
    
    if (destinationMode === 'nas') {
      const cleanRoot = nasRootPath.endsWith(separator) ? nasRootPath.slice(0, -1) : nasRootPath;
      targetDir = `${cleanRoot}${separator}${selectedCategory}`;
    } else {
      targetDir = customFolder.endsWith(separator) ? customFolder.slice(0, -1) : customFolder;
    }

    try {
      const duplicateStatus = await window.electronAPI.checkDuplicate(targetDir, cleanName, brandedName, ext);

      if (duplicateStatus.exists) {
        setDuplicateInfo({
          cleanName,
          brandedName,
          targetDir,
          ext,
          url,
          quality: selectedQuality,
          nextVersionName: duplicateStatus.nextVersionName,
          matches: duplicateStatus.matches
        });
        setShowDuplicateDialog(true);
        return;
      }

      startActualDownload(`${brandedName}${ext}`, targetDir, url, selectedQuality, cleanName, selectedCategory);
    } catch (e: any) {
      alert("Failed to start download: " + e.message);
    }
  };

  const startActualDownload = (filename: string, targetDir: string, downloadUrl: string, quality: string, cleanName: string, category: string) => {
    const separator = targetDir.includes('\\') ? '\\' : '/';
    const outputPath = `${targetDir}${separator}${filename}`;
    
    const id = Date.now();
    const newItem: QueueItem = {
      id,
      name: filename,
      quality,
      progress: 0,
      speed: 'Connecting...',
      eta: '--',
      status: 'downloading',
      cleanName,
      category,
      fullPath: outputPath
    };

    setQueue(prev => [...prev, newItem]);
    setActiveDownloads(queue.length + 1);
    
    // Read the current settings store
    const { embedArtwork } = useNasStore.getState();

    window.electronAPI.startDownload({
      id,
      url: downloadUrl,
      quality,
      outputPath,
      cleanName,
      embedArtwork
    });

    setUrl('');
  };

  const handleDuplicateAction = (action: 'skip' | 'replace' | 'new') => {
    if (!duplicateInfo) return;

    if (action === 'replace') {
      // Overwrite the existing one in target directory
      startActualDownload(`${duplicateInfo.brandedName}${duplicateInfo.ext}`, duplicateInfo.targetDir, duplicateInfo.url, duplicateInfo.quality, duplicateInfo.cleanName, selectedCategory);
    } else if (action === 'new') {
      startActualDownload(duplicateInfo.nextVersionName, duplicateInfo.targetDir, duplicateInfo.url, duplicateInfo.quality, duplicateInfo.cleanName, selectedCategory);
    }
    
    setShowDuplicateDialog(false);
    setDuplicateInfo(null);
  };

  const handleOpenExisting = (path: string) => {
    window.electronAPI.showItemInFolder(path);
  };

  const removeJob = (id: number) => {
    setQueue(prev => prev.filter(item => item.id !== id));
    setActiveDownloads(queue.length - 1);
  };

  const togglePause = (id: number) => {
    setQueue(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, status: item.status === 'downloading' ? 'paused' : 'downloading' };
      }
      return item;
    }));
  };

  return (
    <div className="px-2 py-4 flex flex-col gap-6">

      {/* NAS Offline Banner */}
      {status !== 'Connected' && status !== 'Connecting' && (
        <div className="bg-highlight/10 backdrop-blur-xl border border-highlight/30 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-highlight/20 flex items-center justify-center shrink-0">
              <ServerCrash size={20} className="text-highlight" />
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-[13px] font-bold text-highlight truncate">
                {status === 'Offline' && '🔴 '}
                {status === 'Access Denied' && '⚠ '}
                NAS: {status}
              </div>
              <div className="text-[10px] text-highlight/80 font-medium mt-0.5 leading-tight">Check your connection.</div>
            </div>
          </div>
          <button 
            onClick={() => window.dispatchEvent(new Event('refresh-nas'))}
            className="px-3 py-2 bg-white/50 hover:bg-white text-highlight text-[10px] font-bold rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
          >
            <RefreshCw size={12} /> RETRY
          </button>
        </div>
      )}
      
      {/* Sections 1 & 2: Input & Quality Selector */}
      <div className={`bg-white/40 backdrop-blur-2xl rounded-[24px] p-4 flex flex-col gap-4 border border-white/50 shadow-[0_8px_32px_rgba(255,167,38,0.15)] relative overflow-hidden transition-all ${status !== 'Connected' ? 'grayscale-[20%] opacity-80' : ''}`}>
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

        {/* NAS Offline Banner */}
        {status !== 'Connected' && status !== 'Connecting' && (
          <div className="bg-highlight/10 border border-highlight/20 text-highlight px-3 py-2 rounded-xl flex items-center gap-2 text-[12px] font-medium shadow-sm backdrop-blur-md relative z-10">
            <ServerCrash size={16} />
            <span>NAS disconnected. Please check your network.</span>
          </div>
        )}

        {/* Section 1: Source URL */}
        <div className="flex flex-col gap-1.5 relative z-10">
          <div className="flex justify-between items-center pr-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest pl-1">
              Source URL
            </label>
            <div className="flex items-center gap-2">
              <div 
                title={isOnline ? "Internet Connected" : "Internet Offline"} 
                className={`p-1.5 rounded-full bg-white/40 border border-white/50 shadow-inner transition-colors ${isOnline ? 'text-green-500' : 'text-highlight'}`}
              >
                <Wifi size={14} strokeWidth={3} />
              </div>
              <div 
                title={status === 'Connected' ? "NAS Connected" : "NAS Disconnected"} 
                className={`p-1.5 rounded-full bg-white/40 border border-white/50 shadow-inner transition-colors ${status === 'Connected' ? 'text-green-500' : 'text-highlight'}`}
              >
                <Server size={14} strokeWidth={3} />
              </div>
            </div>
          </div>
          <div className="relative flex items-center shadow-sm rounded-xl">
            <div className="absolute left-3 text-text-secondary pointer-events-none">
              <Link2 size={16} />
            </div>
            
            <input
              type="text"
              placeholder="Paste video URL here..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-white/60 border border-white/50 rounded-xl pl-9 pr-16 py-2.5 text-[13px] text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all shadow-inner backdrop-blur-md"
            />
            
            <div className="absolute right-1.5 flex gap-1 items-center">
              {url && (
                <button onClick={() => setUrl('')} className="p-1.5 text-text-secondary hover:text-text-primary transition-colors">
                  <X size={16} />
                </button>
              )}
              <button
                onClick={handlePaste}
                className="text-[10px] font-bold bg-white/50 hover:bg-white text-text-primary px-2.5 py-1.5 rounded-lg transition-colors shadow-sm"
              >
                PASTE
              </button>
            </div>
          </div>
        </div>

        {/* Quality Selection (Separated Buttons) */}
        <div className="flex items-center justify-center relative z-20">
          <div className="flex items-center gap-1.5 bg-white/40 p-1.5 border border-white/50 shadow-sm rounded-xl backdrop-blur-md">
            {qualities.map((q) => {
              const isActive = selectedQuality === q;
              return (
                <button
                  key={q}
                  onClick={() => setSelectedQuality(q)}
                  title={q}
                  className={`w-9 h-9 rounded-[10px] flex items-center justify-center transition-all duration-300 ${
                    isActive 
                      ? 'bg-highlight text-white shadow-[0_4px_12px_rgba(217,4,41,0.35)] scale-105' 
                      : 'bg-transparent text-text-secondary hover:bg-white/60 hover:text-text-primary hover:scale-105'
                  }`}
                >
                  {qualityIcons[q as keyof typeof qualityIcons]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Destination Section */}
        <div className="flex flex-col gap-1.5 relative z-30 mt-1">
          {/* Segmented Control */}
          <div className="flex bg-white/40 p-1 rounded-xl shadow-sm border border-white/50 backdrop-blur-md relative">
            <div 
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-all duration-300 ease-out pointer-events-none"
              style={{ transform: destinationMode === 'nas' ? 'translateX(0)' : 'translateX(calc(100% + 8px))' }}
            />
            <button
              onClick={() => setDestinationMode('nas')}
              className={`flex-1 relative z-10 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${destinationMode === 'nas' ? 'text-highlight' : 'text-text-secondary hover:text-text-primary'}`}
            >
              NAS Category
            </button>
            <button
              onClick={() => setDestinationMode('custom')}
              className={`flex-1 relative z-10 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${destinationMode === 'custom' ? 'text-highlight' : 'text-text-secondary hover:text-text-primary'}`}
            >
              Custom Folder
            </button>
          </div>

          {destinationMode === 'nas' ? (
            <div className="relative flex items-center shadow-sm rounded-xl group mt-0.5">
              <div className="absolute left-3 text-highlight pointer-events-none transition-transform group-hover:scale-110 duration-300">
                <Folder size={16} />
              </div>
              
              <button
                onClick={() => folders.length > 0 && setShowCategoryMenu(!showCategoryMenu)}
                className="w-full bg-white/60 border border-white/50 rounded-xl pl-9 pr-10 py-2.5 text-[13px] text-text-primary text-left focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all shadow-inner backdrop-blur-md font-medium flex items-center cursor-pointer"
                disabled={folders.length === 0}
              >
                <span className="truncate flex-1">
                  {selectedCategory || "Select Category"}
                </span>
              </button>

              {showCategoryMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40 bg-black/5 backdrop-blur-sm animate-in fade-in duration-200" 
                    onClick={() => setShowCategoryMenu(false)} 
                  />
                  <div className="fixed inset-x-4 top-20 bottom-6 bg-white/98 backdrop-blur-3xl border border-white/80 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] z-50 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
                    <div className="flex justify-between items-center px-4 py-2.5 border-b border-black/5 bg-white/50 shrink-0">
                      <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-1.5"><Folder size={12} className="text-highlight" /> SELECT CATEGORY</span>
                      <button onClick={() => setShowCategoryMenu(false)} className="p-1.5 hover:bg-black/5 text-text-secondary hover:text-highlight rounded-lg transition-colors"><X size={14} /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto flex flex-col [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/10 [&::-webkit-scrollbar-thumb]:rounded-full">
                      {folders.map((f, i) => {
                        const isSelected = selectedCategory === f;
                        const isLast = i === folders.length - 1;
                        return (
                          <button
                            key={f}
                            onClick={() => { setSelectedCategory(f); setShowCategoryMenu(false); }}
                            className={`w-full text-left px-4 py-2.5 text-[13px] transition-all duration-200 ${
                              !isLast ? 'border-b-[0.5px] border-black/5' : ''
                            } ${
                              isSelected 
                                ? 'bg-gradient-to-r from-primary/10 to-transparent text-highlight font-bold' 
                                : 'text-black font-medium hover:bg-highlight/10 hover:text-highlight'
                            }`}
                          >
                            <span className="truncate">{f}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              <div className="absolute right-1.5 flex items-center z-30 pointer-events-auto">
                <button 
                  onClick={() => window.dispatchEvent(new Event('refresh-nas'))}
                  title="Refresh NAS Categories"
                  className="text-highlight hover:text-red-600 transition-colors bg-white/50 hover:bg-white p-1 rounded-lg shadow-sm"
                >
                  <RefreshCw size={13} className={status === 'Connecting' ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          ) : (
            <div className="relative flex items-center shadow-sm rounded-xl group mt-0.5">
              <div className="absolute left-3 text-highlight pointer-events-none transition-transform group-hover:scale-110 duration-300">
                <Folder size={16} />
              </div>
              <div className="w-full bg-white/60 border border-white/50 rounded-xl pl-9 pr-20 py-2.5 text-[13px] text-text-primary text-left transition-all shadow-inner backdrop-blur-md font-medium flex items-center">
                <span className="truncate flex-1 text-text-secondary">
                  {customFolder || "Select Folder"}
                </span>
              </div>
              <div className="absolute right-1.5 flex items-center z-30 pointer-events-auto">
                <button 
                  onClick={handleSelectCustomFolder}
                  className="text-[10px] font-bold bg-white/50 hover:bg-white text-text-primary px-2.5 py-1.5 rounded-lg transition-colors shadow-sm"
                >
                  CHANGE
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          disabled={!isValidUrl() || status !== 'Connected' || !selectedCategory || isFetchingInfo}
          onClick={handleDownload}
          className="w-full mt-1 relative group overflow-hidden bg-gradient-to-r from-secondary to-accent text-white font-bold py-2 px-3 text-[11px] rounded-lg shadow-sm disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center gap-1.5 border border-white/20 z-10"
        >
          <div className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:animate-[shimmer_1s_forwards] skew-x-[-20deg]" />
          {isFetchingInfo ? (
            <>
              <RefreshCw size={12} className="animate-spin text-highlight" />
              ANALYZING LINK... {analyzeCountdown !== null && `(${analyzeCountdown}s)`}
            </>
          ) : (
            <>
              <Download size={12} className="text-highlight" />
              DOWNLOAD
            </>
          )}
        </button>
      </div>

      {/* Queue hide in compact mode */}
      {!isCompactMode && (
        <div className="flex flex-col mt-4">
          <h3 className="text-[10px] font-medium text-text-secondary uppercase tracking-widest px-2 mb-3">
            Active Queue
          </h3>
          
          {queue.length === 0 ? (
            <div className="text-center text-text-secondary font-light text-[12px] py-4">
              📥 No active downloads
            </div>
          ) : (
            <div className="flex flex-col gap-2 px-1 mt-2">
              {queue.map((item) => {
                const ext = item.quality === 'Audio Only' ? 'mp3' : 'mp4';
                let statusText = '';
                if (item.status === 'downloading') {
                  statusText = item.progress === 100 ? 'Merging' : `${item.progress}%`;
                } else if (item.status === 'completed') {
                  statusText = 'Completed';
                } else if (item.status === 'paused') {
                  statusText = 'Paused';
                } else if (item.status === 'error') {
                  statusText = 'Failed';
                }

                return (
                  <div key={item.id} className="flex flex-col relative group">
                    <div className="flex items-end gap-2 text-[12px] font-medium text-text-primary py-1">
                      <div className="shrink-0 w-4 flex items-center justify-center pb-[2px]">
                        {item.status === 'downloading' && <span className="text-highlight">⬇️</span>}
                        {item.status === 'paused' && <span className="text-secondary">⏸</span>}
                        {item.status === 'completed' && <span className="text-green-500">✅</span>}
                        {item.status === 'error' && <span className="text-red-500">❌</span>}
                      </div>
                      
                      <div className="shrink-0 max-w-[140px] truncate pb-[1px]">
                        {item.name}.{ext}
                      </div>

                      <div className="flex-1 border-b-[1.5px] border-dotted border-black/20 mx-1 mb-[5px]" />

                      <div className="shrink-0 text-[11px] pb-[1px] text-text-secondary pr-6">
                        {statusText}
                      </div>
                    </div>

                    {/* Tiny Progress Bar */}
                    {(item.status === 'downloading' || item.status === 'paused') && (
                      <div className="pl-6 pr-6">
                        <div className="h-[1px] w-full bg-black/5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ease-out ${item.status === 'paused' ? 'bg-secondary/40' : 'bg-highlight'}`}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Hover Controls */}
                    <div className="absolute right-0 top-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-[#F5EFE6] via-[#F5EFE6] to-transparent pl-4 pr-1 flex gap-2 items-center">
                       {item.status === 'downloading' && <button onClick={() => togglePause(item.id)} className="text-text-secondary hover:text-text-primary transition-colors"><Pause size={13} /></button>}
                       {item.status === 'paused' && <button onClick={() => togglePause(item.id)} className="text-text-secondary hover:text-text-primary transition-colors"><Play size={13} /></button>}
                       <button onClick={() => removeJob(item.id)} className="text-text-secondary hover:text-highlight transition-colors"><X size={14} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {/* Duplicate File Dialog - Global Search */}
      {showDuplicateDialog && duplicateInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white/95 backdrop-blur-3xl border border-white/60 rounded-[24px] shadow-[0_32px_64px_rgba(0,0,0,0.3)] p-4 m-3 flex flex-col gap-4 max-w-[280px] w-full animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 overflow-hidden relative">
            
            <div className="absolute -top-20 -right-20 w-32 h-32 bg-highlight/20 rounded-full blur-[40px] pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-32 h-32 bg-secondary/10 rounded-full blur-[40px] pointer-events-none" />

            <div className="flex items-center gap-2 relative z-10">
              <div className="w-10 h-10 rounded-full bg-highlight/10 flex items-center justify-center shrink-0 border border-highlight/20 shadow-[0_0_15px_rgba(217,4,41,0.15)] relative">
                <div className="absolute inset-0 rounded-full border border-highlight/30 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
                <AlertTriangle size={18} className="text-highlight drop-shadow-sm" />
              </div>
              <h2 className="text-[14px] font-extrabold uppercase tracking-widest bg-gradient-to-r from-highlight to-accent bg-clip-text text-transparent leading-tight">Song Already Exists</h2>
            </div>
            
            <div className="bg-white/60 rounded-xl p-3 border border-white/80 shadow-inner flex flex-col gap-2 relative z-10 backdrop-blur-md">
              <p className="text-[11px] font-bold text-text-primary leading-tight text-center mb-1">
                This file already exists in the library.
              </p>
              
              <div className="flex flex-col gap-1 mt-1">
                <p className="text-[9px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-1.5">
                  <Laptop size={10} /> Song
                </p>
                <p className="text-[12px] font-bold text-highlight break-words leading-tight">{duplicateInfo.cleanName}{duplicateInfo.ext}</p>
              </div>
              
              <div className="h-px w-full bg-gradient-to-r from-transparent via-black/10 to-transparent my-1" />
              
              <p className="text-[9px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-1.5 mb-1">
                <Folder size={10} /> Found In
              </p>
              
              <div className="flex flex-col gap-2">
                {duplicateInfo.matches.filter(m => m && m.full_path).slice(0, 3).map((match: any, idx: number) => (
                  <div key={idx} className="bg-white/80 border border-black/5 rounded-lg p-2 flex flex-col gap-1.5 shadow-sm">
                    <p className="text-[11px] font-bold text-text-primary flex items-center gap-1.5 leading-tight">
                      📁 {match.category || 'Unknown Folder'}
                    </p>
                    <div className="flex items-center justify-between gap-2 bg-black/5 rounded p-1.5 border border-black/5">
                      <p className="text-[8px] text-text-secondary font-mono truncate leading-tight flex-1" title={match.full_path}>
                        {match.full_path}
                      </p>
                      <button 
                        onClick={() => handleOpenExisting(match.full_path)}
                        className="text-[10px] text-highlight hover:text-white hover:bg-highlight p-1 rounded transition-colors flex items-center justify-center shrink-0"
                        title="Open Location"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </div>
                  </div>
                ))}
                
                {duplicateInfo.matches.filter(m => m && m.full_path).length > 3 && (
                  <p className="text-[9px] text-text-secondary font-bold text-center italic mt-1">
                    + {duplicateInfo.matches.filter(m => m && m.full_path).length - 3} more locations found
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-row gap-2 relative z-10 mt-1">
              <button 
                onClick={() => handleDuplicateAction('new')}
                className="flex-1 relative group overflow-hidden bg-gradient-to-r from-highlight to-accent text-white py-3 px-2 rounded-xl shadow-[0_4px_12px_rgba(217,4,41,0.3)] transition-all flex items-center justify-center hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(217,4,41,0.4)]"
                title="Download Anyway"
              >
                <div className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:animate-[shimmer_1s_forwards] skew-x-[-20deg]" />
                <Download size={20} />
              </button>
              <button 
                onClick={() => handleDuplicateAction('skip')}
                className="flex-1 bg-white/60 border border-black/5 hover:bg-black/5 text-text-secondary hover:text-text-primary py-3 px-2 rounded-xl transition-all flex items-center justify-center hover:-translate-y-0.5"
                title="Cancel"
              >
                <X size={20} />
              </button>
            </div>
            
          </div>
        </div>
      )}
      
    </div>
  );
}
