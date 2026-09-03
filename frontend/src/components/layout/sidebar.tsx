'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShieldAlert,
  Bot,
  ScrollText,
  Award,
  Zap,
  Shield,
  LogOut,
  UserCheck,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SystemStatusDrawer } from './system-status-drawer';
import { useAuth } from '@/contexts/auth-context';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  adminOnly?: boolean;
}

const baseNavItems: NavItem[] = [
  { label: 'Command Center', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Risk Cases', href: '/recovery-cases', icon: ShieldAlert },
  { label: 'AI Decisions & Safety', href: '/ai-decisions', icon: Bot },
  { label: 'Audit Trail', href: '/audit', icon: ScrollText },
  { label: 'Benchmark & Evaluation', href: '/evaluation', icon: Award },
  { label: 'Admin Console', href: '/admin', icon: Shield, badge: 'ADMIN', adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, isReady, logout } = useAuth();

  // Hide sidebar on authentication pages and unauthorized page
  if (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password' ||
    pathname === '/unauthorized'
  ) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch {
      window.location.href = '/login';
    }
  };

  const navItems = baseNavItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className="w-64 flex-shrink-0 bg-[#181714] border-r border-[rgba(242,237,227,0.08)] flex flex-col justify-between h-screen sticky top-0 overflow-y-auto overflow-x-hidden">
      {/* Brand Header */}
      <div>
        <div className="p-4 sm:p-5 border-b border-[rgba(242,237,227,0.08)]">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B89A62] rounded-md p-1 -m-1"
          >
            <div className="w-7 h-7 rounded-md bg-[#B89A62] flex items-center justify-center text-[#151513] font-bold transition-transform duration-150 group-hover:scale-[1.03]">
              <Zap className="w-4 h-4 fill-[#151513]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm tracking-tight text-[#F2EDE3]">
                  Recover<span className="text-[#D1B982]">IQ</span>
                </span>
                <span className="text-[10px] font-mono font-medium uppercase px-1.5 py-0.5 rounded bg-[#B89A62]/10 text-[#D1B982] border border-[#B89A62]/20">
                  Agent
                </span>
              </div>
              <p className="text-[11px] text-[#817A70] font-mono">Autonomous Revenue Recovery</p>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-0.5">
          <div className="px-3 py-2 text-[10px] font-mono font-medium uppercase tracking-wider text-[#817A70]">
            Operations
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/' || pathname === '/dashboard'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all duration-150 ease-out group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B89A62]',
                  isActive
                    ? 'bg-[#24221E] text-[#F2EDE3] font-semibold border border-[rgba(242,237,227,0.08)]'
                    : 'text-[#B7B0A3] hover:text-[#F2EDE3] hover:bg-[#201F1B] border border-transparent'
                )}
              >
                <div className="flex items-center gap-2.5">
                  {/* Subtle active left bar indicator */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[#B89A62] rounded-r-sm" />
                  )}
                  <Icon
                    className={cn(
                      'w-3.5 h-3.5 transition-colors duration-150',
                      isActive
                        ? 'text-[#D1B982]'
                        : 'text-[#817A70] group-hover:text-[#B7B0A3]'
                    )}
                  />
                  <span className={cn(isActive ? 'text-[#F2EDE3]' : 'text-[#B7B0A3]')}>
                    {item.label}
                  </span>
                </div>
                {item.badge && (
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded font-mono',
                    item.adminOnly
                      ? 'bg-[#B89A62]/15 text-[#D1B982] border border-[#B89A62]/30'
                      : 'bg-[#181714] text-[#817A70]'
                  )}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Area: User Card + Telemetry Drawer */}
      <div className="space-y-2">
        {/* User Card */}
        {isReady && user && (
          <div className="mx-2.5 p-2.5 rounded-lg bg-[#1C1B18] border border-[rgba(242,237,227,0.08)] flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-[#24221E] border border-[rgba(242,237,227,0.10)] flex items-center justify-center text-[11px] font-semibold text-[#B89A62] shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <div className="text-xs font-medium text-[#F2EDE3] truncate">{user.name}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span
                    className={cn(
                      'inline-flex items-center gap-0.5 text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border',
                      user.role === 'admin'
                        ? 'bg-[#B89A62]/15 text-[#D1B982] border-[#B89A62]/30'
                        : 'bg-[#71879A]/15 text-[#A2B5C6] border-[#71879A]/30'
                    )}
                  >
                    {user.role === 'admin' ? <Lock className="w-2 h-2" /> : <UserCheck className="w-2 h-2" />}
                    {user.role}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="text-[#817A70] hover:text-[#B56F68] p-1.5 rounded hover:bg-[#24221E] transition-colors shrink-0"
              title="Sign out of RecoverIQ"
              aria-label="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Real-time Subsystem Telemetry */}
        <SystemStatusDrawer />
      </div>
    </aside>
  );
}

