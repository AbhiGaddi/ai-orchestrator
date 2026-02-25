'use client';
import { useState } from 'react';
import { Calendar, Zap, Folder } from 'lucide-react';
import { Task } from '@/types';
import { approveTask, executeTask } from '@/lib/api';
import { StatusBadge, PriorityBadge } from '@/components/ui/Badges';
import { toast } from '@/components/ui/Toast';
import EditTaskModal from './EditTaskModal';
import ApprovalInfoModal from './ApprovalInfoModal';
import Link from 'next/link';


interface TaskCardProps {
    task: Task;
    onChange: (t: Task) => void;
    projectName?: string;
    onDelete?: (id: string) => void;
}

export default function TaskCard({ task, onChange, projectName, onDelete }: TaskCardProps) {
    const [editing, setEditing] = useState(false);
    const [showingInfo, setShowingInfo] = useState(false);
    const [loading, setLoading] = useState<string | null>(null);


    const handleApproveAndExecute = async () => {
        setLoading('approve_and_execute');
        try {
            // First Approve
            let updated = await approveTask(task.id);
            onChange(updated);
            toast('success', `Task approved successfully`);

            // Then instantly execute
            toast('success', `Starting automated pipeline...`);
            updated = await executeTask(task.id);
            onChange(updated);
        } catch (err: unknown) {
            toast('error', err instanceof Error ? err.message : `Failed to approve/execute`);
        } finally {
            setLoading(null);
            setShowingInfo(false);
        }
    };


    const isCompleted = task.status === 'COMPLETED';
    const isRejected = task.status === 'REJECTED';

    return (
        <>
            <div className="task-card" style={{
                padding: '20px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderLeft: `6px solid ${isCompleted ? 'var(--green)' : isRejected ? 'var(--orange)' : task.status === 'FAILED' ? 'var(--red)' : 'var(--accent)'}`,
                borderRadius: 16,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                boxShadow: 'var(--shadow-card)',
                marginBottom: 12
            }}>


                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                            <Link href={`/tasks/${task.id}`} style={{ textDecoration: 'none' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0, lineHeight: 1.4 }}>
                                    {task.title}
                                </h3>
                            </Link>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
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
                    </div>
                </div>
            </div>


            {editing && (
                <EditTaskModal
                    task={task}
                    onClose={() => setEditing(false)}
                    onSaved={updated => { onChange(updated); setEditing(false); }}
                />
            )}

            {showingInfo && (
                <ApprovalInfoModal
                    onClose={() => setShowingInfo(false)}
                    onConfirm={handleApproveAndExecute}
                />
            )}
        </>
    );
}
