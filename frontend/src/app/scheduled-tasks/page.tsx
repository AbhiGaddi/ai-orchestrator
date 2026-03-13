'use client';

import React, { useEffect } from 'react';
import { useScheduledStore } from '@/store/scheduled';
import { CalendarClock, Plus, Play, Trash2, Power } from 'lucide-react';

export default function ScheduledTasksPage() {
    const { tasks, load, loading, toggleTask, runTaskNow, deleteTask } = useScheduledStore();

    useEffect(() => {
        load();
    }, [load]);

    if (loading) return <div className="p-8 text-white">Loading Scheduled Tasks...</div>;

    return (
        <div className="h-screen flex flex-col p-8 w-full bg-[#09090b]">

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
                        <CalendarClock size={28} className="text-violet-500" />
                        Scheduled Tasks
                    </h1>
                    <p className="text-gray-400 text-sm mt-1 ml-10">
                        Define Cron-based autonomous background jobs.
                    </p>
                </div>
                <button
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-lg font-bold transition-all shadow-lg shadow-violet-500/20 active:scale-95"
                >
                    <Plus size={18} /> Add Schedule
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
                {tasks.length === 0 ? (
                    <div className="text-center p-12 bg-[#1f2937] border border-[#374151] rounded-xl flex flex-col items-center justify-center">
                        <CalendarClock size={48} className="text-gray-500 mb-4 opacity-50" />
                        <h3 className="text-gray-300 font-bold mb-1">No scheduled tasks</h3>
                        <p className="text-gray-500 text-sm">Create a cron job to automatically spawn agents periodically.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {tasks.map(task => (
                            <div key={task.id} className="bg-[#111827] border border-[#374151] rounded-lg p-4 flex flex-col gap-3 transition-all hover:border-[#4b5563]">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => toggleTask(task.id, !task.enabled)}
                                            className={`p-1.5 rounded-full transition-colors ${task.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#374151] text-gray-400'}`}
                                            title={task.enabled ? "Disable" : "Enable"}
                                        >
                                            <Power size={18} />
                                        </button>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono bg-[#1f2937] text-violet-400 px-2 py-0.5 rounded text-xs border border-violet-500/20">
                                                    {task.schedule_cron}
                                                </span>
                                                <span className="bg-[#1f2937] text-gray-400 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                                                    {task.model}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => runTaskNow(task.id)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1f2937] hover:bg-violet-600 hover:text-white text-gray-300 text-xs font-semibold rounded transition-colors"
                                            title="Run Now"
                                        >
                                            <Play size={14} /> Run
                                        </button>
                                        <button
                                            onClick={() => { if (window.confirm('Delete scheduled task?')) deleteTask(task.id); }}
                                            className="p-1.5 bg-[#1f2937] hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="pl-11 pr-2">
                                    <p className="text-gray-200 text-sm line-clamp-2">{task.prompt}</p>
                                    <p className="text-gray-500 text-xs mt-1 font-mono truncate">{task.project_path}</p>
                                </div>

                                <div className="pl-11 flex gap-4 text-xs text-gray-500 border-t border-[#1f2937] pt-2 mt-1">
                                    <span>Last run: {task.last_run ? new Date(task.last_run).toLocaleString() : 'Never'}</span>
                                    {task.last_output && <span className="text-emerald-500 max-w-[400px] truncate">Result: {task.last_output}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
}
