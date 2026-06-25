import { Pause, Play, XCircle, RotateCcw } from 'lucide-react';

export default function QueueView() {
  // Placeholder data for now
  const queue = [
    { id: 1, name: 'wedding_broll_camA.mp4', progress: 45, speed: '12 MB/s', eta: '2m 10s', status: 'downloading' },
    { id: 2, name: 'audio_mix_final.wav', progress: 100, speed: '0 MB/s', eta: '0s', status: 'completed' },
    { id: 3, name: 'client_reference.zip', progress: 12, speed: '0 MB/s', eta: '--', status: 'paused' },
    { id: 4, name: 'missing_assets.zip', progress: 0, speed: '0 MB/s', eta: '--', status: 'error' },
  ];

  return (
    <div className="p-4 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold tracking-tight text-white">Download Queue</h2>
        <p className="text-xs text-white/50">{queue.filter(q => q.status === 'downloading').length} active downloads</p>
      </div>

      <div className="flex flex-col gap-3 mt-2">
        {queue.map((item) => (
          <div key={item.id} className="bg-surface border border-border p-3 rounded-xl flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <span className="text-sm font-medium text-white truncate pr-2" title={item.name}>{item.name}</span>
              <div className="flex gap-1">
                {item.status === 'downloading' && (
                  <button className="p-1 text-white/40 hover:text-white/80 transition-colors"><Pause size={14} /></button>
                )}
                {item.status === 'paused' && (
                  <button className="p-1 text-white/40 hover:text-white/80 transition-colors"><Play size={14} /></button>
                )}
                {item.status === 'error' && (
                  <button className="p-1 text-white/40 hover:text-white/80 transition-colors"><RotateCcw size={14} /></button>
                )}
                <button className="p-1 text-white/40 hover:text-accent transition-colors"><XCircle size={14} /></button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[10px] font-medium uppercase tracking-wider">
                <span className={item.status === 'error' ? 'text-accent' : item.status === 'completed' ? 'text-green-500' : 'text-white/60'}>
                  {item.status}
                </span>
                <span className="text-white/60">{item.progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${item.status === 'error' ? 'bg-accent' : item.status === 'completed' ? 'bg-green-500' : 'bg-white'}`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              {item.status === 'downloading' && (
                <div className="flex justify-between text-[10px] text-white/40 font-mono">
                  <span>{item.speed}</span>
                  <span>ETA: {item.eta}</span>
                </div>
              )}
            </div>
          </div>
        ))}
        {queue.length === 0 && (
          <div className="text-center text-white/40 text-sm mt-10">Queue is empty</div>
        )}
      </div>
    </div>
  );
}
