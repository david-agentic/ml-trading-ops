'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { NavItem } from './types';

interface SidebarProps {
  /** Full logo (icon + wordmark) or icon-only, swapped based on collapsed state by the caller. */
  logoSlot: React.ReactNode;
  navItems: NavItem[];
  className?: string;
}

/**
 * Desktop-only (hidden below md — see MobileBottomTabBar/AdminMobileDrawer
 * for the mobile equivalents, per CLAUDE.md §15.1's adaptive-nav rule).
 * Shared across portals; only Admin uses it in Phase 1.
 */
export function Sidebar({ logoSlot, navItems, className }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <aside
      className={cn(
        'hidden md:flex md:flex-col border-r bg-background transition-all duration-200',
        collapsed ? 'md:w-16' : 'md:w-64',
        className,
      )}
    >
      <div className="flex h-16 items-center justify-between border-b px-4">
        <div className={cn('overflow-hidden', collapsed && 'w-0')}>{logoSlot}</div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
