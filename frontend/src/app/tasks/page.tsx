'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, CheckSquare, Plus, Filter } from 'lucide-react';
import { Task } from '@/types';
import { listTasks } from '@/lib/api';
import TaskCard from '@/components/tasks/TaskCard';
import ToastContainer, { toast } from '@/components/ui/Toast';
import Link from 'next/link';

type FilterStatus = 'ALL' | 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED';

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<FilterStatus>('ALL');
    const router = useRouter();

    async function loadTasks(silent = false) {
        if (!silent) setLoading(true); else setRefreshing(true);
        try {
            const data = await listTasks();
            setTasks(data);
        } catch (err: unknown) {
            toast('error', err instanceof Error ? err.message : 'Failed to load tasks');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    useEffect(() => { loadTasks(); }, []);

    function updateTask(updated: Task) {
        setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    }

    const filtered = filter === 'ALL' ? tasks : tasks.filter(t => t.status === filter);

    const counts = {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'PENDING').length,
        approved: tasks.filter(t => t.status === 'APPROVED').length,
        completed: tasks.filter(t => t.status === 'COMPLETED').length,
        failed: tasks.filter(t => t.status === 'FAILED').length,
    };

    const filterButtons: { label: string; value: FilterStatus; count: number; color: string }[] = [
        { label: 'All', value: 'ALL', count: counts.total, color: 'var(--accent)' },
        { label: 'Pending', value: 'PENDING', count: counts.pending, color: 'var(--yellow)' },
        { label: 'Approved', value: 'APPROVED', count: counts.approved, color: 'var(--blue)' },
        { label: 'Completed', value: 'COMPLETED', count: counts.completed, color: 'var(--green)' },
    ];

    return (
        <>
            <ToastContainer />
            <div className="container">
                <div className="page-header">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                        <div>
                            <div className="page-title">
                                <div className="page-title-icon" style={{ background: 'var(--blue-dim)', border: '1px solid rgba(59,130,246,0.2)' }}>
                                    <CheckSquare size={20} color="var(--blue)" />
                                </div>
                                <h1 style={{ fontSize: '2rem' }}>Tasks</h1>
                            </div>
                            <p className="page-subtitle">Review, edit, approve and execute your extracted tasks.</p>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="btn btn-secondary" onClick={() => loadTasks(true)} disabled={refreshing}>
                                <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                                Refresh
                            </button>
                            <Link href="/extract" className="btn btn-primary">
                                <Plus size={15} /> New Extraction
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="stats-grid" style={{ marginBottom: 28 }}>
                    {[
                        { label: 'Total', value: counts.total, color: 'var(--accent-light)' },
                        { label: 'Pending', value: counts.pending, color: 'var(--yellow)' },
                        { label: 'Approved', value: counts.approved, color: 'var(--blue)' },
                        { label: 'Completed', value: counts.completed, color: 'var(--green)' },
                        { label: 'Failed', value: counts.failed, color: 'var(--red)' },
                    ].map(s => (
                        <div key={s.label} className="stat-card">
                            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                            <div className="stat-label">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Filter pills */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                    <Filter size={14} color="var(--text-muted)" style={{ marginTop: 6 }} />
                    {filterButtons.map(fb => (
                        <button
                            key={fb.value}
                            onClick={() => setFilter(fb.value)}
                            style={{
                                padding: '5px 14px', borderRadius: 999, fontSize: '0.8rem', fontWeight: 600,
                                cursor: 'pointer', border: 'none', transition: 'var(--transition)',
                                background: filter === fb.value ? fb.color : 'var(--bg-card)',
                                color: filter === fb.value ? '#fff' : 'var(--text-secondary)',
                                fontFamily: 'inherit',
                            }}
                        >
                            {fb.label} · {fb.count}
                        </button>
                    ))}
                </div>

                {/* Task list */}
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[1, 2, 3].map(i => (
                            <div key={i} className="skeleton" style={{ height: 140, borderRadius: 'var(--radius-lg)' }} />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <div className="empty-title">{filter === 'ALL' ? 'No tasks yet' : `No ${filter.toLowerCase()} tasks`}</div>
                        <p className="empty-sub">
                            {filter === 'ALL'
                                ? 'Go to Extract to paste a discussion and let Claude create tasks for you.'
                                : 'Change the filter to see other tasks.'}
                        </p>
                        {filter === 'ALL' && (
                            <Link href="/extract" className="btn btn-primary" style={{ marginTop: 8 }}>
                                <Plus size={15} /> Extract Tasks
                            </Link>
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {filtered.map(t => (
                            <TaskCard key={t.id} task={t} onChange={updateTask} />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
