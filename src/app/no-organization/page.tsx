import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "No workspace",
};

export default function NoOrganizationPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold">No workspace yet</h1>
        <p className="mt-2 text-sm text-slate-500">
          Your account is not a member of a real-estate workspace. Ask an
          organization owner to invite you, or contact the administrator.
        </p>
      </div>
    </main>
  );
}
