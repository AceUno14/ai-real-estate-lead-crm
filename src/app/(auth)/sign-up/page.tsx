import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard, AuthShell } from "@/components/ui/auth-shell";

import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = {
  title: "Create account",
};

export default function SignUpPage() {
  return (
    <AuthShell
      brand={
        <>
          <div>
            <p className="text-lg font-semibold tracking-tight text-sidebar-text-strong">
              Start your workspace
            </p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-sidebar-text">
              Create your account and we&rsquo;ll set up your real-estate
              workspace — leads, follow-ups, and AI qualification, ready from
              day one.
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
          title="Create account"
          description="Create your account and we'll set up your real-estate workspace."
          footer={
            <>
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="font-medium text-navy underline underline-offset-2 hover:text-navy-strong"
              >
                Sign in
              </Link>
            </>
          }
        >
          <SignUpForm />
        </AuthCard>
      }
    />
  );
}
