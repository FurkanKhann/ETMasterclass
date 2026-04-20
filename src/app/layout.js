import './globals.css';
import { Shield } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Pragati Report Dashboard',
  description: 'AI Agent Masterclass Reporting tool',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="header">
          <Link href="/" className="brand">
            <Shield size={28} className="text-primary" style={{ color: '#3b82f6' }}/>
            Pragati Report
          </Link>
          <nav style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <Link href="/" style={{ color: '#cbd5e1', fontSize: '0.9rem', fontWeight: 500 }}>Dashboard</Link>
            <Link href="/login" style={{ color: '#cbd5e1', fontSize: '0.9rem', fontWeight: 500 }}>Admin Login</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
