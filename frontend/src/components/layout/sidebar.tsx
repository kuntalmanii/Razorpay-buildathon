'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShieldAlert,
  Bot,
  ScrollText,
  Award,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SystemStatusDrawer } from './system-status-drawer';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: NavItem[] = [
  { label: 'Command Center', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Risk Cases', href: '/recovery-cases', icon: ShieldAlert },
  { label: 'AI Decisions & Safety', href: '/ai-decisions', icon: Bot },
  { label: 'Audit Trail', href: '/audit', icon: ScrollText },
  { label: 'Benchmark & Evaluation', href: '/evaluation', icon: Award },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 bg-[#0F1117] border-r border-[#1E232E] flex flex-col justify-between h-screen sticky top-0">
      {/* Brand Header */}
      <div>
        <div className="p-6 border-b border-[#1E232E]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-stone-950 font-bold shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <Zap className="w-4 h-4 fill-stone-950" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-stone-100">
                  Recover<span className="text-amber-400">IQ</span>
                </span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Agent
                </span>
              </div>
              <p className="text-[11px] text-stone-400">Autonomous Revenue Recovery</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5">
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
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
                  'flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                  isActive
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-[#151922]'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      'w-4 h-4 transition-colors',
                      isActive
                        ? 'text-amber-400'
                        : 'text-stone-400 group-hover:text-stone-300'
                    )}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1F242E] text-stone-400 font-mono">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Real-time Subsystem Telemetry */}
      <SystemStatusDrawer />
    </aside>
  );
}
