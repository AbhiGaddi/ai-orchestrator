import React from 'react';
import { Play, Square, Trash2, Terminal } from 'lucide-react';
import type { Agent } from '@/types';
import { ipc } from '@/lib/ipc';
import { useAgentsStore } from '@/store/agents';
import { PromptModal } from './PromptModal';
import { ConfirmModal } from './ConfirmModal';

export function AgentCard({ agent }: { agent: Agent }) {
    const { activeAgentId, setActive, load, removeAgentFromStore } = useAgentsStore();
    const isActive = activeAgentId === agent.id;

    const [showPrompt, setShowPrompt] = React.useState(false);

    const handleStart = async (prompt: string) => {
        try {
            await ipc.agents.start(agent.id, prompt, agent.model);
            load();
        } catch (err) {
            console.error('Failed to start agent:', err);
        }
    };

    const handleStartClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowPrompt(true);
    };

    const handleStop = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await ipc.agents.stop(agent.id);
            load();
        } catch (err) {
            alert('Failed to stop agent');
        }
    };

    const [showConfirm, setShowConfirm] = React.useState(false);

    const handleRemove = async () => {
        try {
            await ipc.agents.remove(agent.id);
            removeAgentFromStore(agent.id);
        } catch (err) {
            console.error('Failed to remove agent:', err);
        }
    };

    const handleRemoveClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowConfirm(true);
    };

    return (
        <div
            onClick={() => setActive(agent.id)}
            className={`p-4 rounded-lg cursor-pointer transition-all border ${isActive
                ? 'bg-[#1f2937] border-violet-500 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                : 'bg-[#111827] border-[#374151] hover:border-violet-500/50'
                }`}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                    {agent.status === 'running' ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title="Running" />
                    ) : agent.status === 'idle' ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-500" title="Idle" />
                    ) : agent.status === 'waiting' ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" title="Waiting for Input" />
                    ) : agent.status === 'error' ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500" title="Error" />
                    ) : (
                        <div className="w-2.5 h-2.5 rounded-full bg-violet-500" title="Completed" />
                    )}
                    <h3 className="font-bold text-gray-100 truncate w-32" title={agent.name}>{agent.name}</h3>
                </div>
                <div className="flex bg-[#374151] rounded text-[10px] uppercase font-bold px-2 py-0.5 text-gray-300">
                    {agent.model}
                </div>
            </div>

            <div className="text-xs text-gray-400 mb-4 h-8 overflow-hidden line-clamp-2">
                {agent.currentTask || 'No current task'}
            </div>

            <div className="flex justify-between items-end pt-3 border-t border-[#374151]">
                <div className="flex gap-2">
                    {agent.status === 'idle' || agent.status === 'completed' || agent.status === 'error' ? (
                        <button
                            onClick={handleStartClick}
                            className="p-1.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                            title="Start Agent"
                        >
                            <Play size={15} className="ml-0.5" />
                        </button>
                    ) : (
                        <button
                            onClick={handleStop}
                            className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                            title="Stop Agent"
                        >
                            <Square size={15} />
                        </button>
                    )}
                    <button
                        onClick={handleRemoveClick}
                        className="p-1.5 rounded hover:bg-[#374151] text-gray-500 hover:text-red-400 transition-colors"
                        title="Remove Agent"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                    <Terminal size={12} />
                    {isActive ? 'Active' : 'View'}
                </div>
            </div>

            <PromptModal
                isOpen={showPrompt}
                onClose={() => setShowPrompt(false)}
                onConfirm={handleStart}
                defaultValue={agent.currentTask || ''}
                title={`Start Agent: ${agent.name}`}
            />

            <ConfirmModal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={handleRemove}
                title="Remove Agent"
                message={`Are you sure you want to remove agent "${agent.name}"? This will terminate any active CLI process.`}
                confirmText="Remove"
                variant="danger"
            />
        </div>
    );
}
