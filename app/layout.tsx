import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'DataRecord ChannelRx',
  description: '医疗器械经销商渠道健康度智能分析平台',
};

const NAV = [
  { href: '/dashboard', label: '渠道总览' },
  { href: '/dealers', label: '经销商' },
  { href: '/risks', label: '风险预警' },
  { href: '/reports', label: 'AI 报告' },
  { href: '/import', label: '数据导入' },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-background font-sans text-foreground">
        <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--primary))] text-sm font-bold text-[hsl(var(--primary-foreground))]">
                R
              </span>
              <span className="text-sm font-semibold tracking-wide">
                DataRecord <span className="text-[hsl(var(--primary))]">ChannelRx</span>
              </span>
            </Link>
            <nav className="flex items-center gap-1">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
