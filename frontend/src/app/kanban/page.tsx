'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useKanbanStore } from '@/store/kanban';
import { KanbanColumnDrop } from '@/components/kanban/KanbanColumn';
import { KanbanCard } from '@/components/kanban/KanbanCard';
import { NewTaskModal } from '@/components/kanban/NewTaskModal';
import { Plus, LayoutList } from 'lucide-react';
import type { KanbanTask, KanbanColumn } from '@/types';

const COLUMNS: { id: KanbanColumn; title: string }[] = [
    { id: 'backlog', title: 'Backlog' },
    { id: 'planned', title: 'Planned' },
    { id: 'ongoing', title: 'Ongoing' },
    { id: 'done', title: 'Done' }
];

export default function KanbanPage() {
    const { tasks, load, loading, moveTask } = useKanbanStore();
    const [showModal, setShowModal] = useState(false);
    const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);

    useEffect(() => {
        load();
    }, [load]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const columnTasks = useMemo(() => {
        return COLUMNS.map(col => ({
            column: col,
            tasks: tasks.filter(t => t.column === col.id)
        }));
    }, [tasks]);

    const handleDragStart = (e: DragStartEvent) => {
        const { active } = e;
        setActiveTask(active.data.current?.task as KanbanTask || null);
    };

    const handleDragEnd = (e: DragEndEvent) => {
        setActiveTask(null);
        const { active, over } = e;
        if (!over) return;

        // Sort logic isn't fully robust here without persisting array position, but column change is:
        const activeData = active.data.current?.task as KanbanTask;
        let newColumn: KanbanColumn | null = null;

        // Dropped on a column directly
        if (over.data.current?.type === 'Column') {
            newColumn = over.data.current.column.id;
        }
        // Dropped over another task
        else if (over.data.current?.type === 'Task') {
            newColumn = (over.data.current.task as KanbanTask).column;
        }

        if (newColumn && activeData && newColumn !== activeData.column) {
            moveTask(activeData.id, newColumn);
        }
    };

    if (loading) return <div className="p-8 text-white">Loading Kanban...</div>;

    return (
        <div className="h-screen flex flex-col p-8 w-full bg-[#09090b]">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
                        <LayoutList size={28} className="text-violet-500" />
                        Agent Kanban Board
                    </h1>
                    <p className="text-gray-400 text-sm mt-1 ml-10">
                        Agents can automatically pick up and move tasks assigned to them here.
                    </p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-lg font-bold transition-all shadow-lg"
                >
                    <Plus size={18} /> Add Task
                </button>
            </div>

            <div className="flex-1 flex gap-6 overflow-x-auto pb-6" style={{ scrollbarWidth: 'thin' }}>
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    {columnTasks.map(({ column, tasks }) => (
                        <KanbanColumnDrop key={column.id} column={column} tasks={tasks} />
                    ))}

                    <DragOverlay>
                        {activeTask ? <div className="rotate-2 scale-105 opacity-90"><KanbanCard task={activeTask} /></div> : null}
                    </DragOverlay>
                </DndContext>
            </div>

            {showModal && (
                <NewTaskModal onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); load(); }} />
            )}
        </div>
    );
}
