import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/ui/Nav';

export const metadata: Metadata = {
  title: 'Flow — AI Workspace Engine',
  description: 'Multi-Phase AI Pipeline: Discussion → Tasks → GitHub → SonarQube → Notification',
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
