'use client';
import { useEffect, useState } from 'react';
import { RefreshCw, Plus } from 'lucide-react';
import { Task } from '@/types';
import { listTasks } from '@/lib/api';
import TaskCard from '@/components/tasks/TaskCard';
import ToastContainer, { toast } from '@/components/ui/Toast';
import Link from 'next/link';

type FilterKey = 'ALL' | 'PENDING' | 'READY_TICKET' | 'READY_CODE' | 'READY_REVIEW' | 'REVIEW_DONE' | 'FAILED';

function matchesFilter(t: Task, filter: FilterKey): boolean {
    if (filter === 'ALL') return true;
    if (filter === 'PENDING') return t.status === 'PENDING';
    if (filter === 'READY_TICKET') return t.status === 'APPROVED' && !t.github_issue_id;
    if (filter === 'READY_CODE') return t.status === 'COMPLETED' && !!t.github_issue_id && !t.github_pr_id;
    if (filter === 'READY_REVIEW') return t.status === 'COMPLETED' && !!t.github_pr_id && !t.pr_reviewed;
    if (filter === 'REVIEW_DONE') return t.status === 'COMPLETED' && !!t.pr_reviewed;
    if (filter === 'FAILED') return t.status === 'FAILED';
    return false;
}

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<FilterKey>('ALL');

    async function loadTasks(silent = false) {
        if (!silent) setLoading(true); else setRefreshing(true);
        try {
            setTasks(await listTasks());
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

    const counts = {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'PENDING').length,
        readyTicket: tasks.filter(t => t.status === 'APPROVED' && !t.github_issue_id).length,
        readyCode: tasks.filter(t => t.status === 'COMPLETED' && !!t.github_issue_id && !t.github_pr_id).length,
        readyReview: tasks.filter(t => t.status === 'COMPLETED' && !!t.github_pr_id && !t.pr_reviewed).length,
        reviewDone: tasks.filter(t => t.status === 'COMPLETED' && !!t.pr_reviewed).length,
        failed: tasks.filter(t => t.status === 'FAILED').length,
    };

    const tabs: { label: string; key: FilterKey; count: number; color?: string }[] = [
        { label: 'All', key: 'ALL', count: counts.total },
        { label: 'Review', key: 'PENDING', count: counts.pending, color: 'var(--yellow)' },
        { label: 'Needs Setup', key: 'READY_TICKET', count: counts.readyTicket, color: 'var(--blue)' },
        { label: 'Ready Code', key: 'READY_CODE', count: counts.readyCode, color: 'var(--purple)' },
        { label: 'To Review', key: 'READY_REVIEW', count: counts.readyReview, color: 'var(--orange)' },
        { label: 'Reviewed', key: 'REVIEW_DONE', count: counts.reviewDone, color: 'var(--green)' },
        { label: 'Failed', key: 'FAILED', count: counts.failed, color: 'var(--red)' },
    ];

    const filtered = tasks.filter(t => matchesFilter(t, filter));
    const activeTab = tabs.find(t => t.key === filter);

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
                            <h1 style={{ fontSize: '1.7rem' }}>Tasks</h1>
                            <p className="page-subtitle" style={{ marginTop: 4 }}>
                                {counts.total} task{counts.total !== 1 ? 's' : ''} total
                                {counts.pending > 0 && ` · ${counts.pending} awaiting review`}
                                {counts.failed > 0 && ` · ${counts.failed} failed`}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => loadTasks(true)} disabled={refreshing}>
                                <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                                Refresh
                            </button>
                            <Link href="/extract" className="btn btn-primary btn-sm">
                                <Plus size={13} /> New Extraction
                            </Link>
                        </div>
                    </div>
                </div>

                {/* ── Unified tab filter ── */}
                <div className="tab-bar">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            className={`tab-item ${filter === tab.key ? 'active' : ''}`}
                            onClick={() => setFilter(tab.key)}
                            style={filter === tab.key && tab.color ? { borderBottomColor: tab.color, color: tab.color } : {}}
                        >
                            {tab.label}
                            <span
                                className="tab-count"
                                style={filter === tab.key && tab.color ? { background: `${tab.color}18`, color: tab.color } : {}}
                            >
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* ── Task list ── */}
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[1, 2, 3].map(i => (
                            <div key={i} className="skeleton" style={{ height: 140, borderRadius: 'var(--radius-lg)' }} />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">
                            {filter === 'FAILED' ? '⚠️' : filter === 'ALL' ? '📋' : '✓'}
                        </div>
                        <div className="empty-title">
                            {filter === 'ALL' ? 'No tasks yet' : `No ${activeTab?.label.toLowerCase()} tasks`}
                        </div>
                        <p className="empty-sub">
                            {filter === 'ALL'
                                ? 'Go to Extract to paste a discussion and let the Flow agents create tasks for you.'
                                : 'Switch to a different filter to see other tasks.'}
                        </p>
                        {filter === 'ALL' && (
                            <Link href="/extract" className="btn btn-primary" style={{ marginTop: 4 }}>
                                <Plus size={14} /> Extract Tasks
                            </Link>
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 48 }}>
                        {filtered.map(t => (
                            <TaskCard key={t.id} task={t} onChange={updateTask} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
