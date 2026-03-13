import { create } from 'zustand';
import { ipc } from '@/lib/ipc';
import type { Automation } from '@/types';

interface AutomationStore {
    automations: Automation[];
    loading: boolean;
    load: () => Promise<void>;
    toggleAutomation: (id: string, enabled: boolean) => Promise<void>;
    runAutomationNow: (id: string) => Promise<void>;
}

export const useAutomationStore = create<AutomationStore>((set) => ({
    automations: [],
    loading: true,
    load: async () => {
        try {
            const data = await ipc.automations.list();
            set({ automations: data, loading: false });
        } catch {
            set({ loading: false });
        }
    },
    toggleAutomation: async (id, enabled) => {
        await ipc.automations.toggle(id, enabled);
        set((state) => ({
            automations: state.automations.map((a) => (a.id === id ? { ...a, enabled } : a)),
        }));
    },
    runAutomationNow: async (id) => {
        await ipc.automations.runNow(id);
    },
}));
