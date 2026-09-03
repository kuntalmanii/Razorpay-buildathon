'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldX, ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function UnauthorizedPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#151513] text-[#F2EDE3] flex items-center justify-center p-6">
      <div className="w-full max-w-md p-8 rounded-xl bg-[#1C1B18] border border-[#B56F68]/30 shadow-2xl space-y-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-[#B56F68]/15 border border-[#B56F68]/30 flex items-center justify-center text-[#B56F68] mx-auto">
          <ShieldX className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-[#F2EDE3] tracking-tight">403 — Unauthorized Access</h1>
          <p className="text-xs text-[#B7B0A3] leading-relaxed">
            Your account does not have sufficient authorization to view this resource. This event has been recorded in the RecoverIQ immutable audit trail.
          </p>
        </div>

        {user && (
          <div className="p-3.5 rounded-lg bg-[#181714] border border-[rgba(242,237,227,0.06)] text-left text-xs font-mono space-y-1">
            <div className="text-[#817A70]">Current Identity:</div>
            <div className="text-[#F2EDE3] font-medium">{user.email}</div>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[#817A70]">Assigned Role:</span>
              <span className="text-[#B68B4F] uppercase font-bold text-[11px] px-1.5 py-0.5 rounded bg-[#B68B4F]/10 border border-[#B68B4F]/20">
                {user.role}
              </span>
            </div>
          </div>
        )}

        <div className="pt-2 flex flex-col gap-2.5">
          <Link
            href="/dashboard"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#B89A62] text-[#151513] text-sm font-semibold hover:bg-[#D1B982] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>

          <button
            onClick={() => logout().then(() => window.location.href = '/login')}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#24221E] border border-[rgba(242,237,227,0.10)] text-[#B7B0A3] hover:text-[#F2EDE3] text-sm font-medium hover:bg-[#2A2823] transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Switch Account / Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
