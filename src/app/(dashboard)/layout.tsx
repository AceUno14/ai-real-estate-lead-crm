import type { Metadata } from "next";
import Link from "next/link";

import { requireActiveOrganization } from "@/server/auth/organization";
import { SignOutButton } from "@/components/ui/sign-out-button";

export const metadata: Metadata = {
  title: {
    default: "Dashboard",
    template: "%s | AI Real Estate Lead CRM",
  },
};

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/tasks", label: "Tasks" },
  { href: "/settings", label: "Settings" },
];

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Server-side tenant guard: unauthenticated users are redirected to
  // sign-in; authenticated users without a membership to /no-organization.
  const organization = await requireActiveOrganization();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white md:block">
        <div className="px-6 py-5">
          <p className="text-sm font-semibold">AI Real Estate Lead CRM</p>
          <p className="mt-1 text-xs text-slate-500">{organization.name}</p>
        </div>
        <nav className="mt-2 space-y-1 px-3">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <nav className="space-x-4 md:hidden">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-slate-700"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">
              {organization.name}
            </span>
            <SignOutButton />
          </div>
        </header>

        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
