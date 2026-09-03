'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import {
  Users,
  Shield,
  Activity,
  Cpu,
  RefreshCw,
  Clock,
  UserCheck,
  Lock,
} from 'lucide-react';

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export default function AdminPage() {
  const { user, isAdmin, isReady } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isReady) {
      if (!user) {
        router.replace('/login');
      } else if (!isAdmin) {
        router.replace('/unauthorized');
      }
    }
  }, [isReady, user, isAdmin, router]);

  const fetchUsers = () => {
    setLoading(true);
    setError(null);
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/users`, {
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Access Denied`);
        return res.json();
      })
      .then((data) => {
        if (data.success && data.data?.users) {
          setUsers(data.data.users);
        }
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isReady && isAdmin) {
      fetchUsers();
    }
  }, [isReady, isAdmin]);

  if (!isReady || !isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-[#817A70] text-sm">
        <div className="flex items-center gap-2 font-mono">
          <div className="w-4 h-4 border-2 border-[#B89A62]/40 border-t-[#B89A62] rounded-full animate-spin" />
          <span>Verifying administrative authorization…</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header
        title="RecoverIQ Administrative Console"
        subtitle="System Governance • Operator Management • Policy Gates • Telemetry Auditing"
      />

      <main className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl">
        {/* Admin Overview KPI row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#1C1B18] border border-[rgba(242,237,227,0.08)]">
            <div className="flex items-center justify-between text-[#817A70] text-xs">
              <span className="flex items-center gap-1.5 font-medium uppercase tracking-wider">
                <Users className="w-4 h-4 text-[#B89A62]" /> Registered Users
              </span>
              <span className="font-mono text-xs text-[#6F9B7A] bg-[#6F9B7A]/10 px-1.5 py-0.5 rounded">Active</span>
            </div>
            <div className="text-2xl font-bold font-mono text-[#F2EDE3] mt-2">
              {users.length}
            </div>
            <div className="text-[11px] text-[#817A70] mt-1">
              Operators & System Administrators
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#1C1B18] border border-[rgba(242,237,227,0.08)]">
            <div className="flex items-center justify-between text-[#817A70] text-xs">
              <span className="flex items-center gap-1.5 font-medium uppercase tracking-wider">
                <Shield className="w-4 h-4 text-[#6F9B7A]" /> Policy Gate
              </span>
              <span className="font-mono text-xs text-[#6F9B7A] bg-[#6F9B7A]/10 px-1.5 py-0.5 rounded">Enforced</span>
            </div>
            <div className="text-2xl font-bold font-mono text-[#F2EDE3] mt-2">
              Zero-Double
            </div>
            <div className="text-[11px] text-[#817A70] mt-1">
              Deterministic verification before dispatch
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#1C1B18] border border-[rgba(242,237,227,0.08)]">
            <div className="flex items-center justify-between text-[#817A70] text-xs">
              <span className="flex items-center gap-1.5 font-medium uppercase tracking-wider">
                <Cpu className="w-4 h-4 text-[#71879A]" /> AI Reasoning
              </span>
              <span className="font-mono text-xs text-[#71879A] bg-[#71879A]/10 px-1.5 py-0.5 rounded">3-Tier</span>
            </div>
            <div className="text-2xl font-bold font-mono text-[#F2EDE3] mt-2">
              Structured
            </div>
            <div className="text-[11px] text-[#817A70] mt-1">
              Advisory &gt; Policy Validated &gt; Executed
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#1C1B18] border border-[rgba(242,237,227,0.08)]">
            <div className="flex items-center justify-between text-[#817A70] text-xs">
              <span className="flex items-center gap-1.5 font-medium uppercase tracking-wider">
                <Activity className="w-4 h-4 text-[#B89A62]" /> Security Scope
              </span>
              <span className="font-mono text-xs text-[#B89A62] bg-[#B89A62]/10 px-1.5 py-0.5 rounded">Strict</span>
            </div>
            <div className="text-2xl font-bold font-mono text-[#B89A62] mt-2">
              RBAC
            </div>
            <div className="text-[11px] text-[#817A70] mt-1">
              Role checks validated on every backend API
            </div>
          </div>
        </div>

        {/* User Management Table */}
        <div className="p-6 rounded-xl bg-[#1C1B18] border border-[rgba(242,237,227,0.08)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-[#F2EDE3] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#B89A62]" />
                System Users &amp; Roles
              </h2>
              <p className="text-xs text-[#817A70]">
                Governed via PostgreSQL users schema with bcrypt hashing and JWT claims
              </p>
            </div>
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#24221E] border border-[rgba(242,237,227,0.10)] text-xs text-[#B7B0A3] hover:text-[#F2EDE3] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {error ? (
            <div className="p-4 rounded-lg bg-[#B56F68]/10 border border-[#B56F68]/30 text-[#B56F68] text-xs">
              {error}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[rgba(242,237,227,0.06)]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#181714] border-b border-[rgba(242,237,227,0.06)] text-[#817A70] uppercase font-mono text-[10px]">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">User ID</th>
                    <th className="py-3 px-4">Registered At</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(242,237,227,0.04)] font-mono">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-[#201F1B] transition-colors">
                      <td className="py-3 px-4 font-sans font-medium text-[#F2EDE3]">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#24221E] border border-[rgba(242,237,227,0.10)] flex items-center justify-center text-[11px] font-semibold text-[#B89A62]">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div>{u.name}</div>
                            <div className="text-[11px] text-[#817A70] font-mono">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                            u.role === 'admin'
                              ? 'bg-[#B89A62]/10 text-[#D1B982] border-[#B89A62]/30'
                              : 'bg-[#71879A]/10 text-[#A2B5C6] border-[#71879A]/30'
                          }`}
                        >
                          {u.role === 'admin' ? <Lock className="w-2.5 h-2.5" /> : <UserCheck className="w-2.5 h-2.5" />}
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#817A70] text-[11px]">
                        {u.id}
                      </td>
                      <td className="py-3 px-4 text-[#817A70] text-[11px]">
                        <span className="flex items-center gap-1 font-sans">
                          <Clock className="w-3 h-3" />
                          {new Date(u.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-[#6F9B7A] bg-[#6F9B7A]/10 px-2 py-0.5 rounded text-[10px] font-semibold">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
