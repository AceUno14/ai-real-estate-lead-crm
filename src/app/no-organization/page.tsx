import type { Metadata } from "next";
import { Building2 } from "lucide-react";

export const metadata: Metadata = {
  title: "No workspace",
};

/**
 * Fallback for authenticated users with no organization membership
 * (D-026). Self-service sign-up provisions a workspace, so this page is
 * rare in practice — kept calm and on the shared token system.
 */
export default function NoOrganizationPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border border-line bg-surface p-8 text-center shadow-sm">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-navy-soft">
          <Building2 className="size-5 text-navy" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink">
          No workspace yet
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Your account is not a member of a real-estate workspace. Ask an
          organization owner to invite you, or contact the administrator.
        </p>
      </div>
    </main>
  );
}
