import { create } from 'zustand';
import { ipc } from '@/lib/ipc';

interface McpServerConfig {
    name: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
    type?: 'stdio' | 'sse';
    status?: string;
}

interface McpState {
    globalServers: McpServerConfig[];
    projectServers: McpServerConfig[];
    loading: boolean;
    loadGlobal: () => Promise<void>;
    loadProject: (projectPath: string) => Promise<void>;
    saveGlobal: (name: string, config: any) => Promise<void>;
    saveProject: (name: string, config: any, projectPath: string) => Promise<void>;
    deleteGlobal: (name: string) => Promise<void>;
    deleteProject: (name: string, projectPath: string) => Promise<void>;
}

export const useMcpStore = create<McpState>((set, get) => ({
    globalServers: [],
    projectServers: [],
    loading: false,

    loadGlobal: async () => {
        set({ loading: true });
        try {
            const data = await ipc.mcp.list('global');
            set({ globalServers: data, loading: false });
        } catch (e) {
            console.error(e);
            set({ loading: false });
        }
    },

    loadProject: async (projectPath) => {
        set({ loading: true });
        try {
            const data = await ipc.mcp.list('project', projectPath);
            set({ projectServers: data, loading: false });
        } catch (e) {
            console.error(e);
            set({ loading: false });
        }
    },

    saveGlobal: async (name, config) => {
        set({ loading: true });
        try {
            await ipc.mcp.save(name, config, 'global');
            await get().loadGlobal();
        } catch (e) {
            console.error(e);
            set({ loading: false });
            throw e;
        }
    },

    saveProject: async (name, config, projectPath) => {
        set({ loading: true });
        try {
            await ipc.mcp.save(name, config, 'project', projectPath);
            await get().loadProject(projectPath);
        } catch (e) {
            console.error(e);
            set({ loading: false });
            throw e;
        }
    },

    deleteGlobal: async (name) => {
        set({ loading: true });
        try {
            await ipc.mcp.delete(name, 'global');
            await get().loadGlobal();
        } catch (e) {
            console.error(e);
            set({ loading: false });
            throw e;
        }
    },

    deleteProject: async (name, projectPath) => {
        set({ loading: true });
        try {
            await ipc.mcp.delete(name, 'project', projectPath);
            await get().loadProject(projectPath);
        } catch (e) {
            console.error(e);
            set({ loading: false });
            throw e;
        }
    }
}));
