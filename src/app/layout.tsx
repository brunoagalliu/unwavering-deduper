import type { Metadata } from 'next';
import SessionProvider from '@/components/SessionProvider';
import { Navigation } from '@/components/Navigation';
import './globals.css';

export const metadata: Metadata = {
  title: 'Unwavering Deduper',
  description: 'Phone number deduplication system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <SessionProvider>
          <Navigation />
          <main>{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}