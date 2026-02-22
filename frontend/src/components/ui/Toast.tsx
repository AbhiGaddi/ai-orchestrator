'use client';
import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
    id: string;
    type: ToastType;
    message: string;
}

let addToastFn: ((type: ToastType, message: string) => void) | null = null;

export function toast(type: ToastType, message: string) {
    addToastFn?.(type, message);
}

const icons = { success: CheckCircle, error: XCircle, info: Info };
const colors = { success: '#10b981', error: '#ef4444', info: '#3b82f6' };

export default function ToastContainer() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    useEffect(() => {
        addToastFn = (type, message) => {
            const id = Math.random().toString(36).slice(2);
            setToasts(prev => [...prev, { id, type, message }]);
            setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
        };
        return () => { addToastFn = null; };
    }, []);

    return (
        <div className="toast-container">
            {toasts.map(t => {
                const Icon = icons[t.type];
                return (
                    <div key={t.id} className={`toast toast-${t.type}`}>
                        <Icon size={18} color={colors[t.type]} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span style={{ color: 'var(--text-primary)', flex: 1 }}>{t.message}</span>
                        <button
                            onClick={() => setToasts(prev => prev.filter(i => i.id !== t.id))}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}
                        >
                            <X size={14} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
