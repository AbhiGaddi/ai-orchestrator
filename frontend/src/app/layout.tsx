import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/ui/Nav';
import { ThemeScript } from '@/components/ThemeScript';
import { KeyboardShortcuts } from '@/components/ui/KeyboardShortcuts';

export const metadata: Metadata = {
  title: 'Flow — AI Workspace Engine',
  description: 'Multi-Phase AI Pipeline: Discussion → Tasks → GitHub → SonarQube → Notification',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <div className="flex h-screen overflow-hidden">
          <Nav />
          <main className="flex-1 overflow-y-auto relative bg-[var(--bg-base)] text-[var(--text-primary)]">
            {children}
            <KeyboardShortcuts />
          </main>
        </div>
      </body>
    </html>
  );
}
