import React, { useState } from 'react';
import { X, LayoutList } from 'lucide-react';
import { ipc } from '@/lib/ipc';
import type { Priority } from '@/types';

export function NewTaskModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [priority, setPriority] = useState<Priority>('MEDIUM');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await ipc.kanban.create({ title, description: desc, priority, column: 'backlog' });
            onSuccess();
        } catch {
            alert('Failed to create task');
        }
        setSubmitting(false);
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm px-4">
            <div className="bg-[#1f2937] p-8 rounded-xl w-full max-w-lg border border-[#374151] shadow-2xl">
                <div className="flex justify-between items-center mb-6 border-b border-[#374151] pb-4">
                    <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                        <LayoutList size={22} className="text-violet-500" />
                        Add Kanban Task
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors bg-[#111827] p-2 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-1.5">Task Title</label>
                        <input
                            required type="text" value={title} onChange={e => setTitle(e.target.value)}
                            className="w-full bg-[#111827] border border-[#374151] rounded-lg p-2.5 text-white focus:ring-1 focus:ring-violet-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-1.5">Description</label>
                        <textarea
                            rows={3} value={desc} onChange={e => setDesc(e.target.value)}
                            className="w-full bg-[#111827] border border-[#374151] rounded-lg p-2.5 text-white focus:ring-1 focus:ring-violet-500 resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-1.5">Priority</label>
                        <select
                            value={priority} onChange={e => setPriority(e.target.value as Priority)}
                            className="w-full bg-[#111827] border border-[#374151] rounded-lg p-2.5 text-white focus:ring-1 focus:ring-violet-500"
                        >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="CRITICAL">Critical</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-[#374151] mt-2">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-300 hover:text-white hover:bg-[#374151] rounded-lg">Cancel</button>
                        <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-lg disabled:opacity-50">Create Task</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
