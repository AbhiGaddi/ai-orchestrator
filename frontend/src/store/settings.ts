import { create } from 'zustand';
import { ipc } from '@/lib/ipc';
import type { AppSettings } from '@/types';

interface SettingsStore {
    settings: AppSettings | null;
    loading: boolean;
    load: () => Promise<void>;
    update: (updates: Partial<AppSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
    settings: null,
    loading: true,
    load: async () => {
        try {
            const data = await ipc.settings.get();
            set({ settings: data, loading: false });
        } catch (err) {
            console.error('Failed to load settings:', err);
            set({ loading: false });
        }
    },
    update: async (updates) => {
        try {
            const newSettings = await ipc.settings.update(updates);
            set({ settings: newSettings });
        } catch (err) {
            console.error('Failed to update settings:', err);
            throw err;
        }
    }
}));
