'use client';

import React, { useEffect, useState } from 'react';
import { Search, Play, Trash2, FileText, Activity } from 'lucide-react';
import { ipc } from '@/lib/ipc';

interface SessionSummary {
    sessionId: string;
    projectPathHash: string;
    filePath: string;
    mtime: string;
    turnCount: number;
    inputTokens: number;
    outputTokens: number;
    model: string;
    estimatedCost: number;
}

export default function SessionsPage() {
    const [sessions, setSessions] = useState<SessionSummary[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selected, setSelected] = useState<SessionSummary | null>(null);

    const loadSessions = async () => {
        try {
            const list = await ipc.sessions.list();
            setSessions(list);
        } catch (err) {
            console.error('Failed to load sessions', err);
        }
    };

    useEffect(() => {
        loadSessions();
    }, []);

    const filteredSessions = sessions.filter(s =>
        s.sessionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.projectPathHash.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDelete = async (filePath: string) => {
        if (!confirm('Are you sure you want to delete this session transcript?')) return;
        await ipc.sessions.delete(filePath);
        if (selected?.filePath === filePath) setSelected(null);
        loadSessions();
    };

    const handleResume = async (s: SessionSummary) => {
        // Here we ideally want to invoke NewAgentModal or route to agent creation with --resume
        alert(`Resume session: ${s.sessionId}. Use --resume ${s.sessionId} in a new agent prompt.`);
    };

    return (
        <div className="flex flex-col h-full bg-[#030712] text-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-[#1f2937]">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Activity className="text-violet-500" /> Sessions Browser
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">Browse and resume past Claude interactions</p>
                </div>
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search sessions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#111827] border border-[#374151] rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:border-violet-500"
                    />
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                <div className="w-1/2 flex flex-col border-r border-[#1f2937] overflow-y-auto bg-[#09090b] p-4">
                    {filteredSessions.length === 0 ? (
                        <div className="text-center text-gray-500 mt-10">No sessions found.</div>
                    ) : (
                        <div className="space-y-2">
                            {filteredSessions.map((s) => (
                                <div
                                    key={s.filePath}
                                    onClick={() => setSelected(s)}
                                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${selected?.filePath === s.filePath ? 'bg-[#1f2937] border-violet-500' : 'bg-[#111827] border-[#374151] hover:border-violet-400/50'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-mono text-sm font-semibold">{s.sessionId.slice(0, 10)}...</span>
                                        <span className="text-xs text-gray-400">{new Date(s.mtime).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-gray-500">
                                        <span className="truncate max-w-[150px]">Project: {s.projectPathHash.slice(0, 8)}</span>
                                        <span className="flex items-center gap-2 text-gray-300">
                                            {s.turnCount} turns / <span className="text-green-400">${s.estimatedCost.toFixed(3)}</span>
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="w-1/2 flex flex-col bg-[#111827] p-6 overflow-y-auto">
                    {selected ? (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-bold mb-4 border-b border-[#374151] pb-2">Selected Session</h2>
                                <div className="space-y-3 text-sm">
                                    <div className="grid grid-cols-[100px_1fr] gap-2">
                                        <span className="text-gray-500">Session ID:</span>
                                        <span className="font-mono text-gray-200">{selected.sessionId}</span>
                                    </div>
                                    <div className="grid grid-cols-[100px_1fr] gap-2">
                                        <span className="text-gray-500">Project Hash:</span>
                                        <span className="font-mono text-gray-200">{selected.projectPathHash}</span>
                                    </div>
                                    <div className="grid grid-cols-[100px_1fr] gap-2">
                                        <span className="text-gray-500">Started:</span>
                                        <span className="text-gray-200">{new Date(selected.mtime).toLocaleString()}</span>
                                    </div>
                                    <div className="grid grid-cols-[100px_1fr] gap-2">
                                        <span className="text-gray-500">Model:</span>
                                        <span className="text-violet-400 font-semibold">{selected.model}</span>
                                    </div>
                                    <div className="grid grid-cols-[100px_1fr] gap-2">
                                        <span className="text-gray-500">Turns:</span>
                                        <span className="text-gray-200">{selected.turnCount} turns</span>
                                    </div>
                                    <div className="grid grid-cols-[100px_1fr] gap-2">
                                        <span className="text-gray-500">Cost:</span>
                                        <span className="text-gray-200 flex items-center gap-2">
                                            <span className="text-green-400 font-semibold">${selected.estimatedCost.toFixed(4)}</span>
                                            <span className="text-xs text-gray-500">({selected.inputTokens.toLocaleString()} in, {selected.outputTokens.toLocaleString()} out tokens)</span>
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-[100px_1fr] gap-2">
                                        <span className="text-gray-500">File Path:</span>
                                        <span className="text-xs font-mono text-gray-400 break-all">{selected.filePath}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-[#374151] flex items-center gap-3">
                                <button
                                    onClick={() => alert('Transcript Viewer not implemented yet')}
                                    className="px-4 py-2 bg-[#1f2937] hover:bg-[#374151] text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors"
                                >
                                    <FileText size={16} /> View Transcript
                                </button>
                                <button
                                    onClick={() => handleResume(selected)}
                                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors"
                                >
                                    <Play size={16} /> Resume in New Agent
                                </button>
                                <button
                                    onClick={() => handleDelete(selected.filePath)}
                                    className="ml-auto px-4 py-2 bg-red-900/40 hover:bg-red-900/60 text-red-500 text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors border border-red-900/50"
                                >
                                    <Trash2 size={16} /> Delete
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                            Select a session to view details
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
