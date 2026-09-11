import type { Metadata } from "next";
import Link from "next/link";

import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-slate-500">
          Access your real estate lead workspace.
        </p>

        <div className="mt-6">
          <SignInForm />
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          No account yet?{" "}
          <Link href="/sign-up" className="font-medium text-slate-900 underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
