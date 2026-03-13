'use client';

import React, { useEffect, useState } from 'react';

export function KeyboardShortcuts() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only trigger if not typing in an input or textarea
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            if (e.key === '?') {
                e.preventDefault();
                setIsOpen(true);
            }

            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl shadow-2xl max-w-lg w-full overflow-hidden text-gray-200">
                <div className="p-4 border-b border-[#1e293b] flex justify-between items-center bg-[#1e293b]/50">
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                        Keyboard Shortcuts
                    </h2>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-gray-400 hover:text-white px-2 py-1 rounded-md transition-colors"
                    >
                        Esc
                    </button>
                </div>

                <div className="p-6">
                    <div className="space-y-4">
                        <ShortcutRow keys={['?']} description="Show this shortcuts menu" />
                        <ShortcutRow keys={['/']} description="Focus command bar (in Agent Terminal)" />
                        <ShortcutRow keys={['Cmd', 'K']} description="Open Command Palette (Coming soon)" />
                        <ShortcutRow keys={['Cmd', 'N']} description="Create New Agent" />
                        <ShortcutRow keys={['Esc']} description="Close modals / Unfocus menus" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function ShortcutRow({ keys, description }: { keys: string[], description: string }) {
    return (
        <div className="flex justify-between items-center py-2 border-b border-[#1e293b] last:border-0 last:pb-0">
            <span className="text-sm text-gray-400">{description}</span>
            <div className="flex gap-2">
                {keys.map((k, i) => (
                    <kbd key={i} className="px-2 py-1 bg-[#1e293b] border border-[#334155] rounded-md text-xs font-mono font-medium shadow-sm flex items-center justify-center min-w-[28px]">
                        {k}
                    </kbd>
                ))}
            </div>
        </div>
    );
}
