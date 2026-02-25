'use client';
import { useEffect, useState } from 'react';
import { RefreshCw, Plus, Brain, FileText, Sparkles, GitBranch, Zap, Search, CheckCircle2 } from 'lucide-react';
import { Task, Project } from '@/types';
import { listTasks, listProjects, syncTasks } from '@/lib/api';
import TaskCard from '@/components/tasks/TaskCard';
import ToastContainer, { toast } from '@/components/ui/Toast';
import Link from 'next/link';



export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');

    async function loadTasks(silent = false) {
        if (silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            if (silent) {
                // Background sync GitHub PRs before fetching tasks
                try {
                    await syncTasks();
                } catch (e) {
                    console.error("Sync failed", e);
                }
            }
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

    function handleDeleteTask(deletedId: string) {
        setTasks(prev => prev.filter(task => task.id !== deletedId));
    }

    const counts = {
        total: tasks.length,
        todo: tasks.filter(t => ['PENDING', 'APPROVED', 'REJECTED'].includes(t.status)).length,
        inProgress: tasks.filter(t => ['IN_PROGRESS', 'FAILED'].includes(t.status)).length,
        review: tasks.filter(t => ['COMPLETED', 'REVIEW_DONE'].includes(t.status)).length,
        done: tasks.filter(t => t.status === 'DONE').length,
    };

    const filtered = tasks
        .filter(t => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q);
        });

    const columns = [
        {
            title: 'TO DO',
            items: filtered.filter(t => ['PENDING', 'APPROVED', 'REJECTED'].includes(t.status)),
            color: 'var(--blue)'
        },
        {
            title: 'In Progress',
            items: filtered.filter(t => ['IN_PROGRESS', 'FAILED'].includes(t.status)),
            color: 'var(--yellow)'
        },
        {
            title: 'Review',
            items: filtered.filter(t => ['COMPLETED', 'REVIEW_DONE'].includes(t.status)),
            color: 'var(--purple)'
        },
        {
            title: 'Done',
            items: filtered.filter(t => t.status === 'DONE'),
            color: 'var(--green)'
        }
    ];

    return (
        <div style={{ position: 'relative', minHeight: 'calc(100vh - 72px)' }}>
            <ToastContainer />
            <div className="glow-blob glow-blob-1" />
            <div className="glow-blob glow-blob-2" />
            <div className="container" style={{ position: 'relative', zIndex: 1, maxWidth: 1600, padding: '0 80px' }}>
                {/* ── Page header ── */}
                <div style={{
                    padding: '30px 80px 20px 80px',
                    margin: '0 -80px',
                    position: 'sticky',
                    top: 0,
                    zIndex: 40,
                    background: 'var(--bg-base)'
                }}>
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
                        gridTemplateColumns: 'repeat(5, 1fr)',
                        gap: 20,
                        marginBottom: 32
                    }}>
                        {[
                            { label: 'Total Tasks', value: counts.total, icon: FileText, color: '#6366f1' },
                            { label: 'To Do', value: counts.todo, icon: Sparkles, color: '#a855f7' },
                            { label: 'In Progress', value: counts.inProgress, icon: Zap, color: '#f59e0b' },
                            { label: 'In Review', value: counts.review, icon: GitBranch, color: '#3b82f6' },
                            { label: 'Done', value: counts.done, icon: CheckCircle2, color: '#10b981' },
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

                    {/* Search Bar Only */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border)',
                        borderRadius: 16,
                        padding: '6px 16px',
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
                    </div>
                </div>

                {/* ── Sprint Board ── */}
                {loading ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                        {[1, 2, 3, 4].map(col => (
                            <div key={`loading-col-${col}`} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {[1, 2].map(i => (
                                    <div key={`loading-${col}-${i}`} className="skeleton" style={{ height: 180, borderRadius: 'var(--radius-lg)' }} />
                                ))}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, minmax(280px, 1fr))',
                        gap: 20,
                        paddingBottom: 48,
                        alignItems: 'flex-start'
                    }}>
                        {columns.map(col => (
                            <div key={col.title} style={{
                                background: 'rgba(0,0,0,0.15)',
                                borderRadius: 20,
                                border: '1px solid rgba(255,255,255,0.03)',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px 16px', flexShrink: 0 }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: col.color, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, boxShadow: `0 0 10px ${col.color}` }} />
                                        {col.title}
                                    </h3>
                                    <div style={{
                                        background: 'var(--bg-card)', padding: '2px 8px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)'
                                    }}>
                                        {col.items.length}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', padding: '0 16px 20px 16px' }}>
                                    {col.items.map(t => (
                                        <TaskCard
                                            key={t.id}
                                            task={t}
                                            onChange={updateTask}
                                            onDelete={handleDeleteTask}
                                            projectName={projects.find(p => p.id === t.project_id)?.name}
                                        />
                                    ))}
                                    {col.items.length === 0 && (
                                        <div style={{
                                            padding: '30px 20px', textAlign: 'center',
                                            border: '2px dashed rgba(255,255,255,0.05)', borderRadius: 16,
                                            color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600
                                        }}>
                                            No tasks here
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
