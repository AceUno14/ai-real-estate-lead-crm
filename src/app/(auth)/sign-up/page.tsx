import type { Metadata } from "next";
import Link from "next/link";

import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = {
  title: "Create account",
};

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold">Create account</h1>
        <p className="mt-1 text-sm text-slate-500">
          Set up your real estate lead workspace.
        </p>

        <div className="mt-6">
          <SignUpForm />
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-medium text-slate-900 underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
