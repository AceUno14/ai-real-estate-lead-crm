import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard, AuthShell } from "@/components/ui/auth-shell";

import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function SignInPage() {
  return (
    <AuthShell
      brand={
        <>
          <div>
            <p className="text-lg font-semibold tracking-tight text-sidebar-text-strong">
              Welcome back
            </p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-sidebar-text">
              Sign in to manage leads, follow-ups, and AI-qualified
              opportunities.
            </p>
          </div>
          <p className="text-xs text-sidebar-text">
            AI Real Estate Lead CRM — sales operations for agents and small
            teams.
          </p>
        </>
      }
      card={
        <AuthCard
          title="Sign in"
          description="Welcome back. Sign in to your lead workspace."
          footer={
            <>
              No account yet?{" "}
              <Link
                href="/sign-up"
                className="font-medium text-navy underline underline-offset-2 hover:text-navy-strong"
              >
                Create one
              </Link>
            </>
          }
        >
          <SignInForm />
        </AuthCard>
      }
    />
  );
}
