import Link from "next/link";

/**
 * Shared authentication shell (UI Phase 3).
 *
 * A calm, premium two-column layout: a quiet brand panel on the left that
 * echoes the navy dashboard sidebar, and the centered auth card on the
 * right. Collapses to a single centered column on mobile with a compact
 * top brand strip.
 */
export function AuthShell({
  card,
  brand,
}: {
  card: React.ReactNode;
  brand: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* Mobile: compact brand strip above the card */}
      <div className="flex items-center gap-2.5 bg-sidebar px-5 py-4 lg:hidden">
        <BrandMark />
        <span className="text-sm font-semibold text-sidebar-text-strong">
          Lead Estate
        </span>
      </div>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        {card}
      </main>

      {/* Desktop only: quiet brand panel, no illustration */}
      <aside
        aria-hidden="true"
        className="hidden flex-col justify-between bg-sidebar px-10 py-10 lg:flex xl:px-14"
      >
        <Link href="/" className="focus-light w-fit rounded-md" tabIndex={-1}>
          <span className="flex items-center gap-2.5">
            <BrandMark />
            <span className="text-sm font-semibold text-sidebar-text-strong">
              Lead Estate
            </span>
          </span>
        </Link>
        {brand}
      </aside>
    </div>
  );
}

/** Compact product mark — the same house glyph used by the dashboard sidebar. */
export function BrandMark() {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white/10">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4 text-white"
        aria-hidden="true"
      >
        <path d="M3 10.5 12 4l9 6.5" />
        <path d="M5 9.5V20h14V9.5" />
        <path d="M10 20v-5h4v5" />
      </svg>
    </span>
  );
}

/** The white auth card: heading, supporting copy, form, footer link. */
export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-md">
      <div className="rounded-xl border border-line bg-surface p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {title}
        </h1>
        <p className="mt-1.5 text-sm leading-6 text-muted">{description}</p>
        <div className="mt-6">{children}</div>
      </div>
      <div className="mt-5 text-center text-sm text-muted">{footer}</div>
    </div>
  );
}
