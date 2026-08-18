import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'PNG School Management System',
  description: 'Cloud-based multi-tenant school management system for Papua New Guinea',
  keywords: ['school management', 'PNG education', 'student attendance', 'academic records'],
  authors: [{ name: 'PNG SMS Team' }],
  openGraph: {
    title: 'PNG School Management System',
    description: 'Digitizing PNG Education - Cloud-based school management platform',
    type: 'website',
    locale: 'en_US',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--bg-primary)]">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
