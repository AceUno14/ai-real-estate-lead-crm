import type { Metadata } from "next";
import Link from "next/link";

import { MobileMenu } from "@/components/ui/mobile-menu";
import { SidebarNavLinks } from "@/components/ui/nav-links";
import { SignOutButton } from "@/components/ui/sign-out-button";
import { requireActiveOrganization } from "@/server/auth/organization";
import { getSessionUser } from "@/server/auth/session";

export const metadata: Metadata = {
  title: {
    default: "Dashboard",
    template: "%s | AI Real Estate Lead CRM",
  },
};

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Server-side tenant guard: unauthenticated users are redirected to
  // sign-in; authenticated users without a membership to /no-organization.
  const organization = await requireActiveOrganization();
  const user = await getSessionUser();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar — deep navy, fixed to the left */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-sidebar md:flex">
        <div className="border-b border-sidebar-line px-5 py-4">
          <Link
            href="/dashboard"
            className="focus-light flex items-center gap-2.5 rounded-md"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white/10">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4 text-white"
                aria-hidden="true"
              >
                <path d="M3 10.5 12 4l9 6.5" />
                <path d="M5 9.5V20h14V9.5" />
                <path d="M10 20v-5h4v5" />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-sidebar-text-strong">
                Lead Estate
              </span>
              <span className="block text-[11px] leading-4 text-sidebar-text">
                Sales operations
              </span>
            </span>
          </Link>
        </div>

        <nav aria-label="Primary" className="flex-1 space-y-1 overflow-y-auto p-3">
          <SidebarNavLinks variant="desktop" />
        </nav>

        <div className="border-t border-sidebar-line p-3">
          <div className="flex items-center gap-3 rounded-md px-2 py-1.5">
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-sidebar-text-strong"
            >
              {(user?.name ?? user?.email ?? "A").slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-text-strong">
                {user?.name || "Agent"}
              </p>
              <p className="truncate text-xs text-sidebar-text">
                {organization.name}
              </p>
            </div>
          </div>
          <div className="mt-1 px-1 pb-1">
            <SignOutButton />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:pl-64">
        {/* Mobile header — compact, navy */}
        <header className="flex items-center justify-between bg-sidebar px-3 py-2 md:hidden">
          <div className="flex items-center gap-2">
            <MobileMenu
              organizationName={organization.name}
              userName={user?.name || user?.email || ""}
            />
            <Link
              href="/dashboard"
              className="focus-light rounded-md text-sm font-semibold text-sidebar-text-strong"
            >
              Lead Estate
            </Link>
          </div>
          <SignOutButton />
        </header>

        {/* Content column */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
