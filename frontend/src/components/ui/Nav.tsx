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
                    type="button"
                    onClick={toggleTheme}
                    className="nav-theme-toggle"
                    title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                    aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                <div className="nav-badge" style={{ marginLeft: 16 }}>
                    <span className="nav-badge-dot" />
                    Phase 2 Live
                </div>
            </div>
        </nav>
    );
}
