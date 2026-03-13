import { create } from 'zustand';
import { listAgentProfiles, createAgentProfile, updateAgentProfile, deleteAgentProfile } from '@/lib/api';
import type { AgentProfile } from '@/types';

interface AgentProfilesState {
    profiles: AgentProfile[];
    loading: boolean;
    error: string | null;
    load: () => Promise<void>;
    createProfile: (data: Partial<AgentProfile>) => Promise<AgentProfile>;
    updateProfile: (id: string, data: Partial<AgentProfile>) => Promise<AgentProfile>;
    deleteProfile: (id: string) => Promise<void>;
}

export const useAgentProfilesStore = create<AgentProfilesState>((set, get) => ({
    profiles: [],
    loading: false,
    error: null,

    load: async () => {
        set({ loading: true, error: null });
        try {
            const profiles = await listAgentProfiles();
            set({ profiles, loading: false });
        } catch (err: any) {
            set({ error: err.message || 'Failed to load profiles', loading: false });
        }
    },

    createProfile: async (data: Partial<AgentProfile>) => {
        const profile = await createAgentProfile(data);
        await get().load();
        return profile;
    },

    updateProfile: async (id: string, data: Partial<AgentProfile>) => {
        const profile = await updateAgentProfile(id, data);
        await get().load();
        return profile;
    },

    deleteProfile: async (id: string) => {
        await deleteAgentProfile(id);
        await get().load();
    },
}));
