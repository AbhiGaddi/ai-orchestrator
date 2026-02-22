'use client';
import { useEffect, useRef, useState } from 'react';
import { LayoutDashboard, RefreshCw, Activity, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { AgentRun, Task } from '@/types';
import { listAgentRuns, listTasks } from '@/lib/api';
import AgentRunRow from '@/components/dashboard/AgentRunRow';
import ToastContainer, { toast } from '@/components/ui/Toast';

const POLL_INTERVAL = 4000; // 4 seconds

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

    const activeAgents = [...new Set(runs.filter(r => r.status === 'RUNNING').map(r => r.agent_name))];

    return (
        <>
            <ToastContainer />
            <div className="container">
                <div className="page-header">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                        <div>
                            <div className="page-title">
                                <div className="page-title-icon" style={{ background: 'var(--purple-dim)', border: '1px solid rgba(168,85,247,0.2)' }}>
                                    <LayoutDashboard size={20} color="var(--purple)" />
                                </div>
                                <h1 style={{ fontSize: '2rem' }}>Agent Dashboard</h1>
                            </div>
                            <p className="page-subtitle">Live view of every agent run. Polls every {POLL_INTERVAL / 1000}s automatically.</p>
                        </div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            {lastUpdated && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    Updated {lastUpdated.toLocaleTimeString()}
                                </span>
                            )}
                            <button
                                className={`btn btn-secondary btn-sm`}
                                onClick={() => setPolling(p => !p)}
                                style={{ borderColor: polling ? 'rgba(16,185,129,0.4)' : 'var(--border)', color: polling ? 'var(--green)' : 'var(--text-secondary)' }}
                            >
                                <Activity size={13} />
                                {polling ? 'Live' : 'Paused'}
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => fetchData(true)}>
                                <RefreshCw size={13} />
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats row */}
                <div className="stats-grid" style={{ marginBottom: 28 }}>
                    {[
                        { icon: Activity, label: 'Total Runs', value: stats.total, color: 'var(--accent-light)' },
                        { icon: Loader2, label: 'Running', value: stats.running, color: 'var(--purple)' },
                        { icon: CheckCircle2, label: 'Completed', value: stats.completed, color: 'var(--green)' },
                        { icon: XCircle, label: 'Failed', value: stats.failed, color: 'var(--red)' },
                        { icon: Clock, label: 'Pending', value: stats.pending, color: 'var(--yellow)' },
                    ].map(s => (
                        <div key={s.label} className="stat-card" style={{ borderColor: stats.running > 0 && s.label === 'Running' ? 'rgba(168,85,247,0.3)' : 'var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                <div className="stat-value" style={{ color: s.color, fontSize: '1.8rem' }}>{s.value}</div>
                                <s.icon size={18} color={s.color} style={{ opacity: 0.7 }} />
                            </div>
                            <div className="stat-label">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Active agents banner */}
                {activeAgents.length > 0 && (
                    <div style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: 'var(--radius-md)', padding: '12px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <span className="agent-running-dot" style={{ background: 'var(--purple)' }} />
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--purple)' }}>Agents currently running:</span>
                        {activeAgents.map(a => (
                            <span key={a} className="agent-chip">{a}</span>
                        ))}
                    </div>
                )}

                {/* Table */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Agent Run History</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{runs.length} records · Click a row to expand details</div>
                    </div>
                    {loading ? (
                        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 8 }} />)}
                        </div>
                    ) : runs.length === 0 ? (
                        <div className="empty-state" style={{ padding: '60px 24px' }}>
                            <div className="empty-icon" style={{ width: 60, height: 60, fontSize: 28 }}>🤖</div>
                            <div className="empty-title">No agent runs yet</div>
                            <p className="empty-sub">Agent activity will appear here as soon as you extract tasks and approve them.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="dashboard-table" style={{ padding: '8px 12px' }}>
                                <thead>
                                    <tr>
                                        <th>Task</th>
                                        <th>Agent</th>
                                        <th>Status</th>
                                        <th>Started</th>
                                        <th>Duration</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {runs.map(run => (
                                        <AgentRunRow key={run.id} run={run} taskTitle={taskMap[run.task_id]} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pipeline legend */}
                <div className="card" style={{ marginTop: 20 }}>
                    <div style={{ fontWeight: 700, marginBottom: 14, fontSize: '0.875rem' }}>Agent Pipeline — Phase 1</div>
                    <div className="pipeline-steps">
                        {[
                            { label: 'Discussion\nAgent', status: 'done', icon: '🧠' },
                            { label: 'connector', isConnector: true, done: true },
                            { label: 'Ticket\nAgent', status: 'done', icon: '🎫' },
                            { label: 'connector', isConnector: true, done: true },
                            { label: 'Email\nAgent', status: 'done', icon: '📧' },
                        ].map((step, i) =>
                            step.isConnector ? (
                                <div key={i} className={`pipeline-connector ${step.done ? 'done' : ''}`} />
                            ) : (
                                <div key={i} className={`pipeline-step ${step.status}`}>
                                    <div className="pipeline-step-circle">{step.icon}</div>
                                    <div className="pipeline-step-label" style={{ whiteSpace: 'pre' }}>{step.label}</div>
                                </div>
                            )
                        )}
                        <div className="pipeline-connector" style={{ opacity: 0.3 }} />
                        {[
                            { label: 'Code\nAgent', status: '', icon: '💻' },
                            { label: 'connector', isConnector: true },
                            { label: 'Build\nAgent', status: '', icon: '🐳' },
                            { label: 'connector', isConnector: true },
                            { label: 'Deploy\nAgent', status: '', icon: '🚀' },
                        ].map((step, i) =>
                            step.isConnector ? (
                                <div key={i} className="pipeline-connector" style={{ opacity: 0.3 }} />
                            ) : (
                                <div key={i} className="pipeline-step" style={{ opacity: 0.4 }}>
                                    <div className="pipeline-step-circle" style={{ fontSize: '1rem' }}>{step.icon}</div>
                                    <div className="pipeline-step-label" style={{ whiteSpace: 'pre' }}>{step.label}</div>
                                </div>
                            )
                        )}
                    </div>
                    <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                        Phase 2-4 agents shown as placeholders — coming soon
                    </div>
                </div>
            </div>
        </>
    );
}
