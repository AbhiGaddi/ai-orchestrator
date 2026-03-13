import { create } from 'zustand';
import { ipc } from '@/lib/ipc';
import type { Agent, AgentStatus } from '@/types';

interface AgentsStore {
    agents: Agent[];
    activeAgentId: string | null;
    loading: boolean;
    load: () => Promise<void>;
    setActive: (id: string) => void;
    updateStatus: (id: string, status: AgentStatus) => void;
    removeAgentFromStore: (id: string) => void;
}

export const useAgentsStore = create<AgentsStore>((set, get) => ({
    agents: [],
    activeAgentId: null,
    loading: true,
    load: async () => {
        try {
            const data = await ipc.agents.list();
            set((state) => ({
                agents: data,
                loading: false,
                activeAgentId: state.activeAgentId || (data.length > 0 ? data[0].id : null)
            }));
        } catch (err) {
            console.error('Failed to load agents:', err);
            set({ loading: false });
        }
    },
    setActive: (id: string) => set({ activeAgentId: id }),
    updateStatus: (id: string, status: AgentStatus) => set((state) => ({
        agents: state.agents.map(a => a.id === id ? { ...a, status } : a)
    })),
    removeAgentFromStore: (id: string) => set((state) => {
        const newAgents = state.agents.filter(a => a.id !== id);
        const newActiveId = state.activeAgentId === id ? (newAgents[0]?.id || null) : state.activeAgentId;
        return { agents: newAgents, activeAgentId: newActiveId };
    })
}));
