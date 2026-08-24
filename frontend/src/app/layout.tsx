import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import '@/styles/globals.css';
import { Sidebar } from '@/components/layout/sidebar';
import { JudgeDemoBar } from '@/components/demo/judge-demo-bar';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'RecoverIQ — Autonomous Revenue Recovery Platform',
  description:
    'AI-powered, deterministic payment recovery platform for Razorpay merchants.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0D0F12] text-[#F3F4F6] min-h-screen flex`}
      >
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
          {children}
        </div>
        <JudgeDemoBar />
      </body>
    </html>
  );
}
