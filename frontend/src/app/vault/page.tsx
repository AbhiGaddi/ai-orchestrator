'use client';

import React, { useEffect, useState } from 'react';
import { Book, Plus, Search, FileText } from 'lucide-react';
import { useVaultStore } from '@/store/vault';
import { FolderTree } from '@/components/vault/FolderTree';
import { DocumentEditor } from '@/components/vault/DocumentEditor';

export default function VaultPage() {
    const { load, loading, activeDocumentId, createDocument, search, setActiveDocument } = useVaultStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (!searchQuery) {
            setSearchResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            const res = await search(searchQuery);
            setSearchResults(res);
        }, 200);
        return () => clearTimeout(timer);
    }, [searchQuery, search]);

    if (loading) return <div className="p-8 text-white">Loading Vault...</div>;

    const handleNewDoc = () => {
        createDocument({ title: 'Untitled Document', content: '# New Document', tags: [] });
    };

    return (
        <div className="h-screen flex flex-col p-8 w-full bg-[#09090b]">

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
                        <Book size={28} className="text-violet-500" />
                        Agent Knowledge Vault
                    </h1>
                    <p className="text-gray-400 text-sm mt-1 ml-10">
                        A shared Markdown database readable and writable by your local AI agents.
                    </p>
                </div>
            </div>

            <div className="flex-1 flex gap-4 overflow-hidden mb-4">

                {/* Sidebar */}
                <div className="w-[300px] flex flex-col gap-4">

                    <div className="flex gap-2">
                        <button
                            onClick={handleNewDoc}
                            className="flex-1 flex justify-center items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white py-2 rounded-lg font-bold shadow-lg shadow-violet-500/20 text-sm transition-all active:scale-95"
                        >
                            <Plus size={16} /> New Doc
                        </button>
                    </div>

                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search documents (FTS5)..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-[#111827] border border-[#374151] rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                        />
                    </div>

                    <div className="flex-1 bg-[#1f2937] rounded-xl border border-[#374151] p-3 overflow-hidden flex flex-col">
                        {searchQuery ? (
                            <div className="h-full overflow-y-auto">
                                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Search Results</div>
                                {searchResults.length === 0 ? (
                                    <div className="text-sm text-gray-500 italic">No matches found.</div>
                                ) : (
                                    searchResults.map(result => (
                                        <div
                                            key={result.id}
                                            onClick={() => setActiveDocument(result.id)}
                                            className="p-2 bg-[#111827] border border-[#374151] rounded mb-2 cursor-pointer hover:border-violet-500 transition-colors"
                                        >
                                            <div className="font-semibold text-sm text-gray-200 flex items-center gap-2">
                                                <FileText size={12} className="text-violet-400" />
                                                {result.title}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <FolderTree />
                        )}
                    </div>
                </div>

                {/* Editor Area */}
                <div className="flex-1">
                    {activeDocumentId ? (
                        <DocumentEditor documentId={activeDocumentId} />
                    ) : (
                        <div className="bg-[#0e1320] border-2 border-dashed border-[#374151] h-full rounded-xl flex flex-col items-center justify-center text-gray-500">
                            <Book size={48} className="opacity-20 mb-4" />
                            <p>Select a document from the vault to read or edit</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
