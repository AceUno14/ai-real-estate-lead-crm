"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  LayoutDashboard,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/settings", label: "Settings", icon: Settings },
];

/**
 * Primary navigation links shared by the desktop sidebar and the mobile
 * drawer. The active route is resolved from the router path so both
 * variants highlight correctly.
 */
export function SidebarNavLinks({
  variant,
}: {
  variant: "desktop" | "mobile";
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              variant === "desktop"
                ? `focus-light flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-sidebar-active text-white"
                      : "text-sidebar-text hover:bg-sidebar-raised hover:text-sidebar-text-strong"
                  }`
                : `flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-base font-medium ${
                    active
                      ? "bg-sidebar-active text-white"
                      : "text-sidebar-text-strong/90 hover:bg-sidebar-raised"
                  }`
            }
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
