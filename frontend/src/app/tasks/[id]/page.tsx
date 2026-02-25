'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Clock, Play, Github, Mail, AlertCircle, CheckSquare, Terminal, Tag, Search, ThumbsUp, Cpu, Folder, GitMerge, Trash2 } from 'lucide-react';
import { Task, AgentRun, Project } from '@/types';
import { getTask, listAgentRuns, executeTask, generateCodeTask, reviewPRTask, updateTask, getProject, deleteTask } from '@/lib/api';
import { StatusBadge, PriorityBadge } from '@/components/ui/Badges';
import ToastContainer, { toast } from '@/components/ui/Toast';

export default function TaskDetailPage() {
    const params = useParams();
    const router = useRouter();
    const taskId = params.id as string;

    const [task, setTask] = useState<Task | null>(null);
    const [runs, setRuns] = useState<AgentRun[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'logs'>('details');
    const [showGenModal, setShowGenModal] = useState(false);
    const [genForm, setGenForm] = useState({ baseBranch: '', newBranch: '' });
    const [isEditingRepo, setIsEditingRepo] = useState(false);
    const [editRepoValue, setEditRepoValue] = useState("");
    const [project, setProject] = useState<Project | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (!taskId) return;
        loadData();
        // Poll for agent runs every 5 seconds if task is not fully done
        const interval = setInterval(loadData, 5000);
        return () => clearInterval(interval);
    }, [taskId]);

    async function loadData() {
        try {
            const [t, r] = await Promise.all([
                getTask(taskId),
                listAgentRuns(taskId)
            ]);
            setTask(t);
            setRuns(r);

            if (t.project_id) {
                const proj = await getProject(t.project_id);
                setProject(proj);
            }
        } catch (err: any) {
            toast('error', err.message || 'Failed to load task details');
        } finally {
            setLoading(false);
        }
    }

    const doAction = async (actionId: string, actionLabel: string, fn: () => Promise<Task>) => {
        setActionLoading(actionId);
        try {
            const updated = await fn();
            setTask(updated);
            toast('success', `${actionLabel} completed successfully`);
            await loadData();
        } catch (err: any) {
            toast('error', err.message || `Failed to complete ${actionLabel}`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async () => {
        setActionLoading('delete');
        try {
            await deleteTask(task!.id);
            toast('success', 'Task deleted successfully');
            router.push('/tasks');
        } catch (err: any) {
            toast('error', err.message || `Failed to delete task`);
            setActionLoading(null);
            setShowDeleteConfirm(false);
        }
    };

    if (loading && !task) {
        return <div className="container" style={{ padding: 40, textAlign: 'center' }}><span className="spinner" style={{ width: 24, height: 24 }} /></div>;
    }

    if (!task) {
        return <div className="container"><p>Task not found.</p></div>;
    }

    const canExecute = task.approved && !['IN_PROGRESS', 'COMPLETED'].includes(task.status);
    const canGenerateCode = (task.status === 'COMPLETED' || task.status === 'FAILED') && !!task.github_issue_id && !task.github_pr_id;
    const canReviewPR = (task.status === 'COMPLETED' || task.status === 'FAILED') && !!task.github_pr_id;
    const canReopen = task.status === 'REJECTED';

    // Step 1: Extracted & Approved
    const step1Done = task.approved;
    // Step 2: Phase 1 (Issue created)
    const step2Done = !!task.github_issue_id;
    // Step 3: Phase 2 (Code generated)
    const step3Done = !!task.github_pr_id;
    // Step 4: Phase 2.5 (PR Reviewed)
    const step4Done = runs.some(r => r.agent_name === 'PRAgent' && r.status === 'COMPLETED');
    // Step 5: Phase 3 (Merged and Done)
    const step5Done = task.status === 'DONE';


    return (
        <div style={{ position: 'relative', overflow: 'hidden', minHeight: 'calc(100vh - 72px)' }}>
            <ToastContainer />
            <div className="glow-blob glow-blob-1" />
            <div className="glow-blob glow-blob-2" />

            <div className="container" style={{ position: 'relative', zIndex: 1, maxWidth: 1600, padding: '0 80px', paddingTop: 10 }}>
                <div style={{ marginBottom: 12 }}>
                    <Link href="/tasks" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>
                        <ArrowLeft size={14} /> Back to Tasks
                    </Link>
                </div>

                {/* Header */}
                <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'center' }}>
                                <StatusBadge status={task.status} />
                                <PriorityBadge priority={task.priority} />
                                {project && (
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 6,
                                        background: 'rgba(59,130,246,0.1)', color: 'var(--blue)',
                                        padding: '3px 10px', borderRadius: 8, fontSize: '0.65rem', fontWeight: 800,
                                        border: '1px solid rgba(59,130,246,0.2)'
                                    }}>
                                        <Folder size={11} /> {project.name.toUpperCase()}
                                    </span>
                                )}
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600 }}>ID: {task.id}</span>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    style={{ padding: '4px', marginLeft: 8, color: 'var(--text-muted)' }}
                                    title="Delete Task"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <h1 style={{ fontSize: '1.4rem', margin: 0, fontWeight: 900, letterSpacing: '-0.02em' }}>{task.title}</h1>
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            {canExecute && (
                                <button className="btn btn-primary" onClick={() => doAction('setup', 'Phase 1 Setup', () => executeTask(task.id))} disabled={!!actionLoading}>
                                    {actionLoading === 'setup' ? <span className="spinner" /> : (task.status === 'FAILED' ? <AlertCircle size={14} /> : <Play size={14} />)}
                                    {task.status === 'FAILED' ? 'Retry Setup (Phase 1)' : 'Execute Setup (Phase 1)'}
                                </button>
                            )}
                            {canGenerateCode && (
                                <button className="btn" style={{ background: 'linear-gradient(135deg, var(--accent), var(--blue))', color: '#fff', border: 'none' }} onClick={() => setShowGenModal(true)} disabled={!!actionLoading}>
                                    {actionLoading === 'generation' ? <span className="spinner" /> : <Terminal size={14} />}
                                    {task.status === 'FAILED' ? 'Retry Code Generation (Phase 2)' : 'Generate Code (Phase 2)'}
                                </button>
                            )}
                            {canReviewPR && (
                                <button className="btn" style={{ background: 'linear-gradient(135deg, var(--green), var(--accent))', color: '#fff', border: 'none' }} onClick={() => doAction('review', 'AI PR Review', () => reviewPRTask(task.id))} disabled={!!actionLoading}>
                                    {actionLoading === 'review' ? <span className="spinner" /> : <CheckCircle2 size={14} />}
                                    {task.status === 'FAILED' ? 'Retry AI Review PR' : 'AI Review PR'}
                                </button>
                            )}
                            {canReopen && (
                                <button className="btn btn-secondary" onClick={() => doAction('reopen', 'Re-open Task', () => updateTask(task.id, { status: 'PENDING' } as any))} disabled={!!actionLoading}>
                                    {actionLoading === 'reopen' ? <span className="spinner" /> : <Play size={14} />}
                                    Re-Open Task
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Progress Tracker */}
                <div className="card" style={{ marginBottom: 16, padding: '20px 24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 38, left: 40, right: 40, height: 2, background: 'var(--border)', zIndex: 0 }} />

                        <StepItem title="Approved" done={step1Done} icon={<ThumbsUp size={12} />} />
                        <StepItem title="GitHub Ticket" done={step2Done} active={step1Done && !step2Done} link={task.github_issue_url} icon={<Tag size={12} />} />
                        <StepItem title="Code Generated" done={step3Done} active={step2Done && !step3Done} link={task.github_pr_url} icon={<Cpu size={12} />} />
                        <StepItem title="PR Reviewed" done={step4Done} active={step3Done && !step4Done} icon={<Search size={12} />} />
                        <StepItem title="Merged & Done" done={step5Done} active={step4Done && !step5Done} icon={<GitMerge size={12} />} />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1.5fr)', gap: 24, alignItems: 'start' }}>
                    {/* Left Col: Details & PR Links */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                        {(task.github_issue_url || task.github_pr_url || task.email_sent) && (
                            <div className="card">
                                <h3 style={{ marginBottom: 16, fontSize: '1.1rem' }}>Integrations</h3>
                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                    {task.github_issue_url && (
                                        <a href={task.github_issue_url} target="_blank" rel="noreferrer" className="badge badge-completed" style={{ gap: 6, textDecoration: 'none', padding: '8px 12px' }}>
                                            <Github size={14} /> Issue #{task.github_issue_id}
                                        </a>
                                    )}
                                    {task.github_pr_url && (
                                        <a href={task.github_pr_url} target="_blank" rel="noreferrer" className="badge badge-primary" style={{ gap: 6, textDecoration: 'none', background: 'var(--blue-dim)', color: 'var(--blue)', padding: '8px 12px' }}>
                                            <Github size={14} /> Pull Request #{task.github_pr_id}
                                        </a>
                                    )}
                                    {task.email_sent && (
                                        <span className="badge badge-completed" style={{ gap: 6, padding: '8px 12px' }}>
                                            <Mail size={14} /> Setup Email Sent
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, height: 'calc(100vh - 380px)', minHeight: 400 }}>
                            <div style={{ display: 'flex', padding: '0 10px', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.02)' }}>
                                <TabBtn active={activeTab === 'details'} onClick={() => setActiveTab('details')}>Details & Criteria</TabBtn>
                                <TabBtn active={activeTab === 'logs'} onClick={() => setActiveTab('logs')}>Agent Activity ({runs.length})</TabBtn>
                            </div>

                            <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
                                {activeTab === 'details' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                        <div>
                                            <div className="task-card-section-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                Target Repository
                                                {!isEditingRepo && (
                                                    <button
                                                        onClick={() => {
                                                            setEditRepoValue(task.github_repo || "");
                                                            setIsEditingRepo(true);
                                                        }}
                                                        style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
                                                    >
                                                        Change
                                                    </button>
                                                )}
                                            </div>
                                            <div className="task-card-section" style={{ fontSize: '0.95rem' }}>
                                                {isEditingRepo ? (
                                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                        <input
                                                            className="form-input"
                                                            style={{ flex: 1, padding: '4px 8px', fontSize: '0.85rem', height: 'auto' }}
                                                            value={editRepoValue}
                                                            onChange={e => setEditRepoValue(e.target.value)}
                                                            placeholder="owner/repo"
                                                        />
                                                        <button className="btn btn-primary btn-sm" onClick={async () => {
                                                            try {
                                                                const updated = await updateTask(task.id, { github_repo: editRepoValue });
                                                                setTask(updated);
                                                                setIsEditingRepo(false);
                                                                toast('success', 'Repository updated');
                                                            } catch (err: any) {
                                                                toast('error', err.message || 'Failed to update repo');
                                                            }
                                                        }}>Save</button>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => setIsEditingRepo(false)}>Cancel</button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {task.github_repo ? (
                                                            <span style={{ color: 'var(--blue)', fontWeight: 500 }}>{task.github_repo}</span>
                                                        ) : (
                                                            <span style={{ color: 'var(--text-muted)' }}>Default (from Workspace)</span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {task.description && (
                                            <div>
                                                <div className="task-card-section-label">Description</div>
                                                <div className="task-card-section" style={{ fontSize: '0.95rem' }}>{task.description}</div>
                                            </div>
                                        )}
                                        {task.acceptance_criteria && (
                                            <div>
                                                <div className="task-card-section-label">Acceptance Criteria</div>
                                                <div className="task-card-section" style={{ fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>{task.acceptance_criteria}</div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        {runs.length === 0 ? (
                                            <p style={{ color: 'var(--text-muted)' }}>No agent activity yet.</p>
                                        ) : (
                                            runs.map(run => (
                                                <div key={run.id} style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-base)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                        <strong style={{ color: 'var(--accent-light)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <Terminal size={14} /> {run.agent_name}
                                                        </strong>
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                            {run.status === 'RUNNING' && <span className="spinner" style={{ width: 10, height: 10, marginRight: 6 }} />}
                                                            {run.status}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                        Started: {new Date(run.started_at || '').toLocaleTimeString()}
                                                    </div>
                                                    {run.error_message && (
                                                        <div style={{ marginTop: 10, padding: 10, background: 'var(--red-dim)', color: '#ff8a8a', borderRadius: 6, fontSize: '0.85rem' }}>
                                                            {run.error_message}
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Right Col: Timeline */}
                    <div className="card" style={{ height: 'calc(100vh - 380px)', minHeight: 400, overflowY: 'auto' }}>
                        <h3 style={{ marginBottom: 16, fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Execution Timeline</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <TimelineEvent title="Task Created" time={task.created_at} icon={<CheckSquare size={14} />} color="var(--text-muted)" />
                            {task.approved && <TimelineEvent title="Task Approved" time={task.updated_at} icon={<CheckCircle2 size={14} />} color="var(--blue)" />}
                            {runs.filter(r => r.agent_name === 'TicketAgent').map(r => (
                                <TimelineEvent key={r.id} title={`Ticket Agent ${r.status}`} time={r.started_at || ''} icon={<Github size={14} />} color={r.status === 'FAILED' ? 'var(--red)' : 'var(--green)'} />
                            ))}
                            {runs.filter(r => r.agent_name === 'EmailAgent').map(r => (
                                <TimelineEvent key={r.id} title={`Email Agent ${r.status}`} time={r.started_at || ''} icon={<Mail size={14} />} color={r.status === 'FAILED' ? 'var(--red)' : 'var(--green)'} />
                            ))}
                            {runs.filter(r => r.agent_name === 'CodeAgent').map(r => (
                                <TimelineEvent key={r.id} title={`Code Agent ${r.status}`} time={r.started_at || ''} icon={<Terminal size={14} />} color={r.status === 'FAILED' ? 'var(--red)' : r.status === 'RUNNING' ? 'var(--yellow)' : 'var(--purple)'} />
                            ))}
                            {runs.filter(r => r.agent_name === 'PRAgent').map(r => (
                                <TimelineEvent key={r.id} title={`PR Agent ${r.status}`} time={r.started_at || ''} icon={<CheckCircle2 size={14} />} color={r.status === 'FAILED' ? 'var(--red)' : r.status === 'RUNNING' ? 'var(--yellow)' : 'var(--green)'} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Generate Code Modal */}
            {
                showGenModal && (
                    <div className="modal-overlay" onClick={() => setShowGenModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <h2>Generate Code</h2>
                            <div style={{ marginBottom: 16 }}>
                                <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Base Branch (Optional)</label>
                                <input
                                    className="form-input"
                                    placeholder="main"
                                    value={genForm.baseBranch}
                                    onChange={e => setGenForm({ ...genForm, baseBranch: e.target.value })}
                                />
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Default: main</p>
                            </div>
                            <div style={{ marginBottom: 24 }}>
                                <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>New Target Branch Name (Optional)</label>
                                <input
                                    className="form-input"
                                    placeholder="ai-code-generation"
                                    value={genForm.newBranch}
                                    onChange={e => setGenForm({ ...genForm, newBranch: e.target.value })}
                                />
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Default: Auto-generated branch name</p>
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <button className="btn btn-ghost" onClick={() => setShowGenModal(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={() => {
                                    setShowGenModal(false);
                                    doAction('generation', 'Code Generation', () => generateCodeTask(task.id, genForm.baseBranch, genForm.newBranch));
                                }}>Generate</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Delete Modal */}
            {showDeleteConfirm && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowDeleteConfirm(false)}>
                    <div className="modal" style={{ maxWidth: 400, padding: 32, borderRadius: 24, textAlign: 'center' }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--red)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px'
                        }}>
                            <Trash2 size={32} />
                        </div>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 12, color: 'var(--text-primary)' }}>Delete Task?</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 32, lineHeight: 1.6 }}>
                            Are you sure you want to completely delete this task? This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={actionLoading === 'delete'}
                                style={{ flex: 1, padding: '12px', borderRadius: 12 }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleDelete}
                                disabled={actionLoading === 'delete'}
                                style={{ flex: 1, padding: '12px', borderRadius: 12 }}
                            >
                                {actionLoading === 'delete' ? <span className="spinner" /> : 'Delete Task'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StepItem({ title, done, active, link, icon }: { title: string, done: boolean, active?: boolean, link?: string, icon?: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 1, flex: 1 }}>
            {/* Title Above */}
            <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: done ? 'var(--green)' : active ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {title}
            </div>

            {/* Icon Center */}
            <div style={{
                width: 28, height: 28, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? 'var(--green)' : active ? 'var(--blue)' : 'var(--bg-card-hover)',
                color: done || active ? '#fff' : 'var(--text-muted)',
                boxShadow: active ? '0 0 0 4px var(--blue-dim)' : 'none',
                border: !done && !active ? '1px solid var(--border)' : 'none',
                transition: 'all 0.3s ease'
            }}>
                {done ? <CheckCircle2 size={16} /> : active ? <Clock size={16} /> : icon}
            </div>

            {/* Link/Status Below */}
            <div style={{ minHeight: 14 }}>
                {link && done ? (
                    <a href={link} target="_blank" rel="noreferrer" style={{ fontSize: '0.65rem', color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}>
                        View Details
                    </a>
                ) : active ? (
                    <span style={{ fontSize: '0.65rem', color: 'var(--blue)', fontWeight: 600 }}>Active</span>
                ) : (
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{done ? 'Complete' : 'Pending'}</span>
                )}
            </div>
        </div>
    );
}

function TabBtn({ children, active, onClick }: { children: React.ReactNode, active: boolean, onClick: () => void }) {
    return (
        <button onClick={onClick} style={{
            padding: '14px 24px',
            background: 'transparent',
            border: 'none',
            borderBottom: active ? '3px solid var(--accent)' : '3px solid transparent',
            color: active ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: 800,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.2s',
            opacity: active ? 1 : 0.6
        }}>
            {children}
        </button>
    );
}

function TimelineEvent({ title, time, icon, color }: { title: string, time: string, icon: React.ReactNode, color: string }) {
    const d = new Date(time);
    return (
        <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 24, height: 24, borderRadius: 12, background: 'var(--bg-card-hover)', color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {icon}
                </div>
                <div style={{ width: 2, flex: 1, background: 'var(--border)', minHeight: 20 }} />
            </div>
            <div style={{ marginTop: 2 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {d.toLocaleDateString()} {d.toLocaleTimeString()}
                </div>
            </div>
        </div>
    );
}
