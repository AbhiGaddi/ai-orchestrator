'use client';

import React, { useEffect, useState } from 'react';
import { Binary, Plus, Trash2, Edit2, Play, Globe, FolderCode, Save } from 'lucide-react';
import { ipc } from '@/lib/ipc';

interface MemoryFile {
    path: string;
    name: string;
    scope: 'global' | 'project';
    projectPath?: string;
    content: string;
    mtime: string;
}

export default function MemoryPage() {
    const [memoryFiles, setMemoryFiles] = useState<MemoryFile[]>([]);
    const [selectedFile, setSelectedFile] = useState<MemoryFile | null>(null);
    const [editContent, setEditContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const loadMemoryFiles = async () => {
        try {
            // For now testing with global + assuming no specific project args passed initially
            // You can pass an array of project paths if needed.
            const list = await ipc.memory.list([]);
            setMemoryFiles(list);
            if (list.length > 0 && !selectedFile) {
                const first = list[0];
                setSelectedFile(first);
                setEditContent(first.content);
            }
        } catch (err) {
            console.error('Failed to load memory files:', err);
        }
    };

    useEffect(() => {
        loadMemoryFiles();
    }, []);

    const handleSelectFile = (file: MemoryFile) => {
        if (selectedFile?.path !== file.path) {
            setSelectedFile(file);
            setEditContent(file.content);
        }
    };

    const handleSave = async () => {
        if (!selectedFile) return;
        setIsSaving(true);
        try {
            await ipc.memory.write(selectedFile.path, editContent);
            await loadMemoryFiles();
        } catch (err) {
            console.error('Failed to save memory file:', err);
            alert('Failed to save memory file');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (file: MemoryFile) => {
        if (!confirm(`Are you sure you want to delete ${file.name}?`)) return;
        try {
            await ipc.memory.delete(file.path);
            if (selectedFile?.path === file.path) {
                setSelectedFile(null);
                setEditContent('');
            }
            await loadMemoryFiles();
        } catch (err) {
            console.error('Failed to delete memory file:', err);
            alert('Failed to delete memory file');
        }
    };

    const globalFiles = memoryFiles.filter(f => f.scope === 'global');
    const projectFiles = memoryFiles.filter(f => f.scope === 'project');

    return (
        <div className="flex flex-col h-full bg-[#030712] text-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-[#1f2937]">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Binary className="text-violet-500" /> Memory Manager
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">Manage global and project memory patterns (`CLAUDE.md`, `memory/`)</p>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar List */}
                <div className="w-1/3 flex flex-col border-r border-[#1f2937] overflow-y-auto bg-[#09090b] p-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Globe size={14} /> Global Memory
                    </h3>
                    <div className="space-y-1 mb-6">
                        {globalFiles.length === 0 && <p className="text-sm text-gray-600 px-3">No global memory files</p>}
                        {globalFiles.map(f => (
                            <button
                                key={f.path}
                                onClick={() => handleSelectFile(f)}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between
                                    ${selectedFile?.path === f.path
                                        ? 'bg-violet-600/20 text-violet-400'
                                        : 'text-gray-300 hover:bg-[#1f2937]'}`}
                            >
                                <span className="flex items-center gap-2">
                                    <span className="font-mono text-xs opacity-50">~</span>{f.name}
                                </span>
                            </button>
                        ))}
                    </div>

                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <FolderCode size={14} /> Project Memory
                    </h3>
                    <div className="space-y-1">
                        {projectFiles.length === 0 && <p className="text-sm text-gray-600 px-3">No project memory files</p>}
                        {projectFiles.map(f => (
                            <button
                                key={f.path}
                                onClick={() => handleSelectFile(f)}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between
                                    ${selectedFile?.path === f.path
                                        ? 'bg-violet-600/20 text-violet-400'
                                        : 'text-gray-300 hover:bg-[#1f2937]'}`}
                            >
                                <span className="flex items-center gap-2 truncate">
                                    <span className="font-mono text-xs text-gray-500">{f.projectPath?.split('/').pop()}/</span>
                                    {f.name}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="w-2/3 flex flex-col bg-[#111827] overflow-hidden">
                    {selectedFile ? (
                        <div className="flex flex-col h-full">
                            <div className="flex items-center justify-between p-4 border-b border-[#1f2937]">
                                <div className="truncate pr-4 flex flex-col">
                                    <span className="font-semibold">{selectedFile.name}</span>
                                    <span className="text-xs text-gray-500 font-mono truncate">{selectedFile.path}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => handleDelete(selectedFile)}
                                        className="px-3 py-1.5 bg-red-900/40 hover:bg-red-900/60 text-red-500 rounded transition-colors flex items-center gap-2 text-sm font-medium border border-red-900/50"
                                    >
                                        <Trash2 size={14} /> Delete
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                                    >
                                        <Save size={14} /> {isSaving ? 'Saving...' : 'Save File'}
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 p-4 bg-[#09090b]">
                                <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="w-full h-full bg-[#111827] border border-[#1f2937] rounded-lg p-4 font-mono text-sm text-gray-300 focus:outline-none focus:border-violet-500 resize-none"
                                    spellCheck="false"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            Select a memory file to edit
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
