'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, LayoutDashboard, CheckSquare, Upload } from 'lucide-react';

const links = [
    { href: '/extract', label: 'Extract', icon: Upload },
    { href: '/tasks', label: 'Tasks', icon: CheckSquare },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

export default function Nav() {
    const pathname = usePathname();
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
                <div className="nav-badge">
                    <span className="nav-badge-dot" />
                    Phase 1 Live
                </div>
            </div>
        </nav>
    );
}
