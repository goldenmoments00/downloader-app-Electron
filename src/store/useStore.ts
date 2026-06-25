import { create } from 'zustand';

interface AppState {
  activeDownloads: number;
  setActiveDownloads: (count: number) => void;
}

export const useStore = create<AppState>((set) => ({
  activeDownloads: 0,
  setActiveDownloads: (count) => set({ activeDownloads: count }),
}));
