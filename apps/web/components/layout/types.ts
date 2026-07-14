import type { LucideIcon } from 'lucide-react';

/** Shared nav-item shape for Sidebar, MobileBottomTabBar, and AdminMobileDrawer. */
export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}
