"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

/**
 * Compact sign-out control designed for the navy sidebar / mobile header:
 * quiet by default, clear on hover, with a comfortable tap target.
 */
export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => void signOut({ callbackUrl: "/" })}
      className="focus-light inline-flex min-h-11 items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium text-sidebar-text transition-colors hover:bg-sidebar-raised hover:text-sidebar-text-strong md:min-h-0 md:py-1.5"
    >
      <LogOut className="size-4 shrink-0" aria-hidden="true" />
      Sign out
    </button>
  );
}
