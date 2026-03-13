import React, { useMemo } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import type { KanbanTask, KanbanColumn } from '@/types';
import { KanbanCard } from './KanbanCard';

interface Props {
    column: { id: KanbanColumn; title: string };
    tasks: KanbanTask[];
}

export function KanbanColumnDrop({ column, tasks }: Props) {
    const taskIds = useMemo(() => tasks.map(t => t.id), [tasks]);

    const { setNodeRef } = useDroppable({
        id: column.id,
        data: { type: 'Column', column }
    });

    const getHeaderColor = () => {
        switch (column.id) {
            case 'backlog': return 'border-gray-500/30 text-gray-400';
            case 'planned': return 'border-sky-500/30 text-sky-400';
            case 'ongoing': return 'border-violet-500/30 text-violet-400';
            case 'done': return 'border-emerald-500/30 text-emerald-400';
            default: return 'border-gray-500/30 text-gray-400';
        }
    };

    return (
        <div className="flex flex-col bg-[#1f2937] rounded-xl border border-[#374151] w-[280px] flex-shrink-0 h-full overflow-hidden shadow-lg">

            {/* Column Header */}
            <div className={`p-4 font-bold tracking-wide uppercase text-sm border-b flex justify-between items-center ${getHeaderColor()} bg-[#111827]/50`}>
                {column.title}
                <span className="bg-[#374151] text-gray-300 rounded px-2 py-0.5 text-[10px]">
                    {tasks.length}
                </span>
            </div>

            {/* Droppable Area */}
            <div
                ref={setNodeRef}
                className="p-3 flex flex-col gap-3 flex-1 overflow-y-auto"
                style={{ scrollbarWidth: 'none' }}
            >
                <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                    {tasks.map(task => (
                        <KanbanCard key={task.id} task={task} />
                    ))}
                </SortableContext>

                {tasks.length === 0 && (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-gray-500 italic text-sm text-center px-4 py-8 border-2 border-dashed border-[#374151] rounded-lg w-full">
                            Drop tasks here
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}
