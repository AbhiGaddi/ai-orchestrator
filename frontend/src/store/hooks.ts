import { create } from 'zustand';
import { ipc } from '@/lib/ipc';

interface HookConfig {
    id?: string;
    event: string;
    matcher?: string;
    command: string;
    timeout?: number;
    background?: boolean;
}

interface HooksState {
    globalHooks: HookConfig[];
    projectHooks: HookConfig[];
    loading: boolean;
    loadGlobal: () => Promise<void>;
    loadProject: (projectPath: string) => Promise<void>;
    saveGlobal: (hooks: HookConfig[]) => Promise<void>;
    saveProject: (hooks: HookConfig[], projectPath: string) => Promise<void>;
}

export const useHooksStore = create<HooksState>((set, get) => ({
    globalHooks: [],
    projectHooks: [],
    loading: false,

    loadGlobal: async () => {
        set({ loading: true });
        try {
            const data = await ipc.hooks.list('global');
            set({ globalHooks: data, loading: false });
        } catch (e) {
            console.error(e);
            set({ loading: false });
        }
    },

    loadProject: async (projectPath) => {
        set({ loading: true });
        try {
            const data = await ipc.hooks.list('project', projectPath);
            set({ projectHooks: data, loading: false });
        } catch (e) {
            console.error(e);
            set({ loading: false });
        }
    },

    saveGlobal: async (hooks) => {
        set({ loading: true });
        try {
            await ipc.hooks.update(hooks, 'global');
            await get().loadGlobal();
        } catch (e) {
            console.error(e);
            set({ loading: false });
            throw e;
        }
    },

    saveProject: async (hooks, projectPath) => {
        set({ loading: true });
        try {
            await ipc.hooks.update(hooks, 'project', projectPath);
            await get().loadProject(projectPath);
        } catch (e) {
            console.error(e);
            set({ loading: false });
            throw e;
        }
    }
}));
