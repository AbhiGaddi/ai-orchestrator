'use client';

import React, { useEffect } from 'react';
import { useAutomationStore } from '@/store/automations';
import { Zap, Plus, Power, Github, TerminalSquare, AlertCircle } from 'lucide-react';

export default function AutomationsPage() {
    const { automations, load, loading, toggleAutomation, runAutomationNow } = useAutomationStore();

    useEffect(() => {
        load();
    }, [load]);

    if (loading) return <div className="p-8 text-white">Loading Automations...</div>;

    const getSourceIcon = (type: string) => {
        switch (type) {
            case 'github': return <Github size={18} />;
            case 'jira': return <AlertCircle size={18} />; // using as simple jira placeholder
            default: return <TerminalSquare size={18} />;
        }
    };

    return (
        <div className="h-screen flex flex-col p-8 w-full bg-[#09090b]">

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
                        <Zap size={28} className="text-amber-500" />
                        Automations
                    </h1>
                    <p className="text-gray-400 text-sm mt-1 ml-10">
                        Automated background polling for GitHub/Jira bound to distinct agent Prompts.
                    </p>
                </div>
                <button
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-lg font-bold transition-all shadow-lg shadow-violet-500/20 active:scale-95"
                >
                    <Plus size={18} /> Add Automation
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
                {automations.length === 0 ? (
                    <div className="text-center p-12 bg-[#1f2937] border border-[#374151] rounded-xl flex flex-col items-center justify-center">
                        <Zap size={48} className="text-gray-500 mb-4 opacity-50" />
                        <h3 className="text-gray-300 font-bold mb-1">No automations configured</h3>
                        <p className="text-gray-500 text-sm">Example: Review new GitHub PRs every 15 minutes.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {automations.map(auto => (
                            <div key={auto.id} className="bg-[#111827] border border-[#374151] rounded-lg p-4 flex flex-col gap-3 transition-all hover:border-[#4b5563]">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => toggleAutomation(auto.id, !auto.enabled)}
                                            className={`p-1.5 rounded-full transition-colors ${auto.enabled ? 'bg-amber-500/20 text-amber-400' : 'bg-[#374151] text-gray-400'}`}
                                            title={auto.enabled ? "Active" : "Paused"}
                                        >
                                            <Power size={18} />
                                        </button>
                                        <div>
                                            <h3 className="font-bold text-gray-200">{auto.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="flex items-center gap-1 bg-[#1f2937] text-gray-300 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                                                    {getSourceIcon(auto.source_type)}
                                                    {auto.source_type}
                                                </span>
                                                <span className="text-gray-500 text-xs font-mono">
                                                    Runs every {auto.schedule_minutes}m
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 text-xs">
                                        <button
                                            onClick={() => runAutomationNow(auto.id)}
                                            className="px-3 py-1.5 bg-[#1f2937] hover:bg-amber-600 hover:text-white text-gray-300 font-semibold rounded transition-colors"
                                        >
                                            Sync Now
                                        </button>
                                    </div>
                                </div>

                                <div className="pl-11 pr-2">
                                    <p className="text-gray-400 text-sm line-clamp-2 italic border-l-2 border-[#374151] pl-3 py-0.5">
                                        "{auto.agent_prompt}"
                                    </p>
                                </div>

                                <div className="pl-11 flex items-center gap-4 text-xs text-gray-500 border-t border-[#1f2937] pt-2 mt-1">
                                    <span>Last run: {auto.last_run ? new Date(auto.last_run).toLocaleString() : 'Never'}</span>
                                    <div className="flex gap-2">
                                        {auto.output_slack && <span className="bg-sky-500/10 text-sky-400 px-1.5 rounded">Slack Output</span>}
                                        {auto.output_telegram && <span className="bg-blue-500/10 text-blue-400 px-1.5 rounded">Telegram</span>}
                                        {auto.output_github_comment && <span className="bg-gray-500/20 text-gray-300 px-1.5 rounded">GitHub Reply</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
}
