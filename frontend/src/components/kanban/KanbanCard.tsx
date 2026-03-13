import React, { useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, GripVertical, UserPlus, FileWarning } from 'lucide-react';
import type { KanbanTask } from '@/types';
import { useAgentsStore } from '@/store/agents';
import { useKanbanStore } from '@/store/kanban';

export function KanbanCard({ task }: { task: KanbanTask }) {
    const { agents } = useAgentsStore();
    const { assignTask, deleteTask } = useKanbanStore();

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: task.id,
        data: { type: 'Task', task }
    });

    const style = {
        transition,
        transform: CSS.Transform.toString(transform),
    };

    const priorityColors = {
        LOW: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
        MEDIUM: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
        HIGH: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
        CRITICAL: 'text-red-400 bg-red-400/10 border-red-400/20',
    };

    const assignedAgent = useMemo(() => {
        return agents.find(a => a.id === task.assigned_agent_id);
    }, [agents, task.assigned_agent_id]);

    if (isDragging) {
        return (
            <div
                ref={setNodeRef} style={style}
                className="w-full h-32 bg-[#1f2937]/50 border-2 border-violet-500/50 border-dashed rounded-lg"
            />
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group bg-[#111827] border border-[#374151] rounded-lg p-3 cursor-default hover:border-[#4b5563] transition-colors relative flex flex-col gap-2 shadow-sm`}
        >
            <div className="flex items-start gap-2 h-full">
                {/* Drag Handle */}
                <div
                    {...attributes} {...listeners}
                    className="text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing pb-4"
                >
                    <GripVertical size={16} />
                </div>

                {/* Card Content */}
                <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${priorityColors[task.priority]}`}>
                            {task.priority}
                        </span>
                        <button
                            onClick={() => deleteTask(task.id)}
                            className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>

                    <h4 className="font-semibold text-gray-200 text-sm mb-1 break-words line-clamp-2">
                        {task.title}
                    </h4>

                    {task.description && (
                        <p className="text-xs text-gray-400 line-clamp-2 pr-1">
                            {task.description}
                        </p>
                    )}

                    {/* Progress Bar (if task is ongoing/done) */}
                    {(task.column === 'ongoing' || task.column === 'done') && (
                        <div className="mt-2.5">
                            <div className="flex justify-between text-[10px] text-gray-400 mb-1 font-medium">
                                <span>Progress</span>
                                <span>{task.progress}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-[#1f2937] border border-[#374151] rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-300 ${task.progress === 100 ? 'bg-emerald-500' : 'bg-violet-500'}`}
                                    style={{ width: `${task.progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Agent Assignment Dropdown */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#374151]">
                        {assignedAgent ? (
                            <div
                                className={`flex gap-1.5 items-center text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${assignedAgent.status === 'error' ? 'text-red-400 border-red-500/30 bg-red-500/10' :
                                        assignedAgent.status === 'completed' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
                                            'text-violet-400 border-violet-500/30 bg-violet-500/10'
                                    }`}
                            >
                                {assignedAgent.status === 'error' && <FileWarning size={10} />}
                                {assignedAgent.name}
                            </div>
                        ) : (
                            <span className="text-[10.5px] italic text-gray-500">Unassigned</span>
                        )}

                        <select
                            value={task.assigned_agent_id || ''}
                            onChange={(e) => assignTask(task.id, e.target.value)}
                            className="bg-transparent border-none text-[10.5px] outline-none text-gray-500 hover:text-gray-300 cursor-pointer w-auto pl-1"
                        >
                            <option value="" className="bg-[#1f2937]">Assign to...</option>
                            {agents.map(a => (
                                <option key={a.id} value={a.id} className="bg-[#1f2937]">{a.name} ({a.model})</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
}
