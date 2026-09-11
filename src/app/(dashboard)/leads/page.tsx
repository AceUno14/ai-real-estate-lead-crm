import type { Metadata } from "next";
import Link from "next/link";

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

  return (
    <div>
      <PageHeader
        title="Leads"
        description={`${total} lead${total === 1 ? "" : "s"} in ${organization.name}`}
      />

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="q" className="block text-xs font-medium text-slate-600">
            Search
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={filters.search ?? ""}
            placeholder="Name, email, location"
            className="mt-1 w-56 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-900 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="status" className="block text-xs font-medium text-slate-600">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={filters.status ?? ""}
            className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-900 focus:outline-none"
          >
            <option value="">All statuses</option>
            {LEAD_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="source" className="block text-xs font-medium text-slate-600">
            Source
          </label>
          <select
            id="source"
            name="source"
            defaultValue={filters.source ?? ""}
            className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-900 focus:outline-none"
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
        <div>
          <label htmlFor="sort" className="block text-xs font-medium text-slate-600">
            Sort
          </label>
          <select
            id="sort"
            name="sort"
            defaultValue={filters.sort}
            className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-900 focus:outline-none"
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
          className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          Apply
        </button>
      </form>

      {leads.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm font-medium text-slate-700">No leads found</p>
          <p className="mt-1 text-sm text-slate-500">
            Leads captured from the public inquiry form will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3">Name</th>
                <th scope="col" className="px-4 py-3">Contact</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Priority</th>
                <th scope="col" className="px-4 py-3">Score</th>
                <th scope="col" className="px-4 py-3">Source</th>
                <th scope="col" className="px-4 py-3">Location</th>
                <th scope="col" className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((lead) => {
                const latestQualification = lead.qualifications[0];
                return (
                  <tr key={lead.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="font-medium text-slate-900 underline-offset-2 hover:underline"
                      >
                        {lead.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{lead.email}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-4 py-3">
                      {latestQualification ? (
                        <PriorityBadge priority={latestQualification.priority} />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {latestQualification ? (
                        latestQualification.score
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{lead.source ?? "—"}</td>
                    <td className="max-w-[12rem] truncate px-4 py-3 text-slate-600">
                      {lead.preferredLocation}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <nav
          className="mt-4 flex items-center justify-between text-sm"
          aria-label="Pagination"
        >
          {filters.page > 1 ? (
            <Link
              href={buildPageHref(filters.page - 1)}
              className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
            >
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-slate-500">
            Page {filters.page} of {totalPages}
          </span>
          {filters.page < totalPages ? (
            <Link
              href={buildPageHref(filters.page + 1)}
              className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
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
