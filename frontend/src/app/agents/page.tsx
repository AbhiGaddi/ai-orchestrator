'use client';

import React, { useEffect, useState } from 'react';
import { Plus, TerminalSquare } from 'lucide-react';
import { useAgentsStore } from '@/store/agents';
import { useIpcEvent } from '@/hooks/useIpcEvent';
import { AgentCard } from '@/components/agents/AgentCard';
import dynamic from 'next/dynamic';
import { NewAgentModal } from '@/components/agents/NewAgentModal';

const AgentTerminal = dynamic(() => import('@/components/agents/AgentTerminal').then(mod => mod.AgentTerminal), { ssr: false });

export default function AgentsPage() {
    const { agents, activeAgentId, load, loading, updateStatus } = useAgentsStore();
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        load();
    }, [load]);

    // Listen to IPC events for realtime status updates
    useIpcEvent('agent:status', (payload: any) => {
        const { id, status } = payload;
        updateStatus(id, status);
    });

    if (loading) {
        return <div className="p-8 text-white relative z-10 pl-[80px]">Loading agents...</div>;
    }

    return (
        <div className="h-screen flex flex-col p-8 w-full relative z-10">

            {/* Header */}
            <div className="flex justify-between items-center mb-6 pr-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <TerminalSquare size={28} className="text-violet-500" />
                        Active Agents
                    </h1>
                    <p className="text-gray-400 text-sm mt-1 ml-10">
                        Manage parallel Claude CLI processes isolated by project
                    </p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-lg font-bold transition-all shadow-lg shadow-violet-500/20 active:scale-95"
                >
                    <Plus size={18} />
                    New Agent
                </button>
            </div>

            <div className="flex gap-4 flex-1 overflow-hidden pr-4 pb-4">

                {/* Left Sidebar: Agents List */}
                <div className="w-[340px] flex flex-col gap-3 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#374151 transparent' }}>
                    {agents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 bg-[#1f2937] rounded-xl border border-[#374151] text-center">
                            <div className="bg-[#374151] p-3 rounded-full mb-3">
                                <TerminalSquare size={24} className="text-gray-400" />
                            </div>
                            <p className="text-gray-300 font-medium mb-1">No agents running</p>
                            <p className="text-xs text-gray-500">Create an agent to spawn a localized Claude CLI terminal instance.</p>
                        </div>
                    ) : (
                        agents.map(agent => (
                            <AgentCard key={agent.id} agent={agent} />
                        ))
                    )}
                </div>

                {/* Right Main: xterm.js Terminal */}
                <div className="flex-1 bg-[#09090b] rounded-xl border border-[#374151] shadow-2xl overflow-hidden relative group p-1">
                    {activeAgentId ? (
                        <AgentTerminal agentId={activeAgentId} />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-3">
                            <TerminalSquare size={48} className="opacity-20" />
                            <p>Select an agent to view real-time output</p>
                        </div>
                    )}
                </div>
            </div>

            {showModal && (
                <NewAgentModal
                    onClose={() => setShowModal(false)}
                    onSuccess={() => {
                        setShowModal(false);
                        load();
                    }}
                />
            )}
        </div>
    );
}
