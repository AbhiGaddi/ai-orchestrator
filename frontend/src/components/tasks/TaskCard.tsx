'use client';
import { useState } from 'react';
import { Pencil, Check, X, Play, Github, Mail, Calendar, AlertCircle, Zap, RefreshCw, Folder } from 'lucide-react';
import { Task } from '@/types';
import { approveTask, rejectTask, executeTask, generateCodeTask } from '@/lib/api';
import { StatusBadge, PriorityBadge } from '@/components/ui/Badges';
import { toast } from '@/components/ui/Toast';
import EditTaskModal from './EditTaskModal';
import Link from 'next/link';


interface TaskCardProps {
    task: Task;
    onChange: (t: Task) => void;
    projectName?: string;
}

export default function TaskCard({ task, onChange, projectName }: TaskCardProps) {
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState<string | null>(null);

    const do_ = async (action: string, fn: () => Promise<Task>) => {
        setLoading(action);
        try {
            const updated = await fn();
            onChange(updated);
            toast('success', `Task ${action}d successfully`);
        } catch (err: unknown) {
            toast('error', err instanceof Error ? err.message : `Failed to ${action}`);
        } finally {
            setLoading(null);
        }
    };

    const canExecute = task.approved && !['IN_PROGRESS', 'COMPLETED', 'FAILED'].includes(task.status);
    const canGenerateCode = task.status === 'COMPLETED' && !!task.github_issue_id && !task.github_pr_id;
    const isCompleted = task.status === 'COMPLETED';
    const isRejected = task.status === 'REJECTED';

    return (
        <>
            <div className="task-card" style={{
                padding: '24px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 24,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-card)',
                marginBottom: 16
            }}>
                {/* Status Accent Stripe */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: 4,
                    background: isCompleted ? 'var(--green)' : isRejected ? 'var(--red)' : task.status === 'FAILED' ? 'var(--red)' : 'var(--accent)'
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <Link href={`/tasks/${task.id}`} style={{ textDecoration: 'none' }}>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
                                    {task.title}
                                </h3>
                            </Link>
                            <StatusBadge status={task.status} />
                            <PriorityBadge priority={task.priority} />
                            {projectName && (
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    background: 'rgba(59,130,246,0.1)', color: 'var(--blue)',
                                    padding: '2px 8px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 800,
                                    border: '1px solid rgba(59,130,246,0.2)'
                                }}>
                                    <Folder size={10} /> {projectName.toUpperCase()}
                                </span>
                            )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <Calendar size={12} />
                                {new Date(task.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                            {task.deadline && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--orange)' }}>
                                    <Zap size={12} />
                                    Due {task.deadline}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            className="btn btn-ghost"
                            onClick={() => setEditing(true)}
                            style={{ width: 36, height: 36, padding: 0, borderRadius: 10, background: 'rgba(255,255,255,0.03)' }}
                        >
                            <Pencil size={14} />
                        </button>
                        {!task.approved && !isRejected && (
                            <>
                                <button
                                    className="btn btn-danger"
                                    onClick={() => do_('reject', () => rejectTask(task.id))}
                                    disabled={!!loading}
                                    style={{ padding: '0 16px', height: 36, borderRadius: 10, fontSize: '0.8rem' }}
                                >
                                    {loading === 'reject' ? <span className="spinner" /> : <X size={14} />} Reject
                                </button>
                                <button
                                    className="btn btn-success"
                                    onClick={() => do_('approve', () => approveTask(task.id))}
                                    disabled={!!loading}
                                    style={{ padding: '0 16px', height: 36, borderRadius: 10, fontSize: '0.8rem', background: 'linear-gradient(135deg, #10b981, #059669)' }}
                                >
                                    {loading === 'approve' ? <span className="spinner" /> : <Check size={14} />} Approve
                                </button>
                            </>
                        )}
                        {canExecute && (
                            <button
                                className="btn btn-primary"
                                onClick={() => do_('execute', () => executeTask(task.id))}
                                disabled={!!loading}
                                style={{ padding: '0 20px', height: 36, borderRadius: 10, fontSize: '0.8rem', background: 'linear-gradient(135deg, #a855f7, #6366f1)' }}
                            >
                                {loading === 'execute' ? <span className="spinner" /> : <Play size={14} />} Execute Setup
                            </button>
                        )}
                        {canGenerateCode && (
                            <button
                                className="btn btn-primary"
                                onClick={() => do_('generate', () => generateCodeTask(task.id))}
                                disabled={!!loading}
                                style={{ padding: '0 20px', height: 36, borderRadius: 10, fontSize: '0.8rem', background: 'linear-gradient(135deg, #a855f7, #6366f1)' }}
                            >
                                {loading === 'generate' ? <span className="spinner" /> : <Play size={14} />} Generate Code
                            </button>
                        )}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 16 }}>
                    <div style={{ background: 'rgba(0,0,0,0.12)', padding: '16px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.03)' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Description</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{task.description || 'No description provided.'}</div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.12)', padding: '16px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.03)' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Acceptance Criteria</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{task.acceptance_criteria || 'No criteria defined.'}</div>
                    </div>
                </div>

                {/* Footer Artifacts */}
                {(task.github_issue_url || task.email_sent || task.github_pr_url || task.status === 'FAILED') && (
                    <div style={{
                        marginTop: 4,
                        paddingTop: 16,
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Artifacts:</div>
                            {task.github_issue_url && (
                                <a href={task.github_issue_url} target="_blank" rel="noreferrer"
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                                        borderRadius: 8, background: 'rgba(16,185,129,0.1)', color: '#10b981',
                                        fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none'
                                    }}>
                                    <Github size={12} /> Issue #{task.github_issue_id}
                                </a>
                            )}
                            {task.github_pr_url && (
                                <a href={task.github_pr_url} target="_blank" rel="noreferrer"
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                                        borderRadius: 8, background: 'rgba(99,102,241,0.1)', color: '#6366f1',
                                        fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none'
                                    }}>
                                    <Github size={12} /> PR #{task.github_pr_id}
                                </a>
                            )}
                            {task.email_sent && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                                    borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)',
                                    fontSize: '0.75rem', fontWeight: 700
                                }}>
                                    <Mail size={12} /> Stakeholders Notified
                                </div>
                            )}
                        </div>

                        {task.status === 'FAILED' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--red)', fontSize: '0.75rem', fontWeight: 700 }}>
                                <AlertCircle size={14} /> Execution failed
                                <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => do_('execute', () => executeTask(task.id))}
                                    disabled={!!loading}
                                    style={{ padding: '0 12px', height: 28, borderRadius: 6 }}
                                >
                                    {loading === 'execute' ? <span className="spinner" /> : <RefreshCw size={12} />} Retry
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {editing && (
                <EditTaskModal
                    task={task}
                    onClose={() => setEditing(false)}
                    onSaved={updated => { onChange(updated); setEditing(false); }}
                />
            )}
        </>
    );
}
