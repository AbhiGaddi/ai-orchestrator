'use client';
import { useState } from 'react';
import { Pencil, Check, X, Play, Github, Mail, Calendar, AlertCircle } from 'lucide-react';
import { Task } from '@/types';
import { approveTask, rejectTask, executeTask, generateCodeTask } from '@/lib/api';
import { StatusBadge, PriorityBadge } from '@/components/ui/Badges';
import { toast } from '@/components/ui/Toast';
import EditTaskModal from './EditTaskModal';
import Link from 'next/link';


interface TaskCardProps {
    task: Task;
    onChange: (t: Task) => void;
}

export default function TaskCard({ task, onChange }: TaskCardProps) {
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
            <div className="task-card" style={{ borderLeft: isCompleted ? '3px solid var(--green)' : isRejected ? '3px solid var(--red)' : '3px solid transparent' }}>
                <div className="task-card-header">
                    <div style={{ flex: 1 }}>
                        <Link href={`/tasks/${task.id}`} className="task-card-title" style={{ marginBottom: 8, display: 'inline-block', textDecoration: 'none', color: 'inherit' }}>
                            {task.title}
                        </Link>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>

                            <StatusBadge status={task.status} />
                            <PriorityBadge priority={task.priority} />
                            {task.deadline && (
                                <span className="badge" style={{ background: 'var(--bg-card-hover)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                                    <Calendar size={10} /> {task.deadline}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="task-card-body">
                    {task.description && (
                        <div>
                            <div className="task-card-section-label">Description</div>
                            <div className="task-card-section">{task.description}</div>
                        </div>
                    )}
                    {task.acceptance_criteria && (
                        <div>
                            <div className="task-card-section-label">Acceptance Criteria</div>
                            <div className="task-card-section">{task.acceptance_criteria}</div>
                        </div>
                    )}
                </div>

                {/* GitHub + Email status */}
                {(task.github_issue_url || task.email_sent || task.github_pr_url) && (
                    <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                        {task.github_issue_url && (
                            <a href={task.github_issue_url} target="_blank" rel="noreferrer"
                                className="badge badge-completed"
                                style={{ gap: 6, textDecoration: 'none' }}>
                                <Github size={11} /> Issue #{task.github_issue_id}
                            </a>
                        )}
                        {task.github_pr_url && (
                            <a href={task.github_pr_url} target="_blank" rel="noreferrer"
                                className="badge badge-primary"
                                style={{ gap: 6, textDecoration: 'none', background: 'var(--blue-dim)', color: 'var(--blue)' }}>
                                <Github size={11} /> PR #{task.github_pr_id}
                            </a>
                        )}
                        {task.email_sent && (
                            <span className="badge badge-completed" style={{ gap: 6 }}>
                                <Mail size={11} /> Email Sent
                            </span>
                        )}
                    </div>
                )}

                <div className="task-card-footer">
                    <div className="task-card-meta">
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(task.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                    </div>

                    {!isCompleted && !isRejected && (
                        <div className="task-card-actions">
                            {/* Edit */}
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)} title="Edit">
                                <Pencil size={13} />
                            </button>

                            {/* Reject */}
                            {!task.approved && (
                                <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => do_('reject', () => rejectTask(task.id))}
                                    disabled={!!loading}
                                >
                                    {loading === 'reject' ? <span className="spinner" /> : <X size={13} />}
                                    Reject
                                </button>
                            )}

                            {/* Approve */}
                            {!task.approved && (
                                <button
                                    className="btn btn-success btn-sm"
                                    onClick={() => do_('approve', () => approveTask(task.id))}
                                    disabled={!!loading}
                                >
                                    {loading === 'approve' ? <span className="spinner" /> : <Check size={13} />}
                                    Approve
                                </button>
                            )}

                            {/* Execute Setup */}
                            {canExecute && (
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => do_('execute', () => executeTask(task.id))}
                                    disabled={!!loading}
                                    title="Run TicketAgent & EmailAgent"
                                >
                                    {loading === 'execute' ? <span className="spinner" /> : <Play size={13} />}
                                    Execute Setup
                                </button>
                            )}

                        </div>
                    )}

                    {/* Generate Code (Phase 2) - Shows even when COMPLETED */}
                    {canGenerateCode && (
                        <div className="task-card-actions">
                            <button
                                className="btn btn-sm"
                                style={{ background: 'linear-gradient(135deg, var(--accent), var(--blue))', color: '#fff', border: 'none' }}
                                onClick={() => do_('generate', () => generateCodeTask(task.id))}
                                disabled={!!loading}
                            >
                                {loading === 'generate' ? <span className="spinner" /> : <Play size={13} />}
                                Generate Code
                            </button>
                        </div>
                    )}

                    {task.status === 'FAILED' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--red)', fontSize: '0.8rem' }}>
                            <AlertCircle size={14} /> Execution failed
                            <button className="btn btn-primary btn-sm" onClick={() => do_('execute', () => executeTask(task.id))} disabled={!!loading}>
                                {loading === 'execute' ? <span className="spinner" /> : <Play size={13} />} Retry
                            </button>
                        </div>
                    )}
                </div>
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
