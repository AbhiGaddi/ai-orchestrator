import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'info';
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'info'
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#111827] border border-[#374151] rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-4 border-b border-[#374151] bg-[#1f2937]/50">
                    <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                        <AlertCircle size={18} className={variant === 'danger' ? 'text-red-500' : 'text-violet-500'} />
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-[#374151] rounded-lg text-gray-400 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4">
                    <p className="text-sm text-gray-300">
                        {message}
                    </p>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`${variant === 'danger'
                                    ? 'bg-red-600 hover:bg-red-700 shadow-red-500/10'
                                    : 'bg-violet-600 hover:bg-violet-700 shadow-violet-500/10'
                                } text-white px-6 py-2 rounded-lg text-sm font-bold transition-all shadow-lg`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
