import { Search, FolderOpen, FileText } from 'lucide-react';

export default function HistoryView() {
  const history = [
    { id: 1, name: 'wedding_broll_camA.mp4', folder: 'Wedding Raw Footage', date: 'Today, 2:30 PM' },
    { id: 2, name: 'audio_mix_final.wav', folder: 'Project Resources', date: 'Yesterday, 4:15 PM' },
    { id: 3, name: 'whoosh_transition.mp3', folder: 'Sound Effects', date: 'Jun 22, 10:00 AM' },
    { id: 4, name: 'luts_pack_v2.zip', folder: 'Templates', date: 'Jun 20, 11:45 AM' },
  ];

  return (
    <div className="p-4 flex flex-col gap-4 h-full animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold tracking-tight text-white">History</h2>
        <p className="text-xs text-white/50">Your recently downloaded files</p>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
        <input 
          type="text" 
          placeholder="Search history..." 
          className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-accent/50 transition-all"
        />
      </div>

      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
        {history.map((item) => (
          <div key={item.id} className="bg-surface border border-border p-3 rounded-lg flex items-center justify-between group hover:border-white/20 transition-all">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded bg-black/40 flex items-center justify-center shrink-0">
                <FileText size={16} className="text-white/60" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium text-white truncate">{item.name}</span>
                <span className="text-[10px] text-white/40 truncate">{item.folder} • {item.date}</span>
              </div>
            </div>
            
            <button className="p-2 bg-white/5 hover:bg-white/10 rounded-md opacity-0 group-hover:opacity-100 transition-all">
              <FolderOpen size={14} className="text-white/80" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
