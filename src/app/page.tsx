import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <p className="text-sm font-semibold">AI Real Estate Lead CRM</p>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/lead" className="text-slate-600 hover:text-slate-900">
              Submit an inquiry
            </Link>
            <Link
              href="/sign-in"
              className="rounded-md border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight">
          Know which lead to call first.
        </h1>
        <p className="max-w-xl text-lg text-slate-500">
          Capture property inquiries, qualify them with AI, and follow up with
          the right people first — with a human always in control of every
          reply.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/sign-up"
            className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            Create an account
          </Link>
          <Link
            href="/lead"
            className="rounded-md border border-slate-300 px-5 py-2.5 text-sm font-medium hover:bg-slate-50"
          >
            Submit a property inquiry
          </Link>
        </div>
      </div>
    </main>
  );
}
