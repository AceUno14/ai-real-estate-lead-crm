import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Search, SearchX } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { PriorityBadge, StatusBadge } from "@/components/leads/badges";
import { LEAD_STATUSES, type LeadStatus } from "@/domain/status";
import { requireActiveOrganization } from "@/server/auth/organization";
import { countLeads, listLeads } from "@/server/db/lead";
import { prisma } from "@/server/db/prisma";
import type { LeadStatus as PrismaLeadStatus } from "@/generated/prisma/client";

export const metadata: Metadata = {
  title: "Leads",
};

const PAGE_SIZE = 25;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name-asc", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

function parseSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const first = (value: string | string[] | undefined): string | undefined => {
    if (Array.isArray(value)) return value[0];
    return value ?? undefined;
  };

  const rawStatus = first(searchParams.status);
  const status =
    rawStatus && (LEAD_STATUSES as readonly string[]).includes(rawStatus)
      ? (rawStatus as LeadStatus)
      : undefined;

  const rawSort = first(searchParams.sort);
  const sort = SORT_OPTIONS.some((option) => option.value === rawSort)
    ? (rawSort as SortValue)
    : "newest";

  const rawPage = first(searchParams.page);
  const page = Math.max(1, Number.parseInt(rawPage ?? "1", 10) || 1);

  return {
    search: first(searchParams.q)?.trim() || undefined,
    status,
    source: first(searchParams.source) || undefined,
    sort,
    page,
  };
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const organization = await requireActiveOrganization();
  const filters = parseSearchParams(await searchParams);

  const [leads, total, sources] = await Promise.all([
    listLeads(organization.id, {
      search: filters.search,
      status: filters.status as PrismaLeadStatus | undefined,
      source: filters.source,
      sort: filters.sort,
      limit: PAGE_SIZE,
      offset: (filters.page - 1) * PAGE_SIZE,
    }),
    countLeads(organization.id, {
      search: filters.search,
      status: filters.status as PrismaLeadStatus | undefined,
      source: filters.source,
    }),
    // Distinct sources in this organization for the source filter dropdown.
    prisma.lead.findMany({
      where: { organizationId: organization.id, source: { not: null } },
      distinct: ["source"],
      select: { source: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildPageHref(page: number): string {
    const params = new URLSearchParams();
    if (filters.search) params.set("q", filters.search);
    if (filters.status) params.set("status", filters.status);
    if (filters.source) params.set("source", filters.source);
    if (filters.sort !== "newest") params.set("sort", filters.sort);
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    return query ? `/leads?${query}` : "/leads";
  }

  const activeFilterCount = [
    filters.search,
    filters.status,
    filters.source,
  ].filter(Boolean).length;

  return (
    <div>
      <PageHeader
        title="Leads"
        description={`${total} lead${total === 1 ? "" : "s"} in ${organization.name}`}
      />

      {/* Filter toolbar */}
      <form
        method="get"
        className="mb-4 rounded-lg border border-line bg-surface p-4 shadow-xs"
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 sm:max-w-xs">
            <label
              htmlFor="q"
              className="block text-xs font-medium text-ink-secondary"
            >
              Search
            </label>
            <div className="relative mt-1">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-faint"
                aria-hidden="true"
              />
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={filters.search ?? ""}
                placeholder="Name, email, location"
                className="h-9 w-full rounded-md border border-line-strong bg-surface pl-8 pr-3 text-sm text-ink placeholder:text-faint focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>
          </div>

          <div className="w-full sm:w-auto">
            <label
              htmlFor="status"
              className="block text-xs font-medium text-ink-secondary"
            >
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={filters.status ?? ""}
              className="mt-1 h-9 w-full rounded-md border border-line-strong bg-surface px-2.5 text-sm text-ink focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy sm:w-36"
            >
              <option value="">All statuses</option>
              {LEAD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-auto">
            <label
              htmlFor="source"
              className="block text-xs font-medium text-ink-secondary"
            >
              Source
            </label>
            <select
              id="source"
              name="source"
              defaultValue={filters.source ?? ""}
              className="mt-1 h-9 w-full rounded-md border border-line-strong bg-surface px-2.5 text-sm text-ink focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy sm:w-36"
            >
              <option value="">All sources</option>
              {sources
                .filter((entry): entry is { source: string } => entry.source !== null)
                .map(({ source }) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
            </select>
          </div>

          <div className="w-full sm:w-auto">
            <label
              htmlFor="sort"
              className="block text-xs font-medium text-ink-secondary"
            >
              Sort
            </label>
            <select
              id="sort"
              name="sort"
              defaultValue={filters.sort}
              className="mt-1 h-9 w-full rounded-md border border-line-strong bg-surface px-2.5 text-sm text-ink focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy sm:w-36"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="h-9 shrink-0 rounded-md bg-navy px-4 text-sm font-medium text-white transition-colors hover:bg-navy-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          >
            Apply{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
        </div>
      </form>

      {leads.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
          <SearchX
            className="mx-auto size-8 text-faint"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm font-semibold text-ink">
            {activeFilterCount > 0 ? "No leads match these filters" : "No leads yet"}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            {activeFilterCount > 0
              ? "Try clearing the search or choosing a different status or source."
              : "Leads captured from your public inquiry form will appear here."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop / tablet: table */}
          <div className="hidden overflow-x-auto overflow-y-hidden rounded-lg border border-line bg-surface shadow-xs sm:block">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-muted text-left text-xs uppercase tracking-wide text-muted">
                  <th scope="col" className="px-4 py-2.5 font-medium">Lead</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Priority</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">AI score</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Source</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Location</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {leads.map((lead) => {
                  const latestQualification = lead.qualifications[0];
                  const score = latestQualification?.score ?? null;
                  return (
                    <tr
                      key={lead.id}
                      className="group relative transition-colors hover:bg-surface-muted"
                    >
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="focus-light font-medium text-ink underline-offset-2 after:absolute after:inset-0 hover:underline"
                        >
                          {/* Stretched link makes the whole row clickable. */}
                          <span className="sr-only">
                            Open lead {lead.name}
                          </span>
                          <span aria-hidden="true">{lead.name}</span>
                        </Link>
                        <span className="mt-0.5 block max-w-[16rem] truncate text-xs text-muted">
                          {lead.email}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={lead.status} />
                      </td>
                      <td className="px-4 py-2.5">
                        {latestQualification ? (
                          <PriorityBadge priority={latestQualification.priority} />
                        ) : (
                          <span className="text-faint">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {score !== null ? (
                          <span className="inline-flex items-center gap-2">
                            <span
                              className={`w-7 text-right text-sm font-semibold tabular-nums ${
                                score >= 80
                                  ? "text-success"
                                  : score >= 60
                                    ? "text-ink"
                                    : "text-muted"
                              }`}
                            >
                              {score}
                            </span>
                            <span
                              className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-surface-muted lg:block"
                              aria-hidden="true"
                            >
                              <span
                                className={`block h-full rounded-full ${
                                  score >= 80
                                    ? "bg-success"
                                    : score >= 60
                                      ? "bg-navy"
                                      : "bg-line-strong"
                                }`}
                                style={{ width: `${score}%` }}
                              />
                            </span>
                          </span>
                        ) : (
                          <span className="text-faint">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-ink-secondary">
                        {lead.source ?? <span className="text-faint">—</span>}
                      </td>
                      <td className="max-w-[12rem] truncate px-4 py-2.5 text-ink-secondary">
                        {lead.preferredLocation}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-muted">                        {new Date(lead.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: compact card list */}
          <ul className="space-y-3 sm:hidden">
            {leads.map((lead) => {
              const latestQualification = lead.qualifications[0];
              const score = latestQualification?.score ?? null;
              return (
                <li
                  key={lead.id}
                  className="relative rounded-lg border border-line bg-surface p-4 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="focus-light text-sm font-semibold text-ink underline-offset-2 after:absolute after:inset-0 hover:underline"
                      >
                        {/* Stretched link makes the whole card clickable. */}
                        <span className="sr-only">Open lead {lead.name}</span>
                        <span aria-hidden="true">{lead.name}</span>
                      </Link>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {lead.email}
                      </p>
                    </div>
                    {score !== null ? (
                      <span
                        className={`shrink-0 text-lg font-semibold tabular-nums ${
                          score >= 80
                            ? "text-success"
                            : score >= 60
                              ? "text-ink"
                              : "text-muted"
                        }`}
                      >
                        {score}
                      </span>
                    ) : (
                      <span className="shrink-0 text-sm text-faint">—</span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={lead.status} />
                    {latestQualification ? (
                      <PriorityBadge priority={latestQualification.priority} />
                    ) : null}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted">
                    <span className="truncate">
                      {lead.source ?? "—"}
                      {lead.preferredLocation ? ` · ${lead.preferredLocation}` : ""}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <ChevronRight
                    className="absolute right-2 top-1/2 size-4 -translate-y-1/2 text-faint"
                    aria-hidden="true"
                  />
                </li>
              );
            })}
          </ul>
        </>
      )}

      {totalPages > 1 ? (
        <nav
          className="mt-4 flex items-center justify-between text-sm"
          aria-label="Pagination"
        >
          {filters.page > 1 ? (
            <Link
              href={buildPageHref(filters.page - 1)}
              className="focus-light inline-flex min-h-11 items-center rounded-md border border-line-strong bg-surface px-4 py-1.5 font-medium text-ink hover:bg-surface-muted"
            >
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted">
            Page {filters.page} of {totalPages}
          </span>
          {filters.page < totalPages ? (
            <Link
              href={buildPageHref(filters.page + 1)}
              className="focus-light inline-flex min-h-11 items-center rounded-md border border-line-strong bg-surface px-4 py-1.5 font-medium text-ink hover:bg-surface-muted"
            >
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
