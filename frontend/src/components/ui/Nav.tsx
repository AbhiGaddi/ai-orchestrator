'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Bot, CheckSquare, Moon, Sun,
    FolderOpen, Activity,
    Terminal, Zap, CalendarClock, BarChart3, Settings,
    Users, Brain
} from 'lucide-react';

const links = [
    { href: '/projects',       label: 'Projects',    icon: FolderOpen,    color: '#6366f1' },
    { href: '/tasks',          label: 'Tasks',       icon: CheckSquare,   color: '#10b981' },
    { href: '/agents',         label: 'Active Runs', icon: Terminal,      color: '#ec4899' },
    { href: '/profiles',       label: 'Profiles',    icon: Users,         color: '#f43f5e' },
    { href: '/skills',         label: 'Skills',      icon: Activity,      color: '#a855f7' },
    { href: '/automations',    label: 'Automations', icon: Zap,           color: '#eab308' },
    { href: '/scheduled-tasks',label: 'Scheduled',   icon: CalendarClock, color: '#8b5cf6' },
    { href: '/memory',         label: 'Memory',      icon: Brain,         color: '#0ea5e9' },
    { href: '/usage',          label: 'Usage',       icon: BarChart3,     color: '#6366f1' },
    { href: '/settings',       label: 'Settings',    icon: Settings,      color: '#64748b' },
];

export default function Nav() {
    const pathname = usePathname();
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');

    useEffect(() => {
        const saved = (localStorage.getItem('theme-mode') as 'light' | 'dark') || 'dark';
        setTheme(saved);
        document.documentElement.setAttribute('data-theme', saved);
        if (saved === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, []);

    const toggleTheme = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        document.documentElement.setAttribute('data-theme', next);
        document.documentElement.classList.toggle('dark', next === 'dark');
        localStorage.setItem('theme-mode', next);
    };

    return (
        <aside className="w-64 bg-[#09090b] border-r border-[#1f2937] flex flex-col h-full shrink-0 relative z-20">
            {/* Logo */}
            <div className="p-5 border-b border-[#1f2937] shrink-0">
                <Link href="/" className="flex items-center gap-3 decoration-transparent">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-violet-500 to-indigo-500 shadow-[0_0_14px_rgba(168,85,247,0.4)]">
                        <Bot size={20} className="text-white" />
                    </div>
                    <span className="font-black text-xl tracking-tight text-white hover:text-white">Flow</span>
                </Link>
            </div>

            {/* Links */}
            <div className="flex-1 overflow-y-auto py-5 px-3 space-y-1">
                {links.map(({ href, label, icon: Icon, color }) => {
                    const isActive = pathname.startsWith(href);

                    return (
                        <Link
                            key={href}
                            href={href}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors"
                            style={{
                                color: isActive ? color : 'var(--text-secondary)',
                                backgroundColor: isActive ? `${color}14` : 'transparent',
                            }}
                        >
                            <div className={`p-1 rounded-md ${isActive ? '' : 'text-gray-400 group-hover:text-gray-300'}`} style={{ backgroundColor: isActive ? `${color}20` : 'transparent' }}>
                                <Icon size={18} color={isActive ? color : undefined} className="shrink-0" />
                            </div>
                            <span className={`text-[0.95rem] font-medium ${isActive ? 'font-semibold' : ''}`} style={{ color: isActive ? color : undefined }}>
                                {label}
                            </span>
                        </Link>
                    );
                })}
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-[#1f2937] shrink-0 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                        <Activity size={12} className="text-emerald-500 animate-pulse" />
                        <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-500">
                            Phase 1-2
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={toggleTheme}
                        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#1f2937] transition-colors text-gray-400 hover:text-gray-200"
                        title="Toggle Theme"
                    >
                        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                </div>
            </div>
        </aside>
    );
}
