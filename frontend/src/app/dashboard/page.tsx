'use client';
import React, { useEffect, useRef, useState } from 'react';
import {
    RefreshCw, Activity, CheckCircle2, XCircle, Clock,
    Loader2, ChevronDown, ChevronRight, Server, Cpu, Zap, AlertTriangle
} from 'lucide-react';
import { AgentRun, Task } from '@/types';
import { listAgentRuns, listTasks } from '@/lib/api';
import { AgentStatusBadge } from '@/components/ui/Badges';
import ToastContainer, { toast } from '@/components/ui/Toast';

const POLL_INTERVAL = 4000;

// ─── Pipeline stage definitions ────────────────────────────────────────────
const PIPELINE_STAGES = [
    { key: 'DiscussionAgent', label: 'Extract', phase: 1, live: true },
    { key: 'TicketAgent', label: 'Ticket', phase: 1, live: true },
    { key: 'EmailAgent', label: 'Email', phase: 1, live: true },
    { key: 'CodeAgent', label: 'Code', phase: 2, live: true },
    { key: 'BuildAgent', label: 'Build', phase: 3, live: false },
    { key: 'DeployAgent', label: 'Deploy', phase: 4, live: false },
];

const AGENT_COLORS: Record<string, string> = {
    DiscussionAgent: '#6366f1',
    TicketAgent: '#10b981',
    EmailAgent: '#f59e0b',
    CodeAgent: '#0ea5e9',
    BuildAgent: '#a855f7',
    DeployAgent: '#f97316',
};

// ─── Stage status helper ───────────────────────────────────────────────────
type StageStatus = 'idle' | 'running' | 'failed' | 'done' | 'partial' | 'planned';

function getStageStatus(agentKey: string, runs: AgentRun[], live: boolean): StageStatus {
    if (!live) return 'planned';
    const stageRuns = runs.filter(r => r.agent_name === agentKey);
    if (!stageRuns.length) return 'idle';
    if (stageRuns.some(r => r.status === 'RUNNING')) return 'running';
    if (stageRuns.some(r => r.status === 'FAILED')) return 'failed';
    if (stageRuns.every(r => r.status === 'COMPLETED')) return 'done';
    return 'partial';
}

