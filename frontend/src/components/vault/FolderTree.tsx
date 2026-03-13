import React, { useState } from 'react';
import { FileText, Folder, ChevronRight, ChevronDown } from 'lucide-react';
import type { VaultFolder, VaultDocument } from '@/types';
import { useVaultStore } from '@/store/vault';

export function FolderTree() {
    const { folders, documents, setActiveDocument, activeDocumentId } = useVaultStore();
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const toggleFolder = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

    // Build recursive tree
    const buildTree = (parentId: string | null) => {
        const childrenFolders = folders.filter(f => (f.parent_id || null) === parentId);
        const childrenDocs = documents.filter(d => (d.folder_id || null) === parentId);

        return (
            <div className="ml-3 border-l border-[#374151] pl-2 mt-1 space-y-1">
                {childrenFolders.map(folder => (
                    <div key={folder.id}>
                        <div
                            onClick={() => toggleFolder(folder.id)}
                            className="flex items-center gap-2 p-1.5 rounded hover:bg-[#374151] cursor-pointer text-gray-300 text-sm font-medium transition-colors"
                        >
                            {expanded[folder.id] ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
                            <Folder size={14} className="text-sky-400" />
                            {folder.name}
                        </div>
                        {expanded[folder.id] && buildTree(folder.id)}
                    </div>
                ))}

                {childrenDocs.map(doc => (
                    <div
                        key={doc.id}
                        onClick={() => setActiveDocument(doc.id)}
                        className={`flex items-center gap-2 p-1.5 pl-[22px] rounded cursor-pointer text-sm transition-colors mt-0.5 ${activeDocumentId === doc.id ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30' : 'text-gray-400 hover:bg-[#374151] hover:text-gray-200 border border-transparent'
                            }`}
                    >
                        <FileText size={13} className={activeDocumentId === doc.id ? 'text-violet-400' : 'text-gray-500'} />
                        <span className="truncate">{doc.title}</span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="h-full overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 pl-2">My Vault</div>
            <div className="-ml-3">{buildTree(null)}</div>

            {folders.length === 0 && documents.length === 0 && (
                <div className="text-sm italic text-gray-500 px-2 mt-4 text-center">Vault is empty</div>
            )}
        </div>
    );
}
