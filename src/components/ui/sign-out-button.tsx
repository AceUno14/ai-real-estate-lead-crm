"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => void signOut({ callbackUrl: "/" })}
      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
    >
      Sign out
    </button>
  );
}
