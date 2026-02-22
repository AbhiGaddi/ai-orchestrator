'use client';
import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { Task } from '@/types';
import { updateTask } from '@/lib/api';
import { toast } from '@/components/ui/Toast';

interface EditModalProps {
    task: Task;
    onClose: () => void;
    onSaved: (updated: Task) => void;
}

export default function EditTaskModal({ task, onClose, onSaved }: EditModalProps) {
    const [form, setForm] = useState({
        title: task.title,
        description: task.description ?? '',
        acceptance_criteria: task.acceptance_criteria ?? '',
        deadline: task.deadline ?? '',
        priority: task.priority,
    });
    const [saving, setSaving] = useState(false);

    const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setForm(f => ({ ...f, [key]: e.target.value }));

    async function handleSave() {
        setSaving(true);
        try {
            const updated = await updateTask(task.id, form);
            toast('success', 'Task updated');
            onSaved(updated);
        } catch (err: unknown) {
            toast('error', err instanceof Error ? err.message : 'Update failed');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <h3 className="modal-title">Edit Task</h3>
                    <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
                </div>
                <div className="modal-body">
                    <div className="form-group">
                        <label className="form-label">Title *</label>
                        <input className="form-input" value={form.title} onChange={set('title')} placeholder="Task title" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea className="form-textarea" value={form.description} onChange={set('description')} rows={4} placeholder="What needs to be done?" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Acceptance Criteria</label>
                        <textarea className="form-textarea" value={form.acceptance_criteria} onChange={set('acceptance_criteria')} rows={3} placeholder="How do we know it's done?" />
                    </div>
                    <div className="grid-2">
                        <div className="form-group">
                            <label className="form-label">Deadline</label>
                            <input className="form-input" value={form.deadline} onChange={set('deadline')} placeholder="e.g. 2 weeks" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Priority</label>
                            <select className="form-select" value={form.priority} onChange={set('priority')}>
                                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? <><span className="spinner" />Saving…</> : <><Save size={15} />Save Changes</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
