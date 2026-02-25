'use client';
import { AgentRun, AgentRunStep } from '@/types';
import { AgentStatusBadge } from '@/components/ui/Badges';
import { Clock, CheckCircle2, XCircle, Loader2, Brain } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getAgentRunSteps } from '@/lib/api';
import ReasoningPanel from './ReasoningPanel';

const agentColors: Record<string, string> = {
    DiscussionAgent: '#6366f1',
    TicketAgent: '#10b981',
    EmailAgent: '#f59e0b',
    CodeAgent: '#3b82f6',
    PRAgent: '#a855f7',
    SonarAgent: '#06b6d4',
    BuildAgent: '#a855f7',
    DeployAgent: '#f97316',
};

const statusIcon: Record<string, React.ReactNode> = {
    PENDING: <Clock size={14} color="var(--yellow)" />,
    RUNNING: <Loader2 size={14} color="var(--purple)" style={{ animation: 'spin 1s linear infinite' }} />,
    COMPLETED: <CheckCircle2 size={14} color="var(--green)" />,
    FAILED: <XCircle size={14} color="var(--red)" />,
};

function duration(start: string | null, end: string | null): string {
    if (!start) return '—';
    const s = new Date(start).getTime();
    const e = end ? new Date(end).getTime() : Date.now();
    const diff = Math.round((e - s) / 1000);
    if (diff < 60) return `${diff}s`;
    return `${Math.floor(diff / 60)}m ${diff % 60}s`;
}

function formatTime(dt: string | null): string {
    if (!dt) return '—';
    return new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function AgentRunRow({ run, taskTitle }: { run: AgentRun; taskTitle?: string }) {
    const [expanded, setExpanded] = useState(false);
    const [steps, setSteps] = useState<AgentRunStep[]>([]);
    const [stepsLoading, setStepsLoading] = useState(false);
    const [stepsLoaded, setStepsLoaded] = useState(false);
    const color = agentColors[run.agent_name] ?? '#94a3b8';

    // Fetch steps lazily when user first expands the row
    useEffect(() => {
        if (!expanded || stepsLoaded) return;
        setStepsLoading(true);
        getAgentRunSteps(run.id)
            .then(data => {
                setSteps(data);
                setStepsLoaded(true);
            })
            .catch(() => setSteps([]))
            .finally(() => setStepsLoading(false));
    }, [expanded, run.id, stepsLoaded]);

    // Re-fetch if the run is still RUNNING (live update)
    useEffect(() => {
        if (!expanded || run.status !== 'RUNNING') return;
        const timer = setInterval(() => {
            getAgentRunSteps(run.id)
                .then(setSteps)
                .catch(() => { });
        }, 3000);
        return () => clearInterval(timer);
    }, [expanded, run.id, run.status]);

    const hasSteps = steps.length > 0 || stepsLoading;

    return (
        <>
            <tr className="dashboard-row" onClick={() => setExpanded(e => !e)} style={{ cursor: 'pointer' }}>
                <td>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {taskTitle ?? run.task_id.slice(0, 8) + '…'}
                    </div>
                </td>
                <td>
                    <div className="agent-chip" style={{ borderColor: `${color}33`, color }}>
                        {run.status === 'RUNNING' && <span className="agent-running-dot" style={{ background: color }} />}
                        {run.agent_name}
                    </div>
                </td>
                <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {statusIcon[run.status] ?? null}
                        <AgentStatusBadge status={run.status} />
                    </div>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                    {formatTime(run.started_at)}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: run.status === 'RUNNING' ? 'var(--purple)' : 'var(--text-muted)' }}>
                    {duration(run.started_at, run.completed_at)}
                </td>
            </tr>
            {expanded && (
                <tr style={{ background: 'var(--bg-base)' }}>
                    <td colSpan={5} style={{ padding: '0 16px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                            {/* Error banner */}
                            {run.error_message && (
                                <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: 12 }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--red)', marginBottom: 4, textTransform: 'uppercase' }}>Error</div>
                                    <div style={{ fontSize: '0.82rem', color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>{run.error_message}</div>
                                </div>
                            )}

                            {/* AI Reasoning Panel */}
                            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                                    <Brain size={15} color="var(--accent-light)" />
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                        AI Reasoning Trace
                                    </span>
                                    {!hasSteps && !stepsLoading && (
                                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                            — Legacy agent (no steps recorded)
                                        </span>
                                    )}
                                </div>
                                <ReasoningPanel steps={steps} loading={stepsLoading} />
                            </div>

                            {/* Final Output */}
                            {run.output && (
                                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                        Final Output
                                    </div>
                                    <pre style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', overflow: 'auto', maxHeight: 160, margin: 0, fontFamily: 'var(--font-mono)' }}>
                                        {JSON.stringify(run.output, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}
