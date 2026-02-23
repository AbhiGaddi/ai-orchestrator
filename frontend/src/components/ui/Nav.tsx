'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, LayoutDashboard, CheckSquare, Upload, Moon, Sun } from 'lucide-react';

const links = [
    { href: '/projects', label: 'Projects', icon: LayoutDashboard }, // Assuming LayoutDashboard for Projects
    { href: '/extract', label: 'Extract Tasks', icon: Upload },
    { href: '/tasks', label: 'Task Review', icon: CheckSquare },
    { href: '/dashboard', label: 'Agent Dashboard', icon: LayoutDashboard },
];

export default function Nav() {
    const pathname = usePathname();
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');

    useEffect(() => {
        const saved = localStorage.getItem('theme-mode') as 'light' | 'dark';
        if (saved) {
            setTheme(saved);
            document.documentElement.setAttribute('data-theme', saved);
        }
    }, []);

    const toggleTheme = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme-mode', next);
    };

    return (
        <nav className="nav">
            <div className="nav-inner">
                <Link href="/" className="nav-logo">
                    <div className="nav-logo-icon">
                        <Bot size={18} color="#fff" />
                    </div>
                    AI Orchestrator
                </Link>
                <div className="nav-links">
                    {links.map(({ href, label, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            className={`nav-link ${pathname.startsWith(href) ? 'active' : ''}`}
                        >
                            <Icon size={15} />
                            {label}
                        </Link>
                    ))}
                </div>
                <div className="nav-spacer" />

                {/* Theme Toggle Button */}
                <button
                    onClick={toggleTheme}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}
                    title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                >
                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                </button>

                <div className="nav-badge" style={{ marginLeft: 16 }}>
                    <span className="nav-badge-dot" />
                    Phase 2 Live
                </div>
            </div>
        </nav>
    );
}
