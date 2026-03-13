import { create } from 'zustand';
import { ipc } from '@/lib/ipc';
import type { KanbanTask, KanbanColumn } from '@/types';

interface KanbanStore {
    tasks: KanbanTask[];
    loading: boolean;
    load: () => Promise<void>;
    moveTask: (id: string, col: KanbanColumn) => Promise<void>;
    assignTask: (id: string, agentId?: string) => Promise<void>;
    deleteTask: (id: string) => Promise<void>;
}

export const useKanbanStore = create<KanbanStore>((set) => ({
    tasks: [],
    loading: true,
    load: async () => {
        try {
            const data = await ipc.kanban.list();
            set({ tasks: data, loading: false });
        } catch (err) {
            console.error('Failed to load kanban tasks:', err);
            set({ loading: false });
        }
    },
    moveTask: async (id: string, col: KanbanColumn) => {
        // Optimistic UI update
        set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? { ...t, column: col } : t)),
        }));
        try {
            await ipc.kanban.move(id, col);
        } catch {
            // Rollback on failure (lazy reload here for simplicity)
            const data = await ipc.kanban.list();
            set({ tasks: data });
        }
    },
    assignTask: async (id: string, agentId?: string) => {
        set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? { ...t, assigned_agent_id: agentId } : t)),
        }));
        await ipc.kanban.assign(id, agentId);
    },
    deleteTask: async (id: string) => {
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
        await ipc.kanban.delete(id);
    },
}));
