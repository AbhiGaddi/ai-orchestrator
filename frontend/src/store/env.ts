import { create } from 'zustand';
import { ipc } from '@/lib/ipc';

interface EnvVar {
    key: string;
    value: string;
    created_at: string;
}

interface EnvState {
    variables: EnvVar[];
    loading: boolean;
    load: () => Promise<void>;
    save: (key: string, value: string) => Promise<void>;
    remove: (key: string) => Promise<void>;
}

export const useEnvStore = create<EnvState>((set, get) => ({
    variables: [],
    loading: false,

    load: async () => {
        set({ loading: true });
        try {
            const data = await ipc.env.list();
            set({ variables: data, loading: false });
        } catch (e) {
            console.error(e);
            set({ loading: false });
        }
    },

    save: async (key, value) => {
        set({ loading: true });
        try {
            await ipc.env.save(key, value);
            await get().load();
        } catch (e) {
            console.error(e);
            set({ loading: false });
            throw e;
        }
    },

    remove: async (key) => {
        set({ loading: true });
        try {
            await ipc.env.delete(key);
            await get().load();
        } catch (e) {
            console.error(e);
            set({ loading: false });
            throw e;
        }
    }
}));
