import { create } from 'zustand';

export type NasStatus = 'Connected' | 'Connecting' | 'Offline' | 'Access Denied';

interface NasStore {
  status: NasStatus;
  folders: string[];
  selectedCategory: string;
  nasRootPath: string;
  setStatus: (status: NasStatus) => void;
  setFolders: (folders: string[]) => void;
  setSelectedCategory: (category: string) => void;
  setNasRootPath: (path: string) => void;
}

export const useNasStore = create<NasStore>((set) => ({
  status: 'Connecting',
  folders: [],
  selectedCategory: '',
  nasRootPath: '',
  setStatus: (status) => set({ status }),
  setFolders: (folders) => set({ folders }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setNasRootPath: (nasRootPath) => set({ nasRootPath })
}));