// ─── Pipeline Stepper ─────────────────────────────────────────────────────
function PipelineStepper({ runs }: { runs: AgentRun[] }) {
    const stages = PIPELINE_STAGES.map(s => ({
        ...s,
        stageRuns: runs.filter(r => r.agent_name === s.key),
        status: getStageStatus(s.key, runs, s.live),
    }));

    const circleStyles: Record<StageStatus, React.CSSProperties> = {
        idle: { border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-muted)' },
        planned: { border: '1.5px dashed rgba(99,102,241,0.25)', background: 'transparent', color: 'rgba(99,102,241,0.35)' },
        running: { border: '2px solid var(--sky)', background: 'var(--sky-dim)', color: 'var(--sky)' },
        failed: { border: '2px solid var(--red)', background: 'var(--red-dim)', color: 'var(--red)' },
        done: { border: '2px solid var(--green)', background: 'var(--green-dim)', color: 'var(--green)' },
        partial: { border: '2px solid var(--yellow)', background: 'var(--yellow-dim)', color: 'var(--yellow)' },
    };

    const labelColor: Record<StageStatus, string> = {
        idle: 'var(--text-muted)',
        planned: 'rgba(99,102,241,0.35)',
        running: 'var(--sky)',
        failed: 'var(--red)',
        done: 'var(--green)',
        partial: 'var(--yellow)',
    };

    const connectorColor = (s: StageStatus) =>
        s === 'done' ? 'var(--green)' : s === 'running' ? 'var(--sky)' : 'var(--border)';

    return (
        <div className="card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{
                padding: '10px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Cpu size={13} color="var(--text-muted)" />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        Pipeline Execution Track
                    </span>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    {[1, 2, 3, 4].map(p => {
                        const isLive = p <= 2;
                        return (
                            <span key={p} style={{
                                fontSize: '0.62rem',
                                fontWeight: 700,
                                letterSpacing: '0.05em',
                                color: isLive ? 'var(--green)' : 'var(--text-muted)',
                                opacity: isLive ? 1 : 0.5,
                            }}>
                                P{p} {isLive ? '●' : '○'}
                            </span>
                        );
                    })}
                </div>
            </div>

            {/* Track */}
            <div className="pipeline-track">
                {stages.map((stage, i) => (
                    <React.Fragment key={stage.key}>
                        <div className="pipeline-stage-node" style={{ opacity: stage.status === 'planned' ? 0.45 : 1 }}>
                            {/* Circle */}
                            <div className="pipeline-stage-circle" style={circleStyles[stage.status]}>
                                {stage.status === 'running' ? (
                                    <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                                ) : stage.status === 'done' ? (
                                    <CheckCircle2 size={13} />
                                ) : stage.status === 'failed' ? (
                                    <XCircle size={13} />
                                ) : (
                                    <span>{i + 1}</span>
                                )}
                                {stage.status === 'running' && (
                                    <div style={{
                                        position: 'absolute',
                                        inset: -4,
                                        borderRadius: '50%',
                                        border: '1px solid var(--sky)',
                                        opacity: 0.35,
                                        animation: 'pulse 1.8s infinite',
                                    }} />
                                )}
                            </div>
                            {/* Label */}
                            <div className="pipeline-stage-label" style={{ color: labelColor[stage.status] }}>
                                {stage.label}
                            </div>
                            {/* Meta */}
                            <div className="pipeline-stage-meta">
                                {stage.live
                                    ? `${stage.stageRuns.length}x`
                                    : 'soon'
                                }
                            </div>
                        </div>

                        {/* Connector */}
                        {i < stages.length - 1 && (
                            <div
                                className="pipeline-connector"
                                style={{
                                    background: connectorColor(stage.status),
                                    opacity: stage.status === 'planned' ? 0.2 : 1,
                                }}
                            />
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}

// ─── Agent Run Row ─────────────────────────────────────────────────────────
function RunItem({ run, taskTitle }: { run: AgentRun; taskTitle?: string }) {
    const [expanded, setExpanded] = useState(false);
    const color = AGENT_COLORS[run.agent_name] ?? '#94a3b8';

    function duration(start: string | null, end: string | null): string {
        if (!start) return '—';
        const diff = Math.round(((end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime()) / 1000);
        if (diff < 60) return `${diff}s`;
        return `${Math.floor(diff / 60)}m ${diff % 60}s`;
    }

    function formatTime(dt: string | null): string {
        if (!dt) return '—';
        return new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    const statusDot: Record<string, React.ReactNode> = {
        PENDING: <Clock size={13} color="var(--yellow)" />,
        RUNNING: <Loader2 size={13} color="var(--sky)" style={{ animation: 'spin 1s linear infinite' }} />,
        COMPLETED: <CheckCircle2 size={13} color="var(--green)" />,
        FAILED: <XCircle size={13} color="var(--red)" />,
    };

    return (
        <>
            <div className="run-item" onClick={() => setExpanded(e => !e)}>
                {/* Agent indicator */}
                <div style={{
                    width: 3,
                    height: 36,
                    borderRadius: 2,
                    background: color,
                    flexShrink: 0,
                    opacity: run.status === 'COMPLETED' ? 0.6 : 1,
                }} />

                {/* Agent chip */}
                <div className="agent-chip" style={{ borderColor: `${color}30`, color, minWidth: 110 }}>
                    {run.status === 'RUNNING' && (
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, animation: 'pulse 1.2s infinite', display: 'inline-block' }} />
                    )}
                    {run.agent_name.replace('Agent', '')}
                </div>

                {/* Task title */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.83rem', color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {taskTitle ?? `Task ${run.task_id.slice(0, 8)}`}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                        {formatTime(run.started_at)} · {duration(run.started_at, run.completed_at)}
                    </div>
                </div>

                {/* Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {statusDot[run.status]}
                    <AgentStatusBadge status={run.status} />
                </div>

                {/* Expand icon */}
                <div style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>
            </div>

            {/* Expanded detail */}
            {expanded && (
                <div className="run-item-expanded">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {run.error_message && (
                            <div style={{
                                gridColumn: '1/-1',
                                background: 'var(--red-dim)',
                                border: '1px solid rgba(239,68,68,0.18)',
                                borderRadius: 'var(--radius-md)',
                                padding: '10px 14px',
                            }}>
                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--red)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Error</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--red)', fontFamily: 'JetBrains Mono, monospace' }}>{run.error_message}</div>
                            </div>
                        )}
                        {run.output && (
                            <div className="console-panel" style={{ gridColumn: run.error_message ? '1/-1' : undefined }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Output</div>
                                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>
                                    {JSON.stringify(run.output, null, 2)}
                                </pre>
                            </div>
                        )}
                        {!run.output && !run.error_message && (
                            <div style={{ gridColumn: '1/-1', fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                No output captured for this run.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

// ─── System Status Sidebar ─────────────────────────────────────────────────
function SystemSidebar({ runs }: { runs: AgentRun[] }) {
    const phases = [
        {
            num: 1, label: 'Discussion → Ticket → Email',
            agents: ['DiscussionAgent', 'TicketAgent', 'EmailAgent'],
            live: true,
        },
        {
            num: 2, label: 'Code Generation → PR',
            agents: ['CodeAgent'],
            live: true,
        },
        {
            num: 3, label: 'Build → Image',
            agents: ['BuildAgent'],
            live: false,
        },
        {
            num: 4, label: 'Deploy → Kubernetes',
            agents: ['DeployAgent'],
            live: false,
        },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Phase status card */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Server size={13} color="var(--text-muted)" />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        System Status
                    </span>
                </div>
                <div style={{ padding: '8px 0' }}>
                    {phases.map(phase => {
                        const hasRunning = phase.agents.some(a => runs.some(r => r.agent_name === a && r.status === 'RUNNING'));
                        const hasFailed = phase.agents.some(a => runs.some(r => r.agent_name === a && r.status === 'FAILED'));
                        const hasAny = phase.agents.some(a => runs.some(r => r.agent_name === a));

                        const dot = !phase.live ? 'var(--text-muted)'
                            : hasRunning ? 'var(--sky)'
                                : hasFailed ? 'var(--red)'
                                    : hasAny ? 'var(--green)'
                                        : 'var(--yellow)';

                        const label = !phase.live ? 'Planned'
                            : hasRunning ? 'Running'
                                : hasFailed ? 'Error'
                                    : hasAny ? 'Healthy'
                                        : 'Idle';

                        return (
                            <div key={phase.num} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 16px',
                                opacity: phase.live ? 1 : 0.45,
                            }}>
                                <div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                        Phase {phase.num}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 1 }}>
                                        {phase.label}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <div style={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: '50%',
                                        background: dot,
                                        animation: hasRunning ? 'pulse 1.5s infinite' : 'none',
                                    }} />
                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: dot, letterSpacing: '0.04em' }}>
                                        {label}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Active agents card */}
            {runs.filter(r => r.status === 'RUNNING').length > 0 && (
                <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid rgba(14,165,233,0.2)', background: 'rgba(14,165,233,0.04)' }}>
                    <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(14,165,233,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Zap size={13} color="var(--sky)" />
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--sky)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            Active Agents
                        </span>
                    </div>
                    <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {[...new Set(runs.filter(r => r.status === 'RUNNING').map(r => r.agent_name))].map(a => (
                            <div key={a} className="agent-chip" style={{
                                color: AGENT_COLORS[a] ?? 'var(--accent-light)',
                                borderColor: `${AGENT_COLORS[a] ?? '#6366f1'}30`,
                                justifyContent: 'center',
                            }}>
                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: AGENT_COLORS[a], animation: 'pulse 1.2s infinite', display: 'inline-block' }} />
                                {a}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick stats per agent */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        Agent Activity
                    </span>
                </div>
                <div style={{ padding: '8px 0' }}>
                    {PIPELINE_STAGES.filter(s => s.live).map(stage => {
                        const agentRuns = runs.filter(r => r.agent_name === stage.key);
                        const completed = agentRuns.filter(r => r.status === 'COMPLETED').length;
                        const failed = agentRuns.filter(r => r.status === 'FAILED').length;
                        const color = AGENT_COLORS[stage.key] ?? '#94a3b8';
                        return (
                            <div key={stage.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 3, height: 16, borderRadius: 2, background: color }} />
                                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>
                                        {stage.key.replace('Agent', '')}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: 8, fontSize: '0.68rem', fontFamily: 'JetBrains Mono, monospace' }}>
                                    <span style={{ color: 'var(--green)' }}>{completed}✓</span>
                                    {failed > 0 && <span style={{ color: 'var(--red)' }}>{failed}✗</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────
export default function DashboardPage() {
    const [runs, setRuns] = useState<AgentRun[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [polling, setPolling] = useState(true);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    async function fetchData(silent = false) {
        if (!silent) setLoading(true);
        try {
            const [runsData, tasksData] = await Promise.all([listAgentRuns(), listTasks()]);
            setRuns(runsData);
            setTasks(tasksData);
            setLastUpdated(new Date());
        } catch (err: unknown) {
            if (!silent) toast('error', err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchData();
        if (polling) {
            intervalRef.current = setInterval(() => fetchData(true), POLL_INTERVAL);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [polling]);

    const taskMap = Object.fromEntries(tasks.map(t => [t.id, t.title]));

    const stats = {
        total: runs.length,
        running: runs.filter(r => r.status === 'RUNNING').length,
        completed: runs.filter(r => r.status === 'COMPLETED').length,
        failed: runs.filter(r => r.status === 'FAILED').length,
        pending: runs.filter(r => r.status === 'PENDING').length,
    };

    return (
        <div style={{ position: 'relative', overflow: 'hidden', minHeight: 'calc(100vh - 72px)' }}>
            <ToastContainer />
            <div className="glow-blob glow-blob-1" />
            <div className="glow-blob glow-blob-2" />

            <div className="container" style={{ position: 'relative', zIndex: 1, maxWidth: 1600, padding: '0 80px' }}>
                {/* ── Page header ── */}
                <div className="page-header">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                        <div>
                            <h1 style={{ fontSize: '1.7rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 'var(--radius-md)',
                                    background: 'var(--purple-dim)',
                                    border: '1px solid rgba(168,85,247,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <Activity size={18} color="var(--purple)" />
                                </div>
                                Agent Dashboard
                            </h1>
                            <p className="page-subtitle" style={{ marginTop: 4 }}>
                                Real-time orchestration monitor · auto-refreshes every {POLL_INTERVAL / 1000}s
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {lastUpdated && (
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                                    {lastUpdated.toLocaleTimeString()}
                                </span>
                            )}
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setPolling(p => !p)}
                                style={{
                                    borderColor: polling ? 'rgba(16,185,129,0.3)' : 'var(--border)',
                                    color: polling ? 'var(--green)' : 'var(--text-secondary)',
                                }}
                            >
                                <Activity size={12} />
                                {polling ? 'Live' : 'Paused'}
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => fetchData(true)}>
                                <RefreshCw size={12} />
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Pipeline stepper ── */}
                <PipelineStepper runs={runs} />

                {/* ── Stats row ── */}
                <div className="stats-grid" style={{ marginBottom: 20 }}>
                    {[
                        { label: 'Total Runs', value: stats.total, color: 'var(--accent-light)' },
                        { label: 'Running', value: stats.running, color: 'var(--sky)' },
                        { label: 'Completed', value: stats.completed, color: 'var(--green)' },
                        { label: 'Failed', value: stats.failed, color: 'var(--red)' },
                        { label: 'Pending', value: stats.pending, color: 'var(--yellow)' },
                    ].map(s => (
                        <div key={s.label} className="stat-card">
                            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                            <div className="stat-label">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* ── Failure warning ── */}
                {stats.failed > 0 && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 16px',
                        background: 'var(--red-dim)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 16,
                    }}>
                        <AlertTriangle size={14} color="var(--red)" />
                        <span style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--red)' }}>
                            {stats.failed} agent run{stats.failed !== 1 ? 's' : ''} failed — expand rows below to inspect errors
                        </span>
                    </div>
                )}

                {/* ── Main content: 2-col grid ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 16, alignItems: 'start', paddingBottom: 48 }}>
                    {/* Run list */}
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{
                            padding: '12px 20px',
                            borderBottom: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <div style={{ fontWeight: 700, fontSize: '0.83rem' }}>Agent Run History</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                                {runs.length} records · click to expand
                            </div>
                        </div>

                        {loading ? (
                            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="skeleton" style={{ height: 56, borderRadius: 'var(--radius-md)' }} />
                                ))}
                            </div>
                        ) : runs.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">🤖</div>
                                <div className="empty-title">No agent runs yet</div>
                                <p className="empty-sub">Extract tasks and approve them to see agent activity here.</p>
                            </div>
                        ) : (
                            <div>
                                {runs.map(run => (
                                    <RunItem key={run.id} run={run} taskTitle={taskMap[run.task_id]} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <SystemSidebar runs={runs} />
                </div>
            </div>
        </div>
    );
}
