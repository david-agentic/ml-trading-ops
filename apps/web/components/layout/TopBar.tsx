'use client';

import { Bell, ChevronDown, LogOut, User as UserIcon } from 'lucide-react';
import * as React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Portal {
  label: string;
  href: string;
}

interface TopBarProps {
  userName: string;
  /** Portals the current user has access to — omit or pass a single entry to hide the switcher. */
  portals?: Portal[];
  onLogout: () => void;
  /** Left-side slot for a mobile hamburger trigger (AdminMobileDrawer) — omitted on desktop-nav portals. */
  leftSlot?: React.ReactNode;
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function TopBar({ userName, portals, onLogout, leftSlot }: TopBarProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-2">{leftSlot}</div>

      <div className="flex items-center gap-2">
        {portals && portals.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1">
                {portals[0]?.label}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {portals.map((portal) => (
                <DropdownMenuItem key={portal.href} asChild>
                  <a href={portal.href}>{portal.label}</a>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Inert placeholder — push notifications are disabled until Phase 9 (CLAUDE.md §15.1). */}
        <Button variant="ghost" size="icon" aria-label="Notifications" disabled>
          <Bell className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="User menu">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials(userName)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{userName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/profile">
                <UserIcon className="mr-2 h-4 w-4" />
                My Profile
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
