import { Mail, MapPin, Phone } from "lucide-react";

import {
  DetailSection,
  MetaItem,
  NoValue,
  SubHeading,
} from "@/components/leads/detail-section";
import { StatusBadge } from "@/components/leads/badges";
import { formatBudgetRange } from "@/lib/format";

/**
 * Contact + inquiry summary (UI Phase 2).
 *
 * Compact, scannable structure: contact block with icons, sales-relevant
 * fields (budget, timeline, financing, location) emphasized, then the
 * remaining inquiry context, then the original message.
 */
export function LeadSummary({
  lead,
}: {
  lead: {
    email: string;
    phone: string | null;
    inquiryType: string;
    propertyType: string | null;
    preferredLocation: string;
    budgetMin: number | null;
    budgetMax: number | null;
    timeline: string | null;
    financingStatus: string | null;
    source: string | null;
    status: string;
    message: string;
  };
}) {
  return (
    <DetailSection id="lead-summary" title="Contact & inquiry">
      {/* Contact — icons aid scanning here */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-1">
        <a
          href={`mailto:${lead.email}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-ink underline-offset-2 hover:underline"
        >
          <Mail className="size-4 shrink-0 text-faint" aria-hidden="true" />
          {lead.email}
        </a>
        {lead.phone ? (
          <a
            href={`tel:${lead.phone.replace(/[^+\d]/g, "")}`}
            className="inline-flex items-center gap-2 text-sm text-ink-secondary underline-offset-2 hover:underline"
          >
            <Phone className="size-4 shrink-0 text-faint" aria-hidden="true" />
            {lead.phone}
          </a>
        ) : (
          <span className="inline-flex items-center gap-2 text-sm text-faint">
            <Phone className="size-4 shrink-0" aria-hidden="true" />
            No phone provided
          </span>
        )}
        <span className="inline-flex items-center gap-2 text-sm text-ink-secondary">
          <MapPin
            className="size-4 shrink-0 text-faint"
            aria-hidden="true"
          />
          {lead.preferredLocation}
        </span>
      </div>

      {/* Sales-relevant fields first, emphasized */}
      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-line pt-4 sm:grid-cols-4">
        <MetaItem
          label="Budget"
          value={
            lead.budgetMin !== null || lead.budgetMax !== null ? (
              <span className="tabular-nums">
                {formatBudgetRange(lead.budgetMin, lead.budgetMax)}
                <span className="ml-1 text-xs font-normal text-faint">
                  USD
                </span>
              </span>
            ) : (
              <NoValue />
            )
          }
          emphasis
        />
        <MetaItem
          label="Timeline"
          value={lead.timeline ?? <NoValue />}
          emphasis
        />
        <MetaItem
          label="Financing"
          value={lead.financingStatus ?? <NoValue />}
          emphasis
        />
        <MetaItem
          label="Location"
          value={lead.preferredLocation}
          emphasis
        />
      </dl>

      {/* Remaining inquiry context */}
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
        <MetaItem label="Inquiry type" value={lead.inquiryType} />
        <MetaItem
          label="Property type"
          value={lead.propertyType ?? <NoValue />}
        />
        <MetaItem label="Source" value={lead.source ?? <NoValue />} />
        <MetaItem label="Status" value={<StatusBadge status={lead.status as never} />} />
      </dl>

      {/* Original message */}
      <div className="mt-5 border-t border-line pt-4">
        <SubHeading>Inquiry message</SubHeading>
        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-secondary">
          {lead.message}
        </p>
      </div>
    </DetailSection>
  );
}
