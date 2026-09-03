import React from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#151513] text-[#F2EDE3] flex flex-col justify-between p-4 sm:p-6 md:p-8">
      {/* Brand Header */}
      <header className="flex items-center justify-between max-w-6xl w-full mx-auto py-2">
        <Link href="/login" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#B89A62]/15 border border-[#B89A62]/30 flex items-center justify-center text-[#B89A62]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="font-semibold text-base tracking-tight text-[#F2EDE3]">RecoverIQ</span>
            <span className="block text-[10px] text-[#817A70] tracking-wider uppercase font-mono">Autonomous Revenue Recovery</span>
          </div>
        </Link>
        <div className="text-xs font-mono text-[#817A70]">
          v1.0 • Enterprise Auth
        </div>
      </header>

      {/* Main Form Container */}
      <main className="flex-1 flex items-center justify-center py-10">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto py-4 text-center text-xs text-[#817A70] border-t border-[rgba(242,237,227,0.06)]">
        <span>Protected by RecoverIQ Zero-Double-Billing Policy Engine & Deterministic Guardrails</span>
      </footer>
    </div>
  );
}
