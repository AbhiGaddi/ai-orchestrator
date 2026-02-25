'use client';
import { useEffect, useState } from 'react';
import { RefreshCw, Plus, Brain, FileText, Sparkles, GitBranch, Zap, Search } from 'lucide-react';
import { Task, Project } from '@/types';
import { listTasks, listProjects } from '@/lib/api';
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
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<FilterKey>('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    async function loadTasks(silent = false) {
        if (silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const [tasksData, projectsData] = await Promise.all([
                listTasks(),
                listProjects()
            ]);
            setTasks(tasksData);
            setProjects(projectsData);
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

    const filtered = tasks
        .filter(t => matchesFilter(t, filter))
        .filter(t => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q);
        });
    const activeTab = tabs.find(t => t.key === filter);

    return (
        <div style={{ position: 'relative', overflow: 'hidden', minHeight: 'calc(100vh - 72px)' }}>
            <ToastContainer />
            <div className="glow-blob glow-blob-1" />
            <div className="glow-blob glow-blob-2" />
            <div className="container" style={{ position: 'relative', zIndex: 1, maxWidth: 1600, padding: '0 80px' }}>
                {/* ── Page header ── */}
                <div style={{ padding: '30px 0 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                        <div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', marginBottom: 12 }}>
                                <Brain size={12} color="var(--accent)" />
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Workflow Management</span>
                            </div>
                            <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>Tasks</h1>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button className="btn btn-secondary" onClick={() => loadTasks(true)} disabled={refreshing} style={{ borderRadius: 12 }}>
                                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                                Refresh
                            </button>
                            <Link href="/extract" className="btn btn-primary" style={{ borderRadius: 12, boxShadow: '0 8px 20px rgba(168,85,247,0.3)' }}>
                                <Plus size={16} /> New Extraction
                            </Link>
                        </div>
                    </div>

                    {/* Quick Stats Dashboard */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 20,
                        marginBottom: 32
                    }}>
                        {[
                            { label: 'Total Syncs', value: counts.total, icon: FileText, color: '#6366f1' },
                            { label: 'Awaiting Action', value: counts.pending, icon: Sparkles, color: '#a855f7' },
                            { label: 'Integration Ready', value: counts.readyTicket, icon: GitBranch, color: '#10b981' },
                            { label: 'Active Pipeline', value: counts.readyCode + counts.readyReview, icon: Zap, color: '#f59e0b' },
                        ].map((stat) => (
                            <div key={stat.label} style={{
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border)',
                                borderRadius: 20,
                                padding: '16px 20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 16,
                                boxShadow: 'var(--shadow-card)'
                            }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: 12,
                                    background: `${stat.color}15`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: `1px solid ${stat.color}30`
                                }}>
                                    <stat.icon size={20} color={stat.color} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{stat.label}</div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)' }}>{stat.value}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Search & Filter Bar */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border)',
                        borderRadius: 16,
                        padding: '6px 6px 6px 16px',
                        marginBottom: 24,
                        backdropFilter: 'blur(10px)'
                    }}>
                        <Search size={18} color="var(--text-muted)" />
                        <input
                            placeholder="Search tasks by title or description..."
                            style={{
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                color: 'var(--text-primary)',
                                flex: 1,
                                fontSize: '0.9rem',
                                padding: '8px 0'
                            }}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                        <div style={{ height: 24, width: 1, background: 'var(--border)' }} />
                        <div style={{ display: 'flex', gap: 4, padding: '0 8px' }}>
                            {tabs.map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setFilter(tab.key)}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: 10,
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        transition: 'all 0.2s',
                                        background: filter === tab.key ? `${tab.color || 'var(--accent)'}15` : 'transparent',
                                        color: filter === tab.key ? (tab.color || 'var(--accent)') : 'var(--text-secondary)',
                                        border: '1px solid',
                                        borderColor: filter === tab.key ? `${tab.color || 'var(--accent)'}40` : 'transparent',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6
                                    }}
                                >
                                    {tab.label}
                                    {tab.count > 0 && (
                                        <span style={{
                                            padding: '1px 6px',
                                            borderRadius: 6,
                                            background: filter === tab.key ? `${tab.color || 'var(--accent)'}25` : 'rgba(255,255,255,0.05)',
                                            fontSize: '0.65rem'
                                        }}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Task list ── */}
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[1, 2, 3].map(i => (
                            <div key={`loading-${i}`} className="skeleton" style={{ height: 140, borderRadius: 'var(--radius-lg)' }} />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">
                            {(() => {
                                if (filter === 'FAILED') return '⚠️';
                                if (filter === 'ALL') return '📋';
                                return '✓';
                            })()}
                        </div>
                        <div className="empty-title">
                            {filter === 'ALL' ? 'No tasks yet' : `No ${activeTab?.label.toLowerCase()} tasks`}
                        </div>
                        <p className="empty-sub">
                            {filter === 'ALL'
                                ? 'Go to Extract to paste a discussion and let the Flow agents create tasks for you.'
                                : 'No items match your current filter and search.'}
                        </p>
                        {filter === 'ALL' && (
                            <Link href="/extract" className="btn btn-primary" style={{ marginTop: 12, borderRadius: 12 }}>
                                <Plus size={14} /> Extract Tasks
                            </Link>
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 48 }}>
                        {filtered.map(t => (
                            <TaskCard
                                key={t.id}
                                task={t}
                                onChange={updateTask}
                                projectName={projects.find(p => p.id === t.project_id)?.name}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
