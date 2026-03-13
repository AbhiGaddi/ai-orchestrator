'use client';

import React, { useEffect, useState } from 'react';
import { ipc } from '@/lib/ipc';
import type { UsageSummary, UsageByAgent, UsageByProject } from '@/types';

// Pricing for Sonnet
const COST_PER_1M_INPUT = 3.00;
const COST_PER_1M_OUTPUT = 15.00;

export default function UsagePage() {
    const [summary, setSummary] = useState<UsageSummary | null>(null);
    const [byAgent, setByAgent] = useState<UsageByAgent[]>([]);
    const [byProject, setByProject] = useState<UsageByProject[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const [sum, agents, projects] = await Promise.all([
                    ipc.usage.summary(),
                    ipc.usage.byAgent(),
                    ipc.usage.byProject(),
                ]);
                setSummary(sum);
                setByAgent(agents);
                setByProject(projects);
            } catch (err) {
                console.error('Failed to load usage data:', err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    if (loading || !summary) {
        return <div className="p-8 text-white relative z-10">Loading usage stats...</div>;
    }

    const formatTokens = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    const calculateCost = (input: number, output: number) => {
        return ((input / 1000000) * COST_PER_1M_INPUT + (output / 1000000) * COST_PER_1M_OUTPUT).toFixed(2);
    };

    const totalTokens = summary.total_input_tokens + summary.total_output_tokens;
    const todayTokens = summary.today_input_tokens + summary.today_output_tokens;
    const estCost = calculateCost(summary.total_input_tokens, summary.total_output_tokens);

    // Maximum tokens for bar chart scaling
    const maxAgentTokens = Math.max(...byAgent.map(a => a.total_input_tokens + a.total_output_tokens), 1);

    return (
        <div className="p-8 max-w-7xl mx-auto text-white relative z-10 transition-all duration-300">
            <h1 className="text-3xl font-bold mb-8">Usage Statistics</h1>

            <div className="grid grid-cols-4 gap-4 mb-10">
                <div className="bg-[#1f2937] p-6 rounded-lg border border-[#374151]">
                    <div className="text-sm text-gray-400 mb-1">Total Tokens</div>
                    <div className="text-3xl font-bold text-violet-400">{formatTokens(totalTokens)}</div>
                </div>
                <div className="bg-[#1f2937] p-6 rounded-lg border border-[#374151]">
                    <div className="text-sm text-gray-400 mb-1">Tokens Today</div>
                    <div className="text-3xl font-bold text-sky-400">{formatTokens(todayTokens)}</div>
                </div>
                <div className="bg-[#1f2937] p-6 rounded-lg border border-[#374151]">
                    <div className="text-sm text-gray-400 mb-1">Total Agent Runs</div>
                    <div className="text-3xl font-bold text-emerald-400">{summary.total_runs}</div>
                </div>
                <div className="bg-[#1f2937] p-6 rounded-lg border border-[#374151]">
                    <div className="text-sm text-gray-400 mb-1">Estimated Cost</div>
                    <div className="text-3xl font-bold text-amber-400">${estCost}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
                <div>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2"> By Model / Agent Type</h2>
                    <div className="bg-[#111827] rounded-lg border border-[#374151] overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#1f2937] border-b border-[#374151]">
                                    <th className="p-4 text-sm font-semibold text-gray-300">Model / Agent</th>
                                    <th className="p-4 text-sm font-semibold text-gray-300">Input Tokens</th>
                                    <th className="p-4 text-sm font-semibold text-gray-300">Output Tokens</th>
                                    <th className="p-4 text-sm font-semibold text-gray-300">Runs</th>
                                    <th className="p-4 text-sm font-semibold text-gray-300">Est Cost</th>
                                </tr>
                            </thead>
                            <tbody>
                                {byAgent.map((agent) => {
                                    const cost = calculateCost(agent.total_input_tokens, agent.total_output_tokens);
                                    return (
                                        <tr key={agent.agent_type} className="border-b border-[#374151] last:border-0 hover:bg-[#374151]/30">
                                            <td className="p-4 text-sm text-gray-200 font-medium">{agent.agent_type}</td>
                                            <td className="p-4 text-sm font-mono text-gray-400">{agent.total_input_tokens.toLocaleString()}</td>
                                            <td className="p-4 text-sm font-mono text-gray-400">{agent.total_output_tokens.toLocaleString()}</td>
                                            <td className="p-4 text-sm text-gray-400">{agent.run_count}</td>
                                            <td className="p-4 text-sm text-amber-400 font-mono">${cost}</td>
                                        </tr>
                                    );
                                })}
                                {byAgent.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-4 text-center text-gray-500 italic">No usage recorded yet.</td>
                                    </tr>
                                )}
                                {byAgent.length > 0 && (
                                    <tr className="bg-[#1f2937] font-bold border-t border-[#374151]">
                                        <td className="p-4 text-sm text-white">Total (All)</td>
                                        <td className="p-4 text-sm font-mono text-white">{summary.total_input_tokens.toLocaleString()}</td>
                                        <td className="p-4 text-sm font-mono text-white">{summary.total_output_tokens.toLocaleString()}</td>
                                        <td className="p-4 text-sm text-white">{summary.total_runs}</td>
                                        <td className="p-4 text-sm text-amber-400 font-mono">${estCost}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div>
                    <h2 className="text-xl font-bold mb-4">By Project</h2>
                    <div className="bg-[#111827] rounded-lg border border-[#374151] overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#1f2937] border-b border-[#374151]">
                                    <th className="p-4 text-sm font-semibold text-gray-300">Project</th>
                                    <th className="p-4 text-sm font-semibold text-gray-300">Total Tokens</th>
                                    <th className="p-4 text-sm font-semibold text-gray-300">Runs</th>
                                </tr>
                            </thead>
                            <tbody>
                                {byProject.map((proj, i) => {
                                    const total = proj.total_input_tokens + proj.total_output_tokens;
                                    return (
                                        <tr key={proj.project_id || i} className="border-b border-[#374151] last:border-0 hover:bg-[#374151]/30">
                                            <td className="p-4 text-sm text-gray-200">{proj.project_name || 'Unassigned'}</td>
                                            <td className="p-4 text-sm font-mono text-gray-400">{total.toLocaleString()} ({formatTokens(total)})</td>
                                            <td className="p-4 text-sm text-gray-400">{proj.run_count}</td>
                                        </tr>
                                    );
                                })}
                                {byProject.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="p-4 text-center text-gray-500 italic">No project stats available.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

