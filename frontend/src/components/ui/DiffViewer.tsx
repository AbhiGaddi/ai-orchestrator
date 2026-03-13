'use client';
import React, { useState } from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { X, Save, Trash2, AlertTriangle } from 'lucide-react';

interface DiffFile {
    file: string;
    oldValue: string;
    newValue: string;
}

interface DiffViewerProps {
    taskId: string;
    diffs: DiffFile[];
    onClose: () => void;
    onCommit: (message: string) => void;
    onDiscard?: () => void;
}

export default function DiffViewer({ taskId, diffs, onClose, onCommit, onDiscard }: DiffViewerProps) {
    const [commitMessage, setCommitMessage] = useState(`Fix: implementation for task ${taskId}`);
    const [selectedFile, setSelectedFile] = useState<DiffFile | null>(diffs[0] || null);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8">
            <div className="bg-[#1f2937] w-full h-full max-w-6xl rounded-2xl border border-[#374151] flex flex-col overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-[#374151] flex items-center justify-between bg-[#111827]">
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                            Review Task Changes
                            <span className="text-xs bg-violet-500/20 text-violet-400 px-2 py-1 rounded-full border border-violet-500/30">
                                {diffs.length} {diffs.length === 1 ? 'File' : 'Files'} Changed
                            </span>
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">Review AI-generated changes before committing to your local repository.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-72 border-r border-[#374151] bg-[#111827]/50 overflow-y-auto p-4 flex flex-col gap-2">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-2 mb-2">Modified Files</h3>
                        {diffs.length === 0 ? (
                            <p className="text-xs text-gray-600 px-2">No file changes detected.</p>
                        ) : diffs.map((d) => (
                            <button
                                key={d.file}
                                onClick={() => setSelectedFile(d)}
                                className={`text-left px-4 py-3 rounded-lg text-sm transition-all border ${selectedFile?.file === d.file
                                    ? 'bg-violet-600/20 border-violet-500/50 text-white font-bold'
                                    : 'border-transparent text-gray-400 hover:bg-white/5'
                                    }`}
                            >
                                <div className="truncate mb-0.5">{d.file.split('/').pop()}</div>
                                <div className="text-[10px] text-gray-500 truncate">{d.file}</div>
                            </button>
                        ))}
                    </div>

                    {/* Main Diff Area */}
                    <div className="flex-1 bg-[#0d1117] overflow-auto relative">
                        {selectedFile ? (
                            <ReactDiffViewer
                                oldValue={selectedFile.oldValue}
                                newValue={selectedFile.newValue}
                                splitView={true}
                                useDarkTheme={true}
                                styles={{
                                    variables: {
                                        dark: {
                                            diffViewerBackground: '#0d1117',
                                            diffViewerColor: '#c9d1d9',
                                            addedBackground: '#2ea04326',
                                            addedColor: '#3fb950',
                                            removedBackground: '#f8514926',
                                            removedColor: '#f85149',
                                            wordAddedBackground: '#2ea0434d',
                                            wordRemovedBackground: '#f851494d',
                                            addedGutterBackground: '#2ea0431a',
                                            removedGutterBackground: '#f851491a'
                                        }
                                    }
                                }}
                                leftTitle="Original"
                                rightTitle="Agent Modified"
                            />
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500 italic">
                                {diffs.length === 0 ? 'No changes to display.' : 'Select a file to view changes.'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[#374151] bg-[#111827] flex items-center gap-6">
                    {onDiscard && (
                        <button
                            onClick={() => setShowDiscardConfirm(true)}
                            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-all font-bold text-sm"
                        >
                            <Trash2 size={16} />
                            Discard Changes
                        </button>
                    )}
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Commit Message</label>
                        <input
                            type="text"
                            value={commitMessage}
                            onChange={(e) => setCommitMessage(e.target.value)}
                            className="w-full bg-[#1f2937] border border-[#374151] rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                            placeholder="Describe your changes..."
                        />
                    </div>
                    <div className="flex gap-3 pt-6">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl border border-[#374151] text-white hover:bg-gray-800 transition-all font-bold"
                        >
                            Close
                        </button>
                        <button
                            onClick={() => onCommit(commitMessage)}
                            disabled={diffs.length === 0}
                            className="px-8 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-black transition-all flex items-center gap-2 shadow-lg shadow-violet-500/20"
                        >
                            <Save size={18} />
                            Commit Changes
                        </button>
                    </div>
                </div>
            </div>

            {/* Discard confirm dialog */}
            {showDiscardConfirm && (
                <div
                    className="absolute inset-0 z-60 flex items-center justify-center bg-black/60"
                    onClick={() => setShowDiscardConfirm(false)}
                >
                    <div
                        className="bg-[#141820] border border-[#374151] rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-5">
                            <AlertTriangle size={28} />
                        </div>
                        <h3 className="text-xl font-bold text-white text-center mb-2">Discard All Changes?</h3>
                        <p className="text-gray-400 text-sm text-center mb-1">
                            This will run <code className="text-red-400 bg-red-500/10 px-1 rounded">git reset --hard HEAD</code> and remove all agent-generated changes.
                        </p>
                        <p className="text-red-400 text-xs text-center mb-6 font-semibold">This cannot be undone.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDiscardConfirm(false)}
                                className="flex-1 py-2.5 rounded-xl border border-[#374151] text-gray-300 hover:bg-[#1f2937] transition-colors text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => { setShowDiscardConfirm(false); onDiscard?.(); }}
                                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors text-sm font-semibold"
                            >
                                Discard
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
