import { create } from 'zustand';
import { ipc } from '@/lib/ipc';
import type { ScheduledTask } from '@/types';

interface ScheduledStore {
    tasks: ScheduledTask[];
    loading: boolean;
    load: () => Promise<void>;
    createTask: (data: Partial<ScheduledTask>) => Promise<void>;
    deleteTask: (id: string) => Promise<void>;
    toggleTask: (id: string, enabled: boolean) => Promise<void>;
    runTaskNow: (id: string) => Promise<void>;
}

export const useScheduledStore = create<ScheduledStore>((set) => ({
    tasks: [],
    loading: true,
    load: async () => {
        try {
            const data = await ipc.scheduled.list();
            set({ tasks: data, loading: false });
        } catch {
            set({ loading: false });
        }
    },
    createTask: async (data) => {
        await ipc.scheduled.create(data);
        const updated = await ipc.scheduled.list();
        set({ tasks: updated });
    },
    deleteTask: async (id) => {
        await ipc.scheduled.delete(id);
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
    },
    toggleTask: async (id, enabled) => {
        await ipc.scheduled.toggle(id, enabled);
        set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? { ...t, enabled } : t)),
        }));
    },
    runTaskNow: async (id) => {
        await ipc.scheduled.runNow(id);
    },
}));
