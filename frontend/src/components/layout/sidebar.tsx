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
    <aside className="w-64 flex-shrink-0 bg-[#181714] border-r border-[rgba(242,237,227,0.08)] flex flex-col justify-between h-screen sticky top-0">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-[rgba(242,237,227,0.08)]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#B89A62] flex items-center justify-center text-[#151513] font-bold shadow-none">
              <Zap className="w-4 h-4 fill-[#151513]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm tracking-tight text-[#F2EDE3]">
                  Recover<span className="text-[#D1B982]">IQ</span>
                </span>
                <span className="text-[10px] font-mono font-medium uppercase px-1.5 py-0.2 rounded bg-[#B89A62]/10 text-[#D1B982] border border-[#B89A62]/20">
                  Agent
                </span>
              </div>
              <p className="text-[11px] text-[#817A70] font-mono">Autonomous Revenue Recovery</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
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
                  'flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors group',
                  isActive
                    ? 'bg-[#B89A62]/10 text-[#D1B982] border border-[#B89A62]/25'
                    : 'text-[#B7B0A3] hover:text-[#F2EDE3] hover:bg-[#201F1B]'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={cn(
                      'w-3.5 h-3.5 transition-colors',
                      isActive
                        ? 'text-[#D1B982]'
                        : 'text-[#817A70] group-hover:text-[#B7B0A3]'
                    )}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#24221E] text-[#817A70] font-mono">
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
