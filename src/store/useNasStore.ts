import { create } from 'zustand';

export type NasStatus = 'Connected' | 'Connecting' | 'Offline' | 'Access Denied';

interface NasStore {
  status: NasStatus;
  folders: string[];
  selectedCategory: string;
  nasRootPath: string;
  embedArtwork: boolean;
  destinationMode: 'nas' | 'custom';
  customFolder: string;
  setStatus: (status: NasStatus) => void;
  setFolders: (folders: string[]) => void;
  setSelectedCategory: (category: string) => void;
  setNasRootPath: (path: string) => void;
  setEmbedArtwork: (embed: boolean) => void;
  setDestinationMode: (mode: 'nas' | 'custom') => void;
  setCustomFolder: (folder: string) => void;
}

export const useNasStore = create<NasStore>((set) => ({
  status: 'Connecting',
  folders: [],
  selectedCategory: '',
  nasRootPath: '',
  embedArtwork: true,
  destinationMode: 'nas',
  customFolder: '',
  setStatus: (status) => set({ status }),
  setFolders: (folders) => set({ folders }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setNasRootPath: (nasRootPath) => set({ nasRootPath }),
  setEmbedArtwork: (embedArtwork) => set({ embedArtwork }),
  setDestinationMode: (destinationMode) => set({ destinationMode }),
  setCustomFolder: (customFolder) => set({ customFolder })
}));
