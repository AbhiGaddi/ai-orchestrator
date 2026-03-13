import { create } from 'zustand';
import { ipc } from '@/lib/ipc';
import type { VaultFolder, VaultDocument } from '@/types';

interface VaultStore {
    folders: VaultFolder[];
    documents: VaultDocument[];
    activeDocumentId: string | null;
    loading: boolean;
    load: () => Promise<void>;
    createFolder: (name: string, parentId?: string) => Promise<void>;
    createDocument: (data: Partial<VaultDocument>) => Promise<VaultDocument>;
    updateDocument: (id: string, data: Partial<VaultDocument>) => Promise<void>;
    deleteDocument: (id: string) => Promise<void>;
    setActiveDocument: (id: string | null) => void;
    search: (query: string) => Promise<VaultDocument[]>;
}

export const useVaultStore = create<VaultStore>((set) => ({
    folders: [],
    documents: [],
    activeDocumentId: null,
    loading: true,
    load: async () => {
        try {
            const [f, d] = await Promise.all([ipc.vault.listFolders(), ipc.vault.listDocuments()]);
            set({ folders: f, documents: d, loading: false });
        } catch {
            set({ loading: false });
        }
    },
    createFolder: async (name, parentId) => {
        await ipc.vault.createFolder(name, parentId);
        const f = await ipc.vault.listFolders();
        set({ folders: f });
    },
    createDocument: async (data) => {
        const newDoc = await ipc.vault.createDocument(data);
        const d = await ipc.vault.listDocuments();
        set({ documents: d, activeDocumentId: newDoc.id });
        return newDoc;
    },
    updateDocument: async (id, data) => {
        await ipc.vault.updateDocument(id, data);
        set((state) => ({
            documents: state.documents.map(doc => doc.id === id ? { ...doc, ...data } : doc)
        }));
    },
    deleteDocument: async (id) => {
        await ipc.vault.deleteDocument(id);
        set((state) => ({
            documents: state.documents.filter(doc => doc.id !== id),
            activeDocumentId: state.activeDocumentId === id ? null : state.activeDocumentId
        }));
    },
    setActiveDocument: (id) => set({ activeDocumentId: id }),
    search: async (query) => {
        return ipc.vault.search(query);
    }
}));
