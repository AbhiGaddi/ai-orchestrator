import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/ui/Nav';

export const metadata: Metadata = {
  title: 'AI Orchestrator — Multi-Phase AI Pipeline',
  description: 'Discussion → Tasks → GitHub Issue → Email → Code → Build → Deploy',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="dark">
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  );
}
