'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Bot, LayoutDashboard, CheckSquare, Moon, Sun,
    FolderOpen, Sparkles, Upload, Activity,
} from 'lucide-react';

const links = [
    {
        href: '/projects',
        label: 'Projects',
        icon: FolderOpen,
        desc: 'Manage project contexts',
        color: '#6366f1',
    },
    {
        href: '/extract',
        label: 'Extract',
        icon: Sparkles,
        desc: 'Paste a meeting transcript',
        color: '#a855f7',
    },
    {
        href: '/tasks',
        label: 'Tasks',
        icon: CheckSquare,
        desc: 'Approve and execute tasks',
        color: '#10b981',
    },
    {
        href: '/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        desc: 'Monitor agent activity',
        color: '#22d3ee',
    },
];

export default function Nav() {
    const pathname = usePathname();
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const [hoveredHref, setHoveredHref] = useState<string | null>(null);

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
        <nav className="nav">
            <div className="nav-inner">
                {/* Logo */}
                <Link href="/" className="nav-logo">
                    <div className="nav-logo-icon">
                        <Bot size={20} color="#fff" />
                    </div>
                    <span style={{ fontWeight: 900, fontSize: '1.4rem', letterSpacing: '-0.04em' }}>Flow</span>
                </Link>

                {/* Divider */}
                <div className="nav-divider" />

                {/* Nav Links */}
                <div className="nav-links">
                    {links.map(({ href, label, icon: Icon, desc, color }) => {
                        const isActive = pathname.startsWith(href);
                        const isHovered = hoveredHref === href;

                        return (
                            <div
                                key={href}
                                style={{ position: 'relative' }}
                                onMouseEnter={() => setHoveredHref(href)}
                                onMouseLeave={() => setHoveredHref(null)}
                            >
                                <Link
                                    href={href}
                                    className={`nav-link ${isActive ? 'active' : ''}`}
                                    style={{
                                        color: isActive ? color : undefined,
                                        background: isActive ? `${color}14` : undefined,
                                        borderBottom: isActive ? `2px solid ${color}` : '2px solid transparent',
                                        borderRadius: isActive ? '6px 6px 0 0' : undefined,
                                        gap: 6,
                                    }}
                                >
                                    <Icon
                                        size={18}
                                        color={isActive ? color : undefined}
                                        style={{ flexShrink: 0 }}
                                    />
                                    {label}
                                </Link>

                                {/* Hover tooltip card */}
                                {isHovered && !isActive && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 'calc(100% + 8px)',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        background: 'var(--bg-card)',
                                        border: `1px solid ${color}30`,
                                        borderRadius: 10,
                                        padding: '10px 14px',
                                        minWidth: 170,
                                        boxShadow: `0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px ${color}15`,
                                        zIndex: 200,
                                        pointerEvents: 'none',
                                        animation: 'fadeSlideIn 0.12s ease',
                                    }}>
                                        {/* Arrow */}
                                        <div style={{
                                            position: 'absolute',
                                            top: -5,
                                            left: '50%',
                                            transform: 'translateX(-50%) rotate(45deg)',
                                            width: 8,
                                            height: 8,
                                            background: 'var(--bg-card)',
                                            border: `1px solid ${color}25`,
                                            borderRight: 'none',
                                            borderBottom: 'none',
                                        }} />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <div style={{
                                                width: 24, height: 24, borderRadius: 6,
                                                background: `${color}18`,
                                                border: `1px solid ${color}30`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                flexShrink: 0,
                                            }}>
                                                <Icon size={12} color={color} />
                                            </div>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                {label}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                                            {desc}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="nav-spacer" />

                {/* Phase status badge */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px',
                    background: 'rgba(16,185,129,0.1)',
                    border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: 999,
                    marginRight: 12,
                }}>
                    <Activity size={11} color="#10b981" style={{ animation: 'pulse 2s infinite' }} />
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#10b981', letterSpacing: '0.04em' }}>
                        Phase 1–2 Live
                    </span>
                </div>

                {/* Theme Toggle */}
                <button
                    type="button"
                    onClick={toggleTheme}
                    className="nav-theme-toggle"
                    title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                    aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
            </div>

            <style>{`
                @keyframes fadeSlideIn {
                    from { opacity: 0; transform: translateX(-50%) translateY(-4px); }
                    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
            `}</style>
        </nav>
    );
}
