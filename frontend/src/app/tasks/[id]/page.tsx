'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
    ArrowLeft, Play, Square, GitMerge, CheckCircle2,
    Clock, AlertCircle, RotateCcw, Folder, User,
    ChevronRight, Loader2, Trash2, FileText, Target
} from 'lucide-react';
import type { Task, Agent, AgentProfile, Project } from '@/types';
import { ipc } from '@/lib/ipc';
import DiffViewer from '@/components/ui/DiffViewer';

const AgentTerminal = dynamic(
    () => import('@/components/agents/AgentTerminal').then(m => m.AgentTerminal),
    { ssr: false }
);

// ── Status helpers ─────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
    PENDING: { label: 'Pending', color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
    APPROVED: { label: 'Approved', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
    QUEUED: { label: 'Queued', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    IN_PROGRESS: { label: 'Running', color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)' },
    REVIEW: { label: 'Review', color: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
    COMPLETED: { label: 'Completed', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    DONE: { label: 'Done', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    FAILED: { label: 'Failed', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    REJECTED: { label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

const PRIORITY_META: Record<string, { color: string }> = {
    LOW: { color: '#9ca3af' },
    MEDIUM: { color: '#f59e0b' },
    HIGH: { color: '#f97316' },
    CRITICAL: { color: '#ef4444' },
};

function StatusBadge({ status }: { status: string }) {
    const m = STATUS_META[status] ?? STATUS_META.PENDING;
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ color: m.color, background: m.bg, border: `1px solid ${m.color}30` }}>
            {status === 'IN_PROGRESS' && <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />}
            {m.label}
        </span>
    );
}

function PriBadge({ priority }: { priority: string }) {
    const m = PRIORITY_META[priority] ?? PRIORITY_META.MEDIUM;
    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold"
            style={{ color: m.color, background: `${m.color}15`, border: `1px solid ${m.color}30` }}>
            {priority}
        </span>
    );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function TaskDetailPage() {
    const { id: taskId } = useParams<{ id: string }>();
    const router = useRouter();

    const [task, setTask] = useState<Task | null>(null);
    const [project, setProject] = useState<Project | null>(null);
    const [profile, setProfile] = useState<AgentProfile | null>(null);
    const [agent, setAgent] = useState<Agent | null>(null);
    const [loading, setLoading] = useState(true);
    const [executing, setExecuting] = useState(false);
    const [showDiff, setShowDiff] = useState(false);
    const [gitDiffs, setGitDiffs] = useState<unknown[]>([]);
    const [showDelete, setShowDelete] = useState(false);

    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    async function load() {
        try {
            const t = await ipc.tasks.get(taskId);
            setTask(t);

            if (t.project_id) {
                ipc.projects.get(t.project_id).then(setProject).catch(() => null);
            }
            if (t.profile_id) {
                ipc.agentProfiles.get(t.profile_id).then(setProfile).catch(() => null);
            }

            // Find agent linked to this task
            const agents = await ipc.agents.list();
            const linked = agents.find(a => a.taskId === taskId) ?? null;
            setAgent(linked);
        } catch {
            // task not found — navigate away
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();

        // Listen for status changes
        const handleStatus = async (payload: unknown) => {
            const { status } = payload as { id: string; status: string };
            if (['completed', 'error', 'idle'].includes(status)) {
                await load(); // refresh task + agent
                // Auto-show diff review after successful completion
                if (status === 'completed') {
                    try {
                        const diffs = await window.api.tasks.getGitDiff(taskId);
                        if (diffs && diffs.length > 0) {
                            setGitDiffs(diffs);
                            setShowDiff(true);
                        }
                    } catch { /* no changes — that's fine */ }
                }
            }
        };
        ipc.on('agent:status', handleStatus);

        // Poll while task is in-progress
        pollRef.current = setInterval(() => {
            if (task?.status === 'IN_PROGRESS') load();
        }, 5000);

        return () => {
            ipc.off('agent:status', handleStatus);
            if (pollRef.current) clearInterval(pollRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [taskId]);

    async function handleExecute() {
        if (!task) return;
        setExecuting(true);
        try {
            await ipc.tasks.execute(taskId);
            await load();
        } finally {
            setExecuting(false);
        }
    }

    async function handleStop() {
        if (!agent) return;
        await ipc.agents.stop(agent.id);
        await load();
    }

    async function handleReviewChanges() {
        try {
            const diffs = await window.api.tasks.getGitDiff(taskId);
            setGitDiffs(diffs);
            setShowDiff(true);
        } catch {
            alert('No local changes found.');
        }
    }

    async function handleCommit(message: string) {
        await window.api.tasks.commit(taskId, message);
        setShowDiff(false);
        await load();
    }

    async function handleDiscard() {
        await window.api.tasks.discard(taskId);
        setShowDiff(false);
        await load();
    }

    async function handleDelete() {
        await ipc.tasks.delete(taskId);
        router.push(project ? `/projects/${project.id}` : '/tasks');
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen pl-[256px]">
                <Loader2 size={24} className="animate-spin text-violet-400" />
            </div>
        );
    }

    if (!task) {
        return <div className="p-8 pl-[280px] text-gray-400">Task not found.</div>;
    }

    const isRunning = task.status === 'IN_PROGRESS' || agent?.status === 'running';
    const isDone = ['COMPLETED', 'DONE', 'FAILED'].includes(task.status);
    const canRun = !isRunning && !['IN_PROGRESS'].includes(task.status);

    return (
        <div className="min-h-screen bg-[#0B0D11]">
            {showDiff && (
                <DiffViewer
                    taskId={taskId}
                    diffs={gitDiffs as never}
                    onClose={() => setShowDiff(false)}
                    onCommit={handleCommit}
                    onDiscard={handleDiscard}
                />
            )}

            <div className="w-full max-w-[1700px] mx-auto px-8 py-6 flex flex-col gap-6">

                {/* Back link */}
                <Link
                    href={project ? `/projects/${project.id}` : '/tasks'}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors w-fit"
                >
                    <ArrowLeft size={13} />
                    {project ? project.name : 'All Tasks'}
                </Link>

                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <StatusBadge status={task.status} />
                            <PriBadge priority={task.priority} />
                            {project && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                                    <Folder size={10} /> {project.name}
                                </span>
                            )}
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">{task.title}</h1>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        {isRunning ? (
                            <button
                                onClick={handleStop}
                                className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
                            >
                                <Square size={14} /> Stop
                            </button>
                        ) : (
                            <button
                                onClick={handleExecute}
                                disabled={executing}
                                className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-violet-500/20"
                            >
                                {executing
                                    ? <Loader2 size={14} className="animate-spin" />
                                    : isDone ? <RotateCcw size={14} /> : <Play size={14} />
                                }
                                {executing ? 'Starting...' : isDone ? 'Re-run' : '▶ Code'}
                            </button>
                        )}
                        {isDone && (
                            <button
                                onClick={handleReviewChanges}
                                className="flex items-center gap-1.5 px-3 py-2 bg-[#1f2937] hover:bg-[#374151] border border-[#374151] text-gray-300 rounded-lg text-sm font-medium transition-colors"
                            >
                                <GitMerge size={14} /> Review Changes
                            </button>
                        )}
                        <button
                            onClick={() => setShowDelete(true)}
                            className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>

                {/* Body: terminal left, details right */}
                <div className="grid grid-cols-[1fr_380px] gap-6" style={{ minHeight: 'calc(100vh - 220px)' }}>

                    {/* Left: Agent Terminal */}
                    <div className="bg-[#09090b] rounded-xl border border-[#374151] overflow-hidden flex flex-col shadow-2xl" style={{ height: 'calc(100vh - 220px)', position: 'sticky', top: 24 }}>
                        {agent ? (
                            <AgentTerminal agentId={agent.id} />
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center gap-6 text-gray-600 p-12 bg-[#09090b]">
                                <div className="relative">
                                    <div className="absolute -inset-4 bg-violet-500/10 blur-2xl rounded-full animate-pulse" />
                                    <Play size={64} className="opacity-20 relative text-violet-400" />
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-bold text-gray-400 mb-2">No active agent run</p>
                                    <p className="text-sm opacity-60 max-w-[300px] mx-auto leading-relaxed">
                                        Click the <span className="text-violet-400 font-bold px-1.5 py-0.5 bg-violet-500/10 rounded">▶ Code</span> button above to initialize a Claude instance and start solving this task.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Task details */}
                    <div className="flex flex-col gap-4">

                        {/* Stats (when running) */}
                        {isRunning && agent && (
                            <div className="bg-[#141820] border border-sky-500/20 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                                    <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider">Live</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-center">
                                    <div>
                                        <div className="text-[10px] text-gray-500 uppercase mb-0.5">Turns</div>
                                        <div className="text-lg font-bold text-white font-mono">{task.turn_count || 0}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-gray-500 uppercase mb-0.5">Tokens</div>
                                        <div className="text-lg font-bold text-white font-mono">
                                            {((task.input_tokens + task.output_tokens) / 1000).toFixed(1)}k
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Profile */}
                        <div className="bg-[#141820] border border-[#1f2937] rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <User size={14} className="text-gray-500" />
                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Agent Profile</span>
                            </div>
                            {profile ? (
                                <div>
                                    <div className="font-semibold text-white text-sm">{profile.name}</div>
                                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                        <span className="capitalize">{profile.model}</span>
                                        {profile.skills.length > 0 && (
                                            <>
                                                <span className="text-gray-700">·</span>
                                                <span>{profile.skills.slice(0, 2).join(', ')}{profile.skills.length > 2 ? ` +${profile.skills.length - 2}` : ''}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <span className="text-sm text-gray-500">Default profile</span>
                            )}
                        </div>

                        {/* Description */}
                        {task.description && (
                            <div className="bg-[#141820] border border-[#1f2937] rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <FileText size={14} className="text-gray-500" />
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</span>
                                </div>
                                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{task.description}</p>
                            </div>
                        )}

                        {/* Acceptance criteria */}
                        {task.acceptance_criteria && (
                            <div className="bg-[#141820] border border-[#1f2937] rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Target size={14} className="text-gray-500" />
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Acceptance Criteria</span>
                                </div>
                                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{task.acceptance_criteria}</p>
                            </div>
                        )}

                        {/* Timeline */}
                        <div className="bg-[#141820] border border-[#1f2937] rounded-xl p-4">
                            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Timeline</div>
                            <div className="space-y-2">
                                <TimelineRow icon={<CheckCircle2 size={12} />} color="#6366f1" label="Created" time={task.created_at} />
                                {task.started_at && <TimelineRow icon={<Play size={12} />} color="#0ea5e9" label="Started" time={task.started_at} />}
                                {task.completed_at && (
                                    <TimelineRow
                                        icon={task.status === 'FAILED' ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
                                        color={task.status === 'FAILED' ? '#ef4444' : '#10b981'}
                                        label={task.status === 'FAILED' ? 'Failed' : 'Completed'}
                                        time={task.completed_at}
                                    />
                                )}
                                {task.elapsed_seconds > 0 && (
                                    <TimelineRow icon={<Clock size={12} />} color="#6b7280" label={`Duration: ${formatDuration(task.elapsed_seconds)}`} time="" />
                                )}
                            </div>
                        </div>

                        {/* Cost summary if done */}
                        {isDone && (task.input_tokens > 0 || task.output_tokens > 0) && (
                            <div className="bg-[#141820] border border-[#1f2937] rounded-xl p-4">
                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Run Summary</div>
                                <div className="grid grid-cols-2 gap-2 text-center">
                                    <div>
                                        <div className="text-[10px] text-gray-500">Turns</div>
                                        <div className="text-base font-bold text-white font-mono">{task.turn_count}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-gray-500">Est. Cost</div>
                                        <div className="text-base font-bold text-green-400 font-mono">
                                            ${((task.input_tokens / 1e6) * 3 + (task.output_tokens / 1e6) * 15).toFixed(3)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Delete confirm */}
            {showDelete && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowDelete(false)}>
                    <div className="bg-[#141820] border border-[#374151] rounded-2xl p-8 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
                        <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-5">
                            <Trash2 size={28} />
                        </div>
                        <h2 className="text-xl font-bold text-white text-center mb-2">Delete Task?</h2>
                        <p className="text-gray-400 text-sm text-center mb-6">This cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDelete(false)} className="flex-1 py-2.5 rounded-xl border border-[#374151] text-gray-300 hover:bg-[#1f2937] transition-colors text-sm font-medium">Cancel</button>
                            <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors text-sm font-semibold">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function TimelineRow({ icon, color, label, time }: { icon: React.ReactNode; color: string; label: string; time: string }) {
    return (
        <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${color}20`, color }}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <span className="text-xs text-gray-400">{label}</span>
                {time && <span className="text-[11px] text-gray-600 ml-2">{new Date(time).toLocaleString()}</span>}
            </div>
        </div>
    );
}

function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
}
